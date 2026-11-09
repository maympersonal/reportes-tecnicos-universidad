import { NextResponse } from "next/server"
import { db } from "@/lib/db"

// Usuarios con rol técnico (para asignar reportes)
export async function GET() {
  const items = await db.user.findMany({
    where: { role: "tecnico", activo: true },
    orderBy: { name: "asc" },
  })
  return NextResponse.json({
    items: items.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      cargo: u.cargo,
      email: u.email,
    })),
  })
}
