import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { verifyPassword, createSession, publicUser, getUserFromRequest } from "@/lib/auth"
import { ensureBootstrap } from "@/lib/bootstrap"

export async function POST(req: NextRequest) {
  try {
    // Asegura que el superadmin y catálogos existan (idempotente)
    await ensureBootstrap()
    const { username, password } = await req.json()
    if (!username || !password) {
      return NextResponse.json({ error: "Usuario y contraseña son obligatorios" }, { status: 400 })
    }
    const user = await db.user.findUnique({
      where: { username: String(username).toLowerCase() },
    })
    if (!user || !user.activo) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }
    if (!verifyPassword(password, user.password)) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }
    const token = await createSession(user.id)
    return NextResponse.json({ user: publicUser(user), token, debeCambiarPassword: user.role === "superadmin" && password === "SRT-DID-2026!" })
  } catch (e) {
    console.error("[login]", e)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  return NextResponse.json({ user: publicUser(user) })
}

