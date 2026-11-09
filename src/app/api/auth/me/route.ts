import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

// GET /api/auth/me — datos del usuario actual
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const area = user.areaId ? await db.area.findUnique({ where: { id: user.areaId } }) : null
  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name,
      role: user.role,
      cargo: user.cargo,
      telefono: user.telefono,
      areaId: user.areaId,
      areaNombre: area?.nombre ?? null,
    },
  })
}
