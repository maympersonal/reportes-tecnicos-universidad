import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { visibilityWhere, dateWhere, buildRanking } from "@/lib/stats"
import * as XLSX from "xlsx"
import { INSTITUCION } from "@/lib/constants"

function fmtFecha(d: Date) {
  return d.toISOString().slice(0, 16).replace("T", " ")
}

// GET /api/exportar/estadisticas/excel?desde&hasta — Excel con 5 hojas
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const sp = req.nextUrl.searchParams
  const desde = sp.get("desde")
  const hasta = sp.get("hasta")
  const where = { ...visibilityWhere(user), ...dateWhere(desde, hasta) }

  // Totales por estado
  const [total, pend, proc, resu, cerr] = await Promise.all([
    db.reporte.count({ where }),
    db.reporte.count({ where: { ...where, estado: "pendiente" } }),
    db.reporte.count({ where: { ...where, estado: "en_proceso" } }),
    db.reporte.count({ where: { ...where, estado: "resuelto" } }),
    db.reporte.count({ where: { ...where, estado: "cerrado" } }),
  ])

  const wb = XLSX.utils.book_new()

  // Hoja 1: Resumen
  const resumen = [
    ["Sistema", INSTITUCION.sistema],
    ["Institución", INSTITUCION.direccion],
    ["Generado", fmtFecha(new Date())],
    [],
    ["Total reportes", total],
    ["Pendientes", pend],
    ["En proceso", proc],
    ["Resueltos", resu],
    ["Cerrados", cerr],
    ["Tasa de resolución %", total ? Math.round(((resu + cerr) / total) * 100) : 0],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumen), "Resumen")

  // Hoja 2: Por tipo
  const tipos = await db.reporte.groupBy({ by: ["tipoTareaId"], where, _count: true })
  const tt = await db.tipoTarea.findMany()
  const ttMap = new Map(tt.map((t) => [t.id, t.nombre]))
  const porTipo = tipos.map((g) => ({ Tipo: ttMap.get(g.tipoTareaId) ?? "Otro", Cantidad: g._count }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porTipo.length ? porTipo : [{ Tipo: "Sin datos", Cantidad: 0 }]), "Por tipo")

  // Hoja 3: Por área
  const areasG = await db.reporte.groupBy({ by: ["areaId"], where, _count: true })
  const areas = await db.area.findMany()
  const aMap = new Map(areas.map((a) => [a.id, a.nombre]))
  const porArea = areasG.map((g) => ({ Área: aMap.get(g.areaId) ?? "Sin área", Cantidad: g._count }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porArea.length ? porArea : [{ Área: "Sin datos", Cantidad: 0 }]), "Por área")

  // Hoja 4: Por técnico
  const tec = await db.user.findMany({
    where: { role: "tecnico", activo: true },
    include: { reportesAsignados: { where, select: { estado: true, fechaCreacion: true, fechaResolucion: true } } },
  })
  const porTec = tec.map((t) => {
    const asignados = t.reportesAsignados.length
    const resueltos = t.reportesAsignados.filter((r) => r.estado === "resuelto" || r.estado === "cerrado").length
    const tiempos = t.reportesAsignados.filter((r) => r.fechaResolucion).map((r) => (r.fechaResolucion!.getTime() - r.fechaCreacion.getTime()) / 3_600_000)
    const prom = tiempos.length ? Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10 : 0
    return { Técnico: t.name, Asignados: asignados, Resueltos: resueltos, "Tiempo prom (h)": prom }
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(porTec.length ? porTec : [{ Técnico: "Sin datos", Asignados: 0, Resueltos: 0, "Tiempo prom (h)": 0 }]), "Por técnico")

  // Hoja 5: Ranking
  const ranking = await buildRanking(user)
  const rankRows = ranking.map((r, i) => ({
    "#": i + 1, Técnico: r.name, Cargo: r.cargo ?? "", Score: r.score,
    Resueltos: r.resueltos, Asignados: r.asignados, "Tiempo prom (h)": r.tiempoProm ?? 0, Estrellas: r.estrellas,
  }))
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rankRows.length ? rankRows : [{ "#": 1, Técnico: "Sin datos" }]), "Ranking")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="estadisticas.xlsx"`,
    },
  })
}
