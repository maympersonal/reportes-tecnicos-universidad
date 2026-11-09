import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

// GET /api/notificaciones — lista del usuario (todas)
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const items = await db.notificacion.findMany({
    where: { usuarioId: user.id },
    orderBy: { fecha: "desc" },
    take: 50,
  })
  return NextResponse.json({
    items: items.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      titulo: n.titulo,
      mensaje: n.mensaje,
      reporteId: n.reporteId,
      leida: n.leida,
      fecha: n.fecha.toISOString(),
    })),
  })
}
