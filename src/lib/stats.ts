import { db } from "@/lib/db"

export function visibilityWhere(user: { id: string; role: string }) {
  if (user.role === "tecnico") {
    return { OR: [{ creadoPorId: user.id }, { tecnicoAsignadoId: user.id }] }
  }
  return {}
}

export function dateWhere(desde?: string | null, hasta?: string | null) {
  if (!desde && !hasta) return {}
  return {
    fechaCreacion: {
      ...(desde ? { gte: new Date(desde) } : {}),
      ...(hasta ? { lte: new Date(hasta + "T23:59:59") } : {}),
    },
  }
}

// Score compuesto de un técnico: 60% resueltos + 25% tiempo + 15% estrellas
export function computeScore(resueltos: number, tiempoProm: number | null, estrellas: number) {
  const resScore = Math.min(100, resueltos * 4) // 25 resueltos = 100
  const tiempoScore = tiempoProm == null ? 50 : Math.max(0, 100 - tiempoProm * 2) // 50h = 0
  const starScore = (estrellas / 5) * 100
  return Math.round(resScore * 0.6 + tiempoScore * 0.25 + starScore * 0.15)
}

// Estrellas 0-5 según resueltos (escala: 5 = 20+ resueltos)
export function estrellasSegun(resueltos: number) {
  return Math.min(5, Math.floor(resueltos / 4))
}

export async function buildRanking(user: { id: string; role: string }) {
  const tecnicos = await db.user.findMany({
    where: { role: "tecnico", activo: true },
    include: {
      reportesAsignados: {
        where: { estado: { in: ["resuelto", "cerrado"] } },
        select: { fechaCreacion: true, fechaResolucion: true },
      },
      _count: { select: { reportesAsignados: true } },
    },
  })

  const rows = tecnicos.map((t) => {
    const resueltos = t.reportesAsignados.length
    const tiempos = t.reportesAsignados
      .filter((r) => r.fechaResolucion)
      .map((r) => (r.fechaResolucion!.getTime() - r.fechaCreacion.getTime()) / 3_600_000)
    const tiempoProm = tiempos.length ? Math.round((tiempos.reduce((a, b) => a + b, 0) / tiempos.length) * 10) / 10 : null
    const estrellas = estrellasSegun(resueltos)
    const score = computeScore(resueltos, tiempoProm, estrellas)
    const asignados = t._count.reportesAsignados
    return {
      id: t.id,
      name: t.name,
      cargo: t.cargo,
      resueltos,
      asignados,
      tiempoProm,
      estrellas,
      score,
      activo: t.activo,
    }
  })
  rows.sort((a, b) => b.score - a.score)
  return rows
}
