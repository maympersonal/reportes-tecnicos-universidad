import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest, verifyPassword, hashPassword, validarPassword } from "@/lib/auth"

// PATCH /api/auth/me/password — cambia la propia contraseña
// Body: { actual, nueva }
export async function PATCH(req: NextRequest) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { actual, nueva } = await req.json()
  if (!actual || !nueva) return NextResponse.json({ error: "Contraseña actual y nueva son obligatorias" }, { status: 400 })
  const user = await db.user.findUnique({ where: { id: me.id } })
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!verifyPassword(String(actual), user.password)) {
    return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 })
  }
  const val = validarPassword(String(nueva))
  if (!val.ok) {
    return NextResponse.json({ error: "Contraseña nueva débil", reglas: val.reglas }, { status: 400 })
  }
  await db.user.update({ where: { id: me.id }, data: { password: hashPassword(String(nueva)) } })
  // Invalidar otras sesiones (opcional): mantenemos la actual
  return NextResponse.json({ ok: true })
}
