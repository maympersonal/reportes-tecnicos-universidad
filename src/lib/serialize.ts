import type { Reporte, User, Area, TipoTarea, EquipoReporte, ArchivoReporte, HistorialEstado } from "@prisma/client"

export type ReporteFull = Reporte & {
  tipoTarea: TipoTarea
  area: Area
  creadoPor: User | null
  tecnicoAsignado: User | null
  equipos: EquipoReporte[]
  archivos: ArchivoReporte[]
  historial: (HistorialEstado & { usuario: User | null })[]
}

// Convierte un Reporte (con includes) a un objeto plano seguro para JSON
// y agrega campos calculados: tiempo_resolucion_horas, tecnico_nombre, creado_por_nombre
export function serializeReporte(r: ReporteFull) {
  const horas = r.fechaResolucion
    ? Math.round(((r.fechaResolucion.getTime() - r.fechaCreacion.getTime()) / 3_600_000) * 10) / 10
    : null
  return {
    id: r.id,
    codigo: r.codigo,
    tipoTareaId: r.tipoTareaId,
    tipoTarea: r.tipoTarea
      ? { id: r.tipoTarea.id, codigo: r.tipoTarea.codigo, nombre: r.tipoTarea.nombre }
      : null,
    descripcion: r.descripcion,
    solucion: r.solucion,
    areaId: r.areaId,
    area: r.area ? { id: r.area.id, nombre: r.area.nombre, responsable: r.area.responsable } : null,
    ubicacion: r.ubicacion,
    usuarioNombre: r.usuarioNombre,
    usuarioCorreo: r.usuarioCorreo,
    usuarioCargo: r.usuarioCargo,
    prioridad: r.prioridad,
    estado: r.estado,
    creadoPorId: r.creadoPorId,
    creadoPorNombre: r.creadoPor?.name ?? "Anonimizado",
    tecnicoAsignadoId: r.tecnicoAsignadoId,
    tecnicoNombre: r.tecnicoAsignado?.name ?? null,
    fechaCreacion: r.fechaCreacion.toISOString(),
    fechaActualizacion: r.fechaActualizacion.toISOString(),
    fechaResolucion: r.fechaResolucion ? r.fechaResolucion.toISOString() : null,
    tiempoResolucionHoras: horas,
    equipos: (r.equipos ?? []).map((e) => ({
      id: e.id,
      tipoEquipoId: e.tipoEquipoId,
      tipoTexto: e.tipoTexto,
      codigoActivo: e.codigoActivo,
      marca: e.marca,
      modelo: e.modelo,
      serie: e.serie,
    })),
    archivos: (r.archivos ?? []).map((a) => ({
      id: a.id,
      archivo: a.archivo,
      nombre: a.nombre,
      tipo: a.tipo,
      fechaSubida: a.fechaSubida.toISOString(),
    })),
    historial: (r.historial ?? []).map((h) => ({
      id: h.id,
      estadoAnterior: h.estadoAnterior,
      estadoNuevo: h.estadoNuevo,
      comentario: h.comentario,
      usuarioId: h.usuarioId,
      usuarioNombre: h.usuario?.name ?? "Sistema",
      fecha: h.fecha.toISOString(),
    })),
  }
}

// Reporte ligero para listas
export function serializeReporteLite(r: Reporte & {
  tipoTarea: TipoTarea | null
  area: Area | null
  tecnicoAsignado: User | null
  creadoPor: User | null
}) {
  const horas = r.fechaResolucion
    ? Math.round(((r.fechaResolucion.getTime() - r.fechaCreacion.getTime()) / 3_600_000) * 10) / 10
    : null
  return {
    id: r.id,
    codigo: r.codigo,
    tipoTarea: r.tipoTarea ? { id: r.tipoTarea.id, codigo: r.tipoTarea.codigo, nombre: r.tipoTarea.nombre } : null,
    area: r.area ? { id: r.area.id, nombre: r.area.nombre } : null,
    descripcion: r.descripcion,
    ubicacion: r.ubicacion,
    usuarioNombre: r.usuarioNombre,
    usuarioCargo: r.usuarioCargo,
    prioridad: r.prioridad,
    estado: r.estado,
    creadoPorNombre: r.creadoPor?.name ?? "Anonimizado",
    tecnicoNombre: r.tecnicoAsignado?.name ?? null,
    tecnicoAsignadoId: r.tecnicoAsignadoId,
    fechaCreacion: r.fechaCreacion.toISOString(),
    fechaActualizacion: r.fechaActualizacion.toISOString(),
    fechaResolucion: r.fechaResolucion ? r.fechaResolucion.toISOString() : null,
    tiempoResolucionHoras: horas,
  }
}
