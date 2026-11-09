"use client"

import { useNotificacionesPendientes, useMarcarLeidas, useMarcarLeida } from "@/lib/hooks"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { Bell, CheckCheck, Inbox } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "ahora"
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  return `hace ${d} d`
}

export function NotificacionesButton() {
  const { data } = useNotificacionesPendientes()
  const marcarTodas = useMarcarLeidas()
  const marcarUna = useMarcarLeida()
  const setView = useAppStore((s) => s.setView)
  const setSelected = useAppStore((s) => s.setView)
  const count = data?.count ?? 0
  const items = data?.items ?? []

  // Notificaciones push visuales: detectar nuevas y mostrar toast
  const seenRef = useRef<Set<string>>(new Set())
  const firstRender = useRef(true)
  useEffect(() => {
    if (!items.length) { firstRender.current = false; return }
    if (firstRender.current) {
      // primera carga: marcar como vistos sin disparar toasts
      items.forEach((n) => seenRef.current.add(n.id))
      firstRender.current = false
      return
    }
    const nuevas = items.filter((n) => !seenRef.current.has(n.id))
    nuevas.forEach((n, i) => {
      seenRef.current.add(n.id)
      const icon = n.tipo === "cambio_estado" ? "🔄" : n.tipo === "asignacion" ? "📥" : "🔔"
      toast(`${icon} ${n.titulo}`, {
        description: n.mensaje,
        duration: 6000,
        style: { borderLeft: "4px solid #10b981" },
        action: n.reporteId
          ? { label: "Ver", onClick: () => setSelected("reporte-detail", { reporteId: n.reporteId! }) }
          : undefined,
        position: "top-right",
      })
      // evita spam masivo: toca un máximo de 3 toasts por ciclo
      if (i >= 2) return
    })
  }, [items, setSelected])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificaciones">
          <AnimatePresence>
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
                className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground"
              >
                {count > 9 ? "9+" : count}
              </motion.span>
            )}
          </AnimatePresence>
          <Bell className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notificaciones</p>
          {count > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => marcarTodas.mutate()} disabled={marcarTodas.isPending}>
              <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
              <Inbox className="h-8 w-8" />
              <p className="text-xs">No tienes notificaciones nuevas</p>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => {
                      marcarUna.mutate(n.id)
                      if (n.reporteId) setSelected("reporte-detail", { reporteId: n.reporteId })
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-institucional text-white">
                      <Bell className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{n.titulo}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{n.mensaje}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(n.fecha)}</p>
                    </div>
                    <span className={cn("mt-1 h-2 w-2 shrink-0 rounded-full", !n.leida ? "bg-emerald-500" : "bg-transparent")} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t p-2 text-center">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setView("reportes")}>
            Ver reportes
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
