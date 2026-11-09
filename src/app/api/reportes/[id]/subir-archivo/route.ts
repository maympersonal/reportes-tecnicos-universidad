import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { serializeReporte } from "@/lib/serialize"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { randomBytes } from "crypto"

// POST /api/reportes/{id}/subir-archivo (multipart/form-data: file)
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await ctx.params

  const r = await db.reporte.findUnique({ where: { id } })
  if (!r) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (user.role === "auditor") {
    return NextResponse.json({ error: "El auditor no puede subir archivos" }, { status: 403 })
  }
  if (user.role === "tecnico" && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo no recibido" }, { status: 400 })
  }

  // Limitar tamaño (~10MB)
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo excede 10MB" }, { status: 413 })
  }

  const ext = path.extname(file.name) || ""
  const nombre = `${randomBytes(8).toString("hex")}${ext}`
  const uploadDir = path.join(process.cwd(), "public", "uploads")
  await mkdir(uploadDir, { recursive: true })
  const rutaFisica = path.join(uploadDir, nombre)
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(rutaFisica, buf)

  const ar = await db.archivoReporte.create({
    data: {
      reporteId: id,
      archivo: `/uploads/${nombre}`,
      nombre: file.name,
      tipo: file.type || null,
      subidoPorId: user.id,
    },
  })

  const updated = await db.reporte.findUnique({
    where: { id },
    include: {
      tipoTarea: true,
      area: true,
      tecnicoAsignado: true,
      creadoPor: true,
      equipos: true,
      archivos: true,
      historial: { include: { usuario: true }, orderBy: { fecha: "asc" } },
    },
  })
  if (!updated) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  console.log(`[upload] ${ar.nombre} -> ${ar.archivo}`)
  return NextResponse.json({ item: serializeReporte(updated) })
}
