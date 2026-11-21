import { db } from "../src/lib/db"
import { ensureBootstrap } from "../src/lib/bootstrap"

async function main() {
  await ensureBootstrap()
  console.log("Datos iniciales preparados; los registros existentes se conservan.")
}

main()
  .catch((error) => {
    console.error("No se pudo inicializar la base de datos:", error)
    process.exitCode = 1
  })
  .finally(async () => { await db.$disconnect() })
