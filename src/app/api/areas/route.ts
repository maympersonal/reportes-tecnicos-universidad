import { NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET() {
  const items = await db.area.findMany({
    include: { tipoArea: true },
    where: { activo: true },
    orderBy: { nombre: "asc" },
  })
  return NextResponse.json({
    items: items.map((a) => ({
      id: a.id,
      nombre: a.nombre,
      tipoAreaId: a.tipoAreaId,
      tipoAreaNombre: a.tipoArea?.nombre ?? null,
      responsable: a.responsable,
    })),
  })
}
