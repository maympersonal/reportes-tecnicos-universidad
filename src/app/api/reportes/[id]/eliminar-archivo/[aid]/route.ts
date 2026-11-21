import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest, tienePermiso } from "@/lib/auth"

// DELETE /api/reportes/{id}/eliminar-archivo/{aid}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string; aid: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id, aid } = await ctx.params
  const r = await db.reporte.findUnique({ where: { id } })
  if (!r) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (!tienePermiso(user, "reportes.editar")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  if (!tienePermiso(user, "reportes.ver_todos") && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }
  // El borrado exige que el adjunto pertenezca al reporte autorizado.
  // Conservamos el registro devuelto para conocer la ruta del archivo físico.
  const ar = await db.archivoReporte.delete({ where: { id: aid, reporteId: id } }).catch((error) => {
    if (error.code === "P2025") return null
    throw error
  })
  if (!ar) return NextResponse.json({ error: "Adjunto no encontrado en este reporte" }, { status: 404 })

  try {
    const fs = await import("fs/promises")
    await fs.unlink(`${process.cwd()}/public${ar.archivo}`)
  } catch (error) {
    // Si ya no existe, la eliminación también se considera completada.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("No se pudo eliminar el archivo físico del adjunto", error)
      return NextResponse.json({ error: "No se pudo eliminar el archivo físico" }, { status: 500 })
    }
  }
  return NextResponse.json({ ok: true })
}
