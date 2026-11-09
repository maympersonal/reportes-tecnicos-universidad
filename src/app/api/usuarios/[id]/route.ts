import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest, hashPassword, publicUser, validarPassword, tienePermiso } from "@/lib/auth"
import { PERMISOS_POR_ROL, type Permiso, type Rol } from "@/lib/constants"

// PATCH /api/usuarios/{id} — editar usuario completo + permisos
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!tienePermiso(me, "usuarios.gestionar")) {
    return NextResponse.json({ error: "Sin permisos para gestionar usuarios" }, { status: 403 })
  }
  const { id } = await ctx.params
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  // Regla superadmin: solo superadmin puede ver/editar la cuenta superadmin
  if (target.role === "superadmin" && me.role !== "superadmin") {
    return NextResponse.json({ error: "No autorizado para editar la cuenta superadmin" }, { status: 403 })
  }

  const body = await req.json()
  const { name, email, username, role, cargo, telefono, areaId, activo, password, permisos, usarPermisosPorRol } = body as Record<string, unknown>

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = String(name)
  if (email !== undefined) {
    // verificar unicidad
    const dup = await db.user.findFirst({ where: { email: String(email), NOT: { id } } })
    if (dup) return NextResponse.json({ error: "Correo ya en uso" }, { status: 409 })
    data.email = String(email)
  }
  if (username !== undefined) {
    const dup = await db.user.findFirst({ where: { username: String(username).toLowerCase(), NOT: { id } } })
    if (dup) return NextResponse.json({ error: "Usuario ya en uso" }, { status: 409 })
    data.username = String(username).toLowerCase()
  }
  // Cambio de rol
  if (role !== undefined && target.role !== "superadmin") {
    const newRole = String(role) as Rol
    if (newRole === "superadmin") return NextResponse.json({ error: "No se puede ascender a superadmin" }, { status: 403 })
    if (newRole === "admin" && me.role !== "superadmin") return NextResponse.json({ error: "Solo superadmin asigna administradores" }, { status: 403 })
    data.role = newRole
    // Al cambiar rol, reset permisos a defaults salvo que se especifique
    if (usarPermisosPorRol !== false) data.permisos = null
  }
  if (cargo !== undefined) data.cargo = cargo ? String(cargo) : null
  if (telefono !== undefined) data.telefono = telefono ? String(telefono) : null
  if (areaId !== undefined) data.areaId = areaId ? String(areaId) : null
  if (activo !== undefined && target.role !== "superadmin") data.activo = Boolean(activo)

  // Permisos custom (override)
  if (permisos !== undefined && target.role !== "superadmin") {
    data.permisos = usarPermisosPorRol === false ? JSON.stringify(permisos as Permiso[]) : null
  } else if (usarPermisosPorRol === true && target.role !== "superadmin") {
    data.permisos = null
  }

  // Cambio de contraseña (opcional)
  if (password && typeof password === "string" && password.length > 0) {
    const val = validarPassword(password)
    if (!val.ok) return NextResponse.json({ error: "Contraseña débil", reglas: val.reglas }, { status: 400 })
    data.password = hashPassword(password)
  }

  const updated = await db.user.update({ where: { id }, data })
  return NextResponse.json({ item: publicUser(updated) })
}

// DELETE /api/usuarios/{id} — baja lógica (desactivar) o eliminación
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!tienePermiso(me, "usuarios.gestionar")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }
  const { id } = await ctx.params
  const target = await db.user.findUnique({ where: { id } })
  if (!target) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  if (target.role === "superadmin") {
    return NextResponse.json({ error: "La cuenta superadmin no puede eliminarse" }, { status: 403 })
  }
  // Baja lógica: desactivar (preserva trazabilidad de reportes)
  await db.user.update({ where: { id }, data: { activo: false } })
  await db.session.deleteMany({ where: { userId: id } }).catch(() => null)
  return NextResponse.json({ ok: true })
}
