"use client"

import { useState } from "react"
import { useLogin } from "@/lib/hooks"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { INSTITUCION, SUPERADMIN_DEFAULT } from "@/lib/constants"
import { toast } from "sonner"
import { Wrench, Shield, FileText, Loader2, Mail, ArrowRight, BarChart3, Users, ClipboardList, Eye, EyeOff, Lock } from "lucide-react"

export function LoginView() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const login = useLogin()
  const setView = useAppStore((s) => s.setView)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      toast.error("Ingresa usuario y contraseña")
      return
    }
    login.mutate(
      { username: username.toLowerCase(), password },
      {
        onSuccess: (res) => {
          if (res.debeCambiarPassword) {
            toast.warning("Tu contraseña es temporal. Cámbiala pronto desde tu perfil.")
          }
          toast.success("Bienvenido al sistema")
        },
        onError: (err: unknown) => toast.error((err as Error).message || "Credenciales inválidas"),
      }
    )
  }

  const quickFill = (u: string, p: string) => {
    setUsername(u)
    setPassword(p)
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Branding */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-institucional p-10 text-white lg:flex">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 80%, white 0, transparent 35%)" }} />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <Wrench className="h-7 w-7" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-tight">{INSTITUCION.sistema}</p>
              <p className="text-sm text-white/70">{INSTITUCION.direccion}</p>
            </div>
          </div>
          <div className="mt-12 max-w-md">
            <h1 className="text-3xl font-bold leading-tight">
              Gestión centralizada de incidentes y solicitudes técnicas
            </h1>
            <p className="mt-3 text-white/80">
              Registra, asigna y da seguimiento a reportes técnicos con trazabilidad completa,
              roles definidos y reportes exportables.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              { icon: ClipboardList, label: "Reportes trazables" },
              { icon: Users, label: "Roles y permisos" },
              { icon: BarChart3, label: "Estadísticas" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="rounded-lg bg-white/10 p-3 backdrop-blur">
                <Icon className="mb-2 h-5 w-5" />
                <p className="text-xs text-white/80">{label}</p>
              </div>
            ))}
          </div>
          {/* Directrices institucionales */}
          <div className="mt-6 space-y-1.5 rounded-lg bg-white/10 p-4 text-xs backdrop-blur">
            <p className="font-semibold text-white">Administración del sistema</p>
            <p className="text-white/80">{INSTITUCION.direccion} (superadmin y administradores)</p>
            <p className="mt-2 font-semibold text-white">Uso operativo</p>
            <p className="text-white/80">{INSTITUCION.direccionServicios} (técnicos y auditores)</p>
          </div>
        </div>
        <div className="relative text-xs text-white/60">
          © {new Date().getFullYear()} {INSTITUCION.departamento} · {INSTITUCION.correo}
        </div>
      </div>

      {/* Formulario */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-institucional text-white">
              <Wrench className="h-6 w-6" />
            </div>
            <p className="font-semibold">{INSTITUCION.sistema}</p>
          </div>

          <h2 className="text-2xl font-bold">Iniciar sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Accede con tus credenciales institucionales
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="usuario"
                autoComplete="username"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showPass ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  autoComplete="current-password"
                  className="pl-8 pr-3"
                />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={login.isPending}>
              {login.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {login.isPending ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>

          {/* Acceso superadmin (única cuenta raíz) */}
          <div className="mt-6 rounded-lg border border-amber-300/50 bg-amber-50/60 p-3 dark:bg-amber-500/10">
            <p className="mb-2 text-xs font-medium text-amber-800 dark:text-amber-300">
              🔑 Cuenta superadmin (cambia la contraseña tras ingresar):
            </p>
            <button
              onClick={() => quickFill(SUPERADMIN_DEFAULT.username, SUPERADMIN_DEFAULT.password)}
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs font-medium hover:bg-accent"
            >
              Autocompletar superadmin
            </button>
            <p className="mt-2 text-[10px] text-muted-foreground">
              Usuario: <span className="font-mono">{SUPERADMIN_DEFAULT.username}</span> · La única cuenta raíz, creada automáticamente.
            </p>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <button onClick={() => setView("privacidad")} className="inline-flex items-center gap-1 hover:text-foreground">
              <Shield className="h-3 w-3" /> Privacidad
            </button>
            <button onClick={() => setView("terminos")} className="inline-flex items-center gap-1 hover:text-foreground">
              <FileText className="h-3 w-3" /> Términos
            </button>
            <a href={`mailto:${INSTITUCION.correo}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Mail className="h-3 w-3" /> Soporte
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
