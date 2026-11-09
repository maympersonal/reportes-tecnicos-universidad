import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { INSTITUCION } from "@/lib/constants"
import { visibilityWhere } from "@/lib/stats"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

// GET /api/exportar/informe/pdf — informe ejecutivo profesional multipágina
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const sp = req.nextUrl.searchParams
  const where = { ...visibilityWhere(user) }

  const [
    total, pendientes, enProceso, resueltos, cerrados, criticosAbiertos,
    tiempoRows, porTipoRows, porAreaRows, tecnicos,
  ] = await Promise.all([
    db.reporte.count({ where }),
    db.reporte.count({ where: { ...where, estado: "pendiente" } }),
    db.reporte.count({ where: { ...where, estado: "en_proceso" } }),
    db.reporte.count({ where: { ...where, estado: "resuelto" } }),
    db.reporte.count({ where: { ...where, estado: "cerrado" } }),
    db.reporte.count({ where: { ...where, prioridad: "critica", estado: { in: ["pendiente", "en_proceso"] } } }),
    db.reporte.findMany({ where: { ...where, estado: { in: ["resuelto", "cerrado"] } }, select: { fechaCreacion: true, fechaResolucion: true } }),
    db.reporte.groupBy({ by: ["tipoTareaId"], where, _count: true }),
    db.reporte.groupBy({ by: ["areaId"], where, _count: true }),
    db.user.findMany({
      where: { role: "tecnico", activo: true },
      include: { reportesAsignados: { where, select: { estado: true, fechaCreacion: true, fechaResolucion: true } } },
    }),
  ])
  const tipos = await db.tipoTarea.findMany()
  const areas = await db.area.findMany()
  const ttMap = new Map(tipos.map((t) => [t.id, t.nombre]))
  const aMap = new Map(areas.map((a) => [a.id, a.nombre]))

  const tiempos = tiempoRows.filter((r) => r.fechaResolucion).map((r) => (r.fechaResolucion!.getTime() - r.fechaCreacion.getTime()) / 3_600_000)
  const tiempoProm = tiempos.length ? Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10 : 0
  const resueltosCerrados = resueltos + cerrados
  const tasaResolucion = total ? Math.round((resueltosCerrados / total) * 100) : 0
  const salud = Math.max(0, Math.min(100, Math.round(tasaResolucion - criticosAbiertos * 5)))

  const porTipo = porTipoRows.map((g) => ({ tipo: ttMap.get(g.tipoTareaId) ?? "Otro", cantidad: g._count })).sort((a, b) => b.cantidad - a.cantidad)
  const porArea = porAreaRows.map((g) => ({ area: aMap.get(g.areaId) ?? "Sin área", cantidad: g._count })).sort((a, b) => b.cantidad - a.cantidad)
  const tecRank = tecnicos.map((t) => {
    const res = t.reportesAsignados.filter((r) => r.estado === "resuelto" || r.estado === "cerrado").length
    const asig = t.reportesAsignados.length
    const ts = t.reportesAsignados.filter((r) => r.fechaResolucion).map((r) => (r.fechaResolucion!.getTime() - r.fechaCreacion.getTime()) / 3_600_000)
    const prom = ts.length ? Math.round((ts.reduce((a, b) => a + b, 0) / ts.length) * 10) / 10 : 0
    return { nombre: t.name, cargo: t.cargo, resueltos: res, asignados: asig, tiempo: prom }
  }).sort((a, b) => b.resueltos - a.resueltos)

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // ===== PORTADA =====
  doc.setFillColor(13, 31, 45)
  doc.rect(0, 0, W, H, "F")
  doc.setFillColor(16, 122, 87) // esmeralda
  doc.rect(0, 0, W, 6, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(26)
  doc.text(INSTITUCION.sistema, W / 2, 70, { align: "center" })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(13)
  doc.setTextColor(180, 200, 210)
  doc.text("Informe Ejecutivo de Gestión Técnica", W / 2, 82, { align: "center" })
  doc.setFontSize(10)
  doc.text(INSTITUCION.direccion, W / 2, 92, { align: "center" })
  doc.text(`${INSTITUCION.departamento} · ${INSTITUCION.correo}`, W / 2, 98, { align: "center" })

  // Caja de resumen en la portada
  doc.setDrawColor(16, 122, 87)
  doc.setFillColor(20, 45, 60)
  doc.roundedRect(30, 120, W - 60, 70, 4, 4, "FD")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(12)
  doc.text("Resumen ejecutivo", W / 2, 134, { align: "center" })
  doc.setFontSize(11)
  doc.setFont("helvetica", "normal")
  doc.text(`Total de reportes: ${total}`, 40, 148)
  doc.text(`Tasa de resolución: ${tasaResolucion}%`, 40, 157)
  doc.text(`Tiempo prom. de resolución: ${tiempoProm} h`, 40, 166)
  doc.text(`Índice de salud institucional: ${salud}/100`, 40, 175)
  doc.text(`Críticos abiertos: ${criticosAbiertos}`, W / 2 + 20, 148)

  doc.setFontSize(9)
  doc.setTextColor(150, 170, 180)
  doc.text(`Generado: ${new Date().toLocaleString("es-ES")}`, W / 2, H - 20, { align: "center" })
  doc.text(`Documento confidencial · ${INSTITUCION.ley}`, W / 2, H - 14, { align: "center" })
  doc.text(`© ${new Date().getFullYear()} ${INSTITUCION.direccion}`, W / 2, H - 8, { align: "center" })

  // ===== PÁGINA 2: KPIs + estado =====
  doc.addPage()
  drawHeader(doc, "1. Indicadores clave (KPI)")
  autoTable(doc, {
    startY: 32,
    head: [["Indicador", "Valor", "Detalle"]],
    body: [
      ["Total de reportes", String(total), "Histórico en el alcance del usuario"],
      ["Pendientes", String(pendientes), "Esperando atención"],
      ["En proceso", String(enProceso), "Siendo atendidos"],
      ["Resueltos", String(resueltos), "Solucionados"],
      ["Cerrados", String(cerrados), "Verificados y cerrados"],
      ["Tasa de resolución", `${tasaResolucion}%`, `${resueltosCerrados} de ${total}`],
      ["Tiempo promedio", `${tiempoProm} h`, "Creación → resolución"],
      ["Críticos abiertos", String(criticosAbiertos), "Prioridad crítica sin resolver"],
      ["Índice de salud", `${salud}/100`, "Tasa penalizada por críticos"],
    ],
    headStyles: { fillColor: [16, 122, 87], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 }, 1: { cellWidth: 25, halign: "center" } },
  })

  // ===== PÁGINA 3: por tipo y por área =====
  doc.addPage()
  drawHeader(doc, "2. Distribución por tipo de tarea")
  autoTable(doc, {
    startY: 32,
    head: [["Tipo de tarea", "Reportes", "% del total"]],
    body: porTipo.map((p) => [p.tipo, String(p.cantidad), total ? `${Math.round((p.cantidad / total) * 100)}%` : "0%"]),
    headStyles: { fillColor: [16, 122, 87], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.5 },
  })
  autoTable(doc, {
    startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10,
    head: [["Distribución por área", "Reportes", "% del total"]],
    body: porArea.map((p) => [p.area, String(p.cantidad), total ? `${Math.round((p.cantidad / total) * 100)}%` : "0%"]),
    headStyles: { fillColor: [30, 58, 80], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.5 },
  })

  // ===== PÁGINA 4: ranking de técnicos =====
  doc.addPage()
  drawHeader(doc, "3. Desempeño del equipo técnico")
  autoTable(doc, {
    startY: 32,
    head: [["#", "Técnico", "Cargo", "Asignados", "Resueltos", "Tiempo prom (h)"]],
    body: tecRank.map((t, i) => [String(i + 1), t.nombre, t.cargo ?? "—", String(t.asignados), String(t.resueltos), String(t.tiempo)]),
    headStyles: { fillColor: [16, 122, 87], textColor: 255 },
    styles: { fontSize: 9, cellPadding: 2.5 },
  })

  // ===== PÁGINA 5: conclusiones y firma =====
  doc.addPage()
  drawHeader(doc, "4. Conclusiones y recomendaciones")
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(40, 40, 40)
  const conclusiones = [
    `Durante el período evaluado se gestionaron ${total} reportes técnicos, de los cuales ${resueltosCerrados} (${tasaResolucion}%) fueron resueltos o cerrados.`,
    `El tiempo promedio de resolución fue de ${tiempoProm} horas, ${tiempoProm <= 24 ? "dentro del objetivo institucional de 24h." : "por encima del objetivo de 24h; se recomienda revisar la asignación de carga."}`,
    `Actualmente hay ${criticosAbiertos} reporte(s) crítico(s) sin atender, los cuales requieren priorización inmediata.`,
    `El índice de salud institucional se ubica en ${salud}/100, lo que ${salud >= 75 ? "indica una gestión saludable." : salud >= 50 ? "requiere mejoras moderadas." : "requiere intervención prioritaria."}`,
    "Se recomienda mantener el seguimiento periódico mediante el tablero de estadísticas y fortalecer la asignación de técnicos a reportes críticos.",
  ]
  let y = 42
  conclusiones.forEach((c, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${c}`, W - 30)
    doc.text(lines, 15, y)
    y += lines.length * 5 + 3
  })

  // Bloque de firma
  doc.setDrawColor(180)
  doc.line(15, H - 45, W - 15, H - 45)
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text("Firma del responsable:", 15, H - 38)
  doc.line(15, H - 30, 95, H - 30)
  doc.text(`Generado por: ${user.name}`, 15, H - 24)
  doc.text(`Fecha: ${new Date().toLocaleString("es-ES")}`, 15, H - 18)
  doc.text(`Contacto: ${INSTITUCION.correo}`, W - 15, H - 18, { align: "right" })
  doc.text(`© ${new Date().getFullYear()} ${INSTITUCION.direccion} · ${INSTITUCION.ley}`, W / 2, H - 8, { align: "center" })

  const buf = doc.output("arraybuffer")
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="informe-ejecutivo-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  })
}

function drawHeader(doc: jsPDF, titulo: string) {
  const W = doc.internal.pageSize.getWidth()
  doc.setFillColor(13, 31, 45)
  doc.rect(0, 0, W, 24, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13)
  doc.text(INSTITUCION.sistema, 14, 10)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(180, 200, 210)
  doc.text(INSTITUCION.direccion, 14, 16)
  doc.text(titulo, 14, 22)
}
