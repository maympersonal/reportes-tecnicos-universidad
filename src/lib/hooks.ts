import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useAppStore } from "@/lib/store"
import type { ReportesFilter, CurrentUser } from "@/lib/store"

// Tipos
export type ReporteLite = {
  id: string
  codigo: string
  tipoTarea: { id: string; codigo: string; nombre: string } | null
  area: { id: string; nombre: string } | null
  descripcion: string
  ubicacion: string | null
  usuarioNombre: string
  usuarioCargo: string | null
  prioridad: string
  estado: string
  creadoPorNombre: string
  tecnicoNombre: string | null
  tecnicoAsignadoId: string | null
  fechaCreacion: string
  fechaActualizacion: string
  fechaResolucion: string | null
  tiempoResolucionHoras: number | null
}

export type ReporteFull = ReporteLite & {
  solucion: string | null
  usuarioCorreo: string
  equipos: { id: string; codigoActivo: string | null; marca: string | null; modelo: string | null; serie: string | null }[]
  archivos: { id: string; archivo: string; nombre: string; tipo: string | null; fechaSubida: string }[]
  historial: {
    id: string
    estadoAnterior: string | null
    estadoNuevo: string
    comentario: string | null
    usuarioId: string | null
    usuarioNombre: string
    fecha: string
  }[]
}

export type Notificacion = {
  id: string
  tipo: string
  titulo: string
  mensaje: string
  reporteId: string | null
  leida: boolean
  fecha: string
}

export type Resumen = {
  total: number
  pendientes: number
  enProceso: number
  resueltos: number
  cerrados: number
  criticos: number
  tiempoProm: number
  activos: number
  tasaResolucion: number
  salud: number
}

// --- Auth ---
export function useLogin() {
  const setAuth = useAppStore((s) => s.setAuth)
  return useMutation({
    mutationFn: async (body: { username: string; password: string }) => {
      const res = await apiFetch<{ user: CurrentUser; token: string; debeCambiarPassword?: boolean }>(`/auth/login`, {
        method: "POST",
        body: JSON.stringify(body),
        auth: false,
      })
      return res
    },
    onSuccess: (res) => {
      setAuth(res.user, res.token)
    },
  })
}

// Cambiar propia contraseña
export function useCambiarPassword() {
  return useMutation({
    mutationFn: async (body: { actual: string; nueva: string }) =>
      apiFetch(`/auth/me/password`, { method: "PATCH", body: JSON.stringify(body) }),
  })
}

// --- Catálogos ---
export function useTiposTarea() {
  return useQuery({
    queryKey: ["tipos-tarea"],
    queryFn: () => apiFetch<{ items: { id: string; codigo: string; nombre: string }[] }>(`/tipos-tarea`),
  })
}
export function useAreas() {
  return useQuery({
    queryKey: ["areas"],
    queryFn: () =>
      apiFetch<{
        items: { id: string; nombre: string; tipoAreaId: string; tipoAreaNombre: string | null; responsable: string | null }[]
      }>(`/areas`),
  })
}
export function useUbicaciones(areaId?: string) {
  return useQuery({
    queryKey: ["ubicaciones", areaId ?? ""],
    queryFn: () => apiFetch<{ items: { id: string; nombre: string; areaId: string; areaNombre: string | null; edificio: string | null; piso: string | null; referencia: string | null }[] }>(`/ubicaciones${areaId ? `?area=${areaId}` : ""}`),
    enabled: !!areaId || areaId === undefined,
  })
}
export function useTecnicos() {
  return useQuery({
    queryKey: ["tecnicos"],
    queryFn: () => apiFetch<{ items: { id: string; name: string; username: string; cargo: string | null; email: string }[] }>(`/tecnicos`),
  })
}

// --- Reportes ---
export function useReportes(opts: ReportesFilter & { page?: number; pageSize?: number } = {}) {
  const user = useAppStore((s) => s.user)
  const params = new URLSearchParams()
  Object.entries(opts).forEach(([k, v]) => {
    if (v !== undefined && v !== "" && v !== null) params.set(k, String(v))
  })
  const qs = params.toString()
  return useQuery({
    queryKey: ["reportes", qs],
    queryFn: () => apiFetch<{ items: ReporteLite[]; total: number; page: number; pageSize: number; totalPages: number }>(`/reportes${qs ? `?${qs}` : ""}`),
    enabled: !!user,
  })
}

export function useReporte(id: string | null) {
  return useQuery({
    queryKey: ["reporte", id],
    queryFn: () => apiFetch<{ item: ReporteFull }>(`/reportes/${id}`),
    enabled: !!id,
  })
}

export function useCrearReporte() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      apiFetch<{ item: ReporteFull }>(`/reportes`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reportes"] })
      qc.invalidateQueries({ queryKey: ["estadisticas"] })
      qc.invalidateQueries({ queryKey: ["notificaciones-pendientes"] })
    },
  })
}

export function useActualizarReporte(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      apiFetch<{ item: ReporteFull }>(`/reportes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (res) => {
      qc.setQueryData(["reporte", id], res)
      qc.invalidateQueries({ queryKey: ["reportes"] })
      qc.invalidateQueries({ queryKey: ["estadisticas"] })
    },
  })
}

export function useCambiarEstado(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { estado: string; comentario?: string; solucion?: string; tecnicoAsignadoId?: string | null }) =>
      apiFetch<{ item: ReporteFull }>(`/reportes/${id}/cambiar-estado`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (res) => {
      qc.setQueryData(["reporte", id], res)
      qc.invalidateQueries({ queryKey: ["reportes"] })
      qc.invalidateQueries({ queryKey: ["estadisticas"] })
      qc.invalidateQueries({ queryKey: ["notificaciones-pendientes"] })
    },
  })
}

export function useEliminarReporte() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => apiFetch(`/reportes/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reportes"] })
      qc.invalidateQueries({ queryKey: ["estadisticas"] })
    },
  })
}

export function useSubirArchivo(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append("file", file)
      const { apiUpload } = await import("@/lib/api")
      return apiUpload<{ item: ReporteFull }>(`/reportes/${id}/subir-archivo`, fd)
    },
    onSuccess: (res) => {
      qc.setQueryData(["reporte", id], res)
    },
  })
}

export function useEliminarArchivo(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (aid: string) => apiFetch(`/reportes/${id}/eliminar-archivo/${aid}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reporte", id] })
    },
  })
}

// --- Estadísticas ---
export function useResumen(desde?: string, hasta?: string) {
  const qs = new URLSearchParams()
  if (desde) qs.set("desde", desde)
  if (hasta) qs.set("hasta", hasta)
  return useQuery({
    queryKey: ["estadisticas", "resumen", desde ?? "", hasta ?? ""],
    queryFn: () => apiFetch<Resumen>(`/estadisticas/resumen${qs.toString() ? `?${qs}` : ""}`),
  })
}
export function usePorMes() {
  return useQuery({
    queryKey: ["estadisticas", "por-mes"],
    queryFn: () => apiFetch<{ items: { label: string; key: string; total: number; resueltos: number }[] }>(`/estadisticas/por-mes`),
  })
}
export function usePorTipo(desde?: string, hasta?: string) {
  const qs = new URLSearchParams()
  if (desde) qs.set("desde", desde)
  if (hasta) qs.set("hasta", hasta)
  return useQuery({
    queryKey: ["estadisticas", "por-tipo", desde ?? "", hasta ?? ""],
    queryFn: () => apiFetch<{ items: { name: string; value: number }[] }>(`/estadisticas/por-tipo${qs.toString() ? `?${qs}` : ""}`),
  })
}
export function usePorArea(desde?: string, hasta?: string) {
  const qs = new URLSearchParams()
  if (desde) qs.set("desde", desde)
  if (hasta) qs.set("hasta", hasta)
  return useQuery({
    queryKey: ["estadisticas", "por-area", desde ?? "", hasta ?? ""],
    queryFn: () => apiFetch<{ items: { name: string; value: number }[] }>(`/estadisticas/por-area${qs.toString() ? `?${qs}` : ""}`),
  })
}
export function usePorTecnico(desde?: string, hasta?: string) {
  const qs = new URLSearchParams()
  if (desde) qs.set("desde", desde)
  if (hasta) qs.set("hasta", hasta)
  return useQuery({
    queryKey: ["estadisticas", "por-tecnico", desde ?? "", hasta ?? ""],
    queryFn: () => apiFetch<{ items: { name: string; asignados: number; resueltos: number; tiempoProm: number | null }[] }>(`/estadisticas/por-tecnico${qs.toString() ? `?${qs}` : ""}`),
  })
}
export function useRanking(q?: string) {
  return useQuery({
    queryKey: ["estadisticas", "ranking", q ?? ""],
    queryFn: () => apiFetch<{
      items: {
        id: string
        name: string
        cargo: string | null
        resueltos: number
        asignados: number
        tiempoProm: number | null
        estrellas: number
        score: number
        activo: boolean
      }[]
    }>(`/estadisticas/ranking${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  })
}

// --- Notificaciones ---
export function useNotificacionesPendientes() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ["notificaciones-pendientes"],
    queryFn: () => apiFetch<{ count: number; items: Notificacion[] }>(`/notificaciones/pendientes`),
    enabled: !!user,
    refetchInterval: 30_000,
  })
}
export function useMarcarLeidas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch(`/notificaciones/marcar-leidas`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificaciones-pendientes"] }),
  })
}
export function useMarcarLeida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/notificaciones/${id}/marcar-leida`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificaciones-pendientes"] }),
  })
}

// --- Usuarios ---
export type UsuarioItem = {
  id: string
  username: string
  email: string
  name: string
  role: string
  cargo: string | null
  telefono: string | null
  areaId: string | null
  areaNombre: string | null
  activo: boolean
  permisos: string[]
  createdAt: string
}

export function useUsuarios(opts: { q?: string; rol?: string; baja?: "true" | "false" } = {}) {
  const params = new URLSearchParams()
  Object.entries(opts).forEach(([k, v]) => { if (v !== undefined && v !== "" && v !== null) params.set(k, String(v)) })
  const qs = params.toString()
  return useQuery({
    queryKey: ["usuarios", qs],
    queryFn: () => apiFetch<{ items: UsuarioItem[] }>(`/usuarios${qs ? `?${qs}` : ""}`),
  })
}

export function useCrearUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => apiFetch<{ item: CurrentUser }>(`/usuarios`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  })
}

export function useActualizarUsuario(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => apiFetch<{ item: CurrentUser }>(`/usuarios/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  })
}

export function useEliminarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => apiFetch(`/usuarios/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  })
}

export function useRestaurarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => apiFetch(`/usuarios/${id}/restaurar`, { method: "PATCH" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuarios"] }),
  })
}

// --- Tipos de equipo ---
export function useTiposEquipo() {
  return useQuery({
    queryKey: ["tipos-equipo"],
    queryFn: () => apiFetch<{ items: { id: string; nombre: string }[] }>(`/tipos-equipo`),
  })
}

export function useCrearTipoEquipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nombre: string) => apiFetch<{ item: { id: string; nombre: string } }>(`/tipos-equipo`, { method: "POST", body: JSON.stringify({ nombre }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tipos-equipo"] }),
  })
}
