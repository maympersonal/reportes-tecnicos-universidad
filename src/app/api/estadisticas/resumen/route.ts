import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { visibilityWhere, dateWhere } from "@/lib/stats"

// GET /api/estadisticas/resumen
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const sp = req.nextUrl.searchParams
  const desde = sp.get("desde")
  const hasta = sp.get("hasta")
  const where = { ...visibilityWhere(user), ...dateWhere(desde, hasta) }

  const [total, pendientes, enProceso, resueltos, cerrados, criticos, tiempoRows] = await Promise.all([
    db.reporte.count({ where }),
    db.reporte.count({ where: { ...where, estado: "pendiente" } }),
    db.reporte.count({ where: { ...where, estado: "en_proceso" } }),
    db.reporte.count({ where: { ...where, estado: "resuelto" } }),
    db.reporte.count({ where: { ...where, estado: "cerrado" } }),
    db.reporte.count({ where: { ...where, prioridad: "critica", estado: { in: ["pendiente", "en_proceso"] } } }),
    db.reporte.findMany({ where: { ...where, estado: { in: ["resuelto", "cerrado"] } }, select: { fechaCreacion: true, fechaResolucion: true } }),
  ])

  const tiempos = tiempoRows
    .filter((r) => r.fechaResolucion)
    .map((r) => (r.fechaResolucion!.getTime() - r.fechaCreacion.getTime()) / 3_600_000)
  const tiempoProm = tiempos.length ? Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10 : 0

  // Índice de salud: % resueltos + cerrados ponderado, penalizado por críticos abiertos
  const resueltosCerrados = resueltos + cerrados
  const tasaResolucion = total > 0 ? Math.round((resueltosCerrados / total) * 100) : 0
  const salud = Math.max(0, Math.min(100, Math.round(tasaResolucion - criticos * 5)))

  const activos = pendientes + enProceso

  return NextResponse.json({
    total,
    pendientes,
    enProceso,
    resueltos,
    cerrados,
    criticos,
    tiempoProm,
    activos,
    tasaResolucion,
    salud,
  })
}
