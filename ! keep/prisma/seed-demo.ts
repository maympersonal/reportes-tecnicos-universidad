// Script OPCIONAL para cargar datos de DEMOSTRACIÓN.
// Uso: bun prisma/seed-demo.ts
// NOTA: por defecto la app NO carga datos simulados al reiniciar.
// El superadmin y los catálogos del sistema se crean automáticamente vía lib/bootstrap.ts.
// Ejecuta este script solo si quieres reportes de ejemplo para probar el dashboard/estadísticas.

import { db } from "../src/lib/db"
import { hashPassword } from "../src/lib/auth"
import { ensureBootstrap } from "../src/lib/bootstrap"
import { TIPOS_EQUIPO_DEFAULT } from "../src/lib/constants"

async function main() {
  await ensureBootstrap()
  console.log("🌱 Cargando datos de demostración (opcionales)...")

  const admins = await db.user.findMany({ where: { role: "admin" } })
  if (admins.length === 0) {
    // crea un admin + técnicos + auditor de demo
    const users = [
      { username: "admin", email: "admin@iris.uh.cu", name: "Carlos Mendoza", role: "admin", cargo: "Administrador DID" },
      { username: "tec1", email: "tec1@iris.uh.cu", name: "Ana García", role: "tecnico", cargo: "Técnico DST" },
      { username: "tec2", email: "tec2@iris.uh.cu", name: "Luis Fernández", role: "tecnico", cargo: "Técnico DST" },
      { username: "tec3", email: "tec3@iris.uh.cu", name: "María López", role: "tecnico", cargo: "Técnica DST" },
      { username: "tec4", email: "tec4@iris.uh.cu", name: "José Ramírez", role: "tecnico", cargo: "Soporte DST" },
      { username: "auditor", email: "auditor@iris.uh.cu", name: "Patricia Díaz", role: "auditor", cargo: "Auditora DST" },
    ]
    for (const u of users) await db.user.create({ data: { ...u, password: hashPassword("Temporal2026!") } })
    console.log("✅ Usuarios demo creados (password: Temporal2026!)")
  }

  const areas = await db.area.findMany()
  const tiposTarea = await db.tipoTarea.findMany()
  const tiposEquipo = await db.tipoEquipo.findMany()
  const tecnicos = await db.user.findMany({ where: { role: "tecnico", activo: true } })
  const admin = await db.user.findFirst({ where: { role: "admin" } })
  if (!admin || tecnicos.length === 0 || areas.length === 0 || tiposTarea.length === 0) {
    console.log("Nada que sembrar (faltan catálogos). Ejecuta primero ensureBootstrap.")
    return
  }

  const estados = ["pendiente", "en_proceso", "resuelto", "cerrado"]
  const prioridades = ["baja", "media", "alta", "critica"]
  const descripciones = [
    "Equipo no enciende, posible fallo de fuente de poder.",
    "Pantalla azul intermitente al iniciar sesión.",
    "Solicito instalación de software institucional.",
    "No tengo acceso al correo, solicito recuperación de cuenta.",
    "Impresora de red no responde.",
    "Lentitud extrema en el equipo, requiere formateo.",
    "Proyector del aula no muestra imagen.",
    "Caída de red en el laboratorio de cómputo.",
    "Teclado con teclas bloqueadas, requiere reemplazo.",
    "Solicitud de acceso al sistema académico.",
  ]
  const soluciones = [
    "Se reemplazó la fuente de poder por una de 500W.",
    "Se reinstalaron los drivers de video.",
    "Se instaló la suite ofimática.",
    "Se restableció la contraseña.",
    "Se reconfiguró la cola de impresión.",
  ]

  let n = await db.reporte.count()
  const now = new Date()
  for (let month = 2; month >= 0; month--) {
    for (let i = 0; i < 7; i++) {
      n++
      const date = new Date(now.getFullYear(), now.getMonth() - month, 1 + (i % 27), 9)
      const estado = estados[(i + month) % 4]
      const prioridad = prioridades[(i + month) % 4]
      const tecnico = tecnicos[(i + month) % tecnicos.length]
      const area = areas[(i + month) % areas.length]
      const tipo = tiposTarea[(i + month) % tiposTarea.length]
      const sol = (estado === "resuelto" || estado === "cerrado") ? soluciones[(i + month) % soluciones.length] : null
      const fr = sol ? new Date(date.getTime() + (i + 3) * 3_600_000) : null
      const codigo = `RPT-${now.getFullYear()}-${String(n).padStart(4, "0")}`
      const r = await db.reporte.create({
        data: {
          codigo, tipoTareaId: tipo.id, descripcion: descripciones[(i + month) % descripciones.length],
          solucion: sol, areaId: area.id, ubicacion: `Edif. ${["A", "B", "C"][i % 3]} - Piso ${1 + (i % 4)}`,
          usuarioNombre: ["Roberto S.", "Lucía P.", "Miguel T.", "Elena C."][i % 4],
          usuarioCorreo: `usuario${i}@iris.uh.cu`, usuarioCargo: "Profesor",
          prioridad, estado, creadoPorId: admin.id,
          tecnicoAsignadoId: estado === "pendiente" ? null : tecnico.id,
          fechaCreacion: date, fechaActualizacion: fr ?? date, fechaResolucion: fr,
        },
      })
      if (i % 3 === 0 && tiposEquipo.length) {
        await db.equipoReporte.create({
          data: { reporteId: r.id, tipoEquipoId: tiposEquipo[(i + month) % tiposEquipo.length].id,
            tipoTexto: tiposEquipo[(i + month) % tiposEquipo.length].nombre,
            codigoActivo: `ACT-${1000 + n}`, marca: ["Dell", "HP", "Lenovo"][i % 3], modelo: `M-${100 + i}`, serie: `SN${n}` },
        })
      }
      await db.historialEstado.create({
        data: { reporteId: r.id, estadoAnterior: null, estadoNuevo: "pendiente", comentario: "Reporte creado", usuarioId: admin.id, fecha: date },
      })
      if (estado !== "pendiente") {
        await db.historialEstado.create({
          data: { reporteId: r.id, estadoAnterior: "pendiente", estadoNuevo: estado, comentario: sol ?? "Actualización", usuarioId: tecnico.id, fecha: new Date(date.getTime() + 3_600_000) },
        })
      }
    }
  }
  console.log(`✅ ${n} reportes de demostración creados`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
