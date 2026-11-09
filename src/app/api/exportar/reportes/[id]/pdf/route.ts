import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { INSTITUCION } from "@/lib/constants"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

async function getReporte(id: string) {
  return db.reporte.findUnique({
    where: { id },
    include: {
      tipoTarea: true, area: true, tecnicoAsignado: true, creadoPor: true,
      equipos: true, archivos: true,
      historial: { include: { usuario: true }, orderBy: { fecha: "asc" } },
    },
  })
}

function fmtFecha(d: Date | null) {
  return d ? d.toISOString().slice(0, 16).replace("T", " ") : "—"
}

// GET /api/exportar/reportes/{id}/pdf
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await ctx.params
  const r = await getReporte(id)
  if (!r) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (user.role === "tecnico" && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const W = doc.internal.pageSize.getWidth()

  // Encabezado institucional
  doc.setFillColor(15, 23, 42) // slate-900
  doc.rect(0, 0, W, 26, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(INSTITUCION.sistema.toUpperCase(), 14, 12)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.text(INSTITUCION.direccion, 14, 17)
  doc.text(`${INSTITUCION.departamento}  •  ${INSTITUCION.correo}`, 14, 22)

  doc.setTextColor(15, 23, 42)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.text(`Reporte ${r.codigo}`, 14, 38)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(90, 90, 90)
  doc.text(`Generado: ${fmtFecha(new Date())}`, W - 14, 38, { align: "right" })

  // Datos generales
  autoTable(doc, {
    startY: 44,
    head: [["Datos del reporte", ""]],
    body: [
      ["Código", r.codigo],
      ["Tipo de tarea", r.tipoTarea?.nombre ?? "—"],
      ["Estado", r.estado],
      ["Prioridad", r.prioridad],
      ["Área", r.area?.nombre ?? "—"],
      ["Ubicación", r.ubicacion ?? "—"],
      ["Usuario afectado", `${r.usuarioNombre} — ${r.usuarioCargo ?? "—"}`],
      ["Correo del usuario", r.usuarioCorreo],
      ["Técnico asignado", r.tecnicoAsignado?.name ?? "Sin asignar"],
      ["Creado por", r.creadoPor?.name ?? "Anonimizado"],
      ["Fecha de creación", fmtFecha(r.fechaCreacion)],
      ["Fecha de resolución", fmtFecha(r.fechaResolucion)],
    ],
    headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
  })

  // Equipos
  if (r.equipos.length > 0) {
    autoTable(doc, {
      startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6,
      head: [["Equipos / Activos", "Código", "Marca", "Modelo", "Serie"]],
      body: r.equipos.map((e) => ["—", e.codigoActivo ?? "—", e.marca ?? "—", e.modelo ?? "—", e.serie ?? "—"]),
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2 },
    })
  }

  // Descripción / Solución
  const y1 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.setTextColor(15, 23, 42)
  doc.text("Descripción", 14, y1)
  doc.setFont("helvetica", "normal")
  doc.text(doc.splitTextToSize(r.descripcion, W - 28), 14, y1 + 5)
  let y2 = y1 + 5 + Math.ceil(r.descripcion.length / 95) * 5 + 6
  if (r.solucion) {
    doc.setFont("helvetica", "bold")
    doc.text("Solución", 14, y2)
    doc.setFont("helvetica", "normal")
    doc.text(doc.splitTextToSize(r.solucion, W - 28), 14, y2 + 5)
    y2 += 5 + Math.ceil(r.solucion.length / 95) * 5 + 6
  }

  // Historial
  if (r.historial.length > 0) {
    autoTable(doc, {
      startY: y2,
      head: [["Historial de estados", "Estado anterior", "Estado nuevo", "Usuario", "Fecha"]],
      body: r.historial.map((h) => [
        h.comentario ?? "—",
        h.estadoAnterior ?? "—",
        h.estadoNuevo,
        h.usuario?.name ?? "Sistema",
        fmtFecha(h.fecha),
      ]),
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      styles: { fontSize: 8, cellPadding: 2 },
    })
  }

  // Pie / firma
  const pageH = doc.internal.pageSize.getHeight()
  doc.setDrawColor(200)
  doc.line(14, pageH - 30, W - 14, pageH - 30)
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text("Firma del técnico:", 14, pageH - 22)
  doc.line(14, pageH - 18, 90, pageH - 18)
  doc.text(`© ${new Date().getFullYear()} ${INSTITUCION.direccion}`, 14, pageH - 8)
  doc.text(`Contacto: ${INSTITUCION.correo}`, W - 14, pageH - 8, { align: "right" })

  const buf = doc.output("arraybuffer")
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${r.codigo}.pdf"`,
    },
  })
}
