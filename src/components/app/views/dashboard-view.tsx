"use client"

import { useResumen, usePorMes, usePorTipo, usePorArea, useRanking, useReportes } from "@/lib/hooks"
import { useAppStore } from "@/lib/store"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { BadgeEstado, BadgePrioridad } from "@/components/app/badge-estado"
import { Skeleton } from "@/components/ui/skeleton"
import { INSTITUCION } from "@/lib/constants"
import { toast } from "sonner"
import { motion } from "framer-motion"
import { CountUp } from "@/components/app/motion-primitives"
import {
  Plus, FileSpreadsheet, Activity, CheckCircle2, Clock, AlertTriangle,
  ListChecks, ClipboardList, AlertOctagon, Trophy, ArrowRight, Server, Users, RefreshCw, FileText,
} from "lucide-react"
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts"
import { apiDownload } from "@/lib/api"

const PIE_COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"]

function Kpi({ icon: Icon, label, value, sub, color = "text-emerald-600", delay = 0 }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number | null; sub?: string; color?: string; delay?: number }) {
  const isPct = typeof value === "number" && label.toLowerCase().includes("salud") || label.toLowerCase().includes("tasa")
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }} whileHover={{ y: -3 }}>
      <Card className="h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">
                {value == null ? <span className="text-muted-foreground/50">—</span> : <CountUp value={value} duration={1.1} suffix={isPct ? "%" : ""} />}
              </p>
              {sub && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{sub}</p>}
            </div>
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function DashboardView() {
  const user = useAppStore((s) => s.user)
  const setView = useAppStore((s) => s.setView)
  const setReportesFilter = useAppStore((s) => s.setReportesFilter)

  const { data: resumen, isLoading } = useResumen()
  const { data: porMes } = usePorMes()
  const { data: porTipo } = usePorTipo()
  const { data: porArea } = usePorArea()
  const { data: ranking } = useRanking()
  const { data: recientes } = useReportes({ page: 1, pageSize: 6 })

  const irConFiltro = (f: Record<string, string>) => {
    setReportesFilter(f)
    setView("reportes")
  }

  const exportarExcel = async () => {
    try {
      await apiDownload(`/exportar/reportes/excel`, "reportes.xlsx")
      toast.success("Excel exportado")
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const exportarInformePDF = async () => {
    try {
      await apiDownload(`/exportar/informe/pdf`, `informe-ejecutivo-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success("Informe ejecutivo PDF generado")
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const hora = new Date().getHours()
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches"
  const emoji = hora < 12 ? "☀️" : hora < 19 ? "🌤️" : "🌙"

  const top5 = (ranking?.items ?? []).slice(0, 5)

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">
            {saludo}, {user?.name.split(" ")[0]} {emoji}
          </h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} ·{" "}
            {INSTITUCION.direccion}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setView("reporte-nuevo")} className="gap-2">
            <Plus className="h-4 w-4" /> Nuevo reporte
          </Button>
          <Button variant="outline" onClick={exportarExcel} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button variant="outline" onClick={exportarInformePDF} className="gap-2">
            <FileText className="h-4 w-4" /> Informe PDF
          </Button>
          <Button variant="outline" onClick={() => setView("estadisticas")} className="gap-2">
            <Activity className="h-4 w-4" /> Estadísticas
          </Button>
        </div>
      </motion.div>

      {/* Centro de comando */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Todos los reportes", icon: ClipboardList, filter: {}, color: "bg-slate-100 dark:bg-slate-800/60" },
          { label: "Pendientes", icon: Clock, filter: { estado: "pendiente" }, color: "bg-amber-50 dark:bg-amber-500/10" },
          { label: "Críticos", icon: AlertOctagon, filter: { prioridad: "critica" }, color: "bg-red-50 dark:bg-red-500/10" },
          { label: "Resueltos", icon: CheckCircle2, filter: { estado: "resuelto" }, color: "bg-emerald-50 dark:bg-emerald-500/10" },
        ].map(({ label, icon: Icon, filter, color }, i) => (
          <motion.button
            key={label}
            onClick={() => irConFiltro(filter)}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -4, scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:shadow-md ${color}`}
          >
            <Icon className="h-6 w-6 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-bold">Ver</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* KPIs avanzados */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Activity} label="Índice de salud" value={resumen?.salud ?? null} sub="Tasa - críticos abiertos" color="text-emerald-600" delay={0.05} />
        <Kpi icon={CheckCircle2} label="Tasa de resolución" value={resumen?.tasaResolucion ?? null} sub={`${resumen?.resueltos ?? 0} resueltos`} color="text-sky-600" delay={0.1} />
        <Kpi icon={Clock} label="Tiempo promedio" value={resumen?.tiempoProm ?? null} sub="Resolución media (h)" color="text-amber-600" delay={0.15} />
        <Kpi icon={ListChecks} label="Reportes activos" value={resumen?.activos ?? null} sub={`${resumen?.total ?? 0} en total`} color="text-fuchsia-600" delay={0.2} />
      </div>

      {/* Alertas críticas */}
      {(resumen?.criticos ?? 0) > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="flex-row items-center gap-2 space-y-0 p-4">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div className="flex-1">
              <CardTitle className="text-base text-destructive">Alertas críticas</CardTitle>
              <CardDescription className="text-destructive/80">
                {resumen?.criticos} reporte(s) crítico(s) sin atender
              </CardDescription>
            </div>
            <Button size="sm" variant="destructive" onClick={() => irConFiltro({ prioridad: "critica" })} className="gap-1">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Tendencia mensual */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tendencia mensual</CardTitle>
            <CardDescription>Reportes creados vs. resueltos (6 meses)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={porMes?.items ?? []}>
                  <defs>
                    <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" opacity={0.4} />
                  <XAxis dataKey="label" fontSize={11} stroke="#94a3b8" />
                  <YAxis fontSize={11} stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="total" name="Creados" stroke="#10b981" strokeWidth={2} fill="url(#gTotal)" />
                  <Area type="monotone" dataKey="resueltos" name="Resueltos" stroke="#0ea5e9" strokeWidth={2} fill="url(#gRes)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie por tipo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución por tipo</CardTitle>
            <CardDescription>Tipos de tarea</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={porTipo?.items ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40} paddingAngle={2}>
                  {(porTipo?.items ?? []).map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
              {(porTipo?.items ?? []).slice(0, 6).map((it, i) => (
                <div key={it.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="truncate text-muted-foreground">{it.name}</span>
                  <span className="ml-auto font-medium">{it.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Barras por área */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Reportes por área</CardTitle>
            <CardDescription>Distribución institucional</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={porArea?.items ?? []} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                <Bar dataKey="value" name="Reportes" radius={[0, 4, 4, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top técnicos */}
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Trophy className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <CardTitle className="text-base">Top técnicos</CardTitle>
              <CardDescription>Por desempeño</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setView("ranking")} className="gap-1 text-xs">
              Ver <ArrowRight className="h-3 w-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {top5.length === 0 && <Skeleton className="h-16 w-full" />}
            {top5.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border p-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${i === 0 ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.resueltos} resueltos · {t.score} pts</p>
                </div>
                <span className="text-amber-500">{"★".repeat(t.estrellas)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Reportes recientes */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base">Reportes recientes</CardTitle>
            <CardDescription>Últimos 6 reportes</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => setView("reportes")} className="gap-1">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Código</th>
                  <th className="px-4 py-2 font-medium">Tipo</th>
                  <th className="px-4 py-2 font-medium">Estado</th>
                  <th className="px-4 py-2 font-medium">Prioridad</th>
                  <th className="px-4 py-2 font-medium">Técnico</th>
                  <th className="px-4 py-2 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(recientes?.items ?? []).map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setView("reporte-detail", { reporteId: r.id })}
                    className="cursor-pointer hover:bg-muted/40"
                  >
                    <td className="px-4 py-2 font-mono text-xs font-semibold text-emerald-600">{r.codigo}</td>
                    <td className="px-4 py-2">{r.tipoTarea?.nombre ?? "—"}</td>
                    <td className="px-4 py-2"><BadgeEstado estado={r.estado} /></td>
                    <td className="px-4 py-2"><BadgePrioridad prioridad={r.prioridad} /></td>
                    <td className="px-4 py-2 text-xs">{r.tecnicoNombre ?? "Sin asignar"}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {new Date(r.fechaCreacion).toLocaleDateString("es-ES")}
                    </td>
                  </tr>
                ))}
                {!recientes && <tr><td colSpan={6} className="p-4"><Skeleton className="h-8 w-full" /></td></tr>}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Activity footer */}
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col gap-2 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1"><Server className="h-3 w-3" /> Sistema: <span className="font-medium text-emerald-600">Operativo</span></span>
            <span className="inline-flex items-center gap-1"><RefreshCw className="h-3 w-3" /> En cola: {resumen?.pendientes ?? 0}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> Técnicos activos: {(ranking?.items ?? []).length}</span>
          </div>
          <span>Última actualización: {new Date().toLocaleTimeString("es-ES")}</span>
        </CardContent>
      </Card>
    </div>
  )
}
