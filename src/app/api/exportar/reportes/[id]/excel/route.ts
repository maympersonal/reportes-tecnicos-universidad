import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"
import { INSTITUCION } from "@/lib/constants"
import * as XLSX from "xlsx"

function fmtFecha(d: Date | null) {
  return d ? d.toISOString().slice(0, 16).replace("T", " ") : "—"
}

// GET /api/exportar/reportes/{id}/excel
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const { id } = await ctx.params
  const r = await db.reporte.findUnique({
    where: { id },
    include: {
      tipoTarea: true, area: true, tecnicoAsignado: true, creadoPor: true,
      equipos: true, archivos: true,
      historial: { include: { usuario: true }, orderBy: { fecha: "asc" } },
    },
  })
  if (!r) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (user.role === "tecnico" && r.creadoPorId !== user.id && r.tecnicoAsignadoId !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const wb = XLSX.utils.book_new()

  // Hoja 1: General
  const general = [
    ["Sistema", INSTITUCION.sistema],
    ["Institución", INSTITUCION.direccion],
    ["Departamento", INSTITUCION.departamento],
    ["Contacto", INSTITUCION.correo],
    [],
    ["Código", r.codigo],
    ["Tipo de tarea", r.tipoTarea?.nombre ?? "—"],
    ["Estado", r.estado],
    ["Prioridad", r.prioridad],
    ["Área", r.area?.nombre ?? "—"],
    ["Ubicación", r.ubicacion ?? "—"],
    ["Usuario afectado", r.usuarioNombre],
    ["Cargo", r.usuarioCargo ?? "—"],
    ["Correo", r.usuarioCorreo],
    ["Técnico asignado", r.tecnicoAsignado?.name ?? "Sin asignar"],
    ["Creado por", r.creadoPor?.name ?? "Anonimizado"],
    ["Fecha creación", fmtFecha(r.fechaCreacion)],
    ["Fecha resolución", fmtFecha(r.fechaResolucion)],
    [],
    ["Descripción", r.descripcion],
    ["Solución", r.solucion ?? "—"],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(general)
  ws1["!cols"] = [{ wch: 22 }, { wch: 60 }]
  XLSX.utils.book_append_sheet(wb, ws1, "General")

  // Hoja 2: Equipos
  const equipos = r.equipos.length
    ? r.equipos.map((e, i) => ({
        "#": i + 1,
        "Código activo": e.codigoActivo ?? "",
        Marca: e.marca ?? "",
        Modelo: e.modelo ?? "",
        Serie: e.serie ?? "",
      }))
    : [{ "#": 1, "Código activo": "Sin equipos", Marca: "", Modelo: "", Serie: "" }]
  const ws2 = XLSX.utils.json_to_sheet(equipos)
  XLSX.utils.book_append_sheet(wb, ws2, "Equipos")

  // Hoja 3: Historial
  const hist = r.historial.length
    ? r.historial.map((h) => ({
        Fecha: fmtFecha(h.fecha),
        "Estado anterior": h.estadoAnterior ?? "—",
        "Estado nuevo": h.estadoNuevo,
        Usuario: h.usuario?.name ?? "Sistema",
        Comentario: h.comentario ?? "",
      }))
    : [{ Fecha: "—", "Estado anterior": "—", "Estado nuevo": "—", Usuario: "—", Comentario: "—" }]
  const ws3 = XLSX.utils.json_to_sheet(hist)
  XLSX.utils.book_append_sheet(wb, ws3, "Historial")

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${r.codigo}.xlsx"`,
    },
  })
}
