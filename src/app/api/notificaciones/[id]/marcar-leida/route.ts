import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

// PATCH /api/notificaciones/{id}/marcar-leida
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await ctx.params
  await db.notificacion.updateMany({
    where: { id, usuarioId: user.id },
    data: { leida: true },
  })
  return NextResponse.json({ ok: true })
}
