import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
  const areaId = req.nextUrl.searchParams.get("area") ?? undefined
  const items = await db.ubicacion.findMany({
    where: areaId ? { areaId } : undefined,
    include: { area: true },
    orderBy: { nombre: "asc" },
  })
  return NextResponse.json({
    items: items.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      areaId: u.areaId,
      areaNombre: u.area?.nombre ?? null,
      edificio: u.edificio,
      piso: u.piso,
      referencia: u.referencia,
    })),
  })
}
