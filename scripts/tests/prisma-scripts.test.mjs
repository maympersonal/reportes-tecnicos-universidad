// Node >= 22.13: node --experimental-vm-modules scripts/tests/prisma-scripts.test.mjs
import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises"
import { stripTypeScriptTypes } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawnSync } from "node:child_process"
import test from "node:test"
import { createContext, SourceTextModule, SyntheticModule } from "node:vm"

const root = new URL("../../", import.meta.url)
const sources = Object.fromEntries(await Promise.all([
  "src/lib/bootstrap.ts", "src/lib/constants.ts", "prisma/seed.ts",
  "prisma/seed-demo.ts", "prisma/reset-db.ts",
].map(async (path) => [path, stripTypeScriptTypes(await readFile(new URL(path, root), "utf8"))])))

// Doble de almacenamiento con unicidad y rollback para probar la lógica sin Prisma instalado.
function database() {
  const rows = Object.fromEntries(["user", "tipoArea", "area", "tipoTarea", "tipoEquipo", "reporte"].map((name) => [name, []]))
  const unique = { user: ["id", "username", "email"], tipoArea: ["nombre"], area: ["nombre"], tipoTarea: ["codigo"], tipoEquipo: ["nombre"], reporte: ["codigo"] }
  const db = { transactions: 0, fail: false, rows }
  const matches = (record, where = {}) => Object.entries(where).every(([key, value]) => record[key] === value)
  for (const name of Object.keys(rows)) {
    db[name] = {
      findFirst: async ({ where }) => rows[name].find((row) => matches(row, where)) ?? null,
      findUnique: async ({ where }) => rows[name].find((row) => matches(row, where)) ?? null,
      findUniqueOrThrow: async ({ where }) => {
        const row = rows[name].find((row) => matches(row, where))
        if (!row) throw new Error("Record not found")
        return row
      },
      findMany: async ({ where } = {}) => rows[name].filter((row) => matches(row, where)),
      create: async ({ data }) => {
        if (unique[name].some((key) => data[key] !== undefined && rows[name].some((row) => row[key] === data[key]))) throw new Error("Unique constraint")
        const row = { id: `${name}-${rows[name].length}`, activo: true, ...structuredClone(data) }
        rows[name].push(row)
        return row
      },
      updateMany: async ({ where, data }) => {
        const selected = rows[name].filter((row) => matches(row, where))
        for (const row of selected) Object.assign(row, data)
        return { count: selected.length }
      },
      upsert: async ({ where, create, update }) => {
        const row = rows[name].find((row) => matches(row, where))
        if (row) return Object.assign(row, update)
        return db[name].create({ data: create })
      },
    }
  }
  db.$transaction = async (callback) => {
    db.transactions++
    if (db.fail) throw new Error("Database unavailable")
    const snapshot = structuredClone(rows)
    try { return await callback(db) }
    catch (error) {
      for (const name of Object.keys(rows)) rows[name] = snapshot[name]
      throw error
    }
  }
  return db
}

async function load(db, script, env = {}) {
  let finish
  const done = new Promise((resolve) => { finish = resolve })
  const processMock = { env, exitCode: 0 }
  db.$disconnect = async () => { finish() }
  const context = createContext({ process: processMock, console: { log() {}, error() {} } })
  const mock = (exports) => new SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
  }, { context })
  const dbModule = mock({ db })
  const authModule = mock({ hashPassword: (value) => `hashed:${value}` })
  const constants = new SourceTextModule(sources["src/lib/constants.ts"], { context })
  const bootstrap = new SourceTextModule(sources["src/lib/bootstrap.ts"], { context })
  const resolve = (name) => {
    if (name.endsWith("/db")) return dbModule
    if (name.endsWith("/auth")) return authModule
    if (name.endsWith("/constants")) return constants
    if (name.endsWith("/bootstrap")) return bootstrap
    throw new Error(`Unexpected import: ${name}`)
  }
  if (!script) {
    await bootstrap.link(resolve)
    await bootstrap.evaluate()
    return bootstrap.namespace.ensureBootstrap
  }
  const module = new SourceTextModule(sources[script], { context })
  await module.link(resolve)
  await module.evaluate()
  await done
  return processMock.exitCode
}

test("seed completa catálogos parciales sin alterar usuarios, estados ni reportes", async () => {
  const db = database()
  db.rows.user.push({ id: "real-admin", role: "superadmin", password: "custom-password", activo: false })
  db.rows.tipoTarea.push({ id: "task", codigo: "otros", nombre: "Personalizado", activo: false })
  db.rows.reporte.push({ id: "real-report", codigo: "RPT-2026-0001", descripcion: "Conservar" })
  assert.equal(await load(db, "prisma/seed.ts"), 0)
  const snapshot = structuredClone(db.rows)
  assert.equal(await load(db, "prisma/seed.ts"), 0)
  assert.deepEqual(db.rows, snapshot)
  assert.equal(db.rows.user.length, 1)
  assert.equal(db.rows.user[0].password, "custom-password")
  assert.equal(db.rows.user[0].role, "admin")
  assert.equal(db.rows.user[0].id, "real-admin")
  assert.equal(db.rows.user[0].activo, false)
  assert.equal(db.rows.tipoTarea[0].activo, false)
  assert.equal(db.rows.tipoTarea[0].nombre, "Personalizado")
  assert.equal(db.rows.tipoTarea.length, 8)
  assert.equal(db.rows.tipoEquipo.length, 15)
  assert.equal(db.rows.area.length, 2)
  assert.equal(db.rows.reporte[0].descripcion, "Conservar")
})

test("bootstrap comparte solicitudes concurrentes y permite reintentar errores", async () => {
  const db = database()
  const initialize = await load(db)
  db.fail = true
  await assert.rejects(initialize(), /Database unavailable/)
  db.fail = false
  const first = initialize()
  assert.equal(first, initialize())
  await first
  assert.equal(db.transactions, 2)
  assert.equal(db.rows.user[0].role, "admin")
  assert.equal(db.rows.user[0].username, "admin")
  assert.equal(db.rows.user.length, 1)
})

test("convierte roles antiguos aunque ya exista un admin y conserva las cuentas", async () => {
  const db = database()
  const original = [
    { id: "legacy", username: "superadmin", role: "superadmin", password: "original", activo: true },
    { id: "admin", username: "admin", role: "admin", password: "another", activo: true },
  ]
  db.rows.user.push(...structuredClone(original))
  const initialize = await load(db)
  await initialize()
  assert.deepEqual(db.rows.user, original.map((user) => ({ ...user, role: "admin" })))
})

test("seed devuelve fallo cuando no se puede preparar la base", async () => {
  const db = database()
  db.fail = true
  assert.equal(await load(db, "prisma/seed.ts"), 1)
})

test("demo agrega 21 reportes una sola vez y conserva contraseñas y cambios", async () => {
  const db = database()
  db.rows.reporte.push({ id: "real", codigo: "RPT-2026-0001", descripcion: "Reporte real" })
  assert.equal(await load(db, "prisma/seed-demo.ts", { DEMO_PASSWORD: "custom-demo" }), 0)
  assert.equal(db.rows.reporte.length, 22)
  assert.equal(db.rows.user.length, 7)
  assert.equal(db.rows.user.find((u) => u.username === "demo.admin").password, "hashed:custom-demo")
  db.rows.reporte[1].descripcion = "Editado por el usuario"
  const snapshot = structuredClone(db.rows)
  assert.equal(await load(db, "prisma/seed-demo.ts", { DEMO_PASSWORD: "different" }), 0)
  assert.deepEqual(db.rows, snapshot)
  for (const report of db.rows.reporte.slice(1)) {
    assert.ok(report.historial.create.length > 0)
    assert.equal(report.historial.create.at(-1).estadoNuevo, report.estado)
    assert.ok(report.fechaActualizacion <= new Date())
  }
})

test("demo rechaza producción antes de escribir", async () => {
  const db = database()
  assert.equal(await load(db, "prisma/seed-demo.ts", { NODE_ENV: "production" }), 1)
  assert.equal(db.transactions, 0)
})

test("demo revierte sus cuentas ante una colisión con un usuario existente", async () => {
  const db = database()
  db.rows.user.push({ id: "existing", username: "demo.tec2", password: "keep" })
  assert.equal(await load(db, "prisma/seed-demo.ts"), 1)
  assert.equal(db.rows.user.length, 2) // usuario previo + admin básico
  assert.equal(db.rows.user[0].password, "keep")
  assert.equal(db.rows.reporte.length, 0)
})

test("reset protege bases reales y enlaces, exige confirmación y detiene fallos", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "reportes-reset-test-"))
  t.after(() => rm(dir, { recursive: true, force: true }))
  await mkdir(join(dir, "prisma"))
  await mkdir(join(dir, "db"))
  await writeFile(join(dir, "prisma/reset-db.mjs"), sources["prisma/reset-db.ts"])
  await writeFile(join(dir, "db/custom.db"), "REAL DATABASE SENTINEL")
  const callsPath = join(dir, "calls.jsonl")
  for (const name of ["prisma", "tsx"]) {
    const location = join(dir, "node_modules", name)
    await mkdir(location, { recursive: true })
    await writeFile(join(location, "package.json"), JSON.stringify({ name, main: "cli.cjs", exports: { ".": "./cli.cjs", "./cli": "./cli.cjs" } }))
    await writeFile(join(location, "cli.cjs"), `require('node:fs').appendFileSync(${JSON.stringify(callsPath)}, JSON.stringify(process.argv.slice(2))+'\\n'); if(process.env.FAIL_CLI) process.exit(1)`)
  }
  const run = (env = {}, args = ["--confirm-reset"]) => spawnSync(process.execPath, [join(dir, "prisma/reset-db.mjs"), ...args], {
    encoding: "utf8", env: { ...process.env, NODE_ENV: "development", DATABASE_URL: "file:../db/test.db", ...env },
  })
  assert.equal(run({ NODE_ENV: "production" }).status, 1)
  assert.equal(run({}, []).status, 1)
  assert.equal(run({ DATABASE_URL: "file:../db/custom.db" }).status, 1)
  assert.equal(run({ DATABASE_URL: "file:/tmp/another.db" }).status, 1)
  assert.equal(run({ DATABASE_URL: "file:../db/test.db?mode=rw" }).status, 1)
  await symlink(join(dir, "db/custom.db"), join(dir, "db/test.db"))
  assert.equal(run().status, 1)
  await rm(join(dir, "db/test.db"))
  await symlink(join(dir, "db/nonexistent.db"), join(dir, "db/test.db"))
  assert.equal(run().status, 1)
  await rm(join(dir, "db/test.db"))
  await assert.rejects(readFile(callsPath), { code: "ENOENT" })
  const success = run()
  assert.equal(success.status, 0, success.stderr)
  let calls = (await readFile(callsPath, "utf8")).trim().split("\n").map(JSON.parse)
  assert.equal(calls.length, 3)
  assert.deepEqual(calls[0].slice(0, 4), ["db", "push", "--force-reset", "--skip-generate"])
  assert.equal(calls[1][0], "generate")
  assert.equal(calls[2][0], join(dir, "prisma/seed.ts"))
  await writeFile(callsPath, "")
  assert.equal(run({ FAIL_CLI: "1" }).status, 1)
  calls = (await readFile(callsPath, "utf8")).trim().split("\n")
  assert.equal(calls.length, 1)
  assert.equal(await readFile(join(dir, "db/custom.db"), "utf8"), "REAL DATABASE SENTINEL")
})
