import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { serializeReporteLite } from "@/lib/serialize"

// GET /api/reportes — listado con filtros y paginación
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const q = sp.get("q")?.trim() || undefined
  const estado = sp.get("estado") || undefined
  const prioridad = sp.get("prioridad") || undefined
  const tipoTarea = sp.get("tipoTarea") || undefined
  const area = sp.get("area") || undefined
  const tecnico = sp.get("tecnico") || undefined
  const desde = sp.get("desde") || undefined
  const hasta = sp.get("hasta") || undefined
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "10", 10)))

  // Filtro de visibilidad por rol
  let vis: Record<string, unknown> = {}
  if (user.role === "tecnico") {
    vis = {
      OR: [{ creadoPorId: user.id }, { tecnicoAsignadoId: user.id }],
    }
  }

  const where: Record<string, unknown> = { ...vis }
  if (estado) where.estado = estado
  if (prioridad) where.prioridad = prioridad
  if (tipoTarea) where.tipoTareaId = tipoTarea
  if (area) where.areaId = area
  if (tecnico) where.tecnicoAsignadoId = tecnico
  if (desde || hasta) {
    where.fechaCreacion = {
      ...(desde ? { gte: new Date(desde) } : {}),
      ...(hasta ? { lte: new Date(hasta + "T23:59:59") } : {}),
    }
  }
  if (q) {
    where.OR = [
      { codigo: { contains: q } },
      { descripcion: { contains: q } },
      { usuarioNombre: { contains: q } },
      { usuarioCorreo: { contains: q } },
    ]
  }

  const [total, rows] = await Promise.all([
    db.reporte.count({ where }),
    db.reporte.findMany({
      where,
      include: { tipoTarea: true, area: true, tecnicoAsignado: true, creadoPor: true },
      orderBy: { fechaCreacion: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])

  return NextResponse.json({
    items: rows.map(serializeReporteLite),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
}

// POST /api/reportes — crear reporte
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (user.role === "auditor") {
    return NextResponse.json({ error: "El auditor no puede crear reportes" }, { status: 403 })
  }

  const body = await req.json()
  const {
    tipoTareaId,
    descripcion,
    areaId,
    ubicacion,
    usuarioNombre,
    usuarioCorreo,
    usuarioCargo,
    prioridad = "media",
    tecnicoAsignadoId,
    equipos = [],
  } = body as Record<string, unknown>

  if (!tipoTareaId || !descripcion || !areaId || !usuarioNombre || !usuarioCorreo) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios (tipo, descripción, área, usuario)" },
      { status: 400 }
    )
  }

  // Generar código RPT-YYYY-XXXX
  const year = new Date().getFullYear()
  const count = await db.reporte.count()
  const codigo = `RPT-${year}-${String(count + 1).padStart(4, "0")}`

  // Solo admin puede asignar técnico
  const tecnicoId = user.role === "admin" && tecnicoAsignadoId ? String(tecnicoAsignadoId) : null

  const reporte = await db.reporte.create({
    data: {
      codigo,
      tipoTareaId: String(tipoTareaId),
      descripcion: String(descripcion),
      areaId: String(areaId),
      ubicacion: ubicacion ? String(ubicacion) : null,
      usuarioNombre: String(usuarioNombre),
      usuarioCorreo: String(usuarioCorreo),
      usuarioCargo: usuarioCargo ? String(usuarioCargo) : null,
      prioridad: String(prioridad),
      estado: "pendiente",
      creadoPorId: user.id,
      tecnicoAsignadoId: tecnicoId,
      equipos: Array.isArray(equipos) && equipos.length > 0
        ? { create: (equipos as Record<string, unknown>[]).map((e) => ({
            tipoEquipoId: (e.tipoEquipoId as string) || null,
            tipoTexto: (e.tipoTexto as string) || null,
            codigoActivo: (e.codigoActivo as string) || null,
            marca: (e.marca as string) || null,
            modelo: (e.modelo as string) || null,
            serie: (e.serie as string) || null,
          })) }
        : undefined,
    },
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

  // Historial inicial
  await db.historialEstado.create({
    data: {
      reporteId: reporte.id,
      estadoAnterior: null,
      estadoNuevo: "pendiente",
      comentario: "Reporte creado",
      usuarioId: user.id,
    },
  })

  // Notificaciones: a todos los administradores + técnico asignado (si hay)
  const admins = await db.user.findMany({ where: { role: "admin", activo: true } })
  const dest = new Set<string>(admins.map((a) => a.id))
  if (tecnicoId) dest.add(tecnicoId)
  // No notificarse a uno mismo
  dest.delete(user.id)
  if (dest.size > 0) {
    await db.notificacion.createMany({
      data: [...dest].map((uid) => ({
        usuarioId: uid,
        tipo: "nuevo_reporte",
        titulo: "Nuevo reporte creado",
        mensaje: `${user.name} creó el reporte ${codigo}`,
        reporteId: reporte.id,
      })),
    })
  }

  const { serializeReporte } = await import("@/lib/serialize")
  return NextResponse.json({ item: serializeReporte(reporte) }, { status: 201 })
}
