"use client"

import { useRef, useState } from "react"
import { useAppStore } from "@/lib/store"
import {
  useReporte,
  useCambiarEstado,
  useEliminarArchivo,
  useSubirArchivo,
  useTecnicos,
} from "@/lib/hooks"
import { apiDownload } from "@/lib/api"
import { ESTADOS, ESTADO_LABEL } from "@/lib/constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BadgeEstado, BadgePrioridad } from "@/components/app/badge-estado"
import { toast } from "sonner"
import {
  ArrowLeft, FileText, FileSpreadsheet, FileType, Pencil, Upload, Trash2,
  Download, Paperclip, ClipboardList, User, Mail, Briefcase, MapPin,
  Wrench, Calendar, Clock, CheckCircle2, History, MessageSquare, UserCog,
  Tag, Inbox, FileBox,
} from "lucide-react"

function fmtFecha(s?: string | null) {
  if (!s) return "—"
  try {
    return new Date(s).toLocaleString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "—"
  }
}

// Tipo local extendido para equipos: el backend ya serializa tipoEquipoId
// y tipoTexto, pero la tipografía de hooks.ts no los expone.
type EquipoReporteItem = {
  id: string
  tipoEquipoId: string | null
  tipoTexto: string | null
  codigoActivo: string | null
  marca: string | null
  modelo: string | null
  serie: string | null
}

function Field({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border bg-muted/20 p-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-background text-emerald-600 ring-1 ring-border">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className={`mt-0.5 text-sm ${mono ? "font-mono" : ""}`}>
          {value ?? <span className="text-muted-foreground">—</span>}
        </p>
      </div>
    </div>
  )
}

export function ReporteDetailView() {
  const user = useAppStore((s) => s.user)
  const setView = useAppStore((s) => s.setView)
  const id = useAppStore((s) => s.selectedReporteId)

  const isAuditor = user?.role === "auditor"

  const { data, isLoading, isError, error, refetch } = useReporte(id)
  const item = data?.item

  const cambiarEstado = useCambiarEstado(id ?? "")
  const eliminarArchivo = useEliminarArchivo(id ?? "")
  const subirArchivo = useSubirArchivo(id ?? "")
  const { data: tecnicos } = useTecnicos()

  const [estadoForm, setEstadoForm] = useState({
    estado: "",
    comentario: "",
    solucion: "",
    tecnicoAsignadoId: "",
  })

  // Sincronizar el form con el reporte cargado (patrón "reset on prop change" recomendado por React)
  const [syncedId, setSyncedId] = useState<string | null>(null)
  const itemId = item?.id ?? null
  if (item && itemId !== syncedId) {
    setSyncedId(itemId)
    setEstadoForm({
      estado: item.estado,
      comentario: "",
      solucion: item.solucion ?? "",
      tecnicoAsignadoId: item.tecnicoAsignadoId ?? "",
    })
  }

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estado vacío
  if (!id) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <Inbox className="h-10 w-10" />
        <p className="text-sm">No hay reporte seleccionado.</p>
        <Button variant="outline" size="sm" onClick={() => setView("reportes")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver a reportes
        </Button>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    )
  }

  if (isError || !item) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <Inbox className="h-10 w-10" />
        <p className="text-sm">{(error as Error)?.message || "No se pudo cargar el reporte"}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setView("reportes")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Volver
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  const exportar = async (tipo: "pdf" | "excel" | "word") => {
    const filename = `${item.codigo}.${tipo === "excel" ? "xlsx" : tipo}`
    try {
      await apiDownload(`/exportar/reportes/${item.id}/${tipo}`, filename)
      toast.success(`${tipo.toUpperCase()} exportado`)
    } catch (e) {
      toast.error((e as Error).message || "Error al exportar")
    }
  }

  const submitEstado = (e: React.FormEvent) => {
    e.preventDefault()
    if (!estadoForm.estado) {
      toast.error("Selecciona un estado")
      return
    }
    cambiarEstado.mutate(
      {
        estado: estadoForm.estado,
        comentario: estadoForm.comentario || undefined,
        solucion: estadoForm.solucion || undefined,
        tecnicoAsignadoId:
          user?.role === "admin"
            ? estadoForm.tecnicoAsignadoId || null
            : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Estado actualizado correctamente")
          setEstadoForm((s) => ({ ...s, comentario: "" }))
        },
        onError: (err: unknown) =>
          toast.error((err as Error).message || "Error al cambiar estado"),
      }
    )
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo excede 10MB")
      return
    }
    subirArchivo.mutate(file, {
      onSuccess: () => toast.success("Archivo subido"),
      onError: (err: unknown) =>
        toast.error((err as Error).message || "Error al subir"),
    })
    // Limpiar input
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView("reportes")}
            className="-ml-2 mb-2 gap-1 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Volver a reportes
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-emerald-600">
              {item.codigo}
            </span>
            <BadgeEstado estado={item.estado} />
            <BadgePrioridad prioridad={item.prioridad} />
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <ClipboardList className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="truncate">{item.tipoTarea?.nombre ?? "Reporte"}</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {item.area?.nombre ?? "—"} · {fmtFecha(item.fechaCreacion)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportar("pdf")}
            className="gap-2"
            title="Exportar a PDF"
          >
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportar("excel")}
            className="gap-2"
            title="Exportar a Excel"
          >
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportar("word")}
            className="gap-2"
            title="Exportar a Word"
          >
            <FileType className="h-4 w-4" /> Word
          </Button>
          {!isAuditor && (
            <Button
              size="sm"
              onClick={() => setView("reporte-editar", { reporteId: item.id })}
              className="gap-2"
            >
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* LEFT */}
        <div className="space-y-4 lg:col-span-2">
          {/* Información general */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Tag className="h-4 w-4 text-muted-foreground" />
                Información general
              </CardTitle>
              <CardDescription>Datos del reporte y del usuario afectado</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Field icon={Tag} label="Código" value={item.codigo} mono />
              <Field icon={Wrench} label="Tipo de tarea" value={item.tipoTarea?.nombre} />
              <Field icon={Briefcase} label="Área" value={item.area?.nombre} />
              <Field icon={MapPin} label="Ubicación" value={item.ubicacion} />
              <Field icon={User} label="Usuario afectado" value={item.usuarioNombre} />
              <Field icon={Briefcase} label="Cargo del usuario" value={item.usuarioCargo} />
              <Field
                icon={Mail}
                label="Correo"
                value={
                  item.usuarioCorreo ? (
                    <a
                      href={`mailto:${item.usuarioCorreo}`}
                      className="text-emerald-600 hover:underline"
                    >
                      {item.usuarioCorreo}
                    </a>
                  ) : null
                }
              />
              <Field icon={UserCog} label="Técnico asignado" value={item.tecnicoNombre ?? "Sin asignar"} />
              <Field icon={User} label="Creado por" value={item.creadoPorNombre} />
              <Field icon={Calendar} label="Fecha de creación" value={fmtFecha(item.fechaCreacion)} />
              <Field
                icon={CheckCircle2}
                label="Fecha de resolución"
                value={fmtFecha(item.fechaResolucion)}
              />
              <Field
                icon={Clock}
                label="Tiempo de resolución"
                value={
                  item.tiempoResolucionHoras != null
                    ? `${item.tiempoResolucionHoras.toFixed(1)} h`
                    : "—"
                }
              />
            </CardContent>
          </Card>

          {/* Equipos / activos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileBox className="h-4 w-4 text-muted-foreground" />
                Equipos / Activos
              </CardTitle>
              <CardDescription>
                {item.equipos.length} equipo(s) relacionado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {item.equipos.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-6 text-center text-muted-foreground">
                  <FileBox className="h-6 w-6" />
                  <p className="text-xs">Sin equipos registrados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Tipo</th>
                        <th className="px-3 py-2 font-medium">Código de activo</th>
                        <th className="px-3 py-2 font-medium">Marca</th>
                        <th className="px-3 py-2 font-medium">Modelo</th>
                        <th className="px-3 py-2 font-medium">Serie</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(item.equipos as EquipoReporteItem[]).map((eq) => (
                        <tr key={eq.id}>
                          <td className="px-3 py-2">
                            {eq.tipoTexto ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">
                                <Wrench className="h-3 w-3" />
                                {eq.tipoTexto}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {eq.codigoActivo || "—"}
                          </td>
                          <td className="px-3 py-2">{eq.marca || "—"}</td>
                          <td className="px-3 py-2">{eq.modelo || "—"}</td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {eq.serie || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Descripción */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Descripción
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {item.descripcion}
              </p>
            </CardContent>
          </Card>

          {/* Solución */}
          {item.solucion && (
            <Card className="border-emerald-300/60 bg-emerald-50/40 dark:bg-emerald-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Solución aplicada
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {item.solucion}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Archivos adjuntos */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  Archivos adjuntos
                </CardTitle>
                <CardDescription>
                  {item.archivos.length} archivo(s)
                </CardDescription>
              </div>
              {!isAuditor && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFile}
                    aria-label="Subir archivo"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={subirArchivo.isPending}
                  >
                    <Upload className="h-4 w-4" />
                    {subirArchivo.isPending ? "Subiendo…" : "Subir archivo"}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {item.archivos.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-6 text-center text-muted-foreground">
                  <Paperclip className="h-6 w-6" />
                  <p className="text-xs">Sin archivos adjuntos</p>
                </div>
              ) : (
                <ul className="max-h-72 divide-y overflow-y-auto scrollbar-thin">
                  {item.archivos.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-3 py-2.5"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <a
                          href={a.archivo}
                          download={a.nombre}
                          className="block truncate text-sm font-medium text-emerald-600 hover:underline"
                          title={a.nombre}
                        >
                          {a.nombre}
                        </a>
                        <p className="text-[11px] text-muted-foreground">
                          {a.tipo || "archivo"} · {fmtFecha(a.fechaSubida)}
                        </p>
                      </div>
                      <a
                        href={a.archivo}
                        download={a.nombre}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Descargar"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      {!isAuditor && (
                        <button
                          type="button"
                          onClick={() =>
                            eliminarArchivo.mutate(a.id, {
                              onSuccess: () => toast.success("Archivo eliminado"),
                              onError: (err: unknown) =>
                                toast.error((err as Error).message || "Error al eliminar"),
                            })
                          }
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          title="Eliminar archivo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          {/* Cambiar estado */}
          {!isAuditor && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Cambiar estado
                </CardTitle>
                <CardDescription>
                  Estado actual:{" "}
                  <span className="font-medium text-foreground">
                    {ESTADO_LABEL[item.estado as keyof typeof ESTADO_LABEL] ?? item.estado}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={submitEstado} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="estado" className="text-xs">
                      Nuevo estado
                    </Label>
                    <Select
                      value={estadoForm.estado}
                      onValueChange={(v) =>
                        setEstadoForm((s) => ({ ...s, estado: v }))
                      }
                    >
                      <SelectTrigger id="estado" className="w-full">
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((e) => (
                          <SelectItem key={e.value} value={e.value}>
                            <span aria-hidden>{e.emoji}</span> {e.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="comentario" className="text-xs">
                      Comentario (opcional)
                    </Label>
                    <Textarea
                      id="comentario"
                      rows={2}
                      placeholder="Explica brevemente el motivo del cambio…"
                      value={estadoForm.comentario}
                      onChange={(e) =>
                        setEstadoForm((s) => ({ ...s, comentario: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="solucion" className="text-xs">
                      Solución / detalle (opcional)
                    </Label>
                    <Textarea
                      id="solucion"
                      rows={3}
                      placeholder="Describe la solución aplicada…"
                      value={estadoForm.solucion}
                      onChange={(e) =>
                        setEstadoForm((s) => ({ ...s, solucion: e.target.value }))
                      }
                    />
                  </div>

                  {user?.role === "admin" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="tecnico" className="text-xs">
                        Técnico asignado
                      </Label>
                      <Select
                        value={estadoForm.tecnicoAsignadoId || "__none__"}
                        onValueChange={(v) =>
                          setEstadoForm((s) => ({
                            ...s,
                            tecnicoAsignadoId: v === "__none__" ? "" : v,
                          }))
                        }
                      >
                        <SelectTrigger id="tecnico" className="w-full">
                          <SelectValue placeholder="Sin asignar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin asignar</SelectItem>
                          {tecnicos?.items?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={cambiarEstado.isPending}
                  >
                    {cambiarEstado.isPending ? "Actualizando…" : "Actualizar estado"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Historial */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-muted-foreground" />
                Historial de cambios
              </CardTitle>
              <CardDescription>
                {item.historial.length} evento(s) registrado(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {item.historial.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-6 text-center text-muted-foreground">
                  <History className="h-6 w-6" />
                  <p className="text-xs">Sin eventos registrados</p>
                </div>
              ) : (
                <ol className="relative max-h-[28rem] space-y-4 overflow-y-auto scrollbar-thin border-l border-l-2 border-border pl-4">
                  {[...item.historial].reverse().map((h) => (
                    <li key={h.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
                      <div className="rounded-lg border bg-muted/30 p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-foreground">
                            {h.usuarioNombre}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          {h.estadoAnterior ? (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <BadgeEstado estado={h.estadoAnterior} />
                              <ArrowLeft className="h-3 w-3" />
                              <BadgeEstado estado={h.estadoNuevo} />
                            </span>
                          ) : (
                            <BadgeEstado estado={h.estadoNuevo} />
                          )}
                          <span className="ml-auto text-[11px] text-muted-foreground">
                            {fmtFecha(h.fecha)}
                          </span>
                        </div>
                        {h.comentario && (
                          <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                            “{h.comentario}”
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
