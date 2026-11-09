"use client"

import { useAppStore } from "@/lib/store"
import { Sidebar } from "@/components/app/sidebar"
import { Topbar } from "@/components/app/topbar"
import { LoginView } from "@/components/app/views/login-view"
import { DashboardView } from "@/components/app/views/dashboard-view"
import { ReportesView } from "@/components/app/views/reportes-view"
import { ReporteDetailView } from "@/components/app/views/reporte-detail-view"
import { ReporteFormView } from "@/components/app/views/reporte-form-view"
import { EstadisticasView } from "@/components/app/views/estadisticas-view"
import { RankingView } from "@/components/app/views/ranking-view"
import { PrivacidadView } from "@/components/app/views/privacidad-view"
import { TerminosView } from "@/components/app/views/terminos-view"
import { UsuariosView } from "@/components/app/views/usuarios-view"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { INSTITUCION } from "@/lib/constants"
import { useEffect, useState } from "react"
import { Shield, FileText } from "lucide-react"

function ViewRouter() {
  const view = useAppStore((s) => s.view)
  switch (view) {
    case "dashboard":
      return <DashboardView />
    case "reportes":
      return <ReportesView />
    case "reporte-detail":
      return <ReporteDetailView />
    case "reporte-nuevo":
    case "reporte-editar":
      return <ReporteFormView />
    case "usuarios":
      return <UsuariosView />
    case "estadisticas":
      return <EstadisticasView />
    case "ranking":
      return <RankingView />
    case "privacidad":
      return <PrivacidadView />
    case "terminos":
      return <TerminosView />
    default:
      return <DashboardView />
  }
}

function LegalFooter() {
  const setView = useAppStore((s) => s.setView)
  return (
    <footer className="mt-auto border-t bg-background/60 px-4 py-3 text-center text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 sm:flex-row">
        <p>
          © {new Date().getFullYear()} {INSTITUCION.sistema} — {INSTITUCION.direccion}
        </p>
        <div className="flex items-center gap-4">
          <button onClick={() => setView("privacidad")} className="inline-flex items-center gap-1 hover:text-foreground">
            <Shield className="h-3 w-3" /> Privacidad
          </button>
          <button onClick={() => setView("terminos")} className="inline-flex items-center gap-1 hover:text-foreground">
            <FileText className="h-3 w-3" /> Términos
          </button>
          <a href={`mailto:${INSTITUCION.correo}`} className="hover:text-foreground">
            {INSTITUCION.correo}
          </a>
        </div>
      </div>
    </footer>
  )
}

export function AppShell() {
  const user = useAppStore((s) => s.user)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Cmd/Ctrl + K → ir a reportes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        useAppStore.getState().setView("reportes")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  if (!user) return <LoginView />

  return (
    <div className="flex min-h-screen w-full">
      {/* Sidebar desktop */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar />
      </div>

      {/* Sidebar móvil */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onToggleMobileSidebar={() => setMobileOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-3 py-4 sm:px-4 sm:py-6">
          <div key={useAppStore.getState().view} className="animate-fade-in-up">
            <ViewRouter />
          </div>
        </main>
        <LegalFooter />
      </div>
    </div>
  )
}
