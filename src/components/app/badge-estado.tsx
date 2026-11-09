"use client"

import { Badge } from "@/components/ui/badge"
import { ESTADOS, PRIORIDADES } from "@/lib/constants"
import { cn } from "@/lib/utils"

const colorMap: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border-amber-300/40",
  blue: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300 border-sky-300/40",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 border-emerald-300/40",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border-slate-300/40",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300 border-orange-300/40",
  red: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300 border-red-300/40",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300 border-yellow-300/40",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300 border-cyan-300/40",
  fuchsia: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 border-fuchsia-300/40",
}

export function BadgeEstado({ estado }: { estado: string }) {
  const e = ESTADOS.find((x) => x.value === estado)
  if (!e) return <Badge variant="outline">{estado}</Badge>
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", colorMap[e.color])}>
      <span aria-hidden>{e.emoji}</span>
      {e.label}
    </span>
  )
}

export function BadgePrioridad({ prioridad }: { prioridad: string }) {
  const p = PRIORIDADES.find((x) => x.value === prioridad)
  if (!p) return <Badge variant="outline">{prioridad}</Badge>
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", colorMap[p.color])}>
      {p.label}
    </span>
  )
}
