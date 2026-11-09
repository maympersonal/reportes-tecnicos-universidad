import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { serializeReporte } from "@/lib/serialize"

// GET /api/reportes/{id}
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await ctx.params

  const r = await db.reporte.findUnique({
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
  if (!r) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  // Visibilidad
  if (user.role === "tecnico" && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  return NextResponse.json({ item: serializeReporte(r) })
}

// PATCH /api/reportes/{id}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await ctx.params

  const r = await db.reporte.findUnique({ where: { id } })
  if (!r) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  // Auditor no edita
  if (user.role === "auditor") {
    return NextResponse.json({ error: "El auditor no puede editar" }, { status: 403 })
  }
  // Técnico: solo sus reportes
  if (user.role === "tecnico" && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const body = await req.json()
  const {
    tipoTareaId,
    descripcion,
    solucion,
    areaId,
    ubicacion,
    usuarioNombre,
    usuarioCorreo,
    usuarioCargo,
    prioridad,
    tecnicoAsignadoId,
    equipos,
  } = body as Record<string, unknown>

  const data: Record<string, unknown> = {}
  if (tipoTareaId !== undefined) data.tipoTareaId = tipoTareaId
  if (descripcion !== undefined) data.descripcion = descripcion
  if (solucion !== undefined) data.solucion = solucion
  if (areaId !== undefined) data.areaId = areaId
  if (ubicacion !== undefined) data.ubicacion = ubicacion
  if (usuarioNombre !== undefined) data.usuarioNombre = usuarioNombre
  if (usuarioCorreo !== undefined) data.usuarioCorreo = usuarioCorreo
  if (usuarioCargo !== undefined) data.usuarioCargo = usuarioCargo
  if (prioridad !== undefined) data.prioridad = prioridad
  // Solo admin puede reasignar técnico
  if (tecnicoAsignadoId !== undefined && user.role === "admin") {
    data.tecnicoAsignadoId = tecnicoAsignadoId || null
  }

  const updated = await db.reporte.update({
    where: { id },
    data,
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

  // Si se actualizaron equipos, reemplazar
  if (Array.isArray(equipos)) {
    await db.equipoReporte.deleteMany({ where: { reporteId: id } })
    if (equipos.length > 0) {
      await db.equipoReporte.createMany({
        data: equipos.map((e: Record<string, unknown>) => ({
          reporteId: id,
          tipoEquipoId: (e.tipoEquipoId as string) || null,
          tipoTexto: (e.tipoTexto as string) || null,
          codigoActivo: (e.codigoActivo as string) || null,
          marca: (e.marca as string) || null,
          modelo: (e.modelo as string) || null,
          serie: (e.serie as string) || null,
        })),
      })
    }
    // recargar
    const reloaded = await db.reporte.findUnique({
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
    if (reloaded) return NextResponse.json({ item: serializeReporte(reloaded) })
  }

  return NextResponse.json({ item: serializeReporte(updated) })
}

// DELETE /api/reportes/{id} — solo admin
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Solo el administrador puede eliminar" }, { status: 403 })
  }
  const { id } = await ctx.params
  await db.reporte.delete({ where: { id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
