import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

// DELETE /api/reportes/{id}/eliminar-archivo/{aid}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; aid: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, aid } = await ctx.params
  const r = await db.reporte.findUnique({ where: { id } })
  if (!r) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (user.role === "auditor") {
    return NextResponse.json({ error: "El auditor no puede eliminar archivos" }, { status: 403 })
  }
  if (user.role === "tecnico" && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  await db.archivoReporte.delete({ where: { id: aid } }).catch(() => null)
  // Borrar el archivo físico
  try {
    const ar = await db.archivoReporte.findUnique({ where: { id: aid } })
    if (ar) {
      const fs = await import("fs/promises")
      await fs.unlink(`${process.cwd()}/public${ar.archivo}`).catch(() => {})
    }
  } catch { /* ignore */ }
  return NextResponse.json({ ok: true })
}
