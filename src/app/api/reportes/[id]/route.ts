import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest, tienePermiso } from "@/lib/auth"
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
  if (!tienePermiso(user, "reportes.ver_todos") && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
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

  // Permiso de edición
  if (!tienePermiso(user, "reportes.editar")) {
    return NextResponse.json({ error: "Sin permiso para editar reportes" }, { status: 403 })
  }
  // Sin acceso global: solo reportes propios o asignados
  if (!tienePermiso(user, "reportes.ver_todos") && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
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
  // Reasignación autorizada por permiso
  if (tecnicoAsignadoId !== undefined) {
    if (!tienePermiso(user, "reportes.asignar")) {
      return NextResponse.json({ error: "Sin permiso para asignar técnicos" }, { status: 403 })
    }
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

// DELETE /api/reportes/{id} — requiere permiso de eliminación
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!tienePermiso(user, "reportes.eliminar")) {
    return NextResponse.json({ error: "Sin permiso para eliminar reportes" }, { status: 403 })
  }
  const { id } = await ctx.params
  const r = await db.reporte.findUnique({ where: { id } })
  if (!r) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (!tienePermiso(user, "reportes.ver_todos") && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  await db.reporte.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
