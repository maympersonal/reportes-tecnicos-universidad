import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"
import {
  SUPERADMIN_DEFAULT, TIPOS_TAREA_DEFAULT, TIPOS_AREA_DEFAULT, TIPOS_EQUIPO_DEFAULT,
} from "@/lib/constants"

let bootstrapped = false

// Crea el superadmin único y los catálogos del sistema si no existen.
// Idempotente: seguro llamarlo en cada arranque del servidor.
export async function ensureBootstrap() {
  if (bootstrapped) return
  bootstrapped = true
  try {
    // --- Superadmin (única cuenta raíz) ---
    const existing = await db.user.findFirst({ where: { role: "superadmin" } })
    if (!existing) {
      await db.user.create({
        data: {
          username: SUPERADMIN_DEFAULT.username,
          email: SUPERADMIN_DEFAULT.email,
          name: SUPERADMIN_DEFAULT.name,
          cargo: SUPERADMIN_DEFAULT.cargo,
          password: hashPassword(SUPERADMIN_DEFAULT.password),
          role: "superadmin",
          activo: true,
        },
      })
      console.log("[bootstrap] ✅ Superadmin creado (username: superadmin)")
    }

    // --- Tipos de área ---
    const taCount = await db.tipoArea.count()
    if (taCount === 0) {
      for (const t of TIPOS_AREA_DEFAULT) await db.tipoArea.create({ data: t })
      console.log("[bootstrap] ✅ Tipos de área creados")
    }

    // --- Áreas mínimas (DID + DST) si no hay ninguna ---
    const areaCount = await db.area.count()
    if (areaCount === 0) {
      const ti = await db.tipoArea.findFirst({ where: { nombre: "TI" } })
      const adm = await db.tipoArea.findFirst({ where: { nombre: "Administrativa" } })
      if (ti) await db.area.create({ data: { nombre: "Dirección de Innovación Digital", tipoAreaId: ti.id, responsable: "Director DID" } })
      if (adm) await db.area.create({ data: { nombre: "Dirección de Servicios Tecnológicos", tipoAreaId: adm.id, responsable: "Director DST" } })
      console.log("[bootstrap] ✅ Áreas DID/DST creadas")
    }

    // --- Tipos de tarea ---
    const ttCount = await db.tipoTarea.count()
    if (ttCount === 0) {
      for (const t of TIPOS_TAREA_DEFAULT) await db.tipoTarea.create({ data: { codigo: t.codigo, nombre: t.nombre, activo: true } })
      console.log("[bootstrap] ✅ Tipos de tarea creados")
    }

    // --- Tipos de equipo ---
    const teCount = await db.tipoEquipo.count()
    if (teCount === 0) {
      for (const n of TIPOS_EQUIPO_DEFAULT) await db.tipoEquipo.create({ data: { nombre: n } })
      console.log("[bootstrap] ✅ Tipos de equipo creados")
    }
  } catch (e) {
    console.error("[bootstrap] error:", e)
  }
}
