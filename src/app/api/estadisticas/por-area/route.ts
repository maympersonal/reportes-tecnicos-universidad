import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { visibilityWhere, dateWhere } from "@/lib/stats"

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const sp = req.nextUrl.searchParams
  const where = { ...visibilityWhere(user), ...dateWhere(sp.get("desde"), sp.get("hasta")) }
  const rows = await db.reporte.groupBy({
    by: ["areaId"],
    where,
    _count: true,
  })
  const areas = await db.area.findMany()
  const map = new Map(areas.map((a) => [a.id, a.nombre]))
  const items = rows
    .map((r) => ({ name: map.get(r.areaId) ?? "Sin área", value: r._count }))
    .sort((a, b) => b.value - a.value)
  return NextResponse.json({ items })
}
