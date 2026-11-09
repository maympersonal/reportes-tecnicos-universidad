import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { serializeReporte } from "@/lib/serialize"

// POST /api/reportes/{id}/cambiar-estado
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await ctx.params

  const r = await db.reporte.findUnique({ where: { id } })
  if (!r) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  if (user.role === "auditor") {
    return NextResponse.json({ error: "El auditor no puede cambiar estados" }, { status: 403 })
  }
  if (user.role === "tecnico" && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const { estado, comentario, solucion, tecnicoAsignadoId } = body as Record<string, unknown>
  if (!estado) return NextResponse.json({ error: "Estado requerido" }, { status: 400 })

  const estadosValidos = ["pendiente", "en_proceso", "resuelto", "cerrado"]
  if (!estadosValidos.includes(String(estado))) {
    return NextResponse.json({ error: "Estado inválido" }, { status: 400 })
  }

  const estadoAnterior = r.estado
  const data: Record<string, unknown> = { estado: String(estado) }
  if (solucion !== undefined) data.solucion = solucion
  if (user.role === "admin" && tecnicoAsignadoId !== undefined) {
    data.tecnicoAsignadoId = tecnicoAsignadoId || null
  }
  // Si pasa a resuelto/cerrado, guardar fechaResolucion
  if (String(estado) === "resuelto" || String(estado) === "cerrado") {
    data.fechaResolucion = new Date()
    if (solucion) data.solucion = solucion
  } else {
    data.fechaResolucion = null
  }

  await db.reporte.update({ where: { id }, data })

  // Historial
  await db.historialEstado.create({
    data: {
      reporteId: id,
      estadoAnterior,
      estadoNuevo: String(estado),
      comentario: comentario ? String(comentario) : null,
      usuarioId: user.id,
    },
  })

  // Notificaciones al creador y al técnico (si no es el mismo que actuó)
  const dest = new Set<string>()
  if (r.creadoPorId && r.creadoPorId !== user.id) dest.add(r.creadoPorId)
  const tec = data.tecnicoAsignadoId ? String(data.tecnicoAsignadoId) : r.tecnicoAsignadoId
  if (tec && tec !== user.id) dest.add(tec)
  if (dest.size > 0) {
    await db.notificacion.createMany({
      data: [...dest].map((uid) => ({
        usuarioId: uid,
        tipo: "cambio_estado",
        titulo: `Reporte ${r.codigo}: ${estado}`,
        mensaje: comentario ? String(comentario).slice(0, 200) : `${user.name} actualizó el estado`,
        reporteId: id,
      })),
    })
  }

  const updated = await db.reporte.findUnique({
    where: { id },
    include: {
      tipoTarea: true,
      area: true,
      tecnicoAsignado: true,
      creadoPor: true,
      equipos: true,
      archivos: true,
      historial: { include: { usuario: true }, orderBy: { fecha: "asc" } },
    },
  })
  if (!updated) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json({ item: serializeReporte(updated) })
}
