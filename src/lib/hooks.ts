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
  const user = useAppStore((s) => s.user)
  return useQuery({
    enabled: !!user,
    queryKey: ["tipos-tarea", user?.id],
    queryFn: ({ signal }) => apiFetch<{ items: { id: string; codigo: string; nombre: string }[] }>(`/tipos-tarea`, { signal }),
  })
}
export function useAreas() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    enabled: !!user,
    queryKey: ["areas", user?.id],
    queryFn: ({ signal }) =>
      apiFetch<{
        items: { id: string; nombre: string; tipoAreaId: string; tipoAreaNombre: string | null; responsable: string | null }[]
      }>(`/areas`, { signal }),
  })
}
export function useUbicaciones(areaId?: string) {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ["ubicaciones", user?.id, areaId ?? ""],
    queryFn: ({ signal }) => apiFetch<{ items: { id: string; nombre: string; areaId: string; areaNombre: string | null; edificio: string | null; piso: string | null; referencia: string | null }[] }>(`/ubicaciones${areaId ? `?area=${areaId}` : ""}`, { signal }),
    enabled: !!user && (!!areaId || areaId === undefined),
  })
}
export function useTecnicos() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    enabled: !!user,
    queryKey: ["tecnicos", user?.id],
    queryFn: ({ signal }) => apiFetch<{ items: { id: string; name: string; username: string; cargo: string | null; email: string }[] }>(`/tecnicos`, { signal }),
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
    queryKey: ["reportes", user?.id, qs],
    queryFn: ({ signal }) => apiFetch<{ items: ReporteLite[]; total: number; page: number; pageSize: number; totalPages: number }>(`/reportes${qs ? `?${qs}` : ""}`, { signal }),
    enabled: !!user,
  })
}

export function useReporte(id: string | null) {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ["reporte", user?.id, id],
    queryFn: ({ signal }) => apiFetch<{ item: ReporteFull }>(`/reportes/${id}`, { signal }),
    enabled: !!user && !!id,
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
  const userId = useAppStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) =>
      apiFetch<{ item: ReporteFull }>(`/reportes/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: (res) => {
      qc.setQueryData(["reporte", userId, id], res)
      qc.invalidateQueries({ queryKey: ["reportes"] })
      qc.invalidateQueries({ queryKey: ["estadisticas"] })
    },
  })
}

export function useCambiarEstado(id: string) {
  const userId = useAppStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { estado: string; comentario?: string; solucion?: string; tecnicoAsignadoId?: string | null }) =>
      apiFetch<{ item: ReporteFull }>(`/reportes/${id}/cambiar-estado`, { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (res) => {
      qc.setQueryData(["reporte", userId, id], res)
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
  const userId = useAppStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData()
      fd.append("file", file)
      const { apiUpload } = await import("@/lib/api")
      return apiUpload<{ item: ReporteFull }>(`/reportes/${id}/subir-archivo`, fd)
    },
    onSuccess: (res) => {
      qc.setQueryData(["reporte", userId, id], res)
    },
  })
}

export function useEliminarArchivo(id: string) {
  const userId = useAppStore((s) => s.user?.id)
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (aid: string) => apiFetch(`/reportes/${id}/eliminar-archivo/${aid}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reporte", userId, id] })
    },
  })
}

// --- Estadísticas ---
export function useResumen(desde?: string, hasta?: string) {
  const qs = new URLSearchParams()
  if (desde) qs.set("desde", desde)
  if (hasta) qs.set("hasta", hasta)
  const user = useAppStore((s) => s.user)
  return useQuery({
    enabled: !!user,
    queryKey: ["estadisticas", user?.id, "resumen", desde ?? "", hasta ?? ""],
    queryFn: ({ signal }) => apiFetch<Resumen>(`/estadisticas/resumen${qs.toString() ? `?${qs}` : ""}`, { signal }),
  })
}
export function usePorMes() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    enabled: !!user,
    queryKey: ["estadisticas", user?.id, "por-mes"],
    queryFn: ({ signal }) => apiFetch<{ items: { label: string; key: string; total: number; resueltos: number }[] }>(`/estadisticas/por-mes`, { signal }),
  })
}
export function usePorTipo(desde?: string, hasta?: string) {
  const qs = new URLSearchParams()
  if (desde) qs.set("desde", desde)
  if (hasta) qs.set("hasta", hasta)
  const user = useAppStore((s) => s.user)
  return useQuery({
    enabled: !!user,
    queryKey: ["estadisticas", user?.id, "por-tipo", desde ?? "", hasta ?? ""],
    queryFn: ({ signal }) => apiFetch<{ items: { name: string; value: number }[] }>(`/estadisticas/por-tipo${qs.toString() ? `?${qs}` : ""}`, { signal }),
  })
}
export function usePorArea(desde?: string, hasta?: string) {
  const qs = new URLSearchParams()
  if (desde) qs.set("desde", desde)
  if (hasta) qs.set("hasta", hasta)
  const user = useAppStore((s) => s.user)
  return useQuery({
    enabled: !!user,
    queryKey: ["estadisticas", user?.id, "por-area", desde ?? "", hasta ?? ""],
    queryFn: ({ signal }) => apiFetch<{ items: { name: string; value: number }[] }>(`/estadisticas/por-area${qs.toString() ? `?${qs}` : ""}`, { signal }),
  })
}
export function usePorTecnico(desde?: string, hasta?: string) {
  const qs = new URLSearchParams()
  if (desde) qs.set("desde", desde)
  if (hasta) qs.set("hasta", hasta)
  const user = useAppStore((s) => s.user)
  return useQuery({
    enabled: !!user,
    queryKey: ["estadisticas", user?.id, "por-tecnico", desde ?? "", hasta ?? ""],
    queryFn: ({ signal }) => apiFetch<{ items: { name: string; asignados: number; resueltos: number; tiempoProm: number | null }[] }>(`/estadisticas/por-tecnico${qs.toString() ? `?${qs}` : ""}`, { signal }),
  })
}
export function useRanking(q?: string) {
  const user = useAppStore((s) => s.user)
  return useQuery({
    enabled: !!user,
    queryKey: ["estadisticas", user?.id, "ranking", q ?? ""],
    queryFn: ({ signal }) => apiFetch<{
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
    }>(`/estadisticas/ranking${q ? `?q=${encodeURIComponent(q)}` : ""}`, { signal }),
  })
}

// --- Notificaciones ---
export function useNotificacionesPendientes() {
  const user = useAppStore((s) => s.user)
  return useQuery({
    queryKey: ["notificaciones-pendientes", user?.id],
    queryFn: ({ signal }) => apiFetch<{ count: number; items: Notificacion[] }>(`/notificaciones/pendientes`, { signal }),
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
  const user = useAppStore((s) => s.user)
  return useQuery({
    enabled: !!user,
    queryKey: ["usuarios", user?.id, qs],
    queryFn: ({ signal }) => apiFetch<{ items: UsuarioItem[] }>(`/usuarios${qs ? `?${qs}` : ""}`, { signal }),
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
  const user = useAppStore((s) => s.user)
  return useQuery({
    enabled: !!user,
    queryKey: ["tipos-equipo", user?.id],
    queryFn: ({ signal }) => apiFetch<{ items: { id: string; nombre: string }[] }>(`/tipos-equipo`, { signal }),
  })
}

export function useCrearTipoEquipo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nombre: string) => apiFetch<{ item: { id: string; nombre: string } }>(`/tipos-equipo`, { method: "POST", body: JSON.stringify({ nombre }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tipos-equipo"] }),
  })
}
