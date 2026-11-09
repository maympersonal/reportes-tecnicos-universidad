"use client"

import { useState } from "react"
import { useAppStore } from "@/lib/store"
import {
  useReporte,
  useCrearReporte,
  useActualizarReporte,
  useTiposTarea,
  useTiposEquipo,
  useCrearTipoEquipo,
  useAreas,
  useTecnicos,
} from "@/lib/hooks"
import { apiFetch } from "@/lib/api"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PRIORIDADES } from "@/lib/constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  ArrowLeft, Plus, Trash2, Save, AlertCircle, ClipboardList,
  Wrench, Briefcase, MapPin, User, Mail, FileBox, MessageSquare,
  CheckCircle2, UserCog, Inbox, Loader2, Cpu, ChevronDown,
} from "lucide-react"

// Tipo local extendido para equipos (incluye tipoEquipoId y tipoTexto que ya
// envía el backend pero la tipografía de hooks.ts no expone).
type EquipoReporteDTO = {
  id: string
  tipoEquipoId: string | null
  tipoTexto: string | null
  codigoActivo: string | null
  marca: string | null
  modelo: string | null
  serie: string | null
}

type Equipo = {
  // "" = no seleccionado, id del "Otros" = mostrar input nuevo, otro id = tipo normal
  tipoEquipoId: string
  nuevoTipoNombre: string
  codigoActivo: string
  marca: string
  modelo: string
  serie: string
}

type FormState = {
  tipoTareaId: string
  nuevoTipoTareaNombre: string
  areaId: string
  prioridad: string
  ubicacion: string
  usuarioNombre: string
  usuarioCargo: string
  usuarioCorreo: string
  descripcion: string
  solucion: string
  tecnicoAsignadoId: string
  equipos: Equipo[]
}

const emptyEquipo: Equipo = {
  tipoEquipoId: "",
  nuevoTipoNombre: "",
  codigoActivo: "",
  marca: "",
  modelo: "",
  serie: "",
}

const emptyForm: FormState = {
  tipoTareaId: "",
  nuevoTipoTareaNombre: "",
  areaId: "",
  prioridad: "media",
  ubicacion: "",
  usuarioNombre: "",
  usuarioCargo: "",
  usuarioCorreo: "",
  descripcion: "",
  solucion: "",
  tecnicoAsignadoId: "",
  equipos: [],
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export function ReporteFormView() {
  const user = useAppStore((s) => s.user)
  const view = useAppStore((s) => s.view)
  const selectedReporteId = useAppStore((s) => s.selectedReporteId)
  const setView = useAppStore((s) => s.setView)

  const isEdit = view === "reporte-editar"
  const isAuditor = user?.role === "auditor"

  const { data: tiposTarea } = useTiposTarea()
  const { data: tiposEquipo } = useTiposEquipo()
  const { data: areas } = useAreas()
  const { data: tecnicos } = useTecnicos()

  const { data: repData, isLoading } = useReporte(
    isEdit ? selectedReporteId : null
  )

  const crear = useCrearReporte()
  const actualizar = useActualizarReporte(selectedReporteId ?? "")
  const crearTipoEquipo = useCrearTipoEquipo()
  const qc = useQueryClient()

  // Mutación local para crear tipo de tarea (no existe hook dedicado en @/lib/hooks)
  const crearTipoTarea = useMutation({
    mutationFn: async (nombre: string) =>
      apiFetch<{ item: { id: string; codigo: string; nombre: string } }>(
        `/tipos-tarea`,
        { method: "POST", body: JSON.stringify({ nombre }) }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tipos-tarea"] }),
  })

  const [form, setForm] = useState<FormState>(emptyForm)
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  // Prefill cuando se edita (patrón "reset on prop change" recomendado por React)
  const [syncedId, setSyncedId] = useState<string | null>(null)
  const itemId = isEdit ? repData?.item?.id ?? null : null
  if (isEdit && repData?.item && itemId !== syncedId) {
    setSyncedId(itemId)
    const r = repData.item
    setForm({
      tipoTareaId: r.tipoTarea?.id ?? "",
      nuevoTipoTareaNombre: "",
      areaId: r.area?.id ?? "",
      prioridad: r.prioridad ?? "media",
      ubicacion: r.ubicacion ?? "",
      usuarioNombre: r.usuarioNombre ?? "",
      usuarioCargo: r.usuarioCargo ?? "",
      usuarioCorreo: r.usuarioCorreo ?? "",
      descripcion: r.descripcion ?? "",
      solucion: r.solucion ?? "",
      tecnicoAsignadoId: r.tecnicoAsignadoId ?? "",
      equipos: r.equipos?.length
        ? (r.equipos as EquipoReporteDTO[]).map((e) => ({
            tipoEquipoId: e.tipoEquipoId ?? "",
            nuevoTipoNombre: "",
            codigoActivo: e.codigoActivo ?? "",
            marca: e.marca ?? "",
            modelo: e.modelo ?? "",
            serie: e.serie ?? "",
          }))
        : [],
    })
  }

  // Empty state: auditor reaches form (shouldn't happen), or edit without id
  if (isAuditor) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <Inbox className="h-10 w-10" />
        <p className="text-sm">El rol auditor no puede crear ni editar reportes.</p>
        <Button variant="outline" size="sm" onClick={() => setView("reportes")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver a reportes
        </Button>
      </div>
    )
  }
  if (isEdit && !selectedReporteId) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <Inbox className="h-10 w-10" />
        <p className="text-sm">No hay reporte seleccionado para editar.</p>
        <Button variant="outline" size="sm" onClick={() => setView("reportes")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver a reportes
        </Button>
      </div>
    )
  }
  if (isEdit && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  // --- Helpers para detectar "Otros" ---
  const tipoTareaOtrosId = tiposTarea?.items?.find((t) => t.codigo === "otros")?.id
  const isTipoTareaOtros = !!tipoTareaOtrosId && form.tipoTareaId === tipoTareaOtrosId

  const tipoEquipoOtrosId = tiposEquipo?.items?.find((t) => t.nombre === "Otros")?.id
  const isEquipoOtros = (eq: Equipo) =>
    !!tipoEquipoOtrosId && eq.tipoEquipoId === tipoEquipoOtrosId

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }))

  const addEquipo = () =>
    setForm((s) => ({ ...s, equipos: [...s.equipos, { ...emptyEquipo }] }))

  const removeEquipo = (idx: number) =>
    setForm((s) => ({ ...s, equipos: s.equipos.filter((_, i) => i !== idx) }))

  const updateEquipo = (idx: number, field: keyof Equipo, value: string) =>
    setForm((s) => ({
      ...s,
      equipos: s.equipos.map((e, i) => (i === idx ? { ...e, [field]: value } : e)),
    }))

  const validate = (): string[] => {
    const errs: string[] = []
    if (!form.tipoTareaId) errs.push("El tipo de tarea es obligatorio")
    else if (isTipoTareaOtros && !form.nuevoTipoTareaNombre.trim())
      errs.push("Debes definir el nombre del nuevo tipo de tarea")
    if (!form.areaId) errs.push("El área es obligatoria")
    if (!form.usuarioNombre.trim()) errs.push("El nombre del usuario afectado es obligatorio")
    if (!form.usuarioCorreo.trim()) errs.push("El correo del usuario afectado es obligatorio")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.usuarioCorreo))
      errs.push("El correo del usuario no es válido")
    if (!form.descripcion.trim()) errs.push("La descripción es obligatoria")
    if (!form.prioridad) errs.push("La prioridad es obligatoria")
    form.equipos.forEach((eq, idx) => {
      if (eq.tipoEquipoId && isEquipoOtros(eq) && !eq.nuevoTipoNombre.trim()) {
        errs.push(
          `Equipo ${idx + 1}: el nombre del nuevo tipo de equipo es obligatorio`
        )
      }
    })
    return errs
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (errs.length > 0) {
      toast.error("Revisa los campos requeridos")
      return
    }

    setSubmitting(true)
    try {
      // --- 1. Resuelve tipo de tarea (crea nuevo si "Otros") ---
      let tipoTareaId = form.tipoTareaId
      if (isTipoTareaOtros) {
        const nombre = form.nuevoTipoTareaNombre.trim()
        // Dedup gracioso: si ya existe un tipo con el mismo nombre (case-insensitive),
        // reutilizarlo en lugar de fallar por unique constraint de codigo.
        const existing = tiposTarea?.items?.find(
          (t) => t.nombre.trim().toLowerCase() === nombre.toLowerCase()
        )
        if (existing) {
          tipoTareaId = existing.id
          toast.info("Se usó un tipo de tarea existente con el mismo nombre")
        } else {
          try {
            const res = await crearTipoTarea.mutateAsync(nombre)
            tipoTareaId = res.item.id
            toast.success(`Tipo de tarea "${nombre}" creado`)
          } catch (err) {
            // Si el POST falla (p.ej. unique constraint), intentar recuperar
            // un tipo existente re-fetchando el catálogo.
            const msg = (err as Error)?.message || "Error al crear el tipo de tarea"
            toast.error(msg)
            setErrors([msg])
            return
          }
        }
      }

      // --- 2. Resuelve tipos de equipo por fila (crea nuevos si "Otros") ---
      const equiposPayload: Array<{
        tipoEquipoId: string | null
        tipoTexto: string | null
        codigoActivo: string | null
        marca: string | null
        modelo: string | null
        serie: string | null
      }> = []

      for (const eq of form.equipos) {
        // Saltar filas donde no se seleccionó ningún tipo
        if (!eq.tipoEquipoId) continue

        let tipoEquipoId: string | null = eq.tipoEquipoId
        let tipoTexto: string | null = null

        if (isEquipoOtros(eq)) {
          const nombre = eq.nuevoTipoNombre.trim()
          // useCrearTipoEquipo ya dedup en servidor: si existe, devuelve el existente
          const res = await crearTipoEquipo.mutateAsync(nombre)
          tipoEquipoId = res.item.id
          tipoTexto = res.item.nombre
        } else {
          const t = tiposEquipo?.items?.find((x) => x.id === eq.tipoEquipoId)
          tipoTexto = t?.nombre ?? null
        }

        equiposPayload.push({
          tipoEquipoId,
          tipoTexto,
          codigoActivo: eq.codigoActivo.trim() || null,
          marca: eq.marca.trim() || null,
          modelo: eq.modelo.trim() || null,
          serie: eq.serie.trim() || null,
        })
      }

      // --- 3. Construye el body del reporte ---
      const body: Record<string, unknown> = {
        tipoTareaId,
        areaId: form.areaId,
        prioridad: form.prioridad,
        ubicacion: form.ubicacion || null,
        usuarioNombre: form.usuarioNombre.trim(),
        usuarioCargo: form.usuarioCargo.trim() || null,
        usuarioCorreo: form.usuarioCorreo.trim(),
        descripcion: form.descripcion.trim(),
        equipos: equiposPayload,
      }
      if (isEdit) body.solucion = form.solucion.trim() || null
      if (user?.role === "admin") {
        body.tecnicoAsignadoId = form.tecnicoAsignadoId || null
      }

      const onSuccess = (res: { item: { id: string; codigo: string } }) => {
        toast.success(isEdit ? "Reporte actualizado" : "Reporte creado")
        setView("reporte-detail", { reporteId: res.item.id })
      }
      const onError = (err: unknown) => {
        const msg = (err as Error)?.message || "Error al guardar"
        toast.error(msg)
        setErrors([msg])
      }

      if (isEdit) actualizar.mutate(body, { onSuccess, onError })
      else crear.mutate(body, { onSuccess, onError })
    } catch (err) {
      const msg = (err as Error)?.message || "Error al procesar el formulario"
      toast.error(msg)
      setErrors([msg])
    } finally {
      setSubmitting(false)
    }
  }

  const pending = submitting || crear.isPending || actualizar.isPending

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              isEdit && selectedReporteId
                ? setView("reporte-detail", { reporteId: selectedReporteId })
                : setView("reportes")
            }
            className="-ml-2 mb-2 gap-1 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {isEdit ? "Volver al detalle" : "Volver a reportes"}
          </Button>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardList className="h-6 w-6 text-emerald-600" />
            {isEdit ? "Editar reporte" : "Nuevo reporte"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {isEdit
              ? "Modifica los campos necesarios y guarda los cambios"
              : "Completa los datos para registrar un nuevo reporte técnico"}
          </p>
        </div>
      </div>

      {/* Errores / validación */}
      {errors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Revisa los siguientes campos</AlertTitle>
          <AlertDescription>
            <ul className="ml-4 list-disc space-y-0.5 text-xs">
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* LEFT (2 cols) */}
        <div className="space-y-4 lg:col-span-2">
          <SectionCard
            icon={Wrench}
            title="Clasificación"
            description="Tipo de tarea, área y prioridad"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tipoTarea" className="text-xs">
                  Tipo de tarea <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.tipoTareaId}
                  onValueChange={(v) => update("tipoTareaId", v)}
                >
                  <SelectTrigger id="tipoTarea" className="w-full">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposTarea?.items?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.codigo === "otros" ? "Otros (definir nuevo)" : t.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isTipoTareaOtros && (
                  <div className="mt-2 space-y-1">
                    <Label htmlFor="nuevoTipoTarea" className="text-[11px] text-muted-foreground">
                      Define el nuevo tipo de tarea{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="nuevoTipoTarea"
                      value={form.nuevoTipoTareaNombre}
                      onChange={(e) => update("nuevoTipoTareaNombre", e.target.value)}
                      placeholder="Ej. Cambio de tóner, Limpieza de equipo…"
                      autoFocus
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Se creará un nuevo tipo de tarea en el catálogo.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="area" className="text-xs">
                  Área <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.areaId}
                  onValueChange={(v) => update("areaId", v)}
                >
                  <SelectTrigger id="area" className="w-full">
                    <SelectValue placeholder="Selecciona un área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas?.items?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prioridad" className="text-xs">
                  Prioridad <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.prioridad}
                  onValueChange={(v) => update("prioridad", v)}
                >
                  <SelectTrigger id="prioridad" className="w-full">
                    <SelectValue placeholder="Selecciona una prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORIDADES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ubicacion" className="text-xs">
                  <MapPin className="mr-1 inline h-3 w-3" />
                  Ubicación
                </Label>
                <Input
                  id="ubicacion"
                  value={form.ubicacion}
                  onChange={(e) => update("ubicacion", e.target.value)}
                  placeholder="Ej. Edificio A, Piso 2, Aula 203"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={User}
            title="Usuario afectado"
            description="Persona que reporta el incidente"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="usuarioNombre" className="text-xs">
                  Nombre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="usuarioNombre"
                  value={form.usuarioNombre}
                  onChange={(e) => update("usuarioNombre", e.target.value)}
                  placeholder="Nombre completo"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usuarioCargo" className="text-xs">
                  <Briefcase className="mr-1 inline h-3 w-3" />
                  Cargo
                </Label>
                <Input
                  id="usuarioCargo"
                  value={form.usuarioCargo}
                  onChange={(e) => update("usuarioCargo", e.target.value)}
                  placeholder="Ej. Profesor, Auxiliar…"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="usuarioCorreo" className="text-xs">
                  <Mail className="mr-1 inline h-3 w-3" />
                  Correo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="usuarioCorreo"
                  type="email"
                  value={form.usuarioCorreo}
                  onChange={(e) => update("usuarioCorreo", e.target.value)}
                  placeholder="usuario@institucion.cu"
                />
              </div>
            </div>
          </SectionCard>

          <SectionCard
            icon={FileBox}
            title="Equipos / Activos relacionados"
            description="Selecciona el tipo de cada equipo y completa sus datos"
          >
            <div className="space-y-3">
              {form.equipos.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-6 text-center text-muted-foreground">
                  <Cpu className="h-6 w-6" />
                  <p className="text-xs">No has agregado equipos</p>
                </div>
              )}
              {form.equipos.map((eq, idx) => {
                const hasTipo = !!eq.tipoEquipoId
                const esOtro = isEquipoOtros(eq)
                return (
                  <div
                    key={idx}
                    className="space-y-3 rounded-lg border bg-muted/20 p-3"
                  >
                    {/* Fila 1: Select de tipo + botón eliminar */}
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={`eq-tipo-${idx}`}
                          className="text-[11px] text-muted-foreground"
                        >
                          Tipo de equipo
                        </Label>
                        <Select
                          value={eq.tipoEquipoId}
                          onValueChange={(v) =>
                            updateEquipo(idx, "tipoEquipoId", v)
                          }
                        >
                          <SelectTrigger
                            id={`eq-tipo-${idx}`}
                            className="h-9 w-full"
                            disabled={!tiposEquipo}
                          >
                            <SelectValue
                              placeholder={
                                tiposEquipo
                                  ? "Selecciona un tipo"
                                  : "Cargando tipos…"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {tiposEquipo?.items?.map((t) => (
                              <SelectItem
                                key={t.id}
                                value={t.id}
                              >
                                {t.nombre === "Otros"
                                  ? "Otros (definir nuevo)"
                                  : t.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEquipo(idx)}
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        title="Eliminar equipo"
                        aria-label={`Eliminar equipo ${idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Fila 2: Sub-formulario (solo si hay tipo seleccionado) */}
                    {hasTipo ? (
                      <div className="space-y-3 border-t pt-3">
                        {esOtro && (
                          <div className="space-y-1">
                            <Label
                              htmlFor={`eq-nuevo-${idx}`}
                              className="text-[11px] text-muted-foreground"
                            >
                              Nombre del nuevo tipo de equipo{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={`eq-nuevo-${idx}`}
                              className="h-8 text-xs"
                              value={eq.nuevoTipoNombre}
                              onChange={(e) =>
                                updateEquipo(idx, "nuevoTipoNombre", e.target.value)
                              }
                              placeholder="Ej. Router, Scanner, Proyector…"
                              autoFocus
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Se creará un nuevo tipo de equipo en el catálogo.
                            </p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
                          <div className="space-y-1">
                            <Label
                              htmlFor={`eq-cod-${idx}`}
                              className="text-[11px] text-muted-foreground"
                            >
                              Código de activo
                            </Label>
                            <Input
                              id={`eq-cod-${idx}`}
                              className="h-8 font-mono text-xs"
                              value={eq.codigoActivo}
                              onChange={(e) =>
                                updateEquipo(idx, "codigoActivo", e.target.value)
                              }
                              placeholder="ACT-0001"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`eq-marca-${idx}`}
                              className="text-[11px] text-muted-foreground"
                            >
                              Marca
                            </Label>
                            <Input
                              id={`eq-marca-${idx}`}
                              className="h-8 text-xs"
                              value={eq.marca}
                              onChange={(e) =>
                                updateEquipo(idx, "marca", e.target.value)
                              }
                              placeholder="Dell, HP…"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`eq-modelo-${idx}`}
                              className="text-[11px] text-muted-foreground"
                            >
                              Modelo
                            </Label>
                            <Input
                              id={`eq-modelo-${idx}`}
                              className="h-8 text-xs"
                              value={eq.modelo}
                              onChange={(e) =>
                                updateEquipo(idx, "modelo", e.target.value)
                              }
                              placeholder="Latitude 5420"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label
                              htmlFor={`eq-serie-${idx}`}
                              className="text-[11px] text-muted-foreground"
                            >
                              Serie
                            </Label>
                            <Input
                              id={`eq-serie-${idx}`}
                              className="h-8 font-mono text-xs"
                              value={eq.serie}
                              onChange={(e) =>
                                updateEquipo(idx, "serie", e.target.value)
                              }
                              placeholder="SN123456"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="flex items-center justify-center gap-1 rounded-md border border-dashed py-3 text-center text-[11px] text-muted-foreground">
                        <ChevronDown className="h-3 w-3" />
                        Selecciona un tipo de equipo para continuar
                      </p>
                    )}
                  </div>
                )
              })}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEquipo}
                className="gap-2"
              >
                <Plus className="h-4 w-4" /> Agregar equipo
              </Button>
            </div>
          </SectionCard>

          <SectionCard
            icon={MessageSquare}
            title="Descripción"
            description="Detalle del incidente o solicitud"
          >
            <div className="space-y-1.5">
              <Label htmlFor="descripcion" className="text-xs">
                Descripción <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="descripcion"
                rows={5}
                value={form.descripcion}
                onChange={(e) => update("descripcion", e.target.value)}
                placeholder="Describe el problema o solicitud con el mayor detalle posible…"
              />
            </div>
          </SectionCard>

          {isEdit && (
            <SectionCard
              icon={CheckCircle2}
              title="Solución aplicada"
              description="Resultado o intervención realizada (editable)"
            >
              <div className="space-y-1.5">
                <Label htmlFor="solucion" className="text-xs">
                  Solución
                </Label>
                <Textarea
                  id="solucion"
                  rows={4}
                  value={form.solucion}
                  onChange={(e) => update("solucion", e.target.value)}
                  placeholder="Describe la solución aplicada…"
                />
              </div>
            </SectionCard>
          )}
        </div>

        {/* RIGHT (1 col) — acciones */}
        <div className="space-y-4">
          {user?.role === "admin" && (
            <SectionCard
              icon={UserCog}
              title="Asignación"
              description="Solo los administradores pueden asignar técnicos"
            >
              <div className="space-y-1.5">
                <Label htmlFor="tecnico" className="text-xs">
                  Técnico asignado
                </Label>
                <Select
                  value={form.tecnicoAsignadoId || "__none__"}
                  onValueChange={(v) =>
                    update("tecnicoAsignadoId", v === "__none__" ? "" : v)
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
                <p className="text-[11px] text-muted-foreground">
                  Se notificará al técnico seleccionado.
                </p>
              </div>
            </SectionCard>
          )}

          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Save className="h-4 w-4 text-muted-foreground" />
                Acciones
              </CardTitle>
              <CardDescription>
                {isEdit ? "Guarda los cambios del reporte" : "Crea el reporte en el sistema"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button type="submit" className="w-full gap-2" disabled={pending}>
                {pending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEdit ? "Guardar cambios" : "Crear reporte"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full gap-2"
                onClick={() =>
                  isEdit && selectedReporteId
                    ? setView("reporte-detail", { reporteId: selectedReporteId })
                    : setView("reportes")
                }
                disabled={pending}
              >
                <ArrowLeft className="h-4 w-4" /> Cancelar
              </Button>

              <div className="rounded-md border bg-muted/30 p-3 text-[11px] text-muted-foreground">
                <p className="font-medium text-foreground">Resumen</p>
                <ul className="mt-1.5 space-y-1">
                  <li>
                    Tipo:{" "}
                    {isTipoTareaOtros
                      ? form.nuevoTipoTareaNombre
                        ? `✓ Otros: ${form.nuevoTipoTareaNombre}`
                        : "✗ sin nombre"
                      : form.tipoTareaId
                      ? "✓"
                      : "—"}
                  </li>
                  <li>Área: {form.areaId ? "✓" : "—"}</li>
                  <li>Usuario: {form.usuarioNombre ? "✓" : "—"}</li>
                  <li>Correo: {form.usuarioCorreo ? "✓" : "—"}</li>
                  <li>Descripción: {form.descripcion ? "✓" : "—"}</li>
                  <li>
                    Equipos: {form.equipos.length}
                    {form.equipos.length > 0
                      ? ` (${form.equipos.filter((e) => e.tipoEquipoId).length} con tipo)`
                      : ""}
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  )
}
