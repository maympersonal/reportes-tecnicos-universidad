import { create } from "zustand"
import { persist } from "zustand/middleware"
import { PERMISOS_POR_ROL, type ViewKey } from "@/lib/constants"

export type CurrentUser = {
  id: string
  username: string
  email: string
  name: string
  role: "admin" | "tecnico" | "auditor"
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
  sessionVersion: number
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

type PersistedAppState = Partial<Pick<AppState, "user" | "token" | "sidebarCollapsed" | "theme" | "view">>

export const useAppStore = create<AppState>()(
  persist<AppState, [], [], PersistedAppState>(
    (set, get) => ({
      user: null,
      token: null,
      sessionVersion: 0,
      setAuth: (user, token) => {
        const previous = get()
        const changed = previous.user?.id !== user?.id || previous.token !== token
        set({
          user,
          token,
          ...(changed ? {
            sessionVersion: previous.sessionVersion + 1,
            view: "dashboard",
            selectedReporteId: null,
            reportesFilter: {},
          } : {}),
        })
      },
      logout: () => set((state) => ({
        user: null,
        token: null,
        sessionVersion: state.sessionVersion + 1,
        view: "dashboard",
        selectedReporteId: null,
        reportesFilter: {},
      })),

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
      version: 1,
      migrate: (persistedState) => {
        const state = persistedState as PersistedAppState
        if (state.user && ["superadmin", "admin"].includes(state.user.role)) {
          return {
            ...state,
            user: { ...state.user, role: "admin" as const, permisos: [...PERMISOS_POR_ROL.admin] },
          }
        }
        return state
      },
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
