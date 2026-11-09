import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { ViewKey } from "@/lib/constants"

export type CurrentUser = {
  id: string
  username: string
  email: string
  name: string
  role: "superadmin" | "admin" | "tecnico" | "auditor"
  cargo: string | null
  telefono: string | null
  areaId: string | null
  permisos: string[]
}

// Filtros globales de la lista de reportes (para enlazar desde el dashboard)
export type ReportesFilter = {
  q?: string
  estado?: string
  prioridad?: string
  tipoTarea?: string
  area?: string
  tecnico?: string
}

type AppState = {
  // Auth
  user: CurrentUser | null
  token: string | null
  setAuth: (user: CurrentUser | null, token: string | null) => void
  logout: () => void

  // Navegación (SPA)
  view: ViewKey
  selectedReporteId: string | null
  setView: (view: ViewKey, opts?: { reporteId?: string }) => void

  // Reportes filtros (para que el dashboard pueda precargar filtros)
  reportesFilter: ReportesFilter
  setReportesFilter: (f: ReportesFilter) => void

  // UI
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void
  theme: "light" | "dark"
  toggleTheme: () => void
  setTheme: (t: "light" | "dark") => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null, view: "dashboard" }),

      view: "dashboard",
      selectedReporteId: null,
      setView: (view, opts) =>
        set({
          view,
          selectedReporteId: opts?.reporteId ?? get().selectedReporteId,
        }),

      reportesFilter: {},
      setReportesFilter: (f) => set({ reportesFilter: f }),

      sidebarCollapsed: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      theme: "light",
      toggleTheme: () => set({ theme: get().theme === "light" ? "dark" : "light" }),
      setTheme: (t) => set({ theme: t }),
    }),
    {
      name: "srt-storage",
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        sidebarCollapsed: s.sidebarCollapsed,
        theme: s.theme,
        view: s.view,
      }),
    }
  )
)
