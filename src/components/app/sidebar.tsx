"use client"

import { useAppStore } from "@/lib/store"
import { NAV_ITEMS, NAV_LEGAL, ROL_LABEL, ROL_AREA, INSTITUCION, type ViewKey } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard, ClipboardList, Trophy, BarChart3, Shield, FileText,
  LogOut, Monitor, Wrench, CircleDot, Users, ChevronLeft, ChevronRight,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { EliminarCuentaDialog } from "@/components/app/eliminar-cuenta-dialog"
import { motion, AnimatePresence } from "framer-motion"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, ClipboardList, Trophy, BarChart3, Shield, FileText, Users,
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase()
}

export function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggle = useAppStore((s) => s.toggleSidebar)
  const user = useAppStore((s) => s.user)
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const logout = useAppStore((s) => s.logout)
  const [eliminarOpen, setEliminarOpen] = useState(false)

  const tienePermiso = (perm?: string) => !perm || (user?.permisos ?? []).includes(perm)

  const navItem = (item: (typeof NAV_ITEMS)[number]) => {
    if (!tienePermiso(item.permiso as string | undefined)) return null
    const Icon = iconMap[item.icon] ?? CircleDot
    const active = view === item.view
    return (
      <button
        key={item.view}
        onClick={() => setView(item.view as ViewKey)}
        className={cn(
          "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
          active
            ? "bg-institucional text-white shadow-sm"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          collapsed && "justify-center"
        )}
        title={collapsed ? item.label : undefined}
      >
        {active && !collapsed && (
          <motion.span layoutId="nav-active" className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-400" />
        )}
        <Icon className="h-4 w-4 shrink-0" />
        {!collapsed && <span className="truncate">{item.label}</span>}
      </button>
    )
  }

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Botón flotante de contraer/expandir — al frente, sobre el borde superior */}
      <motion.button
        onClick={toggle}
        whileHover={{ scale: 1.12 }}
        whileTap={{ scale: 0.92 }}
        title={collapsed ? "Expandir menú" : "Contraer menú"}
        aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
        className={cn(
          "absolute -right-3 top-4 z-50 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-institucional text-white shadow-lg"
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {collapsed ? (
            <motion.span key="r" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <ChevronRight className="h-4 w-4" />
            </motion.span>
          ) : (
            <motion.span key="l" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <ChevronLeft className="h-4 w-4" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Header / logo */}
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-institucional text-white shadow-sm">
          <Wrench className="h-5 w-5" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Reportes Técnicos</p>
            <p className="truncate text-[11px] text-muted-foreground">{INSTITUCION.direccion}</p>
          </div>
        )}
      </div>

      {/* Navegación — NO scrolleable, ocupa el espacio disponible */}
      <nav className="flex flex-1 flex-col justify-center gap-1 px-2 py-3">
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Principal
            </p>
          )}
          {NAV_ITEMS.map(navItem)}
        </div>
        <div className="mt-4 space-y-1">
          {!collapsed && (
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Legal
            </p>
          )}
          {NAV_LEGAL.map((item) => {
            const Icon = iconMap[item.icon] ?? CircleDot
            const active = view === item.view
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view as ViewKey)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-institucional text-white" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  collapsed && "justify-center"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Usuario + acciones */}
      <div className="border-t p-3">
        {user && (
          <div className={cn("flex items-center gap-2", collapsed && "justify-center")}>
            <Avatar className="h-9 w-9 border">
              <AvatarFallback className="bg-institucional text-xs font-semibold text-white">
                {initials(user.name)}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
                <p className="flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {ROL_LABEL[user.role as keyof typeof ROL_LABEL] ?? user.role}
                </p>
                <p className="truncate text-[10px] text-muted-foreground/70">
                  {ROL_AREA[user.role as keyof typeof ROL_AREA]}
                </p>
              </div>
            )}
          </div>
        )}
        <div className={cn("mt-3 flex flex-col gap-1", collapsed && "items-center")}>
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn(!collapsed && "w-full justify-start text-muted-foreground")}
            onClick={() => setEliminarOpen(true)}
            title="Eliminar mi cuenta"
          >
            <Shield className="h-4 w-4" />
            {!collapsed && <span className="text-xs">Eliminar cuenta</span>}
          </Button>
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            className={cn(!collapsed && "w-full justify-start text-muted-foreground hover:text-destructive")}
            onClick={() => logout()}
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="text-xs">Cerrar sesión</span>}
          </Button>
        </div>
      </div>

      <EliminarCuentaDialog open={eliminarOpen} onOpenChange={setEliminarOpen} />
    </aside>
  )
}

export { Monitor }
