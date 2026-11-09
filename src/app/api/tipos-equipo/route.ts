import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest, tienePermiso } from "@/lib/auth"
import { ensureBootstrap } from "@/lib/bootstrap"

// GET /api/tipos-equipo
export async function GET(req: NextRequest) {
  await ensureBootstrap()
  const items = await db.tipoEquipo.findMany({ orderBy: { nombre: "asc" } })
  return NextResponse.json({ items: items.map((t) => ({ id: t.id, nombre: t.nombre })) })
}

// POST /api/tipos-equipo — crear nuevo tipo de equipo (requiere reportes.crear o catalogos.gestionar)
export async function POST(req: NextRequest) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!tienePermiso(me, "reportes.crear") && !tienePermiso(me, "catalogos.gestionar")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  const { nombre } = await req.json()
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
  const n = String(nombre).trim()
  const dup = await db.tipoEquipo.findUnique({ where: { nombre: n } })
  if (dup) return NextResponse.json({ item: { id: dup.id, nombre: dup.nombre } })
  const created = await db.tipoEquipo.create({ data: { nombre: n, creadoPorId: me.id } })
  return NextResponse.json({ item: { id: created.id, nombre: created.nombre } }, { status: 201 })
}
