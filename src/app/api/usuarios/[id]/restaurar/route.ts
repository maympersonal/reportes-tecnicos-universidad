import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest, tienePermiso } from "@/lib/auth"

// PATCH /api/usuarios/{id}/restaurar — reactiva una cuenta dada de baja
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!tienePermiso(me, "usuarios.gestionar")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  const { id } = await ctx.params
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (target.role === "superadmin") {
    return NextResponse.json({ error: "No aplicable a superadmin" }, { status: 403 })
  }
  await db.user.update({ where: { id }, data: { activo: true } })
  return NextResponse.json({ ok: true })
}
