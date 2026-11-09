import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

// POST /api/notificaciones/marcar-leidas — marca todas como leídas
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  await db.notificacion.updateMany({
    where: { usuarioId: user.id, leida: false },
    data: { leida: true },
  })
  return NextResponse.json({ ok: true })
}
