import { db } from "@/lib/db"
import { ensureBootstrap } from "@/lib/bootstrap"

async function main() {
  await db.notificacion.deleteMany()
  await db.historialEstado.deleteMany()
  await db.archivoReporte.deleteMany()
  await db.equipoReporte.deleteMany()
  await db.reporte.deleteMany()
  await db.session.deleteMany()
  await db.ubicacion.deleteMany()
  await db.tipoEquipo.deleteMany()
  await db.tipoTarea.deleteMany()
  await db.area.deleteMany()
  await db.tipoArea.deleteMany()
  await db.user.deleteMany()
  console.log("✅ Todos los datos eliminados. Ejecutando bootstrap...")
  await ensureBootstrap()
  const u = await db.user.findFirst({ where: { role: "superadmin" } })
  console.log("Superadmin:", u?.username, u?.email)
  console.log("tiposTarea=" + (await db.tipoTarea.count()), "tiposEquipo=" + (await db.tipoEquipo.count()), "tiposArea=" + (await db.tipoArea.count()), "areas=" + (await db.area.count()))
}
main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
