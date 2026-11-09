import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { visibilityWhere, dateWhere } from "@/lib/stats"

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const sp = req.nextUrl.searchParams
  const where = { ...visibilityWhere(user), ...dateWhere(sp.get("desde"), sp.get("hasta")) }

  const tecnicos = await db.user.findMany({
    where: { role: "tecnico", activo: true },
    include: {
      reportesAsignados: {
        where,
        select: { estado: true, fechaCreacion: true, fechaResolucion: true },
      },
    },
  })

  const items = tecnicos.map((t) => {
    const asignados = t.reportesAsignados.length
    const resueltos = t.reportesAsignados.filter((r) => r.estado === "resuelto" || r.estado === "cerrado").length
    const tiempos = t.reportesAsignados
      .filter((r) => r.fechaResolucion)
      .map((r) => (r.fechaResolucion!.getTime() - r.fechaCreacion.getTime()) / 3_600_000)
    const tiempoProm = tiempos.length ? Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10 : null
    return { name: t.name, asignados, resueltos, tiempoProm }
  }).sort((a, b) => b.asignados - a.asignados)

  return NextResponse.json({ items })
}
