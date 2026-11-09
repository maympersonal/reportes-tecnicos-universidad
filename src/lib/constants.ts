// Constantes del Sistema de Reportes Técnicos

export type Rol = "superadmin" | "admin" | "tecnico" | "auditor"
export type Estado = "pendiente" | "en_proceso" | "resuelto" | "cerrado"
export type Prioridad = "baja" | "media" | "alta" | "critica"

export const ESTADOS: { value: Estado; label: string; color: string; emoji: string }[] = [
  { value: "pendiente", label: "Pendiente", color: "amber", emoji: "⏳" },
  { value: "en_proceso", label: "En proceso", color: "blue", emoji: "🔄" },
  { value: "resuelto", label: "Resuelto", color: "emerald", emoji: "✅" },
  { value: "cerrado", label: "Cerrado", color: "slate", emoji: "📦" },
]

export const PRIORIDADES: { value: Prioridad; label: string; color: string }[] = [
  { value: "baja", label: "Baja", color: "slate" },
  { value: "media", label: "Media", color: "amber" },
  { value: "alta", label: "Alta", color: "orange" },
  { value: "critica", label: "Crítica", color: "red" },
]

export const ROLES: { value: Rol; label: string; area: string }[] = [
  { value: "superadmin", label: "Superadministrador", area: "Dirección de Innovación Digital" },
  { value: "admin", label: "Administrador", area: "Dirección de Innovación Digital" },
  { value: "tecnico", label: "Técnico", area: "Dirección de Servicios Tecnológicos" },
  { value: "auditor", label: "Auditor", area: "Dirección de Servicios Tecnológicos" },
]

export const ESTADO_LABEL: Record<Estado, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
}

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
}

export const ROL_LABEL: Record<Rol, string> = {
  superadmin: "Superadministrador",
  admin: "Administrador",
  tecnico: "Técnico",
  auditor: "Auditor",
}

export const ROL_AREA: Record<Rol, string> = {
  superadmin: "Dirección de Innovación Digital",
  admin: "Dirección de Innovación Digital",
  tecnico: "Dirección de Servicios Tecnológicos",
  auditor: "Dirección de Servicios Tecnológicos",
}

// Permisos por rol (defaults). superadmin = todo.
export type Permiso =
  | "reportes.crear"
  | "reportes.editar"
  | "reportes.eliminar"
  | "reportes.ver_todos"
  | "reportes.asignar"
  | "reportes.cambiar_estado"
  | "usuarios.gestionar"
  | "catalogos.gestionar"
  | "estadisticas.ver"
  | "ranking.ver"
  | "exportar"
  | "cuenta.eliminar"

export const PERMISOS_POR_ROL: Record<Rol, Permiso[]> = {
  superadmin: [
    "reportes.crear", "reportes.editar", "reportes.eliminar", "reportes.ver_todos",
    "reportes.asignar", "reportes.cambiar_estado", "usuarios.gestionar", "catalogos.gestionar",
    "estadisticas.ver", "ranking.ver", "exportar", "cuenta.eliminar",
  ],
  admin: [
    "reportes.crear", "reportes.editar", "reportes.eliminar", "reportes.ver_todos",
    "reportes.asignar", "reportes.cambiar_estado", "usuarios.gestionar", "catalogos.gestionar",
    "estadisticas.ver", "ranking.ver", "exportar", "cuenta.eliminar",
  ],
  tecnico: ["reportes.crear", "reportes.editar", "reportes.cambiar_estado", "estadisticas.ver", "ranking.ver", "exportar", "cuenta.eliminar"],
  auditor: ["reportes.ver_todos", "estadisticas.ver", "ranking.ver", "exportar"],
}

export const TODOS_PERMISOS: { key: Permiso; label: string }[] = [
  { key: "reportes.crear", label: "Crear reportes" },
  { key: "reportes.editar", label: "Editar reportes" },
  { key: "reportes.eliminar", label: "Eliminar reportes" },
  { key: "reportes.ver_todos", label: "Ver todos los reportes" },
  { key: "reportes.asignar", label: "Asignar técnicos" },
  { key: "reportes.cambiar_estado", label: "Cambiar estado de reportes" },
  { key: "usuarios.gestionar", label: "Gestionar usuarios y permisos" },
  { key: "catalogos.gestionar", label: "Gestionar catálogos" },
  { key: "estadisticas.ver", label: "Ver estadísticas" },
  { key: "ranking.ver", label: "Ver ranking" },
  { key: "exportar", label: "Exportar (Excel/PDF/Word)" },
  { key: "cuenta.eliminar", label: "Eliminar propia cuenta (olvido)" },
]

// Catálogos por defecto
export const TIPOS_TAREA_DEFAULT = [
  { codigo: "activos_fijos", nombre: "Activos fijos" },
  { codigo: "reparacion_hardware", nombre: "Reparación de hardware" },
  { codigo: "actualizacion_sistema", nombre: "Actualización de sistema" },
  { codigo: "recuperacion_cuentas", nombre: "Recuperación de cuentas" },
  { codigo: "mantenimiento_preventivo", nombre: "Mantenimiento preventivo" },
  { codigo: "soporte_red", nombre: "Soporte de red" },
  { codigo: "instalacion_software", nombre: "Instalación de software" },
  { codigo: "otros", nombre: "Otros" },
]

export const TIPOS_AREA_DEFAULT = [
  { nombre: "Académica", descripcion: "Áreas académicas y de docencia" },
  { nombre: "Administrativa", descripcion: "Áreas administrativas" },
  { nombre: "TI", descripcion: "Tecnologías de la información" },
  { nombre: "Servicios", descripcion: "Servicios generales" },
]

// Tipos de equipo por defecto
export const TIPOS_EQUIPO_DEFAULT = [
  "PC de escritorio",
  "Laptop",
  "Torre / CPU",
  "Monitor",
  "Impresora",
  "Escáner",
  "Switch",
  "Router",
  "Access Point",
  "Proyector",
  "Servidor",
  "UPS",
  "Teléfono IP",
  "Cámara IP",
  "Otros",
]

// Niveles del ranking
export const NIVELES = [
  { nombre: "Bronce", min: 0, color: "amber", icon: "🥉" },
  { nombre: "Plata", min: 200, color: "slate", icon: "🥈" },
  { nombre: "Oro", min: 400, color: "yellow", icon: "🥇" },
  { nombre: "Platino", min: 700, color: "cyan", icon: "💎" },
  { nombre: "Diamante", min: 1000, color: "fuchsia", icon: "🔷" },
]

export function getNivel(score: number) {
  return [...NIVELES].reverse().find((n) => score >= n.min) ?? NIVELES[0]
}

// Información institucional
export const INSTITUCION = {
  nombre: "Universidad",
  direccion: "Dirección de Innovación Digital",
  departamento: "Departamento de Desarrollo y Soporte",
  direccionServicios: "Dirección de Servicios Tecnológicos",
  correo: "innovacion.did@iris.uh.cu",
  sistema: "Sistema de Reportes Técnicos",
  ley: "Ley 1581 de 2012 y Decreto 1377 de 2013 (Colombia)",
}

// Credenciales del superadmin bootstrap (única cuenta raíz)
export const SUPERADMIN_DEFAULT = {
  username: "superadmin",
  email: "innovacion.did@iris.uh.cu",
  name: "Dirección de Innovación Digital",
  cargo: "Superadministrador del Sistema",
  password: "SRT-DID-2026!", // cambiar tras primer inicio (se notifica en UI)
}

// Navegación principal
export const NAV_ITEMS = [
  { view: "dashboard", label: "Inicio", icon: "LayoutDashboard" },
  { view: "reportes", label: "Reportes", icon: "ClipboardList" },
  { view: "usuarios", label: "Usuarios", icon: "Users", permiso: "usuarios.gestionar" },
  { view: "ranking", label: "Ranking", icon: "Trophy" },
  { view: "estadisticas", label: "Estadísticas", icon: "BarChart3" },
] as const

export const NAV_LEGAL = [
  { view: "privacidad", label: "Privacidad", icon: "Shield" },
  { view: "terminos", label: "Términos", icon: "FileText" },
] as const

export type ViewKey =
  | "dashboard"
  | "reportes"
  | "reporte-detail"
  | "reporte-nuevo"
  | "reporte-editar"
  | "usuarios"
  | "ranking"
  | "estadisticas"
  | "privacidad"
  | "terminos"
