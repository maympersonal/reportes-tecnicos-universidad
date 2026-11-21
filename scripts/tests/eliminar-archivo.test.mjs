// Node >= 22.13: node --experimental-vm-modules scripts/tests/eliminar-archivo.test.mjs
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { stripTypeScriptTypes } from "node:module"
import test from "node:test"
import { SourceTextModule, SyntheticModule } from "node:vm"

const root = new URL("../../", import.meta.url)
const sources = await Promise.all([
  "src/app/api/reportes/[id]/eliminar-archivo/[aid]/route.ts",
  "src/lib/auth.ts",
  "src/lib/constants.ts",
].map(async (path) => stripTypeScriptTypes(await readFile(new URL(path, root), "utf8"))))

async function run({ role = "tecnico", permisos = null, relation = "creator", authenticated = true,
  reportExists = true, attachmentReport = "report-a", attachmentExists = true,
  databaseError, fileError } = {}) {
  const attachments = attachmentExists
    ? [{ id: "attachment", reporteId: attachmentReport, archivo: "/uploads/photo.jpg" }]
    : []
  const deletedFiles = []
  const user = { id: "user", role, permisos, activo: true }
  const db = {
    session: { findUnique: async () => authenticated
      ? { user, expiresAt: new Date(Date.now() + 60_000) } : null },
    reporte: { findUnique: async () => reportExists ? {
      id: "report-a",
      creadoPorId: relation === "creator" ? "user" : "other",
      tecnicoAsignadoId: relation === "assigned" ? "user" : "other",
    } : null },
    archivoReporte: {
      delete: async ({ where }) => {
        if (databaseError) throw databaseError
        const index = attachments.findIndex((item) =>
          Object.entries(where).every(([key, value]) => item[key] === value))
        if (index < 0) throw Object.assign(new Error("Record not found"), { code: "P2025" })
        return attachments.splice(index, 1)[0]
      },
    },
  }
  function mock(exports) {
    return new SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
    })
  }
  const modules = {
    "next/server": mock({ NextRequest: Request, NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } }),
    "@/lib/db": mock({ db }),
    "@/lib/auth": new SourceTextModule(sources[1]),
    "@/lib/constants": new SourceTextModule(sources[2]),
    crypto: mock({ randomBytes() {}, scryptSync() {}, timingSafeEqual() {} }),
    "fs/promises": mock({ unlink: async (path) => {
      if (fileError) throw fileError
      deletedFiles.push(path)
    } }),
  }
  const route = new SourceTextModule(sources[0], {
    importModuleDynamically: async (specifier) => {
      const module = modules[specifier]
      await module.link(() => { throw new Error("Unexpected dependency") })
      await module.evaluate()
      return module
    },
  })
  await route.link((specifier) => {
    assert.ok(modules[specifier], `Unexpected import: ${specifier}`)
    return modules[specifier]
  })
  await route.evaluate()
  const response = await route.namespace.DELETE(
    new Request("http://localhost/", { headers: { authorization: "Bearer test-token" } }),
    { params: Promise.resolve({ id: "report-a", aid: "attachment" }) },
  )
  return { response, attachments, deletedFiles }
}

for (const [name, options, status] of [
  ["sin sesión", { authenticated: false }, 401],
  ["reporte inexistente", { reportExists: false }, 404],
  ["auditor", { role: "auditor" }, 403],
  ["técnico ajeno al reporte", { relation: "unrelated" }, 403],
  ["técnico sin permiso de edición", { permisos: "[]" }, 403],
  ["rol desconocido", { role: "unknown" }, 403],
  ["adjunto de otro reporte", { attachmentReport: "report-b" }, 404],
  ["administrador con adjunto de otro reporte", { role: "admin", attachmentReport: "report-b" }, 404],
  ["adjunto inexistente", { attachmentExists: false }, 404],
]) {
  test(`Rechaza ${name} sin borrar registros ni archivos`, async () => {
    const result = await run(options)
    assert.equal(result.response.status, status)
    assert.equal(result.attachments.length, options.attachmentExists === false ? 0 : 1)
    assert.deepEqual(result.deletedFiles, [])
  })
}

for (const [name, options] of [
  ["técnico creador", {}],
  ["técnico asignado", { relation: "assigned" }],
  ["administrador", { role: "admin", relation: "unrelated" }],
  ["administrador con override vacío", { role: "admin", relation: "unrelated", permisos: "[]" }],
  ["auditor con permiso personalizado", { role: "auditor", permisos: '["reportes.editar"]' }],
  ["sesión del antiguo superadministrador", { role: "superadmin", relation: "unrelated", permisos: "[]" }],
]) {
  test(`Permite ${name} y elimina el archivo físico`, async () => {
    const result = await run(options)
    assert.equal(result.response.status, 200)
    assert.equal(result.attachments.length, 0)
    assert.deepEqual(result.deletedFiles, [`${process.cwd()}/public/uploads/photo.jpg`])
  })
}

test("No oculta errores inesperados de la base de datos", async () => {
  const error = new Error("Database unavailable")
  await assert.rejects(run({ databaseError: error }), (actual) => actual === error)
})

test("Tolera un archivo físico que ya no existe", async () => {
  const result = await run({ fileError: Object.assign(new Error("Missing file"), { code: "ENOENT" }) })
  assert.equal(result.response.status, 200)
  assert.equal(result.attachments.length, 0)
})

test("Informa un fallo al eliminar el archivo físico", async () => {
  const result = await run({ fileError: Object.assign(new Error("Permission denied"), { code: "EACCES" }) })
  assert.equal(result.response.status, 500)
})
