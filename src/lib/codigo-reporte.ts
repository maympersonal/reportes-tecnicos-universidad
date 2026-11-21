import type { Prisma } from "@prisma/client"

// Debe ser la primera operación de la transacción que guarda el reporte.
export async function reservarCodigoReporte(tx: Prisma.TransactionClient, anio: number) {
  const prefijo = `RPT-${anio}-`
  const inicioNumero = prefijo.length + 1 // SUBSTR de SQLite empieza en 1.

  // Una sola escritura adquiere el bloqueo de SQLite antes de leer el máximo.
  // Solo inicializa desde los códigos existentes cuando aún no hay contador.
  // ON CONFLICT incrementa el contador persistido, incluso si se borraron reportes.
  const [contador] = await tx.$queryRaw<{ ultimoNumero: bigint | number }[]>`
    INSERT INTO "ContadorReporte" ("anio", "ultimoNumero")
    SELECT ${anio}, COALESCE(MAX(CAST(SUBSTR("codigo", ${inicioNumero}) AS INTEGER)), 0) + 1
    FROM "Reporte"
    WHERE "codigo" GLOB ${`${prefijo}[0-9]*`}
      AND SUBSTR("codigo", ${inicioNumero}) NOT GLOB '*[^0-9]*'
      AND NOT EXISTS (SELECT 1 FROM "ContadorReporte" WHERE "anio" = ${anio})
    ON CONFLICT ("anio") DO UPDATE SET "ultimoNumero" = "ultimoNumero" + 1
    RETURNING "ultimoNumero"
  `

  return `${prefijo}${String(contador.ultimoNumero).padStart(4, "0")}`
}
