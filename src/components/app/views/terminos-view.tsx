"use client"

import { useAppStore } from "@/lib/store"
import { INSTITUCION } from "@/lib/constants"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  FileText,
  ArrowLeft,
  Mail,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Users,
  KeyRound,
  Scale,
  AlertTriangle,
  RefreshCw,
  ClipboardList,
  Eye,
  UserCog,
  Crown,
  Server,
  ScrollText,
  Cpu,
} from "lucide-react"
import { toast } from "sonner"

const ULTIMA_ACTUALIZACION = "1 de octubre de 2025"

const SECCIONES = [
  { id: "aceptacion", label: "1. Aceptación de los términos" },
  { id: "objeto", label: "2. Objeto del servicio" },
  { id: "definiciones", label: "3. Definiciones" },
  { id: "cuentas", label: "4. Requisitos de acceso y cuentas" },
  { id: "permitidos", label: "5. Usos permitidos" },
  { id: "prohibidos", label: "6. Usos prohibidos" },
  { id: "roles", label: "7. Roles y responsabilidades" },
  { id: "propiedad", label: "8. Propiedad intelectual" },
  { id: "responsabilidad", label: "9. Limitación de responsabilidad" },
  { id: "modificaciones", label: "10. Modificaciones y vigencia" },
]

const DEFINICIONES = [
  {
    termino: "Reporte",
    definicion:
      "Solicitud formal registrada en el sistema para documentar una incidencia, necesidad de mantenimiento o soporte técnico.",
  },
  {
    termino: "Técnico",
    definicion:
      "Usuario con rol asignado para atender, resolver y cerrar reportes asignados a su cargo.",
  },
  {
    termino: "Auditor",
    definicion:
      "Usuario con permisos de consulta y supervisión, sin capacidad de modificar el contenido operativo de los reportes.",
  },
  {
    termino: "Estado",
    definicion:
      "Etapa actual del ciclo de vida de un reporte: Pendiente, En proceso, Resuelto o Cerrado.",
  },
  {
    termino: "Prioridad",
    definicion:
      "Nivel de urgencia asignado a un reporte: Baja, Media, Alta o Crítica. Determina el orden de atención.",
  },
  {
    termino: "RBAC",
    definicion:
      "Control de accesos basado en roles (Role-Based Access Control). Cada rol tiene permisos diferenciados.",
  },
  {
    termino: "JWT",
    definicion:
      "JSON Web Token firmado, utilizado como mecanismo de sesión para autenticar al usuario en cada petición.",
  },
]

const USOS_PERMITIDOS = [
  "Crear, editar y dar seguimiento a reportes técnicos dentro del ámbito institucional.",
  "Adjuntar archivos y evidencias relevantes para la resolución del reporte.",
  "Consultar el estado, historial y estadísticas agregadas del sistema.",
  "Cambiar de estado un reporte asignado (Técnico) según el flujo definido.",
  "Exportar reportes a Excel, PDF y Word para fines administrativos.",
  "Comunicarse con el responsable del sistema para soporte y reclamos.",
  "Actualizar los datos de perfil y revocar el consentimiento cuando lo considere oportuno.",
]

const USOS_PROHIBIDOS = [
  "Compartir credenciales de acceso con terceros o permitir el uso de la cuenta por personas no autorizadas.",
  "Registrar reportes falsos, simulados o con fines ajenos a la gestión técnica institucional.",
  "Intentar acceder a reportes o datos de usuarios sin los permisos correspondientes.",
  "Atentar contra la integridad, disponibilidad o confidencialidad del sistema o de sus datos.",
  "Utilizar el sistema para fines comerciales, políticos o de proselitismo.",
  "Subir archivos con contenido malicioso, ofensivo o que vulnere derechos de terceros.",
  "Realizar ingeniería inversa, scraping o extracción masiva de datos del sistema.",
  "Utilizar bots, scripts o herramientas automatizadas que afecten el normal funcionamiento.",
]

const ROLES = [
  {
    rol: "Administrador",
    icon: Crown,
    color: "text-amber-600",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    responsabilidades:
      "Gestión completa del sistema: usuarios, áreas, tipos de tarea, configuración general, exportaciones y supervisión de auditoría.",
    permisos: "Crear, leer, actualizar y eliminar en todos los módulos.",
  },
  {
    rol: "Técnico",
    icon: UserCog,
    color: "text-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-500/10",
    responsabilidades:
      "Atender los reportes asignados, cambiar su estado, adjuntar archivos y documentar la resolución.",
    permisos: "Leer reportes visibles y modificar los que tenga asignados.",
  },
  {
    rol: "Auditor",
    icon: Eye,
    color: "text-sky-600",
    bg: "bg-sky-50 dark:bg-sky-500/10",
    responsabilidades:
      "Supervisar la operación mediante consulta de reportes, historial, estadísticas y exportaciones.",
    permisos: "Acceso de solo lectura a los módulos de seguimiento y estadísticas.",
  },
]

export function TerminosView() {
  const setView = useAppStore((s) => s.setView)

  const copiarCorreo = () => {
    navigator.clipboard?.writeText(INSTITUCION.correo)
    toast.success("Correo copiado al portapapeles")
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 animate-fade-in-up px-1 pb-10">
      {/* Header institucional */}
      <Card className="overflow-hidden border-0 bg-institucional text-white shadow-md">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Badge
                variant="secondary"
                className="gap-1 bg-white/15 text-white hover:bg-white/20"
              >
                <ScrollText className="h-3 w-3" /> Documento legal
              </Badge>
              <h1 className="text-2xl font-bold sm:text-3xl">Términos y Condiciones</h1>
              <p className="text-sm text-white/85">
                {INSTITUCION.sistema} · {INSTITUCION.direccion}
              </p>
              <p className="text-xs text-white/70">
                Regulación del uso de la plataforma y de los derechos y obligaciones de los
                usuarios.
              </p>
              <p className="text-xs text-white/70">
                Última actualización: {ULTIMA_ACTUALIZACION}
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setView("dashboard")}
              className="gap-2 bg-white/15 text-white hover:bg-white/25 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid: sticky sidebar + content */}
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        {/* Sticky index */}
        <aside className="hidden lg:block">
          <nav className="lg:sticky lg:top-20 lg:self-start">
            <Card className="p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Contenido
              </p>
              <ul className="space-y-1 text-sm">
                {SECCIONES.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                    >
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
              <Separator className="my-3" />
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1 text-xs"
                onClick={copiarCorreo}
              >
                <Mail className="h-3 w-3" /> Copiar contacto
              </Button>
            </Card>
          </nav>
        </aside>

        {/* Content */}
        <div className="space-y-4">
          {/* 1. Aceptación */}
          <Card id="aceptacion" className="scroll-mt-20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <CardTitle>1. Aceptación de los términos</CardTitle>
              </div>
              <CardDescription>
                El uso del sistema implica la aceptación plena de estos términos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                El acceso y uso del <strong className="text-foreground">{INSTITUCION.sistema}</strong>{" "}
                implica la aceptación plena, libre y consciente de los presentes Términos y
                Condiciones, así como de la <strong className="text-foreground">Política de
                Privacidad</strong> asociada. El usuario reconoce haberlos leído y comprendido
                antes de iniciar el uso de la plataforma.
              </p>
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Carácter vinculante</AlertTitle>
                <AlertDescription>
                  Si el usuario no está de acuerdo con alguno de los términos, deberá abstenerse
                  de utilizar el sistema. La creación de la cuenta constituye una manifestación
                  inequívoca de consentimiento.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 2. Objeto */}
          <Card id="objeto" className="scroll-mt-20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-600" />
                <CardTitle>2. Objeto del servicio</CardTitle>
              </div>
              <CardDescription>
                Finalidad y alcance funcional del sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                El <strong className="text-foreground">{INSTITUCION.sistema}</strong> es una
                plataforma web destinada a la <strong className="text-foreground">gestión,
                seguimiento y auditoría de reportes técnicos</strong> de la institución. El
                sistema permite registrar incidencias, asignarlas a técnicos competentes,
                documentar su resolución, generar estadísticas agregadas y exportar informes.
              </p>
              <p>
                La plataforma facilita la trazabilidad de la operación técnica, asegurando
                transparencia sobre el estado y la calidad del servicio prestado, así como el
                reconocimiento del desempeño del personal técnico mediante un sistema de
                puntuación y rankings.
              </p>
            </CardContent>
          </Card>

          {/* 3. Definiciones */}
          <Card id="definiciones" className="scroll-mt-20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-emerald-600" />
                <CardTitle>3. Definiciones</CardTitle>
              </div>
              <CardDescription>
                Términos clave empleados a lo largo de este documento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <dl className="grid gap-2 sm:grid-cols-2">
                {DEFINICIONES.map((d) => (
                  <div
                    key={d.termino}
                    className="rounded-lg border bg-card p-3 transition-colors hover:border-emerald-300 dark:hover:border-emerald-500/30"
                  >
                    <dt className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 font-mono text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      >
                        {d.termino}
                      </Badge>
                    </dt>
                    <dd className="mt-1 text-xs text-muted-foreground">{d.definicion}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          {/* 4. Cuentas */}
          <Card id="cuentas" className="scroll-mt-20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-emerald-600" />
                <CardTitle>4. Requisitos de acceso y cuentas</CardTitle>
              </div>
              <CardDescription>
                Condiciones para el uso de credenciales y la responsabilidad del usuario.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                El acceso al sistema es personal e intransferible. Cada cuenta es creada por
                el administrador y se entrega al usuario junto con credenciales (nombre de
                usuario y contraseña inicial), bajo su <strong className="text-foreground">responsabilidad
                exclusiva</strong> de custodia.
              </p>
              <ul className="space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>
                    Cambiar la contraseña inicial tan pronto como sea posible y, en todo caso,
                    de forma periódica.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>
                    No revelar las credenciales a terceros ni almacenlas en medios
                    inseguros.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>
                    Cerrar la sesión al terminar el uso en equipos compartidos o públicos.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <span>
                    Comunicar de forma inmediata al responsable cualquier sospecha de uso
                    indebido de la cuenta.
                  </span>
                </li>
              </ul>
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertTitle>Responsabilidad sobre la cuenta</AlertTitle>
                <AlertDescription>
                  Cualquier acción realizada desde una cuenta se entenderá efectuada por el
                  titular. El usuario responde por las consecuencias derivadas del uso
                  indebido, salvo prueba en contrario.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 5 y 6. Usos permitidos / prohibidos */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card id="permitidos" className="scroll-mt-20 border-emerald-200 dark:border-emerald-500/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-emerald-700 dark:text-emerald-400">
                    5. Usos permitidos
                  </CardTitle>
                </div>
                <CardDescription>Conductas que el sistema reconoce como válidas.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {USOS_PERMITIDOS.map((u, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="leading-relaxed text-foreground">{u}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card id="prohibidos" className="scroll-mt-20 border-destructive/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-destructive">6. Usos prohibidos</CardTitle>
                </div>
                <CardDescription>Conductas que pueden conllevar sanción.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {USOS_PROHIBIDOS.map((u, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <span className="leading-relaxed text-foreground">{u}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* 7. Roles */}
          <Card id="roles" className="scroll-mt-20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <CardTitle>7. Roles y responsabilidades</CardTitle>
              </div>
              <CardDescription>
                Perfiles funcionales del sistema y sus permisos asociados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                {ROLES.map((r) => (
                  <div
                    key={r.rol}
                    className={`rounded-lg border p-4 ${r.bg} transition-shadow hover:shadow-sm`}
                  >
                    <div className="flex items-center gap-2">
                      <r.icon className={`h-5 w-5 ${r.color}`} />
                      <p className="text-sm font-semibold text-foreground">{r.rol}</p>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {r.responsabilidades}
                    </p>
                    <p className="mt-2 text-xs">
                      <strong className="text-foreground">Permisos:</strong>{" "}
                      <span className="text-muted-foreground">{r.permisos}</span>
                    </p>
                  </div>
                ))}
              </div>
              <Alert>
                <Scale className="h-4 w-4" />
                <AlertTitle>Principio de mínimo privilegio</AlertTitle>
                <AlertDescription>
                  Cada rol recibe los permisos estrictamente necesarios para desempeñar su
                  función. La asignación de roles es responsabilidad del administrador.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 8. Propiedad intelectual */}
          <Card id="propiedad" className="scroll-mt-20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-emerald-600" />
                <CardTitle>8. Propiedad intelectual</CardTitle>
              </div>
              <CardDescription>
                Titularidad de los contenidos y de la plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                El código fuente, los diseños, las marcas, los logotipos y, en general,
                cualquier elemento de la plataforma son titularidad exclusiva de la{" "}
                <strong className="text-foreground">{INSTITUCION.nombre}</strong>, a través de
                la <strong className="text-foreground">{INSTITUCION.direccion}</strong>. Queda
                prohibida su reproducción, distribución o modificación sin autorización
                expresa y por escrito.
              </p>
              <p>
                Los reportes, archivos adjuntos, comentarios y demás contenidos generados por
                los usuarios en el marco del servicio son titularidad de la institución a
                efectos de gestión interna, sin perjuicio de los derechos morales que asisten
                a sus autores. Los usuarios conservan los derechos sobre los contenidos que
                aporten en calidad de autor intelectual.
              </p>
            </CardContent>
          </Card>

          {/* 9. Responsabilidad */}
          <Card id="responsabilidad" className="scroll-mt-20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-emerald-600" />
                <CardTitle>9. Limitación de responsabilidad</CardTitle>
              </div>
              <CardDescription>
                Alcance de la responsabilidad del responsable del sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                La <strong className="text-foreground">{INSTITUCION.nombre}</strong> no
                garantiza la disponibilidad y continuidad ininterrumpida del servicio, ni la
                ausencia total de errores. Realizará sus mejores esfuerzos para mantener el
                sistema operativo y seguro, así como para resolver incidencias técnicas con la
                mayor celeridad posible.
              </p>
              <p>
                El responsable no se hace cargo de los daños directos o indirectos derivados
                del uso indebido del sistema, de la interrupción del servicio por causas de
                fuerza mayor, ni de las acciones realizadas desde cuentas de usuario que
                contravinieren los presentes términos.
              </p>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Exclusión de garantías</AlertTitle>
                <AlertDescription>
                  El servicio se presta “tal cual” y “según disponibilidad”. No se ofrecen
                  garantías explícitas más allá de las previstas en la legislación aplicable.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 10. Modificaciones */}
          <Card id="modificaciones" className="scroll-mt-20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-emerald-600" />
                <CardTitle>10. Modificaciones y vigencia</CardTitle>
              </div>
              <CardDescription>
                Actualización de los términos y canal de contacto.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                El responsable se reserva el derecho de modificar los presentes Términos y
                Condiciones cuando lo considere oportuno, ya sea por motivos técnicos, legales
                u operativos. Las modificaciones se publicarán en esta misma sección y se
                considerarán aceptadas por el uso continuado del sistema tras su publicación.
              </p>
              <p>
                Los términos vigentes son aquellos publicados en la plataforma en el momento
                del acceso. La fecha de última actualización figura en el encabezado de este
                documento.
              </p>
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Canal oficial de consultas y notificaciones
                    </p>
                    <a
                      href={`mailto:${INSTITUCION.correo}`}
                      className="font-mono text-sm font-semibold text-foreground hover:text-emerald-600"
                    >
                      {INSTITUCION.correo}
                    </a>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1" onClick={copiarCorreo}>
                  <Mail className="h-3 w-3" /> Copiar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col gap-2 p-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <ScrollText className="h-3 w-3" />
                <span>
                  Última actualización:{" "}
                  <strong className="text-foreground">{ULTIMA_ACTUALIZACION}</strong>
                </span>
              </div>
              <a
                href={`mailto:${INSTITUCION.correo}`}
                className="font-mono hover:text-emerald-600"
              >
                {INSTITUCION.correo}
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
