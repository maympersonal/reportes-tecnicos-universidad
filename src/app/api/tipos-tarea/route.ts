import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

export async function GET() {
  const items = await db.tipoTarea.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  })
  return NextResponse.json({
    items: items.map((t) => ({ id: t.id, codigo: t.codigo, nombre: t.nombre })),
  })
}

// Crear nuevo tipo de tarea (solo admin)
export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  const { nombre } = await req.json()
  if (!nombre) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
  const codigo = String(nombre)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
  const created = await db.tipoTarea.create({
    data: { codigo, nombre: String(nombre), activo: true, creadoPorId: user.id },
  })
  return NextResponse.json({ item: created })
}
