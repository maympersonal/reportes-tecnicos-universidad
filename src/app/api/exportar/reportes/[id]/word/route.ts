import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { INSTITUCION } from "@/lib/constants"

function fmtFecha(d: Date | null) {
  return d ? d.toISOString().slice(0, 16).replace("T", " ") : "—"
}

function esc(s: string | null | undefined) {
  return (s ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// GET /api/exportar/reportes/{id}/word — HTML-as-doc
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await ctx.params
  const r = await db.reporte.findUnique({
    where: { id },
    include: {
      tipoTarea: true, area: true, tecnicoAsignado: true, creadoPor: true,
      equipos: true, archivos: true,
      historial: { include: { usuario: true }, orderBy: { fecha: "asc" } },
    },
  })
  if (!r) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (user.role === "tecnico" && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const equiposRows = r.equipos.length
    ? r.equipos.map((e) => `<tr><td>${esc(e.codigoActivo)}</td><td>${esc(e.marca)}</td><td>${esc(e.modelo)}</td><td>${esc(e.serie)}</td></tr>`).join("")
    : `<tr><td colspan="4">Sin equipos asociados</td></tr>`

  const histRows = r.historial.length
    ? r.historial.map((h) => `<tr><td>${fmtFecha(h.fecha)}</td><td>${esc(h.estadoAnterior)}</td><td>${esc(h.estadoNuevo)}</td><td>${esc(h.usuario?.name)}</td><td>${esc(h.comentario)}</td></tr>`).join("")
    : `<tr><td colspan="5">Sin historial</td></tr>`

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(r.codigo)}</title>
<style>
  body { font-family: 'Calibri', sans-serif; color: #1e293b; margin: 40px; }
  .header { background: #0f172a; color: #fff; padding: 18px 22px; margin-bottom: 20px; }
  .header h1 { margin: 0; font-size: 18px; }
  .header p { margin: 4px 0 0; font-size: 11px; opacity: .85; }
  h2 { border-bottom: 2px solid #0f172a; padding-bottom: 4px; font-size: 14px; margin-top: 26px; }
  table { border-collapse: collapse; width: 100%; font-size: 11px; margin-top: 8px; }
  th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
  th { background: #f1f5f9; }
  .field { font-weight: bold; background:#f8fafc; width: 38%; }
  .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 10px; font-size: 10px; color:#64748b; }
  .sol { white-space: pre-wrap; }
</style></head>
<body>
  <div class="header">
    <h1>${INSTITUCION.sistema}</h1>
    <p>${INSTITUCION.direccion} • ${INSTITUCION.departamento}</p>
    <p>${INSTITUCION.correo}</p>
  </div>
  <h2>Reporte ${esc(r.codigo)}</h2>
  <table>
    <tr><td class="field">Código</td><td>${esc(r.codigo)}</td></tr>
    <tr><td class="field">Tipo de tarea</td><td>${esc(r.tipoTarea?.nombre)}</td></tr>
    <tr><td class="field">Estado</td><td>${esc(r.estado)}</td></tr>
    <tr><td class="field">Prioridad</td><td>${esc(r.prioridad)}</td></tr>
    <tr><td class="field">Área</td><td>${esc(r.area?.nombre)}</td></tr>
    <tr><td class="field">Ubicación</td><td>${esc(r.ubicacion)}</td></tr>
    <tr><td class="field">Usuario afectado</td><td>${esc(r.usuarioNombre)} — ${esc(r.usuarioCargo)}</td></tr>
    <tr><td class="field">Correo del usuario</td><td>${esc(r.usuarioCorreo)}</td></tr>
    <tr><td class="field">Técnico asignado</td><td>${esc(r.tecnicoAsignado?.name) ?? "Sin asignar"}</td></tr>
    <tr><td class="field">Creado por</td><td>${esc(r.creadoPor?.name)}</td></tr>
    <tr><td class="field">Fecha de creación</td><td>${fmtFecha(r.fechaCreacion)}</td></tr>
    <tr><td class="field">Fecha de resolución</td><td>${fmtFecha(r.fechaResolucion)}</td></tr>
  </table>
  <h2>Descripción</h2>
  <div class="sol">${esc(r.descripcion)}</div>
  ${r.solucion ? `<h2>Solución</h2><div class="sol">${esc(r.solucion)}</div>` : ""}
  <h2>Equipos / Activos</h2>
  <table><tr><th>Código</th><th>Marca</th><th>Modelo</th><th>Serie</th></tr>${equiposRows}</table>
  <h2>Historial de estados</h2>
  <table><tr><th>Fecha</th><th>Estado anterior</th><th>Estado nuevo</th><th>Usuario</th><th>Comentario</th></tr>${histRows}</table>
  <div class="footer">
    Documento generado por ${INSTITUCION.sistema} — ${INSTITUCION.direccion}<br>
    Contacto: ${INSTITUCION.correo} • © ${new Date().getFullYear()}
  </div>
</body></html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "application/msword",
      "Content-Disposition": `attachment; filename="${r.codigo}.doc"`,
    },
  })
}
