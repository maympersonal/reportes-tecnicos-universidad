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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  Shield,
  ArrowLeft,
  Mail,
  Lock,
  Database,
  Globe,
  UserCheck,
  FileText,
  Eye,
  KeyRound,
  Server,
  AlertCircle,
  Scale,
  Trash2,
  Mailbox,
  ScanEye,
  Clock,
  ListChecks,
  HelpCircle,
  CheckCircle2,
  History,
  Fingerprint,
} from "lucide-react"
import { toast } from "sonner"

const ULTIMA_ACTUALIZACION = "1 de octubre de 2025"

const SECCIONES = [
  { id: "intro", label: "1. Introducción y responsable" },
  { id: "datos", label: "2. Datos que recogemos" },
  { id: "finalidades", label: "3. Finalidades del tratamiento" },
  { id: "base-legal", label: "4. Base legal" },
  { id: "derechos", label: "5. Derechos del titular" },
  { id: "olvido", label: "6. Derecho al olvido" },
  { id: "destinatarios", label: "7. Destinatarios y transferencias" },
  { id: "seguridad", label: "8. Medidas de seguridad" },
  { id: "ia", label: "9. Uso de Inteligencia Artificial" },
  { id: "contacto", label: "10. Contacto y reclamos" },
  { id: "faq", label: "11. Preguntas frecuentes" },
]

// Inventario de datos — con columna Conservación añadida
const DATOS_RECOGIDOS = [
  {
    dato: "Nombre y apellidos",
    finalidad: "Identificación del usuario y atribución de autoría de reportes.",
    base: "Cumplimiento de obligaciones contractuales (art. 10 Ley 1581).",
    conservacion: "Mientras la cuenta esté activa; anonimizada al ejercer el olvido.",
  },
  {
    dato: "Correo institucional",
    finalidad: "Notificaciones del sistema, recuperación de cuenta y reclamos.",
    base: "Ejecución del contrato y relación administrativa.",
    conservacion: "Hasta 12 meses tras la baja para auditoría.",
  },
  {
    dato: "Nombre de usuario (username)",
    finalidad: "Inicio de sesión, trazabilidad y auditoría.",
    base: "Interés legítimo de seguridad informática.",
    conservacion: "Mientras la cuenta esté activa; irreversiblemente anonimizado al olvido.",
  },
  {
    dato: "Hash de contraseña (scrypt)",
    finalidad: "Autenticación segura. Nunca se almacena en texto claro.",
    base: "Medida técnica de seguridad (art. 15 Decreto 1377).",
    conservacion: "Eliminado de forma inmediata al ejercer el olvido.",
  },
  {
    dato: "Cargo y teléfono",
    finalidad: "Asignación de roles y contacto operativo para soporte.",
    base: "Autorización expresa del titular.",
    conservacion: "Suprimido al cerrar la cuenta.",
  },
  {
    dato: "Área de adscripción",
    finalidad: "Visibilidad de reportes según rol y dependencia.",
    base: "Necesidad operativa del servicio.",
    conservacion: "Mientras la cuenta esté activa.",
  },
  {
    dato: "Direcciones IP y logs de sesión",
    finalidad: "Auditoría de accesos, prevención de fraude y soporte técnico.",
    base: "Interés legítimo (seguridad) art. 10 Ley 1581.",
    conservacion: "90 días de retención de logs, luego purga automática.",
  },
  {
    dato: "Historial de estados de reportes",
    finalidad: "Trazabilidad y auditoría de cambios (quién, cuándo, qué estado).",
    base: "Cumplimiento de deberes legales y obligaciones de control.",
    conservacion: "Conservado de forma agregada/anonimizada tras el olvido.",
  },
]

const FINALIDADES = [
  "Gestionar la creación, asignación, seguimiento y resolución de reportes técnicos en el ámbito de la institución.",
  "Mantener un historial auditable de cambios de estado, archivos adjuntos y notificaciones internas.",
  "Generar estadísticas agregadas y rankings de desempeño de los técnicos, con fines de mejora del servicio.",
  "Permitir la exportación de informes en formato Excel, PDF y Word para fines administrativos y de auditoría.",
  "Garantizar la seguridad de la información mediante el control de accesos, registro de sesiones y prevención de usos indebidos.",
  "Cumplir con las obligaciones legales y reglamentarias que correspondan al responsable del tratamiento.",
]

const DERECHOS_TITULAR = [
  {
    icon: Eye,
    title: "Acceder",
    text: "Conocer qué datos personales tiene el responsable y consultarlos de forma gratuita.",
    canal: "Correo institucional",
    plazo: "10 días hábiles (art. 12)",
  },
  {
    icon: UserCheck,
    title: "Actualizar",
    text: "Solicitar la actualización de los datos cuando hayan cambiado o sean incompletos.",
    canal: "Correo institucional",
    plazo: "15 días hábiles (art. 13)",
  },
  {
    icon: ScanEye,
    title: "Rectificar",
    text: "Corregir datos inexactos, parciales o erróneos que consten en el sistema.",
    canal: "Correo institucional",
    plazo: "15 días hábiles (art. 13)",
  },
  {
    icon: Trash2,
    title: "Suprimir",
    text: "Solicitar la supresión de los datos cuando no sean necesarios o el tratamiento sea ilícito.",
    canal: "Panel del usuario → Eliminar cuenta",
    plazo: "Inmediato (autoasistido)",
  },
  {
    icon: KeyRound,
    title: "Revocar autorización",
    text: "Retirar el consentimiento otorgado para el tratamiento de los datos personales.",
    canal: "Panel del usuario o correo",
    plazo: "Inmediato / 15 días hábiles",
  },
]

const DESTINATARIOS = [
  {
    pais: "Estados Unidos 🇺🇸",
    proveedor: "Supabase",
    servicio: "Base de datos PostgreSQL y autenticación",
    finalidad: "Almacenamiento cifrado de datos y gestión de sesiones del backend.",
    garantias: "Cláusulas contractuales tipo (SCC), cifrado en tránsito y reposo, RGPD.",
  },
  {
    pais: "Estados Unidos 🇺🇸",
    proveedor: "Railway",
    servicio: "Hosting del backend",
    finalidad: "Ejecución de la API Next.js y orquestación de servicios.",
    garantias: "Acuerdo de tratamiento de datos y políticas de seguridad SOC 2.",
  },
  {
    pais: "Estados Unidos 🇺🇸",
    proveedor: "Netlify",
    servicio: "Hosting del frontend (CDN)",
    finalidad: "Distribución de la SPA y certificados TLS automáticos.",
    garantias: "Certificación SOC 2 Type II y cumplimiento con estándares de la industria.",
  },
  {
    pais: "Francia 🇫🇷",
    proveedor: "Brevo",
    servicio: "Correo transaccional",
    finalidad: "Envío de notificaciones por correo y recuperación de cuenta.",
    garantias: "Cumplimiento RGPD (UE) y compromisos de confidencialidad.",
  },
]

const MEDIDAS_SEGURIDAD = [
  {
    icon: Fingerprint,
    title: "Hashing de contraseñas (scrypt)",
    text: "Las contraseñas se almacenan con el algoritmo scrypt + sal criptográfica. Es matemáticamente irreversible: ni siquiera un administrador con acceso a la base de datos puede recuperar tu contraseña original.",
  },
  {
    icon: KeyRound,
    title: "Sesiones JWT con caducidad",
    text: "Cada sesión se representa con un token JWT firmado, con caducidad de 7 días y revocación centralizada desde la tabla de sesiones. Cerrar sesión invalida el token al instante.",
  },
  {
    icon: Shield,
    title: "Control de accesos por rol (RBAC)",
    text: "Permisos diferenciados para superadmin, admin, técnico y auditor. Cada usuario accede únicamente a la información necesaria para su función (principio de menor privilegio).",
  },
  {
    icon: Lock,
    title: "Cifrado HTTPS (TLS 1.2+)",
    text: "Todas las comunicaciones entre el navegador y el servidor se cifran mediante TLS 1.2 o superior. Los tokens de sesión viajan por cabecera Authorization.",
  },
  {
    icon: CheckCircle2,
    title: "Validación de fuerza de contraseña",
    text: "Las contraseñas deben cumplir: mínimo 8 caracteres, al menos una mayúscula, una minúscula, un número y un carácter especial. Verificado en backend y frontend.",
  },
  {
    icon: Trash2,
    title: "Derecho al olvido integrado",
    text: "El titular puede eliminar su cuenta desde el panel del usuario: anonimiza los reportes creados, elimina sesiones y notificaciones, y desactiva la cuenta, conservando trazabilidad agregada.",
  },
  {
    icon: History,
    title: "Logs de auditoría e historial",
    text: "Cada cambio de estado de un reporte queda registrado en una tabla de historial (quién, cuándo, estado anterior y nuevo). Los accesos y operaciones críticas se registran para trazabilidad.",
  },
  {
    icon: Server,
    title: "Principio de menor privilegio",
    text: "Cada rol expone solo la información y acciones necesarias. Las reglas de visibilidad (qué reportes ve cada usuario) se aplican en el backend, no en el frontend.",
  },
]

const FAQ = [
  {
    q: "¿Puedo ver los datos que el sistema tiene sobre mí?",
    a: "Sí. Inicia sesión y revisa tu perfil (avatar → Mi cuenta). Para una exportación completa de tus datos, escribe a innovacion.did@iris.uh.cu y se atenderá en máximo 10 días hábiles (art. 12 Ley 1581).",
  },
  {
    q: "¿Qué pasa con los reportes que creé si elimino mi cuenta?",
    a: "Los reportes no se borran: se anonimizan, es decir, se reasignan a un usuario 'Anónimo' para preservar la trazabilidad histórica e integridad del reporte técnico. Tu nombre, correo y username quedan irreversiblemente suprimidos.",
  },
  {
    q: "¿El sistema usa Inteligencia Artificial para tomar decisiones sobre mí?",
    a: "No. El sistema NO utiliza IA para decisiones automatizadas que afecten tus intereses (art. 15 Decreto 1377). Rankings, métricas y asignaciones son reglas deterministas y auditables configuradas por humanos.",
  },
  {
    q: "¿Mi contraseña se almacena en texto claro?",
    a: "Nunca. Se almacena exclusivamente su hash scrypt con sal. Ni administradores ni el equipo de desarrollo pueden recuperarla; si la olvidas, deberás restablecerla mediante el correo de recuperación.",
  },
  {
    q: "¿Cuánto tiempo conservan mis datos?",
    a: "Mientras la cuenta esté activa. Al ejercer el olvido, los datos identificativos se suprimen/anonimizan de inmediato. Los logs de sesión se purgan a los 90 días y el historial de estados se conserva de forma agregada y anonimizada.",
  },
]

export function PrivacidadView() {
  const setView = useAppStore((s) => s.setView)

  const copiarCorreo = () => {
    navigator.clipboard?.writeText(INSTITUCION.correo)
    toast.success("Correo copiado al portapapeles")
  }

  return (
    <div className="mx-auto max-w-5xl animate-fade-in-up px-4 pb-10 sm:px-6">
      {/* Header institucional */}
      <Card className="overflow-hidden border-0 bg-institucional text-white shadow-md">
        <CardContent className="p-5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <Badge
                variant="secondary"
                className="gap-1 bg-white/15 text-white hover:bg-white/20"
              >
                <Shield className="h-3 w-3" /> Documento legal
              </Badge>
              <h1 className="text-2xl font-bold sm:text-3xl">Política de Privacidad</h1>
              <p className="text-sm text-white/85">
                {INSTITUCION.sistema} · {INSTITUCION.direccion}
              </p>
              <p className="text-xs text-white/70">
                Conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013 — República de
                Colombia.
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

      {/* Callout — Tu privacidad es nuestra prioridad */}
      <Alert className="mt-4 border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100 sm:mt-6">
        <Shield className="h-4 w-4" />
        <AlertTitle className="text-base font-semibold">Tu privacidad es nuestra prioridad</AlertTitle>
        <AlertDescription className="text-sm leading-relaxed sm:text-base">
          Recogemos únicamente los datos necesarios para gestionar reportes técnicos (nombre,
          correo institucional, cargo, área y datos de sesión). No solicitamos datos sensibles.
          Tienes derecho a acceder, rectificar, suprimir y revocar tu autorización — todo
          autoasistido desde la propia interfaz o escribiendo a{" "}
          <a href={`mailto:${INSTITUCION.correo}`} className="font-semibold underline">
            {INSTITUCION.correo}
          </a>
          . Tus contraseñas se almacenan cifradas (scrypt) y tus reportes son anonimizados
          si ejerces el derecho al olvido.
        </AlertDescription>
      </Alert>

      {/* Grid: sticky sidebar + content */}
      <div className="mt-4 grid gap-4 sm:gap-6 lg:grid-cols-[220px_1fr] sm:mt-6">
        {/* Sticky index — hidden on mobile */}
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
        <div className="space-y-4 sm:space-y-6">
          {/* 1. Introducción */}
          <Card id="intro" className="scroll-mt-20">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-emerald-600" />
                <CardTitle className="text-base sm:text-lg">1. Introducción y responsable del tratamiento</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Identidad del responsable y compromiso con la protección de datos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 text-sm leading-relaxed text-muted-foreground sm:p-6 sm:pt-0 sm:text-base">
              <p>
                La <strong className="text-foreground">{INSTITUCION.nombre}</strong>, a
                través de la <strong className="text-foreground">{INSTITUCION.direccion}</strong>{" "}
                y, específicamente, del{" "}
                <strong className="text-foreground">{INSTITUCION.departamento}</strong>, actúa
                como <strong className="text-foreground">responsable del tratamiento</strong>{" "}
                de los datos personales en el marco del{" "}
                <strong className="text-foreground">{INSTITUCION.sistema}</strong>. Esta
                plataforma se compromete a garantizar la privacidad y el ejercicio de los
                derechos de los titulares de datos, conforme a lo dispuesto en la Ley
                Estatutaria 1581 de 2012 y el Decreto 1377 de 2013.
              </p>
              <p>
                Esta política describe, en lenguaje claro, qué datos se recogen, con qué
                finalidad, durante cuánto tiempo, a qué destinatarios se comparten, qué
                medidas de seguridad aplicamos y cuáles son tus derechos como titular para
                ejercer control sobre tu información.
              </p>
              <Alert>
                <Scale className="h-4 w-4" />
                <AlertTitle>Marco normativo aplicable</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  Ley Estatutaria 1581 de 2012 (Protección de Datos Personales), Decreto 1377
                  de 2013 (reglamentario) y lineamientos de la Superintendencia de Industria y
                  Comercio (SIC). La presente política se actualiza periódicamente; la fecha
                  de la última revisión figura en el encabezado.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 2. Datos personales */}
          <Card id="datos" className="scroll-mt-20">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 shrink-0 text-emerald-600" />
                <CardTitle className="text-base sm:text-lg">2. Datos personales que recogemos</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Inventario de datos tratados, finalidad, base legal y conservación.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="min-w-[140px]">Dato personal</TableHead>
                      <TableHead className="min-w-[160px]">Finalidad</TableHead>
                      <TableHead className="min-w-[160px]">Base legal</TableHead>
                      <TableHead className="min-w-[140px] hidden md:table-cell">Conservación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DATOS_RECOGIDOS.map((row) => (
                      <TableRow key={row.dato}>
                        <TableCell className="text-sm font-medium">{row.dato}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{row.finalidad}</TableCell>
                        <TableCell className="text-xs text-muted-foreground sm:text-sm">
                          {row.base}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden md:table-cell sm:text-sm">
                          {row.conservacion}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground md:hidden">
                <strong>Conservación:</strong> {DATOS_RECOGIDOS[0].dato}: {DATOS_RECOGIDOS[0].conservacion} — los demás datos se conservan según su finalidad y se anonimizan al ejercer el olvido.
              </p>
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertTitle>Principio de minimización</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  Solo se recogen los datos estrictamente necesarios para la prestación del
                  servicio. El sistema <strong>no solicita datos sensibles</strong> (salud,
                  ideología, biométricos, vida sexual, origen racial, pertenencia sindical, etc.).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 3. Finalidades */}
          <Card id="finalidades" className="scroll-mt-20">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 shrink-0 text-emerald-600" />
                <CardTitle className="text-base sm:text-lg">3. Finalidades del tratamiento</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Los datos se tratan exclusivamente para los siguientes fines.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <ul className="space-y-2 text-sm text-muted-foreground sm:text-base">
                {FINALIDADES.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
              <Alert className="mt-3">
                <Clock className="h-4 w-4" />
                <AlertTitle>Principio de temporalidad</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  Los datos se conservan durante el tiempo necesario para cumplir con la
                  finalidad descrita y, posteriormente, durante los plazos legales aplicables.
                  Cumplido dicho plazo, se anonimizan o suprimen. Los logs de sesión se purgan
                  automáticamente a los 90 días.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 4. Base legal */}
          <Card id="base-legal" className="scroll-mt-20">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 shrink-0 text-emerald-600" />
                <CardTitle className="text-base sm:text-lg">4. Base legal del tratamiento</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Fundamento normativo conforme a la legislación colombiana.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 text-sm leading-relaxed text-muted-foreground sm:p-6 sm:pt-0 sm:text-base">
              <p>
                El tratamiento de datos personales se realiza sobre la base de las siguientes
                causales legalmente reconocidas:
              </p>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-xs">Art. 5</Badge>
                  <span>
                    <strong className="text-foreground">Autorización del titular.</strong>{" "}
                    El usuario consiente libre, previa, expresa e inequívocamente el tratamiento
                    de sus datos al crear su cuenta y aceptar esta política.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-xs">Art. 4</Badge>
                  <span>
                    <strong className="text-foreground">Principios rectores.</strong> El
                    tratamiento se rige por los principios de legalidad, finalidad, libertad,
                    veracidad o calidad, transparencia, acceso restringido, seguridad y
                    confidencialidad.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-xs">Art. 10</Badge>
                  <span>
                    <strong className="text-foreground">Causales habilitantes.</strong>{" "}
                    Ejecución de un contrato, cumplimiento de deberes legales y la atención de
                    intereses legítimos del responsable en materia de seguridad y auditoría.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 shrink-0 font-mono text-xs">Dec. 1377</Badge>
                  <span>
                    <strong className="text-foreground">Reglamentación.</strong> El Decreto
                    1377 de 2013 desarrolla los lineamientos operativos para la gestión
                    adecuada de los datos personales por parte de los responsables.
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* 5. Derechos del titular */}
          <Card id="derechos" className="scroll-mt-20">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                <CardTitle className="text-base sm:text-lg">5. Derechos del titular (art. 8 Ley 1581)</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Derechos que puedes ejercer sobre tus datos personales, canal y plazo de respuesta.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                {DERECHOS_TITULAR.map((d) => (
                  <div
                    key={d.title}
                    className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5 sm:p-4"
                  >
                    <div className="flex items-center gap-2">
                      <d.icon className="h-4 w-4 shrink-0 text-emerald-600" />
                      <p className="text-sm font-semibold text-foreground">{d.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed sm:text-sm">{d.text}</p>
                    <div className="mt-2 flex flex-col gap-1 border-t border-emerald-200/50 pt-2 text-[11px] text-muted-foreground dark:border-emerald-500/20 sm:text-xs">
                      <span><strong className="text-foreground">Canal:</strong> {d.canal}</span>
                      <span><strong className="text-foreground">Plazo:</strong> {d.plazo}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Alert className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ejercicio gratuito</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  El ejercicio de los derechos es <strong>gratuito</strong>. El responsable
                  responderá a la solicitud en un plazo máximo de quince (15) días hábiles
                  (o diez (10) días hábiles para consultas), conforme a los artículos 12 y 13
                  de la Ley 1581 de 2012.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 6. Derecho al olvido */}
          <Card id="olvido" className="scroll-mt-20">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 shrink-0 text-emerald-600" />
                <CardTitle className="text-base sm:text-lg">6. Derecho al olvido y supresión</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Cómo ejercer la supresión de tu cuenta y qué ocurre paso a paso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 text-sm text-muted-foreground sm:p-6 sm:pt-0 sm:text-base">
              <p className="leading-relaxed">
                Puedes ejercer tu derecho a la supresión de datos personales directamente desde
                la interfaz del sistema, sin necesidad de trámite administrativo adicional.
                El flujo es el siguiente:
              </p>
              <ol className="space-y-2">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">1</span>
                  <span>
                    Acceder al panel del usuario en la barra superior (avatar) y seleccionar{" "}
                    <strong className="text-foreground">“Eliminar mi cuenta”</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">2</span>
                  <span>
                    Confirmar la acción escribiendo{" "}
                    <code className="rounded bg-muted px-1 font-mono text-xs">ELIMINAR</code>{" "}
                    en el diálogo de confirmación.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">3</span>
                  <span>
                    El sistema <strong className="text-foreground">anonimiza los reportes creados</strong>{" "}
                    por ti: se reasignan a un usuario genérico “Anónimo” para preservar la
                    integridad histórica y la trazabilidad del reporte técnico.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">4</span>
                  <span>
                    Se <strong className="text-foreground">eliminan tus sesiones activas</strong>{" "}
                    (invalidación inmediata del JWT) y las{" "}
                    <strong className="text-foreground">notificaciones internas</strong>{" "}
                    asociadas a tu usuario.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">5</span>
                  <span>
                    Tu cuenta se <strong className="text-foreground">desactiva</strong>{" "}
                    (activo=false) y tu hash de contraseña, correo y cargo se purgan. El
                    username queda irreversiblemente anonimizado.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">6</span>
                  <span>
                    Se <strong className="text-foreground">conserva trazabilidad agregada</strong>{" "}
                    (historial de estados de los reportes, estadísticas anónimas) con fines de
                    auditoría y mejora del servicio, sin identificar al titular.
                  </span>
                </li>
              </ol>
              <div className="rounded-lg border bg-muted/30 p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-xs text-muted-foreground">¿Dudas sobre el olvido?</p>
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
                <p className="mt-2 text-[11px] text-muted-foreground sm:text-xs">
                  Las solicitudes asistidas por correo se responden en máximo{" "}
                  <strong className="text-foreground">15 días hábiles</strong> (art. 13 Ley 1581).
                </p>
              </div>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Acción irreversible</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  Una vez completada, la operación no puede revertirse. La anonimización
                  busca preservar la integridad histórica del reporte técnico sin
                  comprometer la identidad del titular. Si solo quieres dejar de usar el
                  sistema, puedes simplemente cerrar sesión; no necesitas eliminar tu cuenta.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 7. Destinatarios */}
          <Card id="destinatarios" className="scroll-mt-20">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 shrink-0 text-emerald-600" />
                <CardTitle className="text-base sm:text-lg">7. Destinatarios y transferencias internacionales</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Terceros que actúan como encargados del tratamiento, con país, servicio y garantías.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead className="min-w-[110px]">País</TableHead>
                      <TableHead className="min-w-[100px]">Proveedor</TableHead>
                      <TableHead className="min-w-[140px] hidden md:table-cell">Servicio</TableHead>
                      <TableHead className="min-w-[160px]">Finalidad</TableHead>
                      <TableHead className="min-w-[140px] hidden lg:table-cell">Garantías</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {DESTINATARIOS.map((d) => (
                      <TableRow key={d.proveedor}>
                        <TableCell className="text-xs sm:text-sm">{d.pais}</TableCell>
                        <TableCell className="text-sm font-medium sm:text-base">{d.proveedor}</TableCell>
                        <TableCell className="text-xs hidden md:table-cell sm:text-sm">{d.servicio}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{d.finalidad}</TableCell>
                        <TableCell className="text-xs text-muted-foreground hidden lg:table-cell sm:text-sm">
                          {d.garantias}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Alert>
                <Globe className="h-4 w-4" />
                <AlertTitle>Transferencias internacionales</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  Se han celebrado acuerdos con cláusulas contractuales tipo y se exige a cada
                  encargado el cumplimiento de estándares equivalentes a los previstos en la
                  legislación colombiana. La lista de proveedores puede actualizarse; cualquier
                  cambio se notificará a través de esta política y, cuando proceda, a través de
                  notificación interna en el sistema.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 8. Medidas de seguridad */}
          <Card id="seguridad" className="scroll-mt-20">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 shrink-0 text-emerald-600" />
                <CardTitle className="text-base sm:text-lg">8. Medidas de seguridad técnicas y organizativas</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Salvaguardas concretas implementadas para proteger tus datos personales.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                {MEDIDAS_SEGURIDAD.map((m) => (
                  <div
                    key={m.title}
                    className="rounded-lg border bg-card p-3 transition-colors hover:border-emerald-300 dark:hover:border-emerald-500/30 sm:p-4"
                  >
                    <div className="flex items-center gap-2">
                      <m.icon className="h-4 w-4 shrink-0 text-emerald-600" />
                      <p className="text-sm font-semibold text-foreground">{m.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed sm:text-sm">{m.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 9. Declaración IA */}
          <Card id="ia" className="scroll-mt-20 border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <ScanEye className="h-5 w-5 shrink-0 text-emerald-600" />
                <CardTitle className="text-base sm:text-lg">9. Declaración sobre uso de Inteligencia Artificial</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Conforme al artículo 15 del Decreto 1377 de 2013.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 text-sm text-muted-foreground sm:p-6 sm:pt-0 sm:text-base">
              <p className="leading-relaxed">
                El <strong className="text-foreground">{INSTITUCION.sistema}</strong>{" "}
                <strong className="text-foreground">NO utiliza Inteligencia Artificial</strong>{" "}
                para tomar decisiones automatizadas que produzcan efectos jurídicos o afecten
                de manera significativa los intereses del titular, en cumplimiento del artículo
                15 del Decreto 1377 de 2013.
              </p>
              <p className="leading-relaxed">
                Las decisiones dentro del sistema (asignación de técnicos, priorización de
                reportes, cálculo de rankings y métricas de desempeño) son producto de reglas
                deterministas y explícitas, configuradas por los administradores y
                supervisadas por humanos. Los reportes de estadísticas y rankings se calculan
                mediante fórmulas aritméticas públicas y auditables.
              </p>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Sin elaboración de perfiles automatizados</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  No se realiza elaboración de perfiles ni se realizan predicciones
                  automatizadas que afecten al titular. Cualquier análisis sobre los datos es
                  meramente estadístico y agregado.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 10. Contacto */}
          <Card id="contacto" className="scroll-mt-20">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <Mailbox className="h-5 w-5 shrink-0 text-emerald-600" />
                <CardTitle className="text-base sm:text-lg">10. Contacto y reclamos</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Canal habilitado para el ejercicio de derechos y presentación de reclamos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-4 pt-0 text-sm text-muted-foreground sm:p-6 sm:pt-0 sm:text-base">
              <p className="leading-relaxed">
                El titular podrá ejercer sus derechos de acceso, rectificación, actualización,
                supresión y revocación, así como presentar reclamos, dirigiéndose al
                responsable del tratamiento a través del canal oficial:
              </p>
              <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Correo institucional</p>
                    <a
                      href={`mailto:${INSTITUCION.correo}`}
                      className="font-mono text-sm font-semibold text-foreground hover:text-emerald-600 sm:text-base"
                    >
                      {INSTITUCION.correo}
                    </a>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1" onClick={copiarCorreo}>
                  <Mail className="h-3 w-3" /> Copiar
                </Button>
              </div>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Término de respuesta</AlertTitle>
                <AlertDescription className="text-sm leading-relaxed">
                  Las peticiones de consulta se atenderán en un máximo de diez (10) días
                  hábiles y los reclamos en un máximo de quince (15) días hábiles, conforme a
                  los artículos 12 y 13 de la Ley 1581 de 2012. Si el titular considera que su
                  derecho ha sido vulnerado, podrá acudir a la Superintendencia de Industria y
                  Comercio (SIC).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* 11. FAQ */}
          <Card id="faq" className="scroll-mt-20">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 shrink-0 text-emerald-600" />
                <CardTitle className="text-base sm:text-lg">11. Preguntas frecuentes</CardTitle>
              </div>
              <CardDescription className="text-sm">
                Respuestas rápidas a las dudas más comunes sobre privacidad.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
              <Accordion type="single" collapsible className="w-full">
                {FAQ.map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left text-sm hover:no-underline sm:text-base">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-xs text-muted-foreground leading-relaxed sm:text-sm">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {/* Footer */}
          <Card className="bg-muted/30">
            <CardContent className="flex flex-col gap-2 p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:p-4 sm:text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Shield className="h-3 w-3" />
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
