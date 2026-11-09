"use client"

import { useMemo, useState } from "react"
import { useAppStore } from "@/lib/store"
import {
  useCrearUsuario,
  useActualizarUsuario,
  useAreas,
  type UsuarioItem,
} from "@/lib/hooks"
import {
  ROLES,
  ROL_LABEL,
  TODOS_PERMISOS,
  PERMISOS_POR_ROL,
  type Rol,
  type Permiso,
} from "@/lib/constants"
import { ApiError } from "@/lib/api"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  Eye, EyeOff, Loader2, Save, ShieldCheck, AlertCircle, UserCog,
  KeyRound, Lock, CheckSquare, ListChecks,
} from "lucide-react"

export type UsuarioDialogMode = "create" | "edit"

type ReglaPass = { ok: boolean; label: string }

type FormState = {
  name: string
  username: string
  email: string
  telefono: string
  cargo: string
  areaId: string
  role: Rol
  password: string
  activo: boolean
  usarPermisosPorRol: boolean
  permisos: Permiso[]
}

const emptyForm: FormState = {
  name: "",
  username: "",
  email: "",
  telefono: "",
  cargo: "",
  areaId: "",
  role: "tecnico",
  password: "",
  activo: true,
  usarPermisosPorRol: true,
  permisos: [],
}

function reglasPassword(pw: string): ReglaPass[] {
  return [
    { ok: pw.length >= 8, label: "Mínimo 8 caracteres" },
    { ok: /[A-Z]/.test(pw), label: "Una mayúscula" },
    { ok: /[a-z]/.test(pw), label: "Una minúscula" },
    { ok: /[0-9]/.test(pw), label: "Un número" },
    { ok: /[^A-Za-z0-9]/.test(pw), label: "Un carácter especial" },
  ]
}

function passwordEsFuerte(pw: string): boolean {
  return reglasPassword(pw).every((r) => r.ok)
}

/**
 * Determina, al editar, si los permisos del usuario coincen con los defaults
 * de su rol. Si coinciden, arrancamos en modo "usar por defecto" (ON);
 * si no, en modo override (OFF) con los permisos seleccionados.
 */
function permisosIgualesADefaults(permisos: string[], role: string): boolean {
  const defaults = PERMISOS_POR_ROL[role as Rol] ?? []
  if (permisos.length !== defaults.length) return false
  return defaults.every((p) => permisos.includes(p))
}

function labelForPermiso(key: string): string {
  return TODOS_PERMISOS.find((p) => p.key === key)?.label ?? key
}

export function UsuariosDialog({
  open,
  onOpenChange,
  mode,
  usuario,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: UsuarioDialogMode
  usuario?: UsuarioItem | null
}) {
  const me = useAppStore((s) => s.user)
  const { data: areasData, isLoading: areasLoading } = useAreas()

  const crear = useCrearUsuario()
  const actualizar = useActualizarUsuario(usuario?.id ?? "")

  const [form, setForm] = useState<FormState>(() => {
    if (mode === "edit" && usuario) {
      const defaultsCoinciden = permisosIgualesADefaults(usuario.permisos, usuario.role)
      return {
        name: usuario.name ?? "",
        username: usuario.username ?? "",
        email: usuario.email ?? "",
        telefono: usuario.telefono ?? "",
        cargo: usuario.cargo ?? "",
        areaId: usuario.areaId ?? "",
        role: (usuario.role as Rol) ?? "tecnico",
        password: "",
        activo: usuario.activo ?? true,
        usarPermisosPorRol: defaultsCoinciden,
        permisos: defaultsCoinciden
          ? [...(PERMISOS_POR_ROL[(usuario.role as Rol)] ?? [])]
          : (usuario.permisos as Permiso[]) ?? [],
      }
    }
    return { ...emptyForm }
  })
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [serverReglas, setServerReglas] = useState<ReglaPass[] | null>(null)
  const [localErrors, setLocalErrors] = useState<string[]>([])

  // Si cambia el rol y está activo "usar por defecto", los permisos visibles
  // cambian automáticamente (se derivan del rol en el render; no hace falta
  // mutar estado). Cuando el usuario apaga el toggle, dejamos los defaults
  // pre-seleccionados para que pueda editarlos.
  const handleTogglePermisosPorRol = (checked: boolean) => {
    if (checked) {
      setForm((s) => ({ ...s, usarPermisosPorRol: true }))
    } else {
      // Al apagar, pre-seleccionamos los defaults del rol actual para edición cómoda.
      const defaults = PERMISOS_POR_ROL[form.role] ?? []
      setForm((s) => ({ ...s, usarPermisosPorRol: false, permisos: [...defaults] }))
    }
  }

  const handlePermisoToggle = (key: Permiso, checked: boolean) => {
    setForm((s) => ({
      ...s,
      permisos: checked
        ? Array.from(new Set([...s.permisos, key]))
        : s.permisos.filter((p) => p !== key),
    }))
  }

  const handleSeleccionarTodos = () => {
    const allSelected = TODOS_PERMISOS.every((p) => form.permisos.includes(p.key))
    setForm((s) => ({
      ...s,
      permisos: allSelected ? [] : TODOS_PERMISOS.map((p) => p.key),
    }))
  }

  // Roles disponibles para crear/editar:
  // - nunca `superadmin`
  // - `admin` sólo si el usuario actual es superadmin
  const rolesDisponibles = useMemo(() => {
    return ROLES.filter((r) => {
      if (r.value === "superadmin") return false
      if (r.value === "admin" && me?.role !== "superadmin") return false
      return true
    })
  }, [me?.role])

  // Caso especial: el superadmin edita su propia cuenta → role bloqueado,
  // permisos ocultos.
  const isSuperadminSelf =
    mode === "edit" &&
    me?.role === "superadmin" &&
    usuario?.role === "superadmin" &&
    usuario?.id === me?.id

  // Contraseña: checklist local en vivo
  const reglasLive = useMemo(() => reglasPassword(form.password), [form.password])
  const passwordFuerte = passwordEsFuerte(form.password)

  // ¿Submit habilitado?
  const passwordValida = mode === "edit"
    ? (form.password === "" || passwordFuerte)
    : passwordFuerte

  const camposBasicosValidos =
    form.name.trim() !== "" &&
    form.username.trim() !== "" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.role !== "superadmin"

  const permisosValidos =
    isSuperadminSelf ||
    form.usarPermisosPorRol ||
    form.permisos.length > 0

  const canSubmit =
    camposBasicosValidos &&
    passwordValida &&
    permisosValidos &&
    !crear.isPending &&
    !actualizar.isPending

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }))

  const validateLocal = (): string[] => {
    const errs: string[] = []
    if (!form.name.trim()) errs.push("El nombre es obligatorio")
    if (!form.username.trim()) errs.push("El usuario es obligatorio")
    if (!form.email.trim()) errs.push("El correo es obligatorio")
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.push("El correo no es válido")
    if (mode === "create" && !passwordEsFuerte(form.password))
      errs.push("La contraseña no cumple los requisitos de seguridad")
    if (mode === "edit" && form.password !== "" && !passwordEsFuerte(form.password))
      errs.push("La contraseña nueva no cumple los requisitos de seguridad")
    if (form.role === "superadmin") errs.push("No se pueden crear cuentas superadmin")
    if (!isSuperadminSelf && !form.usarPermisosPorRol && form.permisos.length === 0)
      errs.push("Selecciona al menos un permiso o usa los defaults del rol")
    return errs
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validateLocal()
    setLocalErrors(errs)
    setServerError(null)
    setServerReglas(null)
    if (errs.length > 0) {
      toast.error("Revisa los campos requeridos")
      return
    }

    const body: Record<string, unknown> = {
      name: form.name.trim(),
      username: form.username.trim().toLowerCase(),
      email: form.email.trim(),
      role: form.role,
      cargo: form.cargo.trim() || null,
      telefono: form.telefono.trim() || null,
      areaId: form.areaId || null,
      activo: form.activo,
    }

    if (mode === "create") {
      body.password = form.password
      body.usarPermisosPorRol = form.usarPermisosPorRol
      if (!form.usarPermisosPorRol) body.permisos = form.permisos
    } else {
      // edit
      if (form.password) body.password = form.password
      // Permisos: si es superadmin self, no enviamos nada (locked).
      if (!isSuperadminSelf) {
        body.usarPermisosPorRol = form.usarPermisosPorRol
        if (!form.usarPermisosPorRol) body.permisos = form.permisos
      }
    }

    const onSuccess = () => {
      toast.success(mode === "edit" ? "Usuario actualizado" : "Usuario creado")
      onOpenChange(false)
    }
    const onError = (err: unknown) => {
      if (err instanceof ApiError) {
        const data = err.data as { error?: string; reglas?: ReglaPass[] } | undefined
        if (data?.reglas && Array.isArray(data.reglas)) {
          setServerError(data.error ?? "Contraseña débil")
          setServerReglas(data.reglas)
        } else {
          setServerError(err.message)
        }
        toast.error(err.message)
      } else {
        const msg = (err as Error)?.message || "Error al guardar"
        setServerError(msg)
        toast.error(msg)
      }
    }

    if (mode === "edit") {
      actualizar.mutate(body, { onSuccess, onError })
    } else {
      crear.mutate(body, { onSuccess, onError })
    }
  }

  const pending = crear.isPending || actualizar.isPending

  // Permisos a mostrar en vista previa (modo "por defecto")
  const permisosPreview = useMemo(() => {
    return (PERMISOS_POR_ROL[form.role] ?? []).map((p) => ({
      key: p,
      label: labelForPermiso(p),
    }))
  }, [form.role])

  const allPermisosSelected =
    TODOS_PERMISOS.length > 0 &&
    TODOS_PERMISOS.every((p) => form.permisos.includes(p.key))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserCog className="h-5 w-5 text-emerald-600" />
            {mode === "edit" ? "Editar usuario" : "Nuevo usuario"}
          </DialogTitle>
          <DialogDescription>
            {mode === "edit"
              ? "Modifica los datos del usuario y guarda los cambios."
              : "Completa el formulario para crear una cuenta nueva."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          {/* Errores locales */}
          {localErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Revisa los siguientes campos</AlertTitle>
              <AlertDescription>
                <ul className="ml-4 list-disc space-y-0.5 text-xs">
                  {localErrors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Errores del servidor (contraseña débil etc.) */}
          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error del servidor</AlertTitle>
              <AlertDescription className="space-y-2">
                <p className="text-xs">{serverError}</p>
                {serverReglas && serverReglas.length > 0 && (
                  <ul className="ml-4 list-disc space-y-0.5 text-xs">
                    {serverReglas.map((r, i) => (
                      <li key={i} className={r.ok ? "text-emerald-600" : ""}>
                        {r.ok ? "✓" : "✗"} {r.label}
                      </li>
                    ))}
                  </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Aviso especial para superadmin self */}
          {isSuperadminSelf && (
            <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
              <Lock className="h-4 w-4" />
              <AlertTitle>Cuenta superadmin</AlertTitle>
              <AlertDescription className="text-xs">
                Estás editando tu propia cuenta. El rol y los permisos están
                bloqueados: el superadmin siempre posee todos los permisos.
              </AlertDescription>
            </Alert>
          )}

          {/* Datos básicos */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="u-name" className="text-xs">
                Nombre <span className="text-destructive">*</span>
              </Label>
              <Input
                id="u-name"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Nombre completo"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-username" className="text-xs">
                Usuario <span className="text-destructive">*</span>
              </Label>
              <Input
                id="u-username"
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="usuario.login"
                autoComplete="off"
                autoCapitalize="none"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-email" className="text-xs">
                Correo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="usuario@institucion.cu"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-telefono" className="text-xs">
                Teléfono
              </Label>
              <Input
                id="u-telefono"
                value={form.telefono}
                onChange={(e) => update("telefono", e.target.value)}
                placeholder="+53 5 000 0000"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-cargo" className="text-xs">
                Cargo
              </Label>
              <Input
                id="u-cargo"
                value={form.cargo}
                onChange={(e) => update("cargo", e.target.value)}
                placeholder="Ej. Técnico de soporte"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-area" className="text-xs">
                Área
              </Label>
              {areasLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select
                  value={form.areaId || "__none__"}
                  onValueChange={(v) =>
                    update("areaId", v === "__none__" ? "" : v)
                  }
                >
                  <SelectTrigger id="u-area" className="w-full">
                    <SelectValue placeholder="Sin área" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin área</SelectItem>
                    {areasData?.items?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-role" className="text-xs">
                Rol <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.role}
                onValueChange={(v) => update("role", v as Rol)}
                disabled={isSuperadminSelf}
              >
                <SelectTrigger id="u-role" className="w-full">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {(isSuperadminSelf
                    ? ROLES.filter((r) => r.value === "superadmin")
                    : rolesDisponibles
                  ).map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {isSuperadminSelf
                  ? "Bloqueado para superadmin."
                  : me?.role !== "superadmin"
                    ? "Solo el superadmin puede crear administradores."
                    : "Elige el rol de la cuenta."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-activo" className="text-xs">
                Estado de la cuenta
              </Label>
              <div className="flex h-9 items-center gap-2 rounded-md border px-3">
                <Switch
                  id="u-activo"
                  checked={form.activo}
                  onCheckedChange={(v) => update("activo", v)}
                  disabled={isSuperadminSelf}
                />
                <span className="text-xs">
                  {form.activo ? "Activa" : "Inactiva (baja)"}
                </span>
              </div>
            </div>
          </section>

          {/* Contraseña */}
          <section className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="u-password" className="flex items-center gap-1.5 text-xs">
                <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                Contraseña{" "}
                {mode === "create" ? (
                  <span className="text-destructive">*</span>
                ) : (
                  <span className="text-muted-foreground">(dejar en blanco para mantener)</span>
                )}
              </Label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <Input
              id="u-password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder={
                mode === "create"
                  ? "Mínimo 8, mayúscula, minúscula, número y especial"
                  : "Nueva contraseña (opcional)"
              }
              autoComplete="new-password"
              className="font-mono"
            />
            {/* Checklist en vivo */}
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {reglasLive.map((r, i) => (
                <li
                  key={i}
                  className={`flex items-center gap-1.5 text-[11px] ${
                    r.ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                      r.ok
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground/40 text-muted-foreground"
                    }`}
                    aria-hidden
                  >
                    {r.ok ? "✓" : ""}
                  </span>
                  {r.label}
                </li>
              ))}
            </ul>
          </section>

          {/* Permisos — oculto para superadmin self */}
          {!isSuperadminSelf && (
            <section className="space-y-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold">Permisos</h3>
                </div>
                <label
                  htmlFor="u-usar-defaults"
                  className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
                >
                  <Switch
                    id="u-usar-defaults"
                    checked={form.usarPermisosPorRol}
                    onCheckedChange={handleTogglePermisosPorRol}
                  />
                  Usar permisos por defecto del rol
                </label>
              </div>

              {form.usarPermisosPorRol ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-muted-foreground">
                    La cuenta heredará automáticamente los permisos predeterminados
                    del rol <Badge variant="secondary" className="ml-1">{ROL_LABEL[form.role]}</Badge>.
                  </p>
                  <div className="rounded-md border bg-muted/30 p-3">
                    <p className="mb-2 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                      <ListChecks className="h-3.5 w-3.5" /> Permisos que aplicarán:
                    </p>
                    <ScrollArea className="max-h-40 scrollbar-thin">
                      <ul className="flex flex-wrap gap-1.5">
                        {permisosPreview.length === 0 ? (
                          <li className="text-xs text-muted-foreground">Sin permisos definidos.</li>
                        ) : (
                          permisosPreview.map((p) => (
                            <li key={p.key}>
                              <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300">
                                {p.label}
                              </Badge>
                            </li>
                          ))
                        )}
                      </ul>
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      Selecciona manualmente los permisos. {form.permisos.length} de{" "}
                      {TODOS_PERMISOS.length} seleccionados.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSeleccionarTodos}
                      className="h-7 gap-1 text-[11px]"
                    >
                      <CheckSquare className="h-3 w-3" />
                      {allPermisosSelected ? "Desmarcar todos" : "Seleccionar todos"}
                    </Button>
                  </div>
                  <ScrollArea className="max-h-56 scrollbar-thin">
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {TODOS_PERMISOS.map((p) => {
                        const checked = form.permisos.includes(p.key)
                        return (
                          <label
                            key={p.key}
                            className={`flex cursor-pointer items-start gap-2 rounded-md border p-2 text-xs transition-colors ${
                              checked
                                ? "border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-950/30"
                                : "border-border hover:bg-muted/40"
                            }`}
                            htmlFor={`perm-${p.key}`}
                          >
                            <Checkbox
                              id={`perm-${p.key}`}
                              checked={checked}
                              onCheckedChange={(v) => handlePermisoToggle(p.key, v === true)}
                              className="mt-0.5"
                            />
                            <span>
                              <span className="font-medium">{p.label}</span>
                              <span className="block text-[10px] text-muted-foreground">{p.key}</span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </section>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit} className="gap-2">
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Guardando…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {mode === "edit" ? "Guardar cambios" : "Crear usuario"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
