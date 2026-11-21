import { spawnSync } from "node:child_process"
import { existsSync, lstatSync, realpathSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, resolve } from "node:path"
import { loadEnvFile } from "node:process"
import { fileURLToPath } from "node:url"

const prismaDirectory = dirname(fileURLToPath(import.meta.url))
const root = resolve(prismaDirectory, "..")
const requireFromHere = createRequire(import.meta.url)

function run(module: string, args: string[]) {
  const result = spawnSync(process.execPath, [requireFromHere.resolve(module), ...args], {
    cwd: root, env: process.env, stdio: "inherit",
  })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Falló ${module}; no se continuará con el reinicio.`)
}

function main() {
  const envFile = resolve(root, ".env")
  if (existsSync(envFile)) loadEnvFile(envFile)
  if (process.env.NODE_ENV !== "development") {
    throw new Error("db:fresh requiere NODE_ENV=development.")
  }
  if (process.argv.slice(2).join(" ") !== "--confirm-reset") {
    throw new Error("Esta operación borra los datos. Confirma con: npm run db:fresh -- --confirm-reset")
  }

  // Lista cerrada: nunca permite borrar la base normal db/custom.db.
  const url = process.env.DATABASE_URL
  if (!url?.startsWith("file:") || /[?#%]/.test(url)) {
    throw new Error("DATABASE_URL debe ser una ruta SQLite local sin parámetros.")
  }
  const target = resolve(prismaDirectory, url.slice(5))
  const dbDirectory = resolve(root, "db")
  const allowed = [resolve(dbDirectory, "development.db"), resolve(dbDirectory, "test.db")]
  if (!allowed.includes(target)) {
    throw new Error("Solo se permite reiniciar db/development.db o db/test.db.")
  }
  if (realpathSync(dbDirectory) !== dbDirectory) {
    throw new Error("La carpeta db no puede ser un enlace simbólico.")
  }
  const info = lstatSync(target, { throwIfNoEntry: false })
  if (info) {
    if (!info.isFile() || info.nlink !== 1 || realpathSync(target) !== target) {
      throw new Error("La base de pruebas debe ser un archivo normal sin enlaces.")
    }
  }

  console.log(`Reiniciando la base de pruebas: ${target}`)
  run("prisma", ["db", "push", "--force-reset", "--skip-generate", "--schema", resolve(prismaDirectory, "schema.prisma")])
  run("prisma", ["generate", "--schema", resolve(prismaDirectory, "schema.prisma")])
  run("tsx/cli", [resolve(prismaDirectory, "seed.ts")])
  console.log("Base de pruebas reiniciada con los datos básicos. Ejemplos opcionales: npm run seed:demo")
}

try {
  main()
} catch (error) {
  console.error("No se pudo reiniciar la base de datos:", error)
  process.exitCode = 1
}
