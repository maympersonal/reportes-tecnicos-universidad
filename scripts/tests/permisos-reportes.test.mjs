import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { stripTypeScriptTypes } from "node:module"
import test from "node:test"
import { SourceTextModule, SyntheticModule } from "node:vm"

const root = new URL("../../", import.meta.url)
const files = {
  auth: "src/lib/auth.ts",
  constants: "src/lib/constants.ts",
  codigo: "src/lib/codigo-reporte.ts",
  collection: "src/app/api/reportes/route.ts",
  report: "src/app/api/reportes/[id]/route.ts",
  state: "src/app/api/reportes/[id]/cambiar-estado/route.ts",
  users: "src/app/api/usuarios/route.ts",
  user: "src/app/api/usuarios/[id]/route.ts",
}
const sources = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, file]) =>
  [key, stripTypeScriptTypes(await readFile(new URL(file, root), "utf8"))])))

async function setup({ role = "tecnico", permisos = null, authenticated = true, own = true, reporte = {} } = {}) {
  const user = { id: "me", role, permisos, activo: true }
  const report = { id: "report", creadoPorId: own ? "me" : "other", tecnicoAsignadoId: "old-tech", estado: "pendiente", descripcion: "impresora", ...reporte }
  const writes = []
  const matches = (row, where) => Object.entries(where).every(([key, value]) => {
    if (key === "AND") return value.every((part) => matches(row, part))
    if (key === "OR") return value.some((part) => matches(row, part))
    if (value && typeof value === "object" && "contains" in value) return String(row[key] ?? "").includes(value.contains)
    return row[key] === value
  })
  const reports = [report, { ...report, id: "foreign", creadoPorId: "other", tecnicoAsignadoId: "other" }]
  const db = {
    $transaction: async (callback) => callback(db),
    $queryRaw: async () => [{ ultimoNumero: 3n }],
    session: { findUnique: async () => authenticated ? { user, expiresAt: new Date(Date.now() + 60_000) } : null },
    reporte: {
      findUnique: async () => report,
      findMany: async ({ where }) => reports.filter((row) => matches(row, where)),
      count: async ({ where } = {}) => where ? reports.filter((row) => matches(row, where)).length : reports.length,
      create: async ({ data }) => { writes.push(data); return { ...report, ...data } },
      update: async ({ data }) => { writes.push(data); return { ...report, ...data } },
      delete: async () => { writes.push("deleted"); return report },
    },
    user: {
      findMany: async () => [],
      findFirst: async () => null,
      findUnique: async () => ({ id: "target", role: "tecnico" }),
      create: async ({ data }) => { writes.push(data); return { ...user, ...data } },
      update: async ({ data }) => { writes.push(data); return { ...user, ...data } },
    },
    historialEstado: { create: async () => {} },
    notificacion: { createMany: async () => {} },
  }
  const mock = (exports) => new SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
  })
  const modules = {
    "next/server": mock({ NextRequest: Request, NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } }),
    "@/lib/db": mock({ db }),
    "@/lib/codigo-reporte": new SourceTextModule(sources.codigo),
    "@/lib/auth": new SourceTextModule(sources.auth),
    "@/lib/constants": new SourceTextModule(sources.constants),
    "@/lib/serialize": mock({ serializeReporte: (r) => r, serializeReporteLite: (r) => r }),
    "@/lib/bootstrap": mock({ ensureBootstrap: async () => {} }),
    crypto: mock({ randomBytes: () => Buffer.from("salt"), scryptSync: () => Buffer.from("hash"), timingSafeEqual() {} }),
  }
  const resolve = (specifier) => {
    assert.ok(modules[specifier], `Unexpected import: ${specifier}`)
    return modules[specifier]
  }
  const load = async (key) => {
    const module = key === "auth" ? modules["@/lib/auth"] : new SourceTextModule(sources[key], {
      importModuleDynamically: async (specifier) => {
        const dependency = resolve(specifier)
        if (dependency.status === "unlinked") await dependency.link(resolve)
        if (dependency.status === "linked") await dependency.evaluate()
        return dependency
      },
    })
    if (module.status === "unlinked") await module.link(resolve)
    if (module.status === "linked") await module.evaluate()
    return module.namespace
  }
  return {
    writes, load,
    async call(key, method, body, query = "") {
      const route = await load(key)
      const req = new Request(`http://localhost/api/reportes${query}`, {
        method, headers: { authorization: "Bearer test" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      req.nextUrl = new URL(req.url)
      return route[method](req, { params: Promise.resolve({ id: "report" }) })
    },
  }
}

test("admin siempre tiene todos los permisos; los otros roles respetan overrides", async () => {
  const { load } = await setup()
  const { getPermisos, tienePermiso } = await load("auth")
  assert.equal(tienePermiso(null, "reportes.eliminar"), false)
  assert.equal(tienePermiso({ role: "admin", permisos: "[]" }, "reportes.eliminar"), true)
  assert.ok(getPermisos({ role: "admin", permisos: "[]" }).includes("reportes.asignar"))
  assert.deepEqual(getPermisos({ role: "tecnico", permisos: '[]' }), [])
  assert.deepEqual(getPermisos({ role: "auditor", permisos: '["reportes.editar"]' }), ["reportes.editar"])
  assert.equal(tienePermiso({ role: "tecnico", permisos: "bad-json" }, "reportes.crear"), true)
})

test("actualiza sesiones guardadas en el navegador sin perder el token ni preferencias", async () => {
  const storeSource = stripTypeScriptTypes(await readFile(new URL("src/lib/store.ts", root), "utf8"))
  const mock = (exports) => new SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
  })
  const modules = {
    zustand: mock({ create: () => (options) => options }),
    "zustand/middleware": mock({ persist: (_factory, options) => options }),
    "@/lib/constants": new SourceTextModule(sources.constants),
  }
  const module = new SourceTextModule(storeSource)
  await module.link((name) => modules[name])
  await module.evaluate()
  const { migrate } = module.namespace.useAppStore
  for (const role of ["superadmin", "admin"]) {
    const oldState = { user: { id: "same-id", role, permisos: [] }, token: "keep-token", theme: "dark" }
    const result = migrate(oldState)
    assert.equal(result.user.role, "admin")
    assert.ok(result.user.permisos.includes("reportes.asignar"))
    assert.equal(result.user.id, "same-id")
    assert.equal(result.token, "keep-token")
    assert.equal(result.theme, "dark")
  }
  const technician = { user: { role: "tecnico", permisos: ["reportes.editar"] } }
  assert.deepEqual(migrate(technician), technician)
})

const createBody = { tipoTareaId: "task", descripcion: "Problema", areaId: "area", usuarioNombre: "Nombre", usuarioCorreo: "test@example.invalid" }
for (const [key, method, body, permission, success] of [
  ["collection", "POST", createBody, "reportes.crear", 201],
  ["report", "PATCH", { descripcion: "Cambio" }, "reportes.editar", 200],
  ["report", "DELETE", undefined, "reportes.eliminar", 200],
  ["state", "POST", { estado: "resuelto" }, "reportes.cambiar_estado", 200],
]) {
  test(`${method} ${key}: rechaza sin sesión o permiso antes de escribir`, async () => {
    for (const [options, expected] of [[{ authenticated: false }, 401], [{ permisos: "[]" }, 403]]) {
      const app = await setup(options)
      assert.equal((await app.call(key, method, body)).status, expected)
      assert.deepEqual(app.writes, [])
    }
  })
  test(`${method} ${key}: admite admin y auditor con el permiso explícito`, async () => {
    for (const options of [{ role: "admin", permisos: "[]" }, { role: "auditor", permisos: JSON.stringify([permission]) }]) {
      const app = await setup(options)
      assert.equal((await app.call(key, method, body)).status, success)
      assert.equal(app.writes.length, 1)
    }
  })
  if (key !== "collection") test(`${method} ${key}: exige relación con el reporte salvo acceso global`, async () => {
    for (const [extra, expected] of [[[], 403], [["reportes.ver_todos"], success]]) {
      const app = await setup({ own: false, permisos: JSON.stringify([permission, ...extra]) })
      assert.equal((await app.call(key, method, body)).status, expected)
      assert.equal(app.writes.length, expected === success ? 1 : 0)
    }
  })
}

for (const [key, method, body, permission] of [
  ["collection", "POST", createBody, "reportes.crear"],
  ["report", "PATCH", {}, "reportes.editar"],
  ["state", "POST", { estado: "en_proceso" }, "reportes.cambiar_estado"],
]) {
  test(`${method} ${key}: asignación explícita requiere permiso y nunca se ignora`, async () => {
    for (const tecnicoAsignadoId of ["new-tech", null]) {
      const denied = await setup({ permisos: JSON.stringify([permission]) })
      assert.equal((await denied.call(key, method, { ...body, tecnicoAsignadoId })).status, 403)
      assert.deepEqual(denied.writes, [])
      for (const options of [{ role: "admin", permisos: "[]" }, { permisos: JSON.stringify([permission, "reportes.asignar"]) }]) {
        const allowed = await setup(options)
        assert.ok((await allowed.call(key, method, { ...body, tecnicoAsignadoId })).status < 300)
        assert.equal(allowed.writes[0].tecnicoAsignadoId, tecnicoAsignadoId)
      }
    }
  })
}

test("cerrar un reporte resuelto conserva su fecha y tiempo de resolución", async () => {
  const fechaCreacion = new Date("2026-11-16T09:00:00Z")
  const fechaResolucion = new Date("2026-11-16T11:00:00Z")
  const app = await setup({ reporte: { estado: "resuelto", fechaCreacion, fechaResolucion } })
  assert.equal((await app.call("state", "POST", { estado: "cerrado" })).status, 200)
  assert.equal(app.writes[0].estado, "cerrado")
  assert.equal(app.writes[0].fechaResolucion.getTime(), fechaResolucion.getTime())
  assert.equal((app.writes[0].fechaResolucion - fechaCreacion) / 3_600_000, 2)
})

test("resolver o cerrar sin fecha de resolución registra la fecha actual", async () => {
  for (const estado of ["resuelto", "cerrado"]) {
    const app = await setup({ reporte: { fechaResolucion: null } })
    const inicio = Date.now()
    assert.equal((await app.call("state", "POST", { estado })).status, 200)
    const fecha = app.writes[0].fechaResolucion.getTime()
    assert.ok(fecha >= inicio && fecha <= Date.now())
  }
})

test("reabrir un reporte elimina la fecha de resolución", async () => {
  for (const estado of ["pendiente", "en_proceso"]) {
    const app = await setup({ reporte: { estado: "resuelto", fechaResolucion: new Date("2026-11-16T11:00:00Z") } })
    assert.equal((await app.call("state", "POST", { estado })).status, 200)
    assert.equal(app.writes[0].fechaResolucion, null)
  }
})

test("la búsqueda conserva la visibilidad y respeta reportes.ver_todos", async () => {
  const app = await setup()
  const response = await app.call("collection", "GET", undefined, "?q=impresora")
  assert.equal(response.body.total, 1)
  assert.equal(response.body.items[0].id, "report")
  const global = await setup({ permisos: '["reportes.ver_todos"]' })
  assert.equal((await global.call("collection", "GET", undefined, "?q=impresora")).body.total, 2)
})

for (const [key, method, body] of [
  ["users", "POST", { username: "new", email: "new@example.invalid", name: "Nuevo", password: "StrongPass2026!" }],
  ["user", "PATCH", {}],
]) {
  test(`${method} ${key}: solo admin crea o asigna admin; rechaza roles retirados`, async () => {
    const admin = await setup({ role: "admin" })
    assert.ok((await admin.call(key, method, { ...body, role: "admin" })).status < 300)
    assert.equal(admin.writes[0].role, "admin")
    assert.equal(admin.writes[0].permisos, null)
    const manager = await setup({ permisos: '["usuarios.gestionar"]' })
    assert.equal((await manager.call(key, method, { ...body, role: "admin" })).status, 403)
    assert.deepEqual(manager.writes, [])
    const legacy = await setup({ role: "admin" })
    assert.equal((await legacy.call(key, method, { ...body, role: "superadmin" })).status, 400)
    assert.deepEqual(legacy.writes, [])
  })
}
