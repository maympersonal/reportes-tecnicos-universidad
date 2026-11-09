import { db } from "../src/lib/db"
import { hashPassword } from "../src/lib/auth"
import { TIPOS_TAREA_DEFAULT, TIPOS_AREA_DEFAULT } from "../src/lib/constants"

async function main() {
  console.log("🌱 Iniciando seed...")

  // Limpiar tablas (orden por dependencias)
  await db.notificacion.deleteMany()
  await db.historialEstado.deleteMany()
  await db.archivoReporte.deleteMany()
  await db.equipoReporte.deleteMany()
  await db.reporte.deleteMany()
  await db.session.deleteMany()
  await db.ubicacion.deleteMany()
  await db.area.deleteMany()
  await db.tipoArea.deleteMany()
  await db.tipoTarea.deleteMany()
  await db.user.deleteMany()

  // --- Tipos de área ---
  const tiposArea = []
  for (const t of TIPOS_AREA_DEFAULT) {
    tiposArea.push(await db.tipoArea.create({ data: t }))
  }

  // --- Áreas ---
  const areasData = [
    { nombre: "Facultad de Ingeniería", tipoAreaId: tiposArea[0].id, responsable: "Decano Ing." },
    { nombre: "Facultad de Economía", tipoAreaId: tiposArea[0].id, responsable: "Decano Econ." },
    { nombre: "Rectorado", tipoAreaId: tiposArea[1].id, responsable: "Secretario General" },
    { nombre: "Recursos Humanos", tipoAreaId: tiposArea[1].id, responsable: "Jefa RRHH" },
    { nombre: "Datacenter", tipoAreaId: tiposArea[2].id, responsable: "Admin TI" },
    { nombre: "Soporte Institucional", tipoAreaId: tiposArea[2].id, responsable: "Coord. Soporte" },
    { nombre: "Biblioteca Central", tipoAreaId: tiposArea[3].id, responsable: "Directora Biblioteca" },
  ]
  const areas = []
  for (const a of areasData) {
    areas.push(await db.area.create({ data: a }))
  }

  // --- Ubicaciones ---
  const ubicData = [
    { nombre: "Aula 201", areaId: areas[0].id, edificio: "Edif. A", piso: "2" },
    { nombre: "Aula 105", areaId: areas[0].id, edificio: "Edif. A", piso: "1" },
    { nombre: "Lab. Cómputo 3", areaId: areas[0].id, edificio: "Edif. B", piso: "3" },
    { nombre: "Decanato", areaId: areas[1].id, edificio: "Edif. C", piso: "2" },
    { nombre: "Oficina Rector", areaId: areas[2].id, edificio: "Rectorado", piso: "4" },
    { nombre: "Sala de servidores", areaId: areas[4].id, edificio: "Datacenter", piso: "Sótano" },
    { nombre: "Mostrador de soporte", areaId: areas[5].id, edificio: "Edif. TI", piso: "1" },
    { nombre: "Sala de lectura", areaId: areas[6].id, edificio: "Biblioteca", piso: "2" },
  ]
  for (const u of ubicData) await db.ubicacion.create({ data: u })

  // --- Tipos de tarea ---
  const tiposTarea = []
  for (const t of TIPOS_TAREA_DEFAULT) {
    tiposTarea.push(await db.tipoTarea.create({ data: { codigo: t.codigo, nombre: t.nombre, activo: true } }))
  }

  // --- Usuarios ---
  const usersData = [
    { username: "admin", email: "admin@iris.uh.cu", name: "Carlos Mendoza", role: "admin", cargo: "Administrador del Sistema", areaId: areas[4].id, telefono: "+53 7 123 4567" },
    { username: "tec1", email: "tec1@iris.uh.cu", name: "Ana García", role: "tecnico", cargo: "Técnico de Hardware", areaId: areas[5].id, telefono: "+53 7 222 3344" },
    { username: "tec2", email: "tec2@iris.uh.cu", name: "Luis Fernández", role: "tecnico", cargo: "Técnico de Redes", areaId: areas[4].id, telefono: "+53 7 222 5566" },
    { username: "tec3", email: "tec3@iris.uh.cu", name: "María López", role: "tecnico", cargo: "Técnica de Software", areaId: areas[5].id, telefono: "+53 7 222 7788" },
    { username: "tec4", email: "tec4@iris.uh.cu", name: "José Ramírez", role: "tecnico", cargo: "Soporte General", areaId: areas[5].id, telefono: "+53 7 222 9900" },
    { username: "auditor", email: "auditor@iris.uh.cu", name: "Patricia Díaz", role: "auditor", cargo: "Auditora de TI", areaId: areas[2].id, telefono: "+53 7 333 1122" },
  ]
  const users = []
  for (const u of usersData) {
    users.push(await db.user.create({
      data: { ...u, password: hashPassword("123456") },
    }))
  }
  console.log(`✅ ${users.length} usuarios creados (todos con password "123456")`)

  // --- Reportes ---
  const tecnicos = users.filter((u) => u.role === "tecnico")
  const admin = users.find((u) => u.role === "admin")!
  const estados = ["pendiente", "en_proceso", "resuelto", "cerrado"]
  const prioridades = ["baja", "media", "alta", "critica"]
  const descripciones = [
    "Equipo no enciende, posible fallo de fuente de poder.",
    "Pantalla azul intermitente al iniciar sesión.",
    "Solicito instalación de Microsoft Office 2021.",
    "No tengo acceso al correo institucional, solicito recuperación de cuenta.",
    "Impresora de red no responde, revisar conexión.",
    "Lentitud extrema en el equipo, requiere formateo.",
    "Proyector del aula no muestra imagen desde la laptop.",
    "Actualización de Windows pendiente, requiere revisión.",
    "Caída de red en el laboratorio de cómputo 3.",
    "Teclado con teclas bloqueadas, requiere reemplazo.",
    "Solicito acceso al sistema de gestión académica.",
    "Equipo de la sala de lectura no navega en internet.",
    "Mantenimiento preventivo programado para equipos del aula.",
    "Disco duro con sectores dañados, respaldo y reemplazo.",
    "Configuración de cuenta de correo en móvil institucional.",
    "Ruido excesivo en el ventilador del CPU.",
    "Solicitud de instalación de software estadístico SPSS.",
    "Cámara web no detectada en videoconferencias.",
    "Actualización de antivirus y revisión completa.",
    "Problema con licencia de software de diseño.",
  ]
  const soluciones = [
    "Se reemplazó la fuente de poder por una de 500W, equipo operando con normalidad.",
    "Se reinstalaron los drivers de video y se aplicó actualización acumulativa de Windows.",
    "Se instaló la suite ofimática y se activó con licencia institucional.",
    "Se restableció la contraseña y se verificó el acceso al correo.",
    "Se reconfiguró la cola de impresión y se asignó IP estática al dispositivo.",
    "Se realizó formateo e instalación limpia del sistema operativo con respaldo previo.",
    "Se reemplazó el cable HDMI y se ajustó la resolución del proyector.",
  ]

  let reporteCount = 0
  const now = new Date()
  const year = now.getFullYear()

  // Generar reportes distribuidos en los últimos 6 meses
  for (let month = 5; month >= 0; month--) {
    const perMonth = month === 0 ? 8 : 9
    for (let i = 0; i < perMonth; i++) {
      const date = new Date(year, now.getMonth() - month, 1 + Math.floor(Math.random() * 26), 8 + Math.floor(Math.random() * 9))
      const estadoIdx = Math.floor(Math.random() * 4)
      const estado = estados[estadoIdx]
      const prioridad = prioridades[Math.floor(Math.random() * 4)]
      const tecnico = tecnicos[Math.floor(Math.random() * tecnicos.length)]
      const area = areas[Math.floor(Math.random() * areas.length)]
      const tipo = tiposTarea[Math.floor(Math.random() * tiposTarea.length)]
      const creador = Math.random() > 0.4 ? tecnico : admin
      const desc = descripciones[(i + month) % descripciones.length]
      const solucion = estado === "resuelto" || estado === "cerrado" ? soluciones[(i + month) % soluciones.length] : null
      const fechaResolucion = solucion ? new Date(date.getTime() + (Math.random() * 72 + 2) * 3600 * 1000) : null

      reporteCount++
      const codigo = `RPT-${year}-${String(reporteCount).padStart(4, "0")}`
      const usuarios = ["Roberto Suárez", "Lucía Pérez", "Miguel Torres", "Elena Castillo", "Jorge Núñez", "Rosa Martínez", "Fernando Rojas"]
      const cargos = ["Profesor", "Auxiliar Administrativo", "Estudiante", "Investigador", "Secretaria"]
      const usrNombre = usuarios[(i + month) % usuarios.length]
      const usrCargo = cargos[(i + month) % cargos.length]

      const reporte = await db.reporte.create({
        data: {
          codigo,
          tipoTareaId: tipo.id,
          descripcion: desc,
          solucion,
          areaId: area.id,
          ubicacion: `Edif. ${["A", "B", "C"][i % 3]} - Piso ${1 + (i % 4)}`,
          usuarioNombre: usrNombre,
          usuarioCorreo: `usuario${i + month}@iris.uh.cu`,
          usuarioCargo: usrCargo,
          prioridad,
          estado,
          creadoPorId: creador.id,
          tecnicoAsignadoId: estado === "pendiente" ? null : tecnico.id,
          fechaCreacion: date,
          fechaActualizacion: fechaResolucion ?? date,
          fechaResolucion,
        },
      })

      // Equipos (50% de los reportes)
      if (Math.random() > 0.5) {
        const marcas = ["Dell", "HP", "Lenovo", "Epson", "Canon"]
        await db.equipoReporte.create({
          data: {
            reporteId: reporte.id,
            codigoActivo: `ACT-${1000 + reporteCount}`,
            marca: marcas[i % marcas.length],
            modelo: `Model-${100 + i}`,
            serie: `SN${Date.now().toString().slice(-6)}${i}`,
          },
        })
      }

      // Historial
      const estadosRecorridos = ["pendiente"]
      if (estado !== "pendiente") estadosRecorridos.push("en_proceso")
      if (estado === "resuelto" || estado === "cerrado") estadosRecorridos.push("resuelto")
      if (estado === "cerrado") estadosRecorridos.push("cerrado")
      for (let h = 0; h < estadosRecorridos.length; h++) {
        if (h === 0) {
          await db.historialEstado.create({
            data: {
              reporteId: reporte.id,
              estadoAnterior: null,
              estadoNuevo: "pendiente",
              comentario: "Reporte creado",
              usuarioId: creador.id,
              fecha: date,
            },
          })
        } else {
          await db.historialEstado.create({
            data: {
              reporteId: reporte.id,
              estadoAnterior: estadosRecorridos[h - 1],
              estadoNuevo: estadosRecorridos[h],
              comentario: solucion && h === estadosRecorridos.length - 1 ? solucion : "Actualización de estado",
              usuarioId: tecnico.id,
              fecha: new Date(date.getTime() + h * 6 * 3600 * 1000),
            },
          })
        }
      }

      // Notificaciones (al creador y al técnico)
      await db.notificacion.create({
        data: {
          usuarioId: creador.id,
          tipo: "nuevo_reporte",
          titulo: "Nuevo reporte asignado",
          mensaje: `Se le asignó el reporte ${codigo}`,
          reporteId: reporte.id,
          leida: Math.random() > 0.5,
          fecha: date,
        },
      })
      if (estado !== "pendiente") {
        await db.notificacion.create({
          data: {
            usuarioId: tecnico.id,
            tipo: "asignacion",
            titulo: "Reporte asignado",
            mensaje: `${creador.name} le asignó ${codigo}`,
            reporteId: reporte.id,
            leida: Math.random() > 0.6,
            fecha: new Date(date.getTime() + 30 * 60 * 1000),
          },
        })
      }
    }
  }
  console.log(`✅ ${reporteCount} reportes creados`)

  console.log("\n🎉 Seed completado!")
  console.log("Credenciales de acceso:")
  console.log("  admin / 123456    (Administrador)")
  console.log("  tec1 / 123456     (Técnico)")
  console.log("  auditor / 123456  (Auditor)")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
