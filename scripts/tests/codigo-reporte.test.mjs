import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { stripTypeScriptTypes } from "node:module"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DatabaseSync } from "node:sqlite"
import test from "node:test"
import { SourceTextModule, SyntheticModule } from "node:vm"
import { isMainThread, parentPort, Worker, workerData } from "node:worker_threads"

const root = new URL("../../", import.meta.url)
const source = stripTypeScriptTypes(await readFile(new URL("src/lib/codigo-reporte.ts", root), "utf8"))
const { reservarCodigoReporte } = await import(`data:text/javascript,${encodeURIComponent(source)}`)

function connect(path) {
  const sqlite = new DatabaseSync(path)
  sqlite.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 15000;")
  // Ejecuta sin cambios el SQL parametrizado de producción sobre SQLite real.
  const tx = {
    $queryRaw: async (strings, ...values) => sqlite.prepare(strings.join("?")).all(...values),
  }
  const transaction = async (callback) => {
    sqlite.exec("BEGIN")
    try {
      const result = await callback(tx)
      sqlite.exec("COMMIT")
      return result
    } catch (error) {
      sqlite.exec("ROLLBACK")
      throw error
    }
  }
  const create = (year) => transaction(async (tx) => {
    const codigo = await reservarCodigoReporte(tx, year)
    sqlite.prepare('INSERT INTO "Reporte" (id, codigo) VALUES (?, ?)').run(codigo, codigo)
    return codigo
  })
  return { sqlite, tx, transaction, create }
}

async function setup(t) {
  const directory = await mkdtemp(join(tmpdir(), "reportes-codigos-"))
  const path = join(directory, "test.db")
  const database = connect(path)
  t.after(async () => {
    database.sqlite.close()
    await rm(directory, { recursive: true, force: true })
  })
  database.sqlite.exec(`
    CREATE TABLE ContadorReporte (anio INTEGER PRIMARY KEY, ultimoNumero INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE TipoTarea (id TEXT PRIMARY KEY);
    INSERT INTO TipoTarea VALUES ('task');
    CREATE TABLE Reporte (
      id TEXT PRIMARY KEY, codigo TEXT NOT NULL UNIQUE,
      tipoTareaId TEXT REFERENCES TipoTarea(id)
    );
    CREATE TABLE HistorialEstado (
      reporteId TEXT NOT NULL REFERENCES Reporte(id) ON DELETE CASCADE,
      estadoAnterior TEXT, estadoNuevo TEXT NOT NULL, comentario TEXT, usuarioId TEXT NOT NULL
    );
  `)
  return { ...database, path }
}

if (!isMainThread) {
  const database = connect(workerData.path)
  const gate = new Int32Array(workerData.gate)
  parentPort.postMessage("ready")
  Atomics.wait(gate, 0, 0)
  try {
    const codes = []
    for (let i = 0; i < 5; i++) codes.push(await database.create(2026))
    parentPort.postMessage(codes)
  } finally {
    database.sqlite.close()
  }
} else {
  test("continúa desde el máximo numérico del año e ignora códigos ajenos o inválidos", async (t) => {
    const { sqlite, create } = await setup(t)
    const insert = sqlite.prepare("INSERT INTO Reporte (id, codigo) VALUES (?, ?)")
    const previous = ["RPT-2026-0001", "RPT-2026-9999", "RPT-2026-10000", "RPT-2025-90000", "DEMO-99999", "RPT-2026-99999x", "RPT-2026-", "RPT-2026--99999"]
    for (const codigo of previous) insert.run(codigo, codigo)
    assert.equal(await create(2026), "RPT-2026-10001")
    assert.equal(await create(2026), "RPT-2026-10002")
    assert.equal(await create(2027), "RPT-2027-0001")
    assert.equal(await create(2025), "RPT-2025-90001")
    for (const codigo of previous) assert.ok(sqlite.prepare("SELECT 1 FROM Reporte WHERE codigo = ?").get(codigo))
  })

  test("borrar un reporte intermedio, el último o todos no reutiliza números", async (t) => {
    const { sqlite, create } = await setup(t)
    for (let i = 1; i <= 3; i++) assert.equal(await create(2026), `RPT-2026-000${i}`)
    sqlite.exec("DELETE FROM Reporte WHERE codigo = 'RPT-2026-0002'")
    assert.equal(await create(2026), "RPT-2026-0004")
    sqlite.exec("DELETE FROM Reporte WHERE codigo = 'RPT-2026-0004'")
    assert.equal(await create(2026), "RPT-2026-0005")
    sqlite.exec("DELETE FROM Reporte")
    assert.equal(await create(2026), "RPT-2026-0006")
    assert.equal(await create(2027), "RPT-2027-0001")
  })

  for (const initialized of [false, true]) {
    test(`creaciones simultáneas con conexiones independientes; contador ${initialized ? "existente" : "nuevo"}`, async (t) => {
      const { sqlite, path, create } = await setup(t)
      if (initialized) await create(2026)
      const gate = new SharedArrayBuffer(4)
      const jobs = Array.from({ length: 6 }, () => {
        const worker = new Worker(new URL(import.meta.url), { workerData: { path, gate } })
        t.after(() => worker.terminate())
        let ready
        const started = new Promise((resolve) => { ready = resolve })
        const finished = new Promise((resolve, reject) => {
          worker.on("message", (message) => message === "ready" ? ready() : resolve(message))
          worker.on("error", reject)
          worker.on("exit", (code) => { if (code !== 0) reject(new Error(`Worker terminó con ${code}`)) })
        })
        // También falla si un worker no consigue llegar a la barrera.
        return { started: Promise.race([started, finished]), finished }
      })
      await Promise.all(jobs.map((job) => job.started))
      Atomics.store(new Int32Array(gate), 0, 1)
      Atomics.notify(new Int32Array(gate), 0)
      const codes = (await Promise.all(jobs.map((job) => job.finished))).flat().sort()
      assert.equal(new Set(codes).size, 30)
      assert.deepEqual(codes, Array.from({ length: 30 }, (_, i) => `RPT-2026-${String(i + (initialized ? 2 : 1)).padStart(4, "0")}`))
      assert.equal(sqlite.prepare("SELECT count(*) AS n FROM Reporte").get().n, initialized ? 31 : 30)
    })
  }

  async function loadRoute(database) {
    const { sqlite, tx, transaction } = database
    const notifications = []
    // Adaptador mínimo de Prisma para verificar los límites de la transacción
    // del endpoint y su creación anidada; no sustituye una prueba del cliente Prisma.
    tx.reporte = {
      create: async ({ data }) => {
        const id = data.codigo
        sqlite.prepare("INSERT INTO Reporte (id, codigo, tipoTareaId) VALUES (?, ?, ?)").run(id, data.codigo, data.tipoTareaId)
        const history = data.historial.create
        sqlite.prepare("INSERT INTO HistorialEstado VALUES (?, ?, ?, ?, ?)").run(id, history.estadoAnterior, history.estadoNuevo, history.comentario, history.usuarioId)
        return { ...data, id, historial: [history] }
      },
    }
    const db = {
      $transaction: transaction,
      user: { findMany: async () => [{ id: "admin" }] },
      notificacion: { createMany: async ({ data }) => notifications.push(...data) },
    }
    const mock = (exports) => new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
    })
    const modules = {
      "next/server": mock({ NextRequest: Request, NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } }),
      "@/lib/db": mock({ db }),
      "@/lib/codigo-reporte": mock({ reservarCodigoReporte }),
      "@/lib/auth": mock({ getUserFromRequest: async () => ({ id: "author", name: "Autor" }), tienePermiso: () => true }),
      "@/lib/serialize": mock({ serializeReporteLite: (r) => r, serializeReporte: (r) => r }),
    }
    const route = new SourceTextModule(stripTypeScriptTypes(await readFile(new URL("src/app/api/reportes/route.ts", root), "utf8")), {
      importModuleDynamically: async (name) => modules[name],
    })
    await route.link((name) => modules[name])
    await route.evaluate()
    return {
      notifications,
      post: (body = {}) => route.namespace.POST(new Request("http://localhost/api/reportes", {
        method: "POST",
        body: JSON.stringify({ tipoTareaId: "task", descripcion: "Problema", areaId: "area", usuarioNombre: "Nombre", usuarioCorreo: "a@example.invalid", ...body }),
      })),
    }
  }

  test("el endpoint devuelve el historial inicial y notifica con el código reservado", async (t) => {
    const database = await setup(t)
    const { post, notifications } = await loadRoute(database)
    const response = await post()
    assert.equal(response.status, 201)
    const { item } = response.body
    assert.equal(item.codigo, `RPT-${new Date().getFullYear()}-0001`)
    assert.equal(item.historial.length, 1)
    assert.equal(item.historial[0].estadoNuevo, "pendiente")
    assert.equal(database.sqlite.prepare("SELECT count(*) AS n FROM HistorialEstado").get().n, 1)
    assert.equal(notifications[0].mensaje, `Autor creó el reporte ${item.codigo}`)
  })

  test("un fallo de reporte o historial revierte todo, incluido el contador", async (t) => {
    const database = await setup(t)
    const { sqlite } = database
    const { post, notifications } = await loadRoute(database)
    await assert.rejects(post({ tipoTareaId: "missing" }), /FOREIGN KEY/)
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM ContadorReporte").get().n, 0)
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM Reporte").get().n, 0)
    const first = await post()
    sqlite.exec("CREATE TRIGGER fail_history BEFORE INSERT ON HistorialEstado BEGIN SELECT RAISE(ABORT, 'historial no disponible'); END;")
    await assert.rejects(post(), /historial no disponible/)
    assert.equal(sqlite.prepare("SELECT ultimoNumero FROM ContadorReporte").get().ultimoNumero, 1)
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM Reporte").get().n, 1)
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM HistorialEstado").get().n, 1)
    assert.equal(notifications.length, 1)
    sqlite.exec("DROP TRIGGER fail_history")
    assert.equal((await post()).body.item.codigo, first.body.item.codigo.replace(/0001$/, "0002"))
  })
}
