import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUserFromRequest, hashPassword, publicUser, validarPassword, tienePermiso } from "@/lib/auth"
import { PERMISOS_POR_ROL, type Permiso, type Rol } from "@/lib/constants"
import { ensureBootstrap } from "@/lib/bootstrap"

// GET /api/usuarios — lista usuarios (excluye superadmin a no-superadmins)
export async function GET(req: NextRequest) {
  await ensureBootstrap()
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!tienePermiso(me, "usuarios.gestionar")) {
    return NextResponse.json({ error: "Sin permisos para gestionar usuarios" }, { status: 403 })
  }
  const sp = req.nextUrl.searchParams
  const q = sp.get("q")?.toLowerCase() || ""
  const rol = sp.get("rol") || undefined
  const baja = sp.get("baja") // "true" → inactivos

  let where: Record<string, unknown> = {}
  if (me.role !== "superadmin") where.role = { not: "superadmin" }
  if (rol) where.role = rol === "superadmin" && me.role !== "superadmin" ? where.role : rol
  if (baja === "true") where.activo = false
  else if (baja === "false") where.activo = true
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { username: { contains: q } },
      { email: { contains: q } },
      { cargo: { contains: q } },
    ]
  }

  const rows = await db.user.findMany({
    where,
    include: { area: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  })
  return NextResponse.json({
    items: rows.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      name: u.name,
      role: u.role,
      cargo: u.cargo,
      telefono: u.telefono,
      areaId: u.areaId,
      areaNombre: u.area?.nombre ?? null,
      activo: u.activo,
      permisos: u.role === "superadmin" ? PERMISOS_POR_ROL.superadmin : (u.permisos ? safeParse(u.permisos) : PERMISOS_POR_ROL[u.role as Rol] ?? []),
      createdAt: u.createdAt.toISOString(),
    })),
  })
}

function safeParse(s: string): Permiso[] {
  try { const v = JSON.parse(s); return Array.isArray(v) ? v : [] } catch { return [] }
}

// POST /api/usuarios — crear usuario (requiere usuarios.gestionar)
export async function POST(req: NextRequest) {
  await ensureBootstrap()
  const me = await getUserFromRequest(req)
  if (!me) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!tienePermiso(me, "usuarios.gestionar")) {
    return NextResponse.json({ error: "Sin permisos para gestionar usuarios" }, { status: 403 })
  }
  const body = await req.json()
  const { username, email, name, password, role = "tecnico", cargo, telefono, areaId, activo = true, permisos, usarPermisosPorRol = true } = body as Record<string, unknown>

  if (!username || !email || !name || !password) {
    return NextResponse.json({ error: "Usuario, email, nombre y contraseña son obligatorios" }, { status: 400 })
  }
  // Solo superadmin puede crear superadmin/admin; admin no puede crear superadmin
  const targetRole = String(role) as Rol
  if (targetRole === "superadmin") {
    return NextResponse.json({ error: "No se pueden crear cuentas superadmin" }, { status: 403 })
  }
  if (me.role !== "superadmin" && targetRole === "admin") {
    return NextResponse.json({ error: "Solo el superadmin puede crear administradores" }, { status: 403 })
  }
  // Validar contraseña fuerte
  const val = validarPassword(String(password))
  if (!val.ok) {
    return NextResponse.json({ error: "Contraseña débil", reglas: val.reglas }, { status: 400 })
  }
  // Unicidad
  const exists = await db.user.findFirst({ where: { OR: [{ username: String(username).toLowerCase() }, { email: String(email) }] } })
  if (exists) return NextResponse.json({ error: "Usuario o correo ya existen" }, { status: 409 })

  const permisosJson = usarPermisosPorRol ? null : JSON.stringify(permisos ?? [])
  const created = await db.user.create({
    data: {
      username: String(username).toLowerCase(),
      email: String(email),
      name: String(name),
      password: hashPassword(String(password)),
      role: targetRole,
      cargo: cargo ? String(cargo) : null,
      telefono: telefono ? String(telefono) : null,
      areaId: areaId ? String(areaId) : null,
      activo: Boolean(activo),
      permisos: permisosJson,
    },
  })
  return NextResponse.json({ item: publicUser(created) }, { status: 201 })
}
