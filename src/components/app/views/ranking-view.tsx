"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence, type Variants } from "framer-motion"
import { useRanking } from "@/lib/hooks"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Search, Trophy, FileSpreadsheet, Crown, Eye, LayoutList, Medal, Star, Sparkles,
} from "lucide-react"
import { getNivel, INSTITUCION, type ViewKey } from "@/lib/constants"
import { apiDownload } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { CountUp, Confetti, MotionCard, itemSlideUp } from "@/components/app/motion-primitives"

type RankItem = {
  id: string
  name: string
  cargo: string | null
  resueltos: number
  asignados: number
  tiempoProm: number | null
  estrellas: number
  score: number
  activo: boolean
}

const nivelColorMap: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300 border-amber-300/40",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300 border-slate-300/40",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/15 dark:text-yellow-300 border-yellow-300/40",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300 border-cyan-300/40",
  fuchsia: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300 border-fuchsia-300/40",
}

const podiumRowAccent: Record<number, string> = {
  0: "bg-amber-50/60 dark:bg-amber-500/10 border-l-4 border-l-amber-400",
  1: "bg-slate-50/60 dark:bg-slate-500/10 border-l-4 border-l-slate-400",
  2: "bg-orange-50/60 dark:bg-orange-500/10 border-l-4 border-l-orange-400",
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function NivelBadge({ score }: { score: number }) {
  const nivel = getNivel(score)
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium", nivelColorMap[nivel.color])}>
      <span aria-hidden>{nivel.icon}</span>
      {nivel.nombre}
    </span>
  )
}

function Estrellas({ count, animate: anim = false }: { count: number; animate?: boolean }) {
  const filled = Math.max(0, Math.min(5, count))
  return (
    <span className="inline-flex items-center text-xs" aria-label={`${filled} de 5 estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const StarEl = (
          <Star className={cn("h-3 w-3", i < filled ? "fill-amber-400 text-amber-400" : "fill-transparent text-muted-foreground/40")} />
        )
        if (!anim) return <span key={i}>{StarEl}</span>
        return (
          <motion.span key={i} initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 260, damping: 14 }}>
            {StarEl}
          </motion.span>
        )
      })}
    </span>
  )
}

// Variantes del podio
const podiumContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } },
}

function PodiumCard({ item, position, isTop }: { item: RankItem; position: number; isTop: boolean }) {
  const nivel = getNivel(item.score)
  const medalEmoji = position === 1 ? "🥇" : position === 2 ? "🥈" : "🥉"
  // Tamaños reducidos: avatar top h-12 w-12 sm:h-14 sm:w-14, otros h-10 w-10 sm:h-12 sm:w-12
  const avatarSize = isTop
    ? "h-12 w-12 text-base sm:h-14 sm:w-14 sm:text-lg"
    : "h-10 w-10 text-sm sm:h-12 sm:w-12 sm:text-base"
  const [confettiFire, setConfettiFire] = useState(false)

  useEffect(() => {
    if (isTop) {
      const t = setTimeout(() => setConfettiFire(true), 600)
      return () => clearTimeout(t)
    }
  }, [isTop])

  // Color de borde / glow por posición
  const ringClass = isTop
    ? "border-amber-300/70 shadow-[0_6px_28px_-10px_rgba(245,158,11,0.45)]"
    : position === 2
      ? "border-slate-300/60"
      : "border-orange-300/50"

  return (
    <motion.div
      variants={itemSlideUp}
      className={cn(
        "relative",
        isTop && "sm:-mt-3",
        // orden: #2 izq, #1 centro, #3 der
        position === 2 && "sm:order-1",
        isTop && "sm:order-2",
        position === 3 && "sm:order-3"
      )}
    >
      <motion.div
        whileHover={{ y: -4, scale: 1.015 }}
        transition={{ type: "spring", stiffness: 300, damping: 18 }}
        className="h-full"
      >
        <Card className={cn("relative flex h-full flex-col items-center overflow-hidden text-center", ringClass)}>
          {/* Glow de fondo para el #1 */}
          {isTop && <div className="absolute inset-0 bg-gradient-to-b from-amber-400/15 via-transparent to-transparent" />}

          {/* Corona animada (solo #1) */}
          {isTop && (
            <motion.div
              className="absolute left-1/2 top-1 z-10 -translate-x-1/2 text-2xl sm:text-3xl"
              initial={{ y: -20, opacity: 0, scale: 0.5 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 10 }}
            >
              <motion.span
                animate={{ y: [0, -5, 0], rotate: [-4, 4, -4] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                className="inline-block drop-shadow"
                aria-hidden
              >
                <Crown className="h-6 w-6 sm:h-7 sm:w-7 fill-amber-400 text-amber-500" />
              </motion.span>
            </motion.div>
          )}

          {/* Confetti */}
          {isTop && <Confetti fire={confettiFire} />}

          <CardContent className="relative w-full space-y-2 p-3 pt-7 sm:p-4 sm:pt-8">
            {/* Avatar con ring */}
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 220, damping: 12 }}
                className={cn(
                  "flex items-center justify-center rounded-full bg-institucional font-bold text-white shadow-md ring-2",
                  avatarSize,
                  isTop ? "ring-amber-300" : position === 2 ? "ring-slate-300" : "ring-orange-300"
                )}
              >
                {getInitials(item.name)}
              </motion.div>
            </div>

            {/* Medalla */}
            <motion.div
              className="text-xl sm:text-2xl"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 180, damping: 12 }}
              aria-hidden
            >
              {medalEmoji}
            </motion.div>

            {/* Nombre y cargo */}
            <div>
              <p className="truncate text-sm font-bold sm:text-base">{item.name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{item.cargo ?? "Técnico"}</p>
            </div>

            {/* Nivel y estrellas */}
            <div className="flex flex-col items-center gap-1">
              <NivelBadge score={item.score} />
              <Estrellas count={item.estrellas} animate={isTop} />
            </div>

            {/* Score con count-up — texto reducido */}
            <div>
              <p className="text-xl font-extrabold tracking-tight text-emerald-600 sm:text-2xl">
                <CountUp value={item.score} duration={1.3} />
              </p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">puntos · {nivel.nombre}</p>
            </div>

            {/* Stats — compacto */}
            <div className="grid grid-cols-3 gap-1 border-t pt-2 text-center">
              <div>
                <p className="text-xs font-semibold sm:text-sm">{item.resueltos}</p>
                <p className="text-[9px] uppercase text-muted-foreground">Resueltos</p>
              </div>
              <div>
                <p className="text-xs font-semibold sm:text-sm">{item.asignados}</p>
                <p className="text-[9px] uppercase text-muted-foreground">Asignados</p>
              </div>
              <div>
                <p className="text-xs font-semibold sm:text-sm">{item.tiempoProm != null ? `${item.tiempoProm}h` : "—"}</p>
                <p className="text-[9px] uppercase text-muted-foreground">Promedio</p>
              </div>
            </div>

            {/* Estado */}
            <div className="flex justify-center">
              {item.activo ? (
                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] dark:bg-emerald-500/15 dark:text-emerald-300">Activo</Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}

function AnimatedProgress({ value, delay = 0.3 }: { value: number; delay?: number }) {
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
      <motion.div
        className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, Math.min(100, value))}%` }}
        transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  )
}

function SkeletonPodium() {
  return (
    <div className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
      {[1, 0, 2].map((i) => (
        <Card key={i} className={i === 0 ? "sm:order-2 sm:-mt-3" : "sm:order-1"}>
          <CardContent className="space-y-2 p-3 pt-8 sm:p-4">
            <div className="flex justify-center"><Skeleton className="h-14 w-14 rounded-full" /></div>
            <Skeleton className="mx-auto h-4 w-28" />
            <Skeleton className="mx-auto h-3 w-20" />
            <Skeleton className="mx-auto h-7 w-16" />
            <Skeleton className="mx-auto h-6 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

const tableRowVariate: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
}

export function RankingView() {
  const setView = useAppStore((s) => s.setView)
  const [query, setQuery] = useState("")
  const [debounced, setDebounced] = useState("")
  const [periodo, setPeriodo] = useState("general")
  const [mode, setMode] = useState<"podio" | "tabla">("podio")

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const { data, isLoading } = useRanking(debounced || undefined)
  const items = useMemo<RankItem[]>(() => (data?.items ?? []) as RankItem[], [data])
  const top3 = items.slice(0, 3)
  const resto = items.slice(3)
  const maxScore = useMemo(() => (items.length ? Math.max(...items.map((i) => i.score), 1) : 1), [items])

  const exportarExcel = async () => {
    try {
      await apiDownload("/exportar/estadisticas/excel", "ranking.xlsx")
      toast.success("Excel exportado correctamente")
    } catch (e) {
      toast.error("No se pudo exportar: " + (e as Error).message)
    }
  }
  const verDetalle = () => {
    setView("reportes" as ViewKey)
    toast.info("Mostrando reportes")
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Trophy className="h-6 w-6 text-amber-500 sm:h-7 sm:w-7" /> Ranking de técnicos
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">Desempeño del equipo técnico · {INSTITUCION.direccion}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportarExcel} size="sm" className="gap-2 bg-institucional text-white hover:opacity-90 sm:size-default">
            <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
          </Button>
        </div>
      </motion.div>

      {/* Controles — compactos en una sola fila desde sm+ */}
      <MotionCard>
        <Card>
          <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar técnico…" className="h-9 pl-8" aria-label="Buscar técnico" />
            </div>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="h-9 w-full sm:w-[160px]" aria-label="Período">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="mes">Este mes</SelectItem>
                <SelectItem value="trimestre">Este trimestre</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 self-end rounded-md border p-0.5 sm:self-auto">
              <Button size="sm" variant={mode === "podio" ? "default" : "ghost"} onClick={() => setMode("podio")} className="gap-1 h-8 px-2.5">
                <Trophy className="h-3.5 w-3.5" /> <span className="hidden xs:inline sm:inline">Podio</span>
              </Button>
              <Button size="sm" variant={mode === "tabla" ? "default" : "ghost"} onClick={() => setMode("tabla")} className="gap-1 h-8 px-2.5">
                <LayoutList className="h-3.5 w-3.5" /> <span className="hidden xs:inline sm:inline">Tabla</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </MotionCard>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {mode === "podio" ? <SkeletonPodium /> : (
              <Card>
                <CardContent className="p-3 sm:p-4">
                  <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ) : items.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center sm:py-16">
                <Trophy className="h-10 w-10 text-muted-foreground/40" />
                <p className="px-4 text-sm text-muted-foreground">
                  {debounced ? "No se encontraron técnicos para la búsqueda." : "Aún no hay técnicos con actividad registrada."}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : mode === "podio" ? (
          <motion.div key="podio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4 sm:space-y-5">
            {top3.length > 0 && (
              <motion.div
                variants={podiumContainer}
                initial="hidden"
                animate="show"
                className="mx-auto grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end"
              >
                {top3.length >= 2 && <PodiumCard item={top3[1]} position={2} isTop={false} />}
                <PodiumCard item={top3[0]} position={1} isTop />
                {top3.length >= 3 && <PodiumCard item={top3[2]} position={3} isTop={false} />}
              </motion.div>
            )}

            {/* Tabla restante */}
            {resto.length > 0 && (
              <Card>
                <CardHeader className="p-3 sm:p-4 sm:pb-2">
                  <CardTitle className="text-sm sm:text-base">Posiciones restantes</CardTitle>
                  <CardDescription className="text-xs">Técnicos a partir del puesto {top3.length + 1}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto scrollbar-thin">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10 text-center">#</TableHead>
                          <TableHead>Técnico</TableHead>
                          <TableHead className="hidden text-right sm:table-cell">Score</TableHead>
                          <TableHead className="hidden text-right sm:table-cell">Resueltos</TableHead>
                          <TableHead className="hidden text-right sm:table-cell">Tiempo</TableHead>
                          <TableHead className="text-center hidden md:table-cell">Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {resto.map((it, i) => (
                          <motion.tr
                            key={it.id}
                            variants={tableRowVariate}
                            initial="hidden"
                            animate="show"
                            transition={{ delay: i * 0.05 }}
                            className="border-b transition-colors hover:bg-muted/40"
                          >
                            <TableCell className="text-center font-mono text-xs font-semibold text-muted-foreground">{top3.length + i + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-institucional text-[10px] font-bold text-white sm:h-8 sm:w-8 sm:text-xs">{getInitials(it.name)}</div>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium sm:text-sm">{it.name}</p>
                                  <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">{it.cargo ?? "Técnico"}</p>
                                </div>
                                <span className="ml-auto sm:hidden"><NivelBadge score={it.score} /></span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold sm:text-sm sm:table-cell hidden"><NivelBadge score={it.score} /></TableCell>
                            <TableCell className="text-right text-xs hidden sm:table-cell">{it.resueltos}</TableCell>
                            <TableCell className="text-right text-xs hidden sm:table-cell">{it.tiempoProm != null ? `${it.tiempoProm}h` : "—"}</TableCell>
                            <TableCell className="text-center hidden md:table-cell">
                              {it.activo ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px] dark:bg-emerald-500/15 dark:text-emerald-300">Activo</Badge> : <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" onClick={verDetalle} className="h-7 gap-1 px-2 text-xs"><Eye className="h-3 w-3" /> Ver</Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        ) : (
          // Modo tabla completa
          <motion.div key="tabla" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card>
              <CardHeader className="p-3 sm:p-4 sm:pb-2">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base"><Sparkles className="h-4 w-4 text-amber-500" /> Tabla general de ranking</CardTitle>
                <CardDescription className="text-xs">{items.length} técnico(s) ordenado(s) por score</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10 text-center">#</TableHead>
                        <TableHead>Técnico</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Nivel</TableHead>
                        <TableHead className="min-w-[120px] sm:w-40">Score</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Resueltos</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Asignados</TableHead>
                        <TableHead className="text-right hidden md:table-cell">Tiempo prom.</TableHead>
                        <TableHead className="text-center hidden sm:table-cell">Estrellas</TableHead>
                        <TableHead className="text-center hidden md:table-cell">Estado</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((it, i) => (
                        <motion.tr
                          key={it.id}
                          variants={tableRowVariate}
                          initial="hidden"
                          animate="show"
                          transition={{ delay: i * 0.04 }}
                          className={cn("border-b transition-colors hover:bg-muted/40", i < 3 && podiumRowAccent[i])}
                        >
                          <TableCell className="text-center">
                            <motion.span
                              className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                                i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
                                : i === 1 ? "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300"
                                : i === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                                : "bg-muted text-muted-foreground")}
                            >{i + 1}</motion.span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-institucional text-[10px] font-bold text-white sm:h-8 sm:w-8 sm:text-xs">{getInitials(it.name)}</div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium sm:text-sm">{it.name}</p>
                                <p className="truncate text-[10px] text-muted-foreground sm:text-[11px]">{it.cargo ?? "Técnico"}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell"><NivelBadge score={it.score} /></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <AnimatedProgress value={(it.score / maxScore) * 100} delay={0.2 + i * 0.04} />
                              <span className="w-8 shrink-0 text-right text-xs font-semibold sm:w-10">{it.score}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-xs hidden sm:table-cell">{it.resueltos}</TableCell>
                          <TableCell className="text-right text-xs hidden md:table-cell">{it.asignados}</TableCell>
                          <TableCell className="text-right text-xs hidden md:table-cell">{it.tiempoProm != null ? `${it.tiempoProm}h` : "—"}</TableCell>
                          <TableCell className="text-center hidden sm:table-cell"><Estrellas count={it.estrellas} /></TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            {it.activo ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px] dark:bg-emerald-500/15 dark:text-emerald-300">Activo</Badge> : <Badge variant="secondary" className="text-[10px]">Inactivo</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={verDetalle} className="h-7 gap-1 px-2 text-xs"><Eye className="h-3 w-3" /> Ver</Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leyenda de niveles */}
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col gap-2 p-3 text-xs text-muted-foreground sm:p-4">
          <div className="flex items-center gap-2 font-medium text-foreground"><Medal className="h-4 w-4" /> Niveles de ranking</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span>🥉 Bronce (0+)</span>
            <span>🥈 Plata (200+)</span>
            <span>🥇 Oro (400+)</span>
            <span>💎 Platino (700+)</span>
            <span>🔷 Diamante (1000+)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
