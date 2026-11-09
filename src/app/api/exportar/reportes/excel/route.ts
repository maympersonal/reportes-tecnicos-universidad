import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { visibilityWhere, dateWhere } from "@/lib/stats"
import * as XLSX from "xlsx"

// GET /api/exportar/reportes/excel?...filtros
export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const sp = req.nextUrl.searchParams
  const where = {
    ...visibilityWhere(user),
    ...dateWhere(sp.get("desde"), sp.get("hasta")),
    ...(sp.get("estado") ? { estado: sp.get("estado")! } : {}),
    ...(sp.get("prioridad") ? { prioridad: sp.get("prioridad")! } : {}),
    ...(sp.get("area") ? { areaId: sp.get("area")! } : {}),
    ...(sp.get("tipoTarea") ? { tipoTareaId: sp.get("tipoTarea")! } : {}),
  }

  const rows = await db.reporte.findMany({
    where,
    include: { tipoTarea: true, area: true, tecnicoAsignado: true, creadoPor: true },
    orderBy: { fechaCreacion: "desc" },
  })

  const data = rows.map((r, i) => ({
    "#": i + 1,
    "Código": r.codigo,
    "Tipo": r.tipoTarea?.nombre ?? "",
    "Área": r.area?.nombre ?? "",
    "Ubicación": r.ubicacion ?? "",
    "Usuario": r.usuarioNombre,
    "Cargo": r.usuarioCargo ?? "",
    "Correo": r.usuarioCorreo,
    "Prioridad": r.prioridad,
    "Estado": r.estado,
    "Técnico": r.tecnicoAsignado?.name ?? "Sin asignar",
    "Creado por": r.creadoPor?.name ?? "Anonimizado",
    "Creación": r.fechaCreacion.toISOString().slice(0, 19).replace("T", " "),
    "Resolución": r.fechaResolucion ? r.fechaResolucion.toISOString().slice(0, 19).replace("T", " ") : "",
    "Horas": r.fechaResolucion ? Math.round((r.fechaResolucion.getTime() - r.fechaCreacion.getTime()) / 3_600_000 * 10) / 10 : "",
    "Descripción": r.descripcion,
    "Solución": r.solucion ?? "",
  }))

  const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ "#": 1, Código: "Sin datos" }])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Reportes")
  ws["!cols"] = (data[0] ? Object.keys(data[0]) : ["#"]).map((k) => ({ wch: Math.max(10, k.length + 2) }))

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reportes.xlsx"`,
    },
  })
}
