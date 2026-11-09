# 📘 Guía de Instalación y Ejecución — Sistema de Reportes Técnicos

Guía paso a paso para **instalar todo en Visual Studio Code (VSC)** y **correr la app** en desarrollo, producción y como app de escritorio.

> **Stack:** Next.js 16 (React 19) · TypeScript · Tailwind 4 · shadcn/ui · Prisma + SQLite · TanStack Query · Zustand · framer-motion · recharts · Tauri (escritorio)

---

## 1. Requisitos previos

| Herramienta | Versión | Para qué | Descarga |
|-------------|---------|----------|----------|
| **Node.js** | 20 LTS+ | Runtime JS | <https://nodejs.org/> |
| **Bun** | 1.1+ | Gestor de paquetes y runner | <https://bun.sh/> |
| **Git** | 2.x | Versionado | <https://git-scm.com/> |
| **Rust + Cargo** | 1.77+ | Solo para compilar la app de escritorio (Tauri) | <https://rustup.rs/> |
| **Tauri CLI** | 2.x | Empaquetar escritorio | `bunx tauri` (se instala solo) |

Verifica:
```bash
node -v && bun -v && git -v          # obligatorios
rustc --version && cargo --version   # solo si vas a compilar escritorio
```

> **Windows:** instala además *Microsoft C++ Build Tools* y *WebView2* (Tauri).  
> **macOS:** Xcode Command Line Tools (`xcode-select --install`).  
> **Linux:** `webkit2gtk`, `libgtk-3`, `librsvg2` (Tauri).

---

## 2. Visual Studio Code

### 2.1 Instalar VSC
<https://code.visualstudio.com/>

### 2.2 Extensiones (panel `Ctrl+Shift+X`)

| Extensión | Autor | Uso |
|-----------|-------|-----|
| ES7+ React/Redux snippets | dsznajder | Snippets React |
| Tailwind CSS IntelliSense | Tailwind Labs | Autocompletado Tailwind |
| Prisma | Prisma | Schema + cliente |
| ESLint | Microsoft | Lint en tiempo real |
| Prettier | Prettier | Formateo |
| PostCSS Language Support | PostCSS | CSS moderno |
| Pretty TypeScript Errors | TS Tools | Errores TS legibles |
| Auto Rename Tag | Jun Han | Etiquetas en pares |
| Path Intellisense | C. Kohler | Rutas |
| Error Lens | Alexander | Errores inline |
| GitLens | GitKraken | Historial Git |
| Tauri | tauri-apps | Soporte Tauri (escritorio) |
| Material Icon Theme | PKief | Iconos |
| rust-analyzer | The Rust Project | Solo si compilas escritorio |
| CodeLLDB | Vadim Chugunov | Debug Rust (opcional) |

> El proyecto ya incluye `.vscode/extensions.json` con recomendaciones: VSC te ofrecerá instalarlas al abrirlo.

### 2.3 Configuración (`.vscode/settings.json`, ya incluido)
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.tabSize": 2,
  "tailwindCSS.experimental.classRegex": ["cva\\(\"([^\"]*)\"", "cn\\(([^)]*)\\)"],
  "prisma.fileWatch": true
}
```

### 2.4 Abrir el proyecto
```bash
cd reportes-tecnicos
code .
```
(O **Archivo → Abrir carpeta…** en VSC.)

---

## 3. Instalar dependencias

En la terminal integrada (`` Ctrl+` ``):
```bash
bun install
```
> Sin Bun: `npm install` o `pnpm install`.

---

## 4. Base de datos (SQLite — sin servidor)

El proyecto usa **SQLite** (archivo local en `db/custom.db`). No necesitas instalar PostgreSQL/MySQL.

### 4.1 Variables de entorno (`.env`, ya incluido)
```env
DATABASE_URL="file:./db/custom.db"
```

### 4.2 Sincronizar esquema
```bash
bun run db:push        # crea/actualiza las tablas según prisma/schema.prisma
```

### 4.3 Bootstrap del superadmin (automático)
Al primer inicio del servidor, **la app crea automáticamente**:
- La **única cuenta superadmin** (usuario `superadmin`, contraseña `SRT-DID-2026!`).
- Los catálogos del sistema: tipos de área, áreas DID/DST, tipos de tarea, tipos de equipo.

> La BD **persiste** entre reinicios: tus usuarios, reportes y catálogos no se borran al cerrar el IDE.

### 4.4 (Opcional) Datos de demostración
Si quieres reportes de ejemplo para probar el dashboard/estadísticas:
```bash
bun run seed:demo      # crea ~21 reportes de ejemplo (no afecta al superadmin)
```

### 4.5 (Opcional) Reiniciar desde cero
```bash
bun run bootstrap      # borra TODO y recrea solo el superadmin + catálogos
```

---

## 5. Ejecutar en desarrollo

```bash
bun run dev
```
Salida:
```
▲ Next.js 16.1.3 (Turbopack)
- Local: http://localhost:3000
✓ Ready in 700ms
```
Abre <http://localhost:3000>.

### Primer ingreso
1. En el login, clic en **"Autocompletar superadmin"**.
2. Ingresa (contraseña `SRT-DID-2026!`).
3. Verás un aviso: tu contraseña es temporal. **Cámbiala** desde tu perfil (cuando esté disponible) o pidiendo al superadmin que la resetee.

> **Importante:** el superadmin es la **única cuenta raíz**. Crea después cuentas de `admin` (Dirección de Innovación Digital), `tecnico` y `auditor` (Dirección de Servicios Tecnológicos) desde la vista **Usuarios**.

### Comandos disponibles
| Comando | Acción |
|---------|--------|
| `bun run dev` | Servidor de desarrollo (puerto 3000) |
| `bun run lint` | ESLint — calidad de código |
| `bun run db:push` | Sincroniza esquema Prisma |
| `bun run db:generate` | Regenera cliente Prisma |
| `bun run bootstrap` | Borra todo y recrea superadmin + catálogos |
| `bun run seed:demo` | Carga reportes de demostración |
| `bun run build` | Compila para producción (standalone) |
| `bun run start` | Levanta producción en puerto 3000 |
| `bun run desktop` | App de escritorio en modo dev (Tauri) |
| `bun run desktop:build` | Compila instaladores de escritorio |

---

## 6. Roles, permisos y seguridad

| Rol | Dirección | Permisos |
|-----|-----------|----------|
| **superadmin** | Innovación Digital | Todos (cuenta raíz única, no eliminable) |
| **admin** | Innovación Digital | Reportes + usuarios + catálogos + exportar |
| **tecnico** | Servicios Tecnológicos | Crear/editar sus reportes + cambiar estado |
| **auditor** | Servicios Tecnológicos | Solo lectura + exportar |

- **Contraseñas fuertes obligatorias** al crear/editar: ≥8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 carácter especial. El formulario muestra un checklist en vivo.
- **Mostrar/ocultar contraseña** con el botón 👁 en login y en gestión de usuarios.
- **Derecho al olvido**: cada usuario puede eliminar su cuenta (anonimiza sus datos, conserva trazabilidad).
- **Permisos por rol** con override personalizable por usuario desde la vista **Usuarios**.

---

## 7. App de escritorio (Tauri)

El proyecto ya incluye el andamiaje Tauri en `src-tauri/`.

### 7.1 Requisitos (una sola vez)
```bash
# Instala Rust (si no lo tienes)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# En VSC instala la extensión "Tauri" y "rust-analyzer"
```

### 7.2 Compilar la app de escritorio
```bash
bun run desktop         # modo desarrollo (ventana nativa + hot reload)
bun run desktop:build   # genera instaladores en src-tauri/target/release/bundle/
```
Salidas:
- Windows: `.msi` y `.exe` (con WebView2)
- macOS: `.dmg` y `.app`
- Linux: `.deb`, `.AppImage`, `.rpm`

### 7.3 Iconos
Coloca tus iconos en `src-tauri/icons/` (`icon.png`, `icon.ico`, `128x128.png`, etc.). Puedes generarlos con `bunx tauri icon ruta/a/tu-logo.png`.

> La app de escritorio usa el mismo frontend y la misma API Next.js (que corre embebido). La BD SQLite se guarda en el directorio de la app.

---

## 8. Producción (web)

```bash
bun run build          # compila .next/standalone
bun run start          # servidor de producción en :3000
```
Para servir detrás de un proxy (Nginx/Caddy), apunta el upstream a `localhost:3000`.

---

## 9. Estructura del proyecto

```
reportes-tecnicos/
├── prisma/
│   ├── schema.prisma          # 11 modelos (User, Reporte, TipoEquipo, etc.)
│   └── seed-demo.ts           # datos demo (opcional)
├── scripts/
│   └── wipe-and-bootstrap.ts  # reset + superadmin
├── src-tauri/                  # Andamiaje app de escritorio (Rust + Tauri)
│   ├── tauri.conf.json
│   ├── Cargo.toml
│   └── src/{main.rs,lib.rs}
├── src/
│   ├── app/
│   │   ├── page.tsx           # Ruta única "/" — SPA
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/               # Backend (auth, usuarios, reportes, estadísticas, exportar, ...)
│   ├── components/
│   │   ├── ui/                # shadcn/ui
│   │   └── app/
│   │       ├── app-shell.tsx  # Layout + router de vistas
│   │       ├── sidebar.tsx   # Sidebar fijo + botón flotante
│   │       ├── topbar.tsx
│   │       ├── notificaciones.tsx  # Push visuales (toasts)
│   │       ├── motion-primitives.tsx
│   │       └── views/         # dashboard, reportes, detalle, form, usuarios, ranking, estadísticas, privacidad, términos
│   └── lib/                   # auth, db, api, hooks, store, constants, serialize, stats, bootstrap
├── .vscode/                   # settings + extensions
├── GUIA-INSTALACION.md        # este archivo
├── ROADMAP.md                 # qué falta: dev→prod, escritorio, despliegue, LDAP v2
└── package.json
```

---

## 10. Solución de problemas

| Problema | Solución |
|----------|----------|
| `Cannot find module '@prisma/client'` | `bun run db:generate` |
| El puerto 3000 está ocupado | Cambia el puerto en `package.json` |
| Cambios en `schema.prisma` no aplican | `bun run db:push` |
| Login falla | Verifica que el bootstrap creó el superadmin (revisa `dev.log`). Usuario: `superadmin`, pass: `SRT-DID-2026!` |
| `Unknown argument areaId` (Prisma) | Cliente Prisma cacheado: `bun run db:generate` y reinicia `bun run dev` |
| Tauri: `linker 'cc' not found` | Instala build tools C++ (Win) o Xcode CLT (mac) |
| Tauri: WebView2 no encontrado (Win) | Instala WebView2 Runtime |

---

## 11. Resumen de comandos

```bash
# --- Primera vez ---
bun install
bun run db:push                # crea la BD
# el superadmin + catálogos se crean solos al arrancar

# --- Desarrollo ---
bun run dev                    # http://localhost:3000  (superadmin / SRT-DID-2026!)

# --- Calidad ---
bun run lint

# --- Producción web ---
bun run build && bun run start

# --- App de escritorio ---
bun run desktop:build          # instaladores en src-tauri/target/release/bundle/

# --- Reiniciar desde cero ---
bun run bootstrap

# --- Datos demo (opcional) ---
bun run seed:demo
```

---

**Contacto:** innovacion.did@iris.uh.cu · Dirección de Innovación Digital  
**Versión:** 4.0 (con superadmin, gestión de usuarios, Tauri desktop, informe ejecutivo PDF)  
**Roadmap v2:** ver `ROADMAP.md` (LDAP, multi-red, asignación por técnico)
