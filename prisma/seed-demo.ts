import type { User } from "@prisma/client"
import { db } from "../src/lib/db"
import { hashPassword } from "../src/lib/auth"
import { ensureBootstrap } from "../src/lib/bootstrap"

// Identificadores reservados para estos ejemplos; repetir el comando no los duplica.
async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Los datos de demostración no se cargan en producción.")
  }
  await ensureBootstrap()
  const password = process.env.DEMO_PASSWORD || "Temporal2026!"

  const result = await db.$transaction(async (tx) => {
    const definitions = [
      { username: "demo.admin", name: "Carlos Mendoza", role: "admin" },
      { username: "demo.tec1", name: "Ana García", role: "tecnico" },
      { username: "demo.tec2", name: "Luis Fernández", role: "tecnico" },
      { username: "demo.tec3", name: "María López", role: "tecnico" },
      { username: "demo.tec4", name: "José Ramírez", role: "tecnico" },
      { username: "demo.auditor", name: "Patricia Díaz", role: "auditor" },
    ]
    const users: User[] = []
    let createdUsers = 0
    for (const definition of definitions) {
      const id = `seed-${definition.username}`
      const existing = await tx.user.findUnique({ where: { id } })
      if (existing) {
        users.push(existing)
        continue
      }
      // Una colisión con una cuenta ajena aborta sin cambiar esa cuenta.
      users.push(await tx.user.create({
        data: { ...definition, id, email: `${definition.username}@example.invalid`, password: hashPassword(password) },
      }))
      createdUsers++
    }

    const admin = users.find((user) => user.role === "admin" && user.activo)
    const technicians = users.filter((user) => user.role === "tecnico" && user.activo)
    const areas = await tx.area.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } })
    const tasks = await tx.tipoTarea.findMany({ where: { activo: true }, orderBy: { codigo: "asc" } })
    const equipment = await tx.tipoEquipo.findMany({ orderBy: { nombre: "asc" } })
    if (!admin || !technicians.length || !areas.length || !tasks.length) {
      throw new Error("Faltan usuarios de demostración activos o catálogos habilitados.")
    }

    const states = ["pendiente", "en_proceso", "resuelto", "cerrado"]
    const priorities = ["baja", "media", "alta", "critica"]
    const descriptions = [
      "Equipo no enciende, revisar fuente de poder.",
      "Impresora de red no responde.",
      "Solicito instalación de software institucional.",
      "Caída de red en el laboratorio de cómputo.",
      "Proyector del aula no muestra imagen.",
      "Mantenimiento preventivo de equipos.",
      "Solicito recuperación de la cuenta institucional.",
    ]
    let createdReports = 0
    const now = new Date()
    for (let index = 0; index < 21; index++) {
      const codigo = `DEMO-${String(index + 1).padStart(4, "0")}`
      if (await tx.reporte.findUnique({ where: { codigo } })) continue
      const stateIndex = index % states.length
      const technician = technicians[index % technicians.length]
      const date = new Date(now.getTime() - (63 - index * 3) * 86_400_000)
      const resolvedAt = stateIndex >= 2 ? new Date(date.getTime() + 7_200_000) : null
      const device = equipment.length ? equipment[index % equipment.length] : undefined
      await tx.reporte.create({
        data: {
          codigo,
          descripcion: `[Demostración] ${descriptions[index % descriptions.length]}`,
          solucion: resolvedAt ? "Incidencia de demostración resuelta y verificada." : null,
          tipoTareaId: tasks[index % tasks.length].id,
          areaId: areas[index % areas.length].id,
          ubicacion: `Aula de demostración ${index + 1}`,
          usuarioNombre: "Solicitante de demostración",
          usuarioCorreo: `solicitante${index + 1}@example.invalid`,
          prioridad: priorities[Math.floor(index / 4) % priorities.length],
          estado: states[stateIndex],
          creadoPorId: admin.id,
          tecnicoAsignadoId: stateIndex ? technician.id : null,
          fechaCreacion: date,
          fechaActualizacion: new Date(date.getTime() + stateIndex * 3_600_000),
          fechaResolucion: resolvedAt,
          historial: {
            create: states.slice(0, stateIndex + 1).map((state, step) => ({
              estadoAnterior: step ? states[step - 1] : null,
              estadoNuevo: state,
              comentario: "Historial de demostración",
              usuarioId: step ? technician.id : admin.id,
              fecha: new Date(date.getTime() + step * 3_600_000),
            })),
          },
          ...(device && index % 3 === 0 ? {
            equipos: { create: {
              tipoEquipoId: device.id, tipoTexto: device.nombre,
              codigoActivo: `DEMO-ACT-${index + 1}`, marca: "Ejemplo", modelo: "Demo",
            } },
          } : {}),
        },
      })
      createdReports++
    }
    return { createdUsers, createdReports }
  }, { timeout: 30_000 })
  console.log(`Demostración: ${result.createdUsers} usuarios y ${result.createdReports} reportes nuevos.`)
  console.log("Cuentas: demo.admin, demo.tec1–demo.tec4 y demo.auditor. Consulta prisma/README.md para acceder.")
}

main()
  .catch((error) => {
    console.error("No se pudieron cargar los ejemplos:", error)
    process.exitCode = 1
  })
  .finally(async () => { await db.$disconnect() })
