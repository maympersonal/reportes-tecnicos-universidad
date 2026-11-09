"use client"

import { useState, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import {
  useResumen,
  usePorMes,
  usePorTipo,
  usePorArea,
  usePorTecnico,
} from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { apiDownload } from "@/lib/api"
import { INSTITUCION } from "@/lib/constants"
import { toast } from "sonner"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts"
import {
  FileSpreadsheet,
  Filter,
  X,
  Activity,
  Clock,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  ListChecks,
  BarChart3,
  FileText,
} from "lucide-react"

// Paleta institucional consistente (esmeralda / sky / ámbar)
const CHART_COLORS = [
  "#10b981", // emerald
  "#0ea5e9", // sky
  "#f59e0b", // amber
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#84cc16", // lime
  "#f97316", // orange
  "#ec4899", // pink
]

const COLOR_TOTAL = "#10b981"
const COLOR_RESUELTOS = "#0ea5e9"
const COLOR_ASIGNADOS = "#f59e0b"

// Animación de entrada del card (staggered)
const cardEnter = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
})

type KpiProps = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  sub?: string
  iconColor?: string
  loading?: boolean
}

function KpiCard({ icon: Icon, label, value, sub, iconColor = "text-emerald-600", loading }: KpiProps) {
  return (
    <Card>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-6 w-14 sm:h-7 sm:w-16" />
            ) : (
              <p className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
            )}
            {sub && <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">{sub}</p>}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted sm:h-9 sm:w-9">
            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChartCard({
  title,
  description,
  children,
  className,
  delay = 0,
}: {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <motion.div {...cardEnter(delay)} className={className}>
      <Card className="h-full">
        <CardHeader className="p-3 sm:p-4 sm:pb-2">
          <CardTitle className="text-sm sm:text-base">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">{children}</CardContent>
      </Card>
    </motion.div>
  )
}

function ChartSkeleton() {
  return <Skeleton className="h-[220px] w-full sm:h-[260px]" />
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[200px] w-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
      <BarChart3 className="h-8 w-8 opacity-40" />
      <p>{message}</p>
    </div>
  )
}

export function EstadisticasView() {
  const [desde, setDesde] = useState<string>("")
  const [hasta, setHasta] = useState<string>("")
  // Forzar animación de recharts la primera vez que se monta en la sesión
  const [firstRender, setFirstRender] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setFirstRender(false), 50)
    return () => clearTimeout(t)
  }, [])

  // Filtros aplicados (en vivo para UX fluida)
  const desdeF = desde || undefined
  const hastaF = hasta || undefined

  const { data: resumen, isLoading: loadingResumen } = useResumen(desdeF, hastaF)
  const { data: porMes, isLoading: loadingMes } = usePorMes()
  const { data: porTipo, isLoading: loadingTipo } = usePorTipo(desdeF, hastaF)
  const { data: porArea, isLoading: loadingArea } = usePorArea(desdeF, hastaF)
  const { data: porTecnico, isLoading: loadingTecnico } = usePorTecnico(desdeF, hastaF)

  const r = resumen

  const limpiar = () => {
    setDesde("")
    setHasta("")
    toast.info("Filtros limpiados")
  }

  const exportarExcel = async () => {
    try {
      const qs = new URLSearchParams()
      if (desdeF) qs.set("desde", desdeF)
      if (hastaF) qs.set("hasta", hastaF)
      const path = `/exportar/estadisticas/excel${qs.toString() ? `?${qs}` : ""}`
      await apiDownload(path, "estadisticas.xlsx")
      toast.success("Excel exportado correctamente")
    } catch (e) {
      toast.error("No se pudo exportar: " + (e as Error).message)
    }
  }

  const exportarPDF = async () => {
    try {
      await apiDownload("/exportar/informe/pdf", "informe-ejecutivo.pdf")
      toast.success("Informe PDF exportado correctamente")
    } catch (e) {
      toast.error("No se pudo exportar: " + (e as Error).message)
    }
  }

  // Datos para gráfico de técnicos
  const tecnicoData = useMemo(() => {
    return (porTecnico?.items ?? []).map((t) => ({
      name: t.name,
      asignados: t.asignados,
      resueltos: t.resueltos,
    }))
  }, [porTecnico])

  const hayDatosMes = (porMes?.items ?? []).length > 0
  const hayDatosTipo = (porTipo?.items ?? []).length > 0
  const hayDatosArea = (porArea?.items ?? []).length > 0
  const hayDatosTecnico = tecnicoData.length > 0

  // Clave que cambia cuando se monta por primera vez → fuerza animación de recharts
  const chartKey = firstRender ? "fresh" : "ready"

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
          <h1 className="text-xl font-bold sm:text-2xl">Estadísticas</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Indicadores institucionales · {INSTITUCION.direccion}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportarExcel} size="sm" className="gap-2 bg-institucional text-white hover:opacity-90 sm:size-default">
            <FileSpreadsheet className="h-4 w-4" /> Exportar Excel
          </Button>
          <Button onClick={exportarPDF} size="sm" variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/30 dark:text-emerald-300 dark:hover:bg-emerald-500/10 sm:size-default">
            <FileText className="h-4 w-4" /> Informe PDF
          </Button>
        </div>
      </motion.div>

      {/* Filtros */}
      <motion.div {...cardEnter(0.05)}>
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0 p-3 sm:p-4 sm:pb-2">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-xs sm:text-sm">Filtros de fecha</CardTitle>
              <CardDescription className="text-[11px] sm:text-xs">
                Acota los indicadores a un rango temporal
              </CardDescription>
            </div>
            {(desde || hasta) && (
              <Button size="sm" variant="ghost" onClick={limpiar} className="h-7 gap-1 px-2 text-xs">
                <X className="h-3 w-3" /> Limpiar
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
              <div className="flex-1">
                <Label htmlFor="desde" className="text-xs">
                  Desde
                </Label>
                <Input
                  id="desde"
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  className="mt-1 h-9 max-w-[220px]"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="hasta" className="text-xs">
                  Hasta
                </Label>
                <Input
                  id="hasta"
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                  className="mt-1 h-9 max-w-[220px]"
                />
              </div>
              <Button variant="outline" size="sm" onClick={limpiar} className="h-9 gap-1">
                <X className="h-3 w-3" /> Limpiar filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* KPIs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-6"
      >
        <KpiCard
          icon={ClipboardList}
          label="Total"
          value={r?.total ?? "—"}
          sub="Reportes en rango"
          iconColor="text-emerald-600"
          loading={loadingResumen}
        />
        <KpiCard
          icon={Clock}
          label="Pendientes"
          value={r?.pendientes ?? "—"}
          sub="Sin iniciar"
          iconColor="text-amber-600"
          loading={loadingResumen}
        />
        <KpiCard
          icon={Activity}
          label="En proceso"
          value={r?.enProceso ?? "—"}
          sub="En trabajo"
          iconColor="text-sky-600"
          loading={loadingResumen}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Resueltos"
          value={r?.resueltos ?? "—"}
          sub="Atendidos"
          iconColor="text-emerald-600"
          loading={loadingResumen}
        />
        <KpiCard
          icon={PackageCheck}
          label="Cerrados"
          value={r?.cerrados ?? "—"}
          sub="Finalizados"
          iconColor="text-slate-600"
          loading={loadingResumen}
        />
        <KpiCard
          icon={ListChecks}
          label="Tiempo prom."
          value={`${r?.tiempoProm ?? "—"} h`}
          sub="Resolución media"
          iconColor="text-emerald-600"
          loading={loadingResumen}
        />
      </motion.div>

      {/* Gráfico de línea — Reportes por mes */}
      <ChartCard
        title="Reportes por mes"
        description="Creados vs. resueltos (últimos 6 meses)"
        delay={0.15}
      >
        {loadingMes ? (
          <ChartSkeleton />
        ) : !hayDatosMes ? (
          <EmptyState message="No hay datos mensuales disponibles" />
        ) : (
          <ResponsiveContainer key={`mes-${chartKey}`} width="100%" height={220}>
            <LineChart data={porMes?.items ?? []} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.35} />
              <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                formatter={(v: number) => [v, ""]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="total"
                name="Creados"
                stroke={COLOR_TOTAL}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                isAnimationActive
                animationDuration={900}
                animationBegin={200}
              />
              <Line
                type="monotone"
                dataKey="resueltos"
                name="Resueltos"
                stroke={COLOR_RESUELTOS}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                strokeDasharray="5 4"
                isAnimationActive
                animationDuration={900}
                animationBegin={350}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Pie — Distribución por tipo */}
        <ChartCard
          title="Distribución por tipo"
          description="Proporción de reportes según tipo de tarea"
          delay={0.25}
        >
          {loadingTipo ? (
            <ChartSkeleton />
          ) : !hayDatosTipo ? (
            <EmptyState message="Sin reportes en el rango" />
          ) : (
            <>
              <ResponsiveContainer key={`tipo-${chartKey}`} width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={porTipo?.items ?? []}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={64}
                    innerRadius={32}
                    paddingAngle={2}
                    isAnimationActive
                    animationDuration={900}
                    animationBegin={200}
                  >
                    {(porTipo?.items ?? []).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 grid max-h-28 grid-cols-1 gap-1 overflow-y-auto scrollbar-thin text-[11px] sm:grid-cols-2">
                {(porTipo?.items ?? []).map((it, i) => (
                  <div key={it.name} className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="truncate text-muted-foreground">{it.name}</span>
                    <span className="ml-auto font-medium">{it.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </ChartCard>

        {/* Bar horizontal — Reportes por área */}
        <ChartCard
          title="Reportes por área"
          description="Distribución institucional"
          delay={0.35}
        >
          {loadingArea ? (
            <ChartSkeleton />
          ) : !hayDatosArea ? (
            <EmptyState message="Sin reportes en el rango" />
          ) : (
            <ResponsiveContainer key={`area-${chartKey}`} width="100%" height={240}>
              <BarChart
                data={porArea?.items ?? []}
                layout="vertical"
                margin={{ left: 10, right: 20, top: 8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
                <XAxis type="number" fontSize={11} allowDecimals={false} stroke="#94a3b8" />
                <YAxis
                  type="category"
                  dataKey="name"
                  fontSize={11}
                  width={110}
                  stroke="#94a3b8"
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                  cursor={{ fill: "rgba(16,185,129,0.08)" }}
                />
                <Bar
                  dataKey="value"
                  name="Reportes"
                  radius={[0, 4, 4, 0]}
                  fill={COLOR_TOTAL}
                  isAnimationActive
                  animationDuration={900}
                  animationBegin={200}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Carga por técnico */}
      <ChartCard
        title="Carga por técnico"
        description="Reportes asignados vs. resueltos por técnico"
        delay={0.45}
      >
        {loadingTecnico ? (
          <ChartSkeleton />
        ) : !hayDatosTecnico ? (
          <EmptyState message="No hay técnicos con reportes en el rango" />
        ) : (
          <ResponsiveContainer key={`tec-${chartKey}`} width="100%" height={260}>
            <BarChart
              data={tecnicoData}
              margin={{ left: 0, right: 16, top: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.35} />
              <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid #e2e8f0" }}
                cursor={{ fill: "rgba(16,185,129,0.06)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                dataKey="asignados"
                name="Asignados"
                fill={COLOR_ASIGNADOS}
                radius={[4, 4, 0, 0]}
                isAnimationActive
                animationDuration={900}
                animationBegin={200}
              />
              <Bar
                dataKey="resueltos"
                name="Resueltos"
                fill={COLOR_TOTAL}
                radius={[4, 4, 0, 0]}
                isAnimationActive
                animationDuration={900}
                animationBegin={350}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Nota */}
      <motion.div {...cardEnter(0.55)}>
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col gap-1 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <span>
              Datos calculados en vivo desde la base institucional · {INSTITUCION.sistema}
            </span>
            <span className="mt-1 sm:mt-0">
              Salud del sistema:{" "}
              <span className="font-semibold text-emerald-600">{r?.salud ?? "—"}/100</span>
              {" · "}
              Tasa de resolución:{" "}
              <span className="font-semibold text-sky-600">{r?.tasaResolucion ?? "—"}%</span>
            </span>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
