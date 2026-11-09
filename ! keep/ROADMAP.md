# 🗺️ Roadmap — Sistema de Reportes Técnicos

Estado actual, qué falta para cada etapa y plan de la **versión 2 (LDAP)**.

---

## ✅ Estado actual (v4)

| Módulo | Estado |
|--------|--------|
| Backend API (auth, usuarios, reportes, estadísticas, exportar) | ✅ Funcional |
| BD SQLite persistente + bootstrap superadmin | ✅ Funcional |
| Roles: superadmin / admin / técnico / auditor + permisos por rol | ✅ Funcional |
| Gestión de usuarios (crear/editar/baja/restaurar) + fuerza de contraseña | ✅ Funcional |
| Reportes CRUD + equipos por tipo + tipos de tarea "Otros" | ✅ Funcional |
| Equipos: catálogo TipoEquipo + "Otros" crea nuevo tipo | ✅ Funcional |
| Historial, notificaciones push visuales (toasts) | ✅ Funcional |
| Exportación Excel + PDF individual + **PDF informe ejecutivo** + Word | ✅ Funcional |
| Dashboard, Reportes, Ranking, Estadísticas, Usuarios | ✅ Funcional |
| Privacidad detallada (Ley 1581) + Términos, responsivos | ✅ Funcional |
| Animaciones (podio, confetti, count-up, transiciones) | ✅ Funcional |
| Andamiaje Tauri para app de escritorio | ✅ Listo para compilar |
| Login con show/hide contraseña | ✅ Funcional |

---

## ❓ Qué falta para completar la etapa de desarrollo

- [ ] **Perfil de usuario**: UI para que cada usuario cambie SU propia contraseña (el endpoint `PATCH /api/auth/me/password` ya existe; falta la vista).
- [ ] **Edición de catálogos** (áreas, ubicaciones, tipos) desde el frontend (los endpoints existen; falta UI de gestión).
- [ ] **Paginación en Ranking** (actualmente lista todos).
- [ ] **Búsqueda global ⌘K** funcional (el atajo abre Reportes; falta combobox de búsqueda).
- [ ] **Validación de archivos adjuntos** (tipo/antivirus).
- [ ] **Tests automatizados** (Vitest + Playwright) — opcional pero recomendado.
- [ ] **Renovación de sesión** silenciosa (refresco de token antes de expirar).

---

## 🚀 Cómo pasar de desarrollo a producción

### Web (servidor)
1. **Variables de entorno de producción** (`.env.production` o variables del host):
   ```env
   DATABASE_URL="file:/var/lib/reportes/db.sqlite"  # o ruta persistente
   NODE_ENV=production
   ```
2. **Compilar:**
   ```bash
   bun run build      # genera .next/standalone autónomo
   ```
3. **Servidor de producción:**
   ```bash
   bun run start      # usa .next/standalone/server.js en :3000
   ```
   O detrás de un proceso manager (PM2, systemd, Docker):
   ```bash
   # con Docker (recomendado)
   docker build -t reportes-tecnicos .
   docker run -p 3000:3000 -v $(pwd)/db:/app/db reportes-tecnicos
   ```
4. **Proxy inverso** (Nginx/Caddy) con TLS apuntando a `localhost:3000`.
5. **Backups** programados del archivo `db/custom.db` (SQLite = un solo archivo).

### Checklist de producción
- [ ] Cambiar la contraseña temporal del superadmin.
- [ ] Crear las cuentas de admin/técnico/auditor reales.
- [ ] HTTPS obligatorio (Caddy/Let's Encrypt).
- [ ] CORS configurado para el dominio final.
- [ ] Backups diarios de la BD.
- [ ] Logs centralizados y monitoreo (uptime).
- [ ] Políticas de contraseñas activas (ya implementadas).

---

## 🖥️ Qué falta para crear la app de escritorio

El andamiaje **Tauri** ya está en `src-tauri/`. Solo necesitas:

### Requisitos (una sola vez)
1. **Rust** instalado: <https://rustup.rs/> → `rustc --version`
2. **Dependencias del SO** para compilar Tauri:
   - Windows: *Microsoft C++ Build Tools* + *WebView2 Runtime*
   - macOS: Xcode Command Line Tools
   - Linux: `webkit2gtk-4.1`, `libgtk-3-dev`, `librsvg2-dev`, `libssl-dev`
3. En VSC: extensiones **Tauri** y **rust-analyzer**.

### Compilar
```bash
bun run desktop:build     # genera instaladores en src-tauri/target/release/bundle/
```
- Windows → `.msi`, `.exe`
- macOS → `.dmg`, `.app`
- Linux → `.deb`, `.AppImage`, `.rpm`

### Iconos
```bash
bunx tauri icon ruta/a/tu-logo.png   # genera todos los tamaños en src-tauri/icons/
```

### Empaquetado con BD
La app de escritorio usa SQLite local en el directorio de datos del usuario. Para multiusuario (varios PCs), migra a PostgreSQL compartido (ver despliegue) o usa sincronización.

---

## 🌐 Qué falta para despliegue

### Opción A: Servidor dedicado (VPS / on-premise)
- Despliega el build standalone (`bun run start`) detrás de Caddy/Nginx + TLS.
- BD SQLite persistente en el disco del servidor (backup diario).
- Usuarios acceden vía navegador en la URL pública.

### Opción B: Contenedor (Docker)
Crea un `Dockerfile`:
```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY . .
RUN bun install && bun run build

FROM oven/bun:1
WORKDIR /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/db ./db
EXPOSE 3000
CMD ["bun", "server.js"]
```
Sube a Railway / Fly.io / Render / tu VPS.

### Opción C: Estático + API serverless (más complejo)
No recomendado para esta app (usa SQLite + uploads locales). Mejor servidor dedicado/contenedor.

### Checklist de despliegue
- [ ] Dominio + certificado TLS.
- [ ] Variables de entorno de producción.
- [ ] Migración de SQLite → PostgreSQL si esperas >50 usuarios concurrentes (cambia `provider = "postgresql"` en `schema.prisma` y `DATABASE_URL`).
- [ ] Backups automatizados.
- [ ] Monitoreo de uptime y alertas.
- [ ] Política de retención de logs.

---

## 🔮 Versión 2 — LDAP institucional (lo único que falta)

**Objetivo:** que los usuarios de la universidad (estudiantes, profesores, administrativos) puedan, **desde cualquier red**, crear un reporte técnico autenticándose con su cuenta institucional (LDAP/Active Directory), y que el **técnico asigne ese reporte** según los permisos que le dé el admin/superadmin.

### Arquitectura propuesta
```
Internet (cualquier red) → Gateway/Proxy (TLS) → App (servidor público)
                                                      │
                                    ┌─────────────────┼─────────────────┐
                                    ▼                                   ▼
                          LDAP institucional                   BD PostgreSQL
                          (autenticación de                     (reportes, usuarios,
                           usuarios finales)                      historial, permisos)
```

### Componentes a implementar

#### 1. Conexión LDAP (backend)
- Nuevo módulo `src/lib/ldap.ts` usando `ldapjs` (o `activedirectory2`):
  ```ts
  import ldap from 'ldapjs'
  // bind con credenciales del usuario final → valida usuario/contraseña institucional
  ```
- Endpoint nuevo: `POST /api/auth/ldap` → recibe `{ username, password }`, hace bind LDAP, y si OK crea/actualiza un `User` con `role: 'tecnico'` (o un rol nuevo `reportante` = usuario final que solo crea reportes) **sin contraseña local** (marca `ldapAuth: true`).

#### 2. Nuevo rol `reportante` (usuario final)
- Permisos: solo `reportes.crear` y `cuenta.eliminar`. No ve ranking/estadísticas/otros reportes.
- Crea reportes desde un formulario simplificado.
- El reporte queda **sin técnico asignado** (entra a una "cola de asignación").

#### 3. Cola de asignación + permisos de técnico
- Los técnicos (Dirección de Servicios Tecnológicos) ven una **cola de reportes sin asignar**.
- Un técnico **se auto-asigna** o el admin le asigna, según el permiso `reportes.asignar` que el superadmin/admin le haya otorgado.
- El técnico solo puede tomar reportes de áreas/en su ámbito de permisos (configurable).

#### 4. Exposición pública segura
- Servidor con HTTPS (obligatorio para LDAP desde redes externas).
- Rate limiting + CAPTCHA en el login de reportantes.
- Posible VPN o túnel al LDAP institucional si este no está expuesto.

#### 5. UI cambios
- Login con pestaña "Cuenta institucional (LDAP)" vs "Cuenta de sistema".
- Vista "Cola de asignación" para técnicos.
- Formulario de reporte simplificado para reportantes.

### Pasos para la v2
1. Instalar `ldapjs`: `bun add ldapjs`.
2. Configurar variables de entorno LDAP:
   ```env
   LDAP_URL=ldaps://ldap.universidad.edu:636
   LDAP_BIND_DN=cn=srv-reportes,ou=services,dc=universidad,dc=edu
   LDAP_BIND_PASSWORD=...
   LDAP_SEARCH_BASE=ou=users,dc=universidad,dc=edu
   ```
3. Implementar `src/lib/ldap.ts` (bind + search).
4. Crear endpoint `/api/auth/ldap`.
5. Añadir rol `reportante` a `constants.ts` y `PERMISOS_POR_ROL`.
6. Migrar BD SQLite → PostgreSQL (para multiusuario real).
7. Vista "Cola de asignación".
8. Desplegar en servidor público con TLS.

### Estimación
- LDAP + nuevo rol: ~3-5 días.
- Cola de asignación + UI: ~2-3 días.
- Migración a PostgreSQL + despliegue: ~1-2 días.
- Pruebas con LDAP real de la universidad: ~2 días.
- **Total v2: ~2 semanas** (1 desarrollador).

---

## 📅 Resumen

| Etapa | Estado | Esfuerzo restante |
|-------|--------|-------------------|
| Desarrollo completo | 90% | Perfil usuario + catálogos UI (opcional) |
| Producción web | Listo para desplegar | Configurar entorno + TLS |
| App de escritorio | Andamiaje listo | Instalar Rust + `desktop:build` |
| Despliegue | Documentado | Elegir VPS/Docker + dominio |
| **Versión 2 (LDAP)** | Diseñado | **~2 semanas** de implementación |

---

**Contacto:** innovacion.did@iris.uh.cu · Dirección de Innovación Digital
