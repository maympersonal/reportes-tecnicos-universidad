"use client"

import { useEffect, useMemo, useState } from "react"
import { useAppStore } from "@/lib/store"
import {
  useUsuarios,
  useEliminarUsuario,
  useRestaurarUsuario,
  type UsuarioItem,
} from "@/lib/hooks"
import {
  ROLES,
  ROL_LABEL,
  ROL_AREA,
  INSTITUCION,
} from "@/lib/constants"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { UsuariosDialog } from "@/components/app/views/usuarios-dialog"
import { toast } from "sonner"
import {
  Plus, Search, Pencil, RefreshCw, UserCog, Inbox, AlertCircle,
  UserX, RotateCcw, ShieldCheck, Users as UsersIcon,
} from "lucide-react"
import { motion } from "framer-motion"

const ALL = "__all__"

type TabKey = "activas" | "bajas"

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

function rolBadgeClass(role: string) {
  switch (role) {
    case "superadmin":
      return "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "admin":
      return "border-emerald-400 bg-emerald-400/10 text-emerald-700 dark:text-emerald-300"
    case "tecnico":
      return "border-amber-400 bg-amber-400/10 text-amber-700 dark:text-amber-300"
    case "auditor":
      return "border-slate-400 bg-slate-400/10 text-slate-700 dark:text-slate-300"
    default:
      return "border-border bg-muted text-foreground"
  }
}

function MotionCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  )
}

export function UsuariosView() {
  const user = useAppStore((s) => s.user)

  const [tab, setTab] = useState<TabKey>("activas")
  const [query, setQuery] = useState("")
  const [debouncedQ, setDebouncedQ] = useState("")
  const [rolFilter, setRolFilter] = useState<string>(ALL)

  // Debounce de la búsqueda (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(query.trim()), 300)
    return () => clearTimeout(t)
  }, [query])

  const bajaParam = tab === "bajas" ? "true" : "false"
  const rolParam = rolFilter === ALL ? undefined : rolFilter

  const { data, isLoading, isFetching, refetch, isError, error } = useUsuarios({
    q: debouncedQ || undefined,
    rol: rolParam,
    baja: bajaParam,
  })

  const items = useMemo<UsuarioItem[]>(() => data?.items ?? [], [data])

  const eliminar = useEliminarUsuario()
  const restaurar = useRestaurarUsuario()

  // Diálogo de creación/edición
  // Se usa un contador de sesión como `key` para forzar el remount del diálogo
  // cada vez que se abre, asegurando estado de formulario limpio (sin
  // recurrir a useEffect con setState, que lint rechaza).
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [dialogUsuario, setDialogUsuario] = useState<UsuarioItem | null>(null)
  const [dialogSession, setDialogSession] = useState(0)

  const openCreate = () => {
    setDialogMode("create")
    setDialogUsuario(null)
    setDialogSession((s) => s + 1)
    setDialogOpen(true)
  }
  const openEdit = (u: UsuarioItem) => {
    setDialogMode("edit")
    setDialogUsuario(u)
    setDialogSession((s) => s + 1)
    setDialogOpen(true)
  }

  const handleEliminar = (u: UsuarioItem) => {
    eliminar.mutate(u.id, {
      onSuccess: () => toast.success(`Cuenta "${u.username}" dada de baja`),
      onError: (e) => toast.error((e as Error)?.message || "Error al dar de baja"),
    })
  }

  const handleRestaurar = (u: UsuarioItem) => {
    restaurar.mutate(u.id, {
      onSuccess: () => toast.success(`Cuenta "${u.username}" reactivada`),
      onError: (e) => toast.error((e as Error)?.message || "Error al restaurar"),
    })
  }

  // Filtro de roles disponibles (no mostrar superadmin en el Select a menos que sea el superadmin)
  const rolesFiltro = useMemo(() => {
    return ROLES.filter((r) => {
      if (r.value === "superadmin" && user?.role !== "superadmin") return false
      return true
    })
  }, [user?.role])

  const miRolLabel = user ? ROL_LABEL[user.role as keyof typeof ROL_LABEL] : ""
  const miArea = user ? ROL_AREA[user.role as keyof typeof ROL_AREA] : ""

  return (
    <div className="space-y-5">
      {/* Header */}
      <MotionCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <UsersIcon className="h-6 w-6 text-emerald-600" />
              Gestión de usuarios
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {INSTITUCION.sistema} · {INSTITUCION.direccion}
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {user && (
                <Badge variant="outline" className="gap-1.5 py-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-semibold">{miRolLabel}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{miArea}</span>
                </Badge>
              )}
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
              <Button size="sm" onClick={openCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo usuario
              </Button>
            </div>
            {user && (
              <p className="text-right text-[11px] text-muted-foreground">
                Sesión: <span className="font-medium text-foreground">{user.name}</span>
              </p>
            )}
          </div>
        </div>
      </MotionCard>

      {/* Controles: tabs (izq) + búsqueda (der) + filtro por rol */}
      <MotionCard delay={0.05}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-4 w-4 text-muted-foreground" />
              Cuentas del sistema
            </CardTitle>
            <CardDescription>
              Administra cuentas activas y bajas, permisos y áreas asignadas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <Tabs
                value={tab}
                onValueChange={(v) => setTab(v as TabKey)}
                className="w-fit"
              >
                <TabsList>
                  <TabsTrigger value="activas" className="gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Cuentas activas
                  </TabsTrigger>
                  <TabsTrigger value="bajas" className="gap-1.5">
                    <UserX className="h-3.5 w-3.5" />
                    Bajas
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex flex-1 flex-wrap items-end gap-2 sm:justify-end">
                <div className="space-y-1.5">
                  <Label htmlFor="u-buscar" className="text-xs text-muted-foreground">
                    Buscar
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="u-buscar"
                      className="w-full pl-8 sm:w-64"
                      placeholder="Nombre, usuario, correo…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="u-rol-filter" className="text-xs text-muted-foreground">
                    Rol
                  </Label>
                  <Select
                    value={rolFilter}
                    onValueChange={(v) => setRolFilter(v)}
                  >
                    <SelectTrigger id="u-rol-filter" className="w-full sm:w-44">
                      <SelectValue placeholder="Todos los roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todos los roles</SelectItem>
                      {rolesFiltro.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {tab === "activas"
                ? "Cuentas activas en el sistema."
                : "Cuentas inactivas (dadas de baja). Puedes restaurarlas."}
              {" · "}
              {items.length} usuario(s) listado(s)
            </p>
          </CardContent>
        </Card>
      </MotionCard>

      {/* Tabla */}
      <MotionCard delay={0.1}>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-[44px] px-3">#</TableHead>
                    <TableHead className="px-3">Usuario</TableHead>
                    <TableHead className="hidden px-3 sm:table-cell">Correo</TableHead>
                    <TableHead className="px-3">Rol</TableHead>
                    <TableHead className="hidden px-3 lg:table-cell">Área</TableHead>
                    <TableHead className="px-3">Estado</TableHead>
                    <TableHead className="px-3 text-center">Permisos</TableHead>
                    <TableHead className="hidden px-3 xl:table-cell">Creado</TableHead>
                    <TableHead className="px-3 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        <TableCell colSpan={9} className="px-3 py-3">
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={9} className="px-3 py-6 text-center text-sm text-destructive">
                        <AlertCircle className="mb-1 inline h-4 w-4" />{" "}
                        {(error as Error)?.message || "Error al cargar los usuarios"}
                      </TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="px-3 py-12">
                        <div className="flex flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                          <Inbox className="h-8 w-8" />
                          <p className="text-sm font-medium">
                            {tab === "bajas"
                              ? "No hay cuentas dadas de baja"
                              : "No se encontraron usuarios"}
                          </p>
                          <p className="text-xs">
                            {query || rolFilter !== ALL
                              ? "Ajusta la búsqueda o los filtros."
                              : tab === "bajas"
                                ? "Las bajas aparecerán aquí."
                                : "Crea una nueva cuenta para empezar."}
                          </p>
                          {tab === "activas" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 gap-2"
                              onClick={openCreate}
                            >
                              <Plus className="h-4 w-4" /> Nuevo usuario
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((u, idx) => {
                      const isSuperadmin = u.role === "superadmin"
                      const isSelf = u.id === user?.id
                      const isSuperadminSelf = isSuperadmin && isSelf
                      return (
                        <TableRow
                          key={u.id}
                          className="hover:bg-muted/40"
                        >
                          <TableCell className="px-3 text-xs text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="px-3">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback
                                  className={`text-[11px] font-semibold text-white ${
                                    isSuperadmin
                                      ? "bg-emerald-700"
                                      : "bg-institucional"
                                  }`}
                                >
                                  {initials(u.name || u.username)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="truncate text-sm font-medium">
                                    {u.name || "—"}
                                  </p>
                                  {isSelf && (
                                    <Badge
                                      variant="outline"
                                      className="border-emerald-300 px-1 text-[10px] text-emerald-700 dark:border-emerald-700 dark:text-emerald-300"
                                    >
                                      Tú
                                    </Badge>
                                  )}
                                </div>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  @{u.username}
                                  {u.cargo ? ` · ${u.cargo}` : ""}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden px-3 text-xs sm:table-cell">
                            <a
                              href={`mailto:${u.email}`}
                              className="text-emerald-700 hover:underline dark:text-emerald-300"
                            >
                              {u.email}
                            </a>
                          </TableCell>
                          <TableCell className="px-3">
                            <Badge variant="outline" className={`gap-1 ${rolBadgeClass(u.role)}`}>
                              {ROL_LABEL[u.role as keyof typeof ROL_LABEL] ?? u.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden px-3 text-xs lg:table-cell">
                            {u.areaNombre ?? (
                              <span className="text-muted-foreground">Sin área</span>
                            )}
                          </TableCell>
                          <TableCell className="px-3">
                            {u.activo ? (
                              <Badge
                                variant="outline"
                                className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                              >
                                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Activo
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-300"
                              >
                                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-slate-400" />
                                Inactivo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-3 text-center">
                            {isSuperadmin ? (
                              <Badge
                                variant="secondary"
                                title="El superadmin posee todos los permisos"
                                className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                              >
                                <ShieldCheck className="h-3 w-3" /> Todos
                              </Badge>
                            ) : (
                              <Badge variant="secondary" title={`${u.permisos.length} permiso(s)`}>
                                {u.permisos.length}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden px-3 text-xs text-muted-foreground xl:table-cell">
                            {fmtFecha(u.createdAt)}
                          </TableCell>
                          <TableCell className="px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="gap-1 text-xs"
                                onClick={() => openEdit(u)}
                                title="Editar usuario"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Editar</span>
                              </Button>

                              {tab === "activas" ? (
                                !isSuperadmin && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        title="Dar de baja"
                                      >
                                        <UserX className="h-3.5 w-3.5" />
                                        <span className="hidden md:inline">Dar de baja</span>
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Dar de baja a {u.name}?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          La cuenta <span className="font-mono">@{u.username}</span> quedará
                                          inactiva. No podrá iniciar sesión, pero se preservará el
                                          historial de reportes asociado. Podrás restaurarla cuando
                                          quieras desde la pestaña “Bajas”.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleEliminar(u)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Sí, dar de baja
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
                                  onClick={() => handleRestaurar(u)}
                                  disabled={restaurar.isPending}
                                  title="Restaurar cuenta"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  <span className="hidden md:inline">Restaurar</span>
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </MotionCard>

      {/* Leyenda rápida */}
      <MotionCard delay={0.15}>
        <Card className="bg-muted/30">
          <CardContent className="flex flex-wrap items-center gap-3 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Roles:</span>
            {ROLES.map((r) => (
              <span key={r.value} className="inline-flex items-center gap-1">
                <Badge variant="outline" className={`gap-1 ${rolBadgeClass(r.value)}`}>
                  {r.label}
                </Badge>
                <span className="text-[10px]">{r.area}</span>
              </span>
            ))}
            <span className="ml-auto hidden text-[10px] sm:inline">
              Solo el superadmin puede crear administradores. Nadie puede crear
              superadmin.
            </span>
          </CardContent>
        </Card>
      </MotionCard>

      {/* Diálogo crear/editar */}
      <UsuariosDialog
        key={dialogSession}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        usuario={dialogUsuario}
      />
    </div>
  )
}
