import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { visibilityWhere } from "@/lib/stats"

// GET /api/estadisticas/por-mes — serie mensual de los últimos 6 meses
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const where = visibilityWhere(user)

  const now = new Date()
  const meses: { label: string; key: string; total: number; resueltos: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const inicio = new Date(d.getFullYear(), d.getMonth(), 1)
    const fin = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const [total, resueltos] = await Promise.all([
      db.reporte.count({ where: { ...where, fechaCreacion: { gte: inicio, lt: fin } } }),
      db.reporte.count({ where: { ...where, estado: { in: ["resuelto", "cerrado"] }, fechaCreacion: { gte: inicio, lt: fin } } }),
    ])
    const label = d.toLocaleDateString("es-ES", { month: "short" })
    meses.push({ label: label.charAt(0).toUpperCase() + label.slice(1), key: `${d.getFullYear()}-${d.getMonth() + 1}`, total, resueltos })
  }
  return NextResponse.json({ items: meses })
}
