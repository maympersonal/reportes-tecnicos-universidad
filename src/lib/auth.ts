import { randomBytes, scryptSync, timingSafeEqual } from "crypto"
import { db } from "@/lib/db"
import { PERMISOS_POR_ROL, type Permiso, type Rol } from "@/lib/constants"

// --- Hashing de contraseñas (scrypt, sin dependencias externas) ---
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":")
  if (!salt || !hash) return false
  const hashBuf = Buffer.from(hash, "hex")
  const testBuf = scryptSync(password, salt, 64)
  return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf)
}

// --- Validación de fuerza de contraseña ---
export type ReglaPass = { ok: boolean; label: string }
export function validarPassword(pw: string): { ok: boolean; reglas: ReglaPass[]; score: number } {
  const reglas: ReglaPass[] = [
    { ok: pw.length >= 8, label: "Mínimo 8 caracteres" },
    { ok: /[A-Z]/.test(pw), label: "Una mayúscula" },
    { ok: /[a-z]/.test(pw), label: "Una minúscula" },
    { ok: /[0-9]/.test(pw), label: "Un número" },
    { ok: /[^A-Za-z0-9]/.test(pw), label: "Un carácter especial" },
  ]
  const score = reglas.filter((r) => r.ok).length
  return { ok: reglas.every((r) => r.ok), reglas, score }
}

// --- Sesiones ---
export function generateToken(): string {
  return randomBytes(32).toString("hex")
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7

export async function createSession(userId: string) {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  await db.session.create({ data: { token, userId, expiresAt } })
  return token
}

export async function getUserFromRequest(req: Request) {
  const auth = req.headers.get("authorization") ?? ""
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null
  if (!token) return null
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {})
    return null
  }
  if (!session.user || !session.user.activo) return null
  return session.user
}

// Permisos efectivos del usuario: si tiene permisos custom (override), usa esos; si no, los del rol.
export function getPermisos(user: { role: string; permisos: string | null }): Permiso[] {
  if (user.role === "superadmin") return PERMISOS_POR_ROL.superadmin
  const defaults = PERMISOS_POR_ROL[user.role as Rol] ?? []
  if (user.permisos) {
    try {
      const custom = JSON.parse(user.permisos) as Permiso[]
      if (Array.isArray(custom)) return custom
    } catch { /* ignore */ }
  }
  return defaults
}

export function tienePermiso(user: { role: string; permisos: string | null } | null, permiso: Permiso): boolean {
  if (!user) return false
  if (user.role === "superadmin") return true
  return getPermisos(user).includes(permiso)
}

export function requireRole(user: { role: string } | null, ...roles: Rol[]) {
  if (!user) return false
  return roles.includes(user.role as Rol)
}

// Sanitiza el objeto user para enviar al cliente
export function publicUser(user: {
  id: string
  username: string
  email: string
  name: string
  role: string
  cargo: string | null
  telefono: string | null
  areaId: string | null
  permisos: string | null
}) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name,
    role: user.role,
    cargo: user.cargo,
    telefono: user.telefono,
    areaId: user.areaId,
    permisos: getPermisos(user),
  }
}
