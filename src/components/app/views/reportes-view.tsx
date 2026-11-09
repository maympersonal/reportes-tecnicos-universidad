"use client"

import { useMemo, useState } from "react"
import { useAppStore, type ReportesFilter } from "@/lib/store"
import {
  useReportes,
  useTiposTarea,
  useAreas,
} from "@/lib/hooks"
import { apiDownload } from "@/lib/api"
import { ESTADOS, PRIORIDADES, ESTADO_LABEL, PRIORIDAD_LABEL } from "@/lib/constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BadgeEstado, BadgePrioridad } from "@/components/app/badge-estado"
import { toast } from "sonner"
import {
  Plus, FileSpreadsheet, RefreshCw, Filter, X, Search, ArrowLeft, ArrowRight,
  Pencil, ClipboardList, AlertCircle, Inbox,
} from "lucide-react"

const PAGE_SIZE = 10

const ALL = "__all__"

function initials(name: string) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
}

function fmtFecha(s: string) {
  try {
    return new Date(s).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  } catch {
    return "—"
  }
}

export function ReportesView() {
  const user = useAppStore((s) => s.user)
  const setView = useAppStore((s) => s.setView)
  const storeFilter = useAppStore((s) => s.reportesFilter)
  const setReportesFilter = useAppStore((s) => s.setReportesFilter)

  const isAuditor = user?.role === "auditor"

  // Local filter state, initialized from store (so the dashboard's "ver críticos" works)
  const [filtros, setFiltros] = useState<ReportesFilter>(() => ({ ...storeFilter }))
  const [page, setPage] = useState(1)

  const applyFiltro = (next: ReportesFilter) => {
    setFiltros(next)
    setReportesFilter(next)
    setPage(1)
  }

  const { data: tiposTarea } = useTiposTarea()
  const { data: areas } = useAreas()

  const query = useMemo(
    () => ({ ...filtros, page, pageSize: PAGE_SIZE }),
    [filtros, page]
  )
  const { data, isLoading, isFetching, refetch, isError, error } = useReportes(query)

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  const updateFiltro = (k: keyof ReportesFilter, v: string | undefined) => {
    const next = { ...filtros }
    if (!v || v === "" || v === ALL) delete next[k]
    else next[k] = v
    applyFiltro(next)
  }

  const limpiar = () => applyFiltro({})

  const hayFiltros = Object.values(filtros).some((v) => v && v !== "")

  const exportarExcel = async () => {
    try {
      const params = new URLSearchParams()
      Object.entries(filtros).forEach(([k, v]) => {
        if (v) params.set(k, String(v))
      })
      const qs = params.toString()
      await apiDownload(`/exportar/reportes/excel${qs ? `?${qs}` : ""}`, "reportes.xlsx")
      toast.success("Excel exportado correctamente")
    } catch (e) {
      toast.error((e as Error).message || "Error al exportar")
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardList className="h-6 w-6 text-emerald-600" />
            Reportes
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gestiona y consulta los reportes técnicos del sistema
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
            title="Recargar lista"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Recargar</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportarExcel}
            className="gap-2"
            title="Exportar listado a Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Excel</span>
          </Button>
          {!isAuditor && (
            <Button
              size="sm"
              onClick={() => setView("reporte-nuevo")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nuevo reporte
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filtros
          </CardTitle>
          <CardDescription>Refina la búsqueda de reportes</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <Label htmlFor="f-q" className="text-xs text-muted-foreground">
              Buscar
            </Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="f-q"
                className="pl-8"
                placeholder="Código, descripción, usuario…"
                value={filtros.q ?? ""}
                onChange={(e) => updateFiltro("q", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-estado" className="text-xs text-muted-foreground">
              Estado
            </Label>
            <Select
              value={filtros.estado ?? ALL}
              onValueChange={(v) => updateFiltro("estado", v === ALL ? undefined : v)}
            >
              <SelectTrigger id="f-estado" className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {ESTADOS.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    <span aria-hidden>{e.emoji}</span> {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-tipo" className="text-xs text-muted-foreground">
              Tipo de tarea
            </Label>
            <Select
              value={filtros.tipoTarea ?? ALL}
              onValueChange={(v) => updateFiltro("tipoTarea", v === ALL ? undefined : v)}
            >
              <SelectTrigger id="f-tipo" className="w-full">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos</SelectItem>
                {tiposTarea?.items?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-prioridad" className="text-xs text-muted-foreground">
              Prioridad
            </Label>
            <Select
              value={filtros.prioridad ?? ALL}
              onValueChange={(v) => updateFiltro("prioridad", v === ALL ? undefined : v)}
            >
              <SelectTrigger id="f-prioridad" className="w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {PRIORIDADES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-area" className="text-xs text-muted-foreground">
              Área
            </Label>
            <Select
              value={filtros.area ?? ALL}
              onValueChange={(v) => updateFiltro("area", v === ALL ? undefined : v)}
            >
              <SelectTrigger id="f-area" className="w-full">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas</SelectItem>
                {areas?.items?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-full flex items-center justify-between gap-2 pt-1">
            <p className="text-xs text-muted-foreground">
              {hayFiltros ? (
                <span className="inline-flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Filtros activos · {total} resultado(s)
                </span>
              ) : (
                <span>{total} reporte(s) en total</span>
              )}
            </p>
            {hayFiltros && (
              <Button variant="ghost" size="sm" onClick={limpiar} className="gap-1 text-xs">
                <X className="h-3 w-3" /> Limpiar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="px-3">Código</TableHead>
                <TableHead className="px-3">Tipo</TableHead>
                <TableHead className="hidden px-3 sm:table-cell">Área</TableHead>
                <TableHead className="px-3">Estado</TableHead>
                <TableHead className="px-3">Prioridad</TableHead>
                <TableHead className="hidden px-3 md:table-cell">Técnico</TableHead>
                <TableHead className="hidden px-3 lg:table-cell">Fecha</TableHead>
                <TableHead className="px-3 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={`s-${i}`}>
                    <TableCell colSpan={8} className="px-3 py-3">
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-3 py-6 text-center text-sm text-destructive">
                    {(error as Error)?.message || "Error al cargar los reportes"}
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="px-3 py-12">
                    <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                      <Inbox className="h-8 w-8" />
                      <p className="text-sm font-medium">No se encontraron reportes</p>
                      <p className="text-xs">Ajusta los filtros o crea un nuevo reporte</p>
                      {!isAuditor && (
                        <Button size="sm" variant="outline" className="mt-2 gap-2" onClick={() => setView("reporte-nuevo")}>
                          <Plus className="h-4 w-4" /> Crear reporte
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setView("reporte-detail", { reporteId: r.id })}
                  >
                    <TableCell className="px-3 font-mono text-xs font-semibold text-emerald-600">
                      {r.codigo}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate px-3 text-sm" title={r.tipoTarea?.nombre ?? ""}>
                      {r.tipoTarea?.nombre ?? "—"}
                    </TableCell>
                    <TableCell className="hidden px-3 text-sm sm:table-cell">
                      {r.area?.nombre ?? "—"}
                    </TableCell>
                    <TableCell className="px-3">
                      <BadgeEstado estado={r.estado} />
                    </TableCell>
                    <TableCell className="px-3">
                      <BadgePrioridad prioridad={r.prioridad} />
                    </TableCell>
                    <TableCell className="hidden px-3 md:table-cell">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-institucional text-[10px] font-semibold text-white">
                            {initials(r.tecnicoNombre ?? "—")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">
                          {r.tecnicoNombre ?? <span className="text-muted-foreground">Sin asignar</span>}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden px-3 text-xs text-muted-foreground lg:table-cell">
                      {fmtFecha(r.fechaCreacion)}
                    </TableCell>
                    <TableCell className="px-3 text-right">
                      {!isAuditor ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            setView("reporte-editar", { reporteId: r.id })
                          }}
                          title="Editar reporte"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Solo lectura</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginación */}
      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            Página <span className="font-semibold text-foreground">{page}</span> de{" "}
            <span className="font-semibold text-foreground">{totalPages}</span> ·{" "}
            {total} reporte(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="gap-1"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Leyenda rápida de estados */}
      <Card className="bg-muted/30">
        <CardContent className="flex flex-wrap items-center gap-4 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Leyenda:</span>
          {ESTADOS.map((e) => (
            <span key={e.value} className="inline-flex items-center gap-1">
              <span aria-hidden>{e.emoji}</span>
              {e.label}
            </span>
          ))}
          <span className="mx-1 hidden h-3 w-px bg-border sm:inline-block" />
          {PRIORIDADES.map((p) => (
            <span key={p.value} className="inline-flex items-center gap-1">
              <BadgePrioridad prioridad={p.value} />
              <span className="sr-only">{PRIORIDAD_LABEL[p.value as keyof typeof PRIORIDAD_LABEL]}</span>
            </span>
          ))}
          <span className="ml-auto hidden text-[10px] sm:inline">
            {ESTADO_LABEL.pendiente && "Solo visible para administradores y técnicos autorizados"}
          </span>
        </CardContent>
      </Card>
    </div>
  )
}
