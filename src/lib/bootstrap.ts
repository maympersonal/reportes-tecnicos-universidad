import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"
import {
  ADMIN_DEFAULT, TIPOS_TAREA_DEFAULT, TIPOS_AREA_DEFAULT, TIPOS_EQUIPO_DEFAULT,
} from "@/lib/constants"

let initialization: Promise<void> | undefined

// Comparte la inicialización concurrente y permite reintentar si falla.
export function ensureBootstrap(): Promise<void> {
  if (!initialization) {
    initialization = initialize().catch((error) => {
      initialization = undefined
      throw error
    })
  }
  return initialization
}

async function initialize() {
  await db.$transaction(async (tx) => {
    // Compatibilidad con instalaciones anteriores: conservar identidad y credenciales.
    await tx.user.updateMany({ where: { role: "superadmin" }, data: { role: "admin" } })
    const existing = await tx.user.findFirst({ where: { role: "admin" } })
    if (!existing) {
      await tx.user.create({
        data: {
          username: ADMIN_DEFAULT.username,
          email: ADMIN_DEFAULT.email,
          name: ADMIN_DEFAULT.name,
          cargo: ADMIN_DEFAULT.cargo,
          password: hashPassword(ADMIN_DEFAULT.password),
          role: "admin",
          activo: true,
        },
      })
    }

    // update vacío conserva nombres editados, descripciones y estados existentes.
    for (const tipo of TIPOS_AREA_DEFAULT) {
      await tx.tipoArea.upsert({ where: { nombre: tipo.nombre }, create: tipo, update: {} })
    }

    const areas = [
      { nombre: "Dirección de Innovación Digital", tipo: "TI", responsable: "Director DID" },
      { nombre: "Dirección de Servicios Tecnológicos", tipo: "Administrativa", responsable: "Director DST" },
    ]
    for (const { tipo, ...area } of areas) {
      const tipoArea = await tx.tipoArea.findUniqueOrThrow({ where: { nombre: tipo } })
      await tx.area.upsert({
        where: { nombre: area.nombre },
        create: { ...area, tipoAreaId: tipoArea.id },
        update: {},
      })
    }

    for (const tipo of TIPOS_TAREA_DEFAULT) {
      await tx.tipoTarea.upsert({
        where: { codigo: tipo.codigo }, create: { ...tipo, activo: true }, update: {},
      })
    }
    for (const nombre of TIPOS_EQUIPO_DEFAULT) {
      await tx.tipoEquipo.upsert({ where: { nombre }, create: { nombre }, update: {} })
    }
  }, { timeout: 20_000 })
}
