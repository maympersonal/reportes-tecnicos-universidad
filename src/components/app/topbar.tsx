"use client"

import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb"
import { Sun, Moon, Menu, Search } from "lucide-react"
import { NotificacionesButton } from "@/components/app/notificaciones"

const VIEW_TITLES: Record<string, string> = {
  dashboard: "Inicio",
  reportes: "Reportes",
  "reporte-detail": "Detalle del reporte",
  "reporte-nuevo": "Nuevo reporte",
  "reporte-editar": "Editar reporte",
  ranking: "Ranking",
  estadisticas: "Estadísticas",
  privacidad: "Privacidad",
  terminos: "Términos",
}

function saludo() {
  const h = new Date().getHours()
  if (h < 12) return { txt: "Buenos días", emoji: "☀️" }
  if (h < 19) return { txt: "Buenas tardes", emoji: "🌤️" }
  return { txt: "Buenas noches", emoji: "🌙" }
}

export function Topbar({ onToggleMobileSidebar }: { onToggleMobileSidebar?: () => void }) {
  const view = useAppStore((s) => s.view)
  const user = useAppStore((s) => s.user)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const setView = useAppStore((s) => s.setView)

  const s = saludo()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {onToggleMobileSidebar && (
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onToggleMobileSidebar} aria-label="Menú">
          <Menu className="h-5 w-5" />
        </Button>
      )}
      <div className="hidden md:block">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold">{VIEW_TITLES[view] ?? "Inicio"}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="ml-1 hidden flex-1 lg:block">
        {user && (
          <p className="text-sm text-muted-foreground">
            {s.txt}, <span className="font-medium text-foreground">{user.name.split(" ")[0]}</span> {s.emoji}
          </p>
        )}
      </div>

      {/* Buscador visual (Cmd+K) */}
      <Button
        variant="outline"
        size="sm"
        className="ml-auto hidden gap-2 text-muted-foreground sm:flex"
        onClick={() => setView("reportes")}
      >
        <Search className="h-4 w-4" />
        <span className="text-xs">Buscar reportes…</span>
        <kbd className="hidden rounded border bg-muted px-1 text-[10px] sm:inline">⌘K</kbd>
      </Button>

      <NotificacionesButton />

      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Cambiar tema">
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    </header>
  )
}
