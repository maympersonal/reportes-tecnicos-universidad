import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest } from "@/lib/auth"

// DELETE /api/auth/me/eliminar — derecho al olvido (Ley 1581)
// Anonimiza reportes creados por el usuario, desactiva la cuenta y borra sesión/perfil.
export async function DELETE(req: NextRequest) {
  const user = await getUserFromRequest(req)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Requiere confirmación: body { confirm: "ELIMINAR" }
  let body: { confirm?: string } = {}
  try {
    body = await req.json()
  } catch {
    /* ignore */
  }
  if (body.confirm !== "ELIMINAR") {
    return NextResponse.json({ error: 'Debe escribir "ELIMINAR" para confirmar' }, { status: 400 })
  }

  // 1. Anonimizar reportes creados por el usuario (derecho al olvido)
  await db.reporte.updateMany({
    where: { creadoPorId: user.id },
    data: {
      usuarioNombre: "Anonimizado",
      usuarioCorreo: "anonimizado@olvido.local",
      usuarioCargo: "Anonimizado",
    },
  })

  // 2. Desvincular al usuario como técnico asignado (sin perder el reporte)
  await db.reporte.updateMany({
    where: { tecnicoAsignadoId: user.id },
    data: { tecnicoAsignadoId: null },
  })

  // 3. Anonimizar historial y notificaciones vinculadas
  await db.historialEstado.updateMany({
    where: { usuarioId: user.id },
    data: { usuarioId: null },
  })

  // 4. Borrar sesiones y notificaciones del usuario
  await db.session.deleteMany({ where: { userId: user.id } })
  await db.notificacion.deleteMany({ where: { usuarioId: user.id } })

  // 5. Anonimizar datos personales del usuario y desactivar
  await db.user.update({
    where: { id: user.id },
    data: {
      name: "Usuario eliminado",
      email: `eliminado-${user.id.slice(0, 8)}@olvido.local`,
      username: `eliminado-${user.id.slice(0, 8)}`,
      password: "INACTIVO",
      cargo: null,
      telefono: null,
      areaId: null,
      activo: false,
    },
  })

  console.log(`[olvido] Cuenta ${user.id} anonimizada y desactivada`)
  return NextResponse.json({ ok: true })
}
