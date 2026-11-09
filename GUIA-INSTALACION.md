# 📘 Guía de Instalación y Ejecución en VS Code
## Sistema de Reportes Técnicos — Dirección de Innovación Digital

Esta guía te acompaña **paso a paso** desde cero hasta tener la aplicación corriendo en tu
computadora con Visual Studio Code. Está pensada tanto para quien ya programa como para quien
instala por primera vez: cada paso dice **qué hacer, cómo verificarlo y qué hacer si falla**.

> **Stack:** Next.js 16 (React 19) · TypeScript 5 · Tailwind CSS 4 · shadcn/ui · Prisma + SQLite ·
> TanStack Query · Zustand · framer-motion · recharts · jsPDF/xlsx

> ⚡ **Dato importante sobre los datos:** la aplicación arranca **siempre con la base de datos
> vacía**. Los datos de demostración viven en un script aparte (`bun run seed`) y **se eliminan
> automáticamente cada vez que reinicias la app en el IDE**. Así trabajas siempre sobre datos
> limpios y decides cuándo cargar el escenario demo.

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Instalar y configurar Visual Studio Code](#2-instalar-y-configurar-visual-studio-code)
3. [Abrir el proyecto en VSC](#3-abrir-el-proyecto-en-vsc)
4. [Instalar dependencias](#4-instalar-dependencias)
5. [Configurar la base de datos](#5-configurar-la-base-de-datos)
6. [Ejecutar la aplicación](#6-ejecutar-la-aplicación)
7. [Datos de demostración (seed)](#7-datos-de-demostración-seed)
8. [Cuentas y roles](#8-cuentas-y-roles)
9. [Comandos disponibles](#9-comandos-disponibles)
10. [Estructura del proyecto](#10-estructura-del-proyecto)
11. [Verificación final (checklist)](#11-verificación-final-checklist)
12. [Solución de problemas (FAQ)](#12-solución-de-problemas-faq)
13. [Empaquetado futuro: escritorio y móvil](#13-empaquetado-futuro-escritorio-y-móvil)
14. [Listo para producción (v1.0)](#14-listo-para-producción-v10)
15. [Pruebas: unitarias, regresivas y de usabilidad](#15-pruebas-unitarias-regresivas-y-de-usabilidad)
16. [Acceso desde otros equipos y otras redes](#16-acceso-desde-otros-equipos-y-otras-redes)

---

## 1. Requisitos previos

Antes de abrir VSC, instala este software base (Windows, macOS o Linux):

### 1.1 Node.js 20 LTS o superior — *obligatorio*

- Descarga: <https://nodejs.org/> (elige la versión **LTS**)
- Instala con las opciones por defecto.

**Verifica** en una terminal (PowerShell, Terminal o cmd):

```bash
node -v     # → v20.x o superior
npm -v      # → debe devolver un número
```

### 1.2 Bun — *recomendado (gestor de paquetes y runtime ultrarrápido)*

El proyecto está preparado para Bun. Instálalo:

```bash
# macOS / Linux / WSL
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Verifica:**

```bash
bun -v      # → v1.1.x o superior
```

> 💡 **¿No quieres instalar Bun?** Puedes usar `npm` en todos los comandos (`npm install`,
> `npm run dev`, `npx prisma db push`...). La app funciona igual; Bun solo es más rápido.

### 1.3 Git — *recomendado*

- Descarga: <https://git-scm.com/>
- Verifica: `git --version`

### 1.4 Navegador actualizado

Cualquiera de los modernos: Chrome, Edge, Firefox o Brave. La app se ve y funciona igual.

---

## 2. Instalar y configurar Visual Studio Code

### 2.1 Descarga e instalación

1. Descarga VSC: <https://code.visualstudio.com/>
2. Instala con las opciones por defecto. En Windows, marca la casilla
   **«Add to PATH»** / **«Add 'Open with Code' action»** para poder abrir carpetas con clic derecho.

### 2.2 Extensiones recomendadas

Abre el panel de extensiones con `Ctrl+Shift+X` e instala:

| Extensión | Autor | Utilidad |
|-----------|-------|----------|
| **ESLint** | Microsoft | Marca errores de código en tiempo real |
| **Prettier - Code formatter** | Prettier | Formatea el código al guardar |
| **Tailwind CSS IntelliSense** | Tailwind Labs | Autocompleta clases de estilos |
| **Prisma** | Prisma | Resalta y autocompleta el esquema de BD |
| **Error Lens** | Alexander | Muestra los errores justo en la línea |
| **Auto Rename Tag** | Jun Han | Renombra etiquetas JSX en pares |
| **Path Intellisense** | Christian Kohler | Autocompleta rutas de archivos |
| **GitLens** | GitKraken | Historial y autoría del código |
| **Material Icon Theme** | Philipp Kief | Iconos por tipo de archivo (opcional, estético) |

> 🎁 El proyecto ya incluye `.vscode/extensions.json` y `.vscode/settings.json`, así que al abrir
> la carpeta VSC te **recomendará automáticamente** las extensiones clave y aplicará la
> configuración del editor (formato al guardar, tabulación de 2 espacios, etc.).

### 2.3 Terminal integrada de VSC

Todos los comandos de esta guía se ejecutan en la **terminal integrada**:
ábre con `` Ctrl+` `` (tecla junto al número 1) o **Terminal → New Terminal**.

---

## 3. Abrir el proyecto en VSC

Si recibiste el proyecto comprimido (`.zip` / `.tar`):

1. Descomprímelo en una carpeta **sin espacios ni acentos en la ruta**
   (ej. `C:\proyectos\reportes-tecnicos`).
2. En VSC: **Archivo → Abrir carpeta…** y selecciona la carpeta raíz del proyecto
   (la que contiene `package.json`).

O desde la terminal:

```bash
cd ruta/a/la/carpeta
code .
```

> ⚠️ **Importante:** abre la carpeta raíz del proyecto (donde está `package.json`), no una
> carpeta superior, o las rutas de la base de datos no coincidirán.

---

## 4. Instalar dependencias

En la terminal integrada de VSC:

```bash
bun install
```

> Con npm: `npm install`

Esto instala todas las librerías del proyecto: `next`, `react`, `prisma`, `tailwindcss`,
`framer-motion`, `recharts`, `xlsx`, `jspdf`, etc. Tarda entre 30 s y 3 min según tu conexión.

**Verifica:** se creó la carpeta `node_modules` y el comando terminó **sin errores rojos**.

---

## 5. Configurar la base de datos

El proyecto usa **SQLite**: la base de datos es un archivo local (`db/custom.db`).
No necesitas instalar ningún servidor de base de datos.

### 5.1 Revisar el archivo `.env`

Debe existir un archivo `.env` en la raíz con:

```env
DATABASE_URL="file:../db/custom.db"
```

> La ruta es relativa a la carpeta `prisma/`, por lo que el archivo de base de datos se crea en
> `db/custom.db` de la raíz del proyecto. **No necesitas cambiar nada** si respetas la estructura.

### 5.2 Crear las tablas

```bash
bun run db:push
```

**Verifica:** verás un mensaje como `Your database is now in sync with your Prisma schema. Done in …`

> El cliente de Prisma se genera automáticamente. Si algún día el editor marca errores de tipos
> en `db.*`, ejecuta `bun run db:generate` para regenerarlo.

### 5.3 ¿Qué pasa con los datos cuando reinicio la app?

Cada vez que ejecutes `bun run dev`, el script `predev` corre automáticamente
`prisma/reset-db.ts`, que:

1. 🧹 Elimina el archivo de base de datos anterior (`db/custom.db`).
2. 🗄 Recrea el esquema vacío.
3. ✅ Deja la app lista en **cero datos**.

Esto es intencional: **los datos simulados nunca persisten entre sesiones del IDE**.
Si quieres trabajar con el escenario completo de prueba, ejecuta el seed (sección 7) después
de cada reinicio.

---

## 6. Ejecutar la aplicación

```bash
bun run dev
```

Verás algo como:

```
🧹 [reset-db] Limpiando base de datos para un inicio fresco...
🗄  [reset-db] Sincronizando esquema Prisma (base vacía)...
✅ [reset-db] Base de datos vacía y lista.
   💡 ¿Quieres datos de demostración? Ejecuta: bun run seed

▲ Next.js 16.x (Turbopack)
- Local: http://localhost:3000
✓ Ready in 800ms
```

Abre <http://localhost:3000> en tu navegador. Verás la pantalla de inicio de sesión.

> 🔎 **Pantalla de "Base de datos vacía":** si aún no cargaste el seed, el login te mostrará un
> aviso amarillo recordándote ejecutar `bun run seed`. Es el comportamiento esperado.

Para **detener** el servidor: `Ctrl+C` en la terminal.
Para **reiniciarlo**: vuelve a ejecutar `bun run dev` (la BD se limpia de nuevo, como se explicó).

---

## 7. Datos de demostración (seed)

Los datos simulados viven en `prisma/seed-demo.ts` — **no están dentro de la app**.

```bash
bun run seed
```

Este script crea:

- **Catálogos**: 4 tipos de área, 8 áreas (incluyendo *Dirección de Innovación Digital* y
  *Dirección de Servicios Tecnológicos*), 9 ubicaciones, 8 tipos de tarea y 14 tipos de equipo.
- **6 usuarios** (ver sección 8) con contraseña `Demo2025`.
- **53 reportes** distribuidos en los últimos 6 meses, con equipos, historial de estados,
  notificaciones y tiempos de resolución realistas.

**Verifica:** recarga el navegador, el aviso amarillo desaparece y podrás iniciar sesión.

> 🔄 Recuerda: al reiniciar `bun run dev`, la base se limpia y deberás volver a ejecutar
> `bun run seed` si quieres el escenario demo. Si prefieres empezar a registrar datos reales,
> simplemente crea los catálogos y cuentas que necesites con la cuenta admin — la app funciona
> completa sin seed.

---

## 8. Cuentas y roles

La aplicación es **creada y administrada por la Dirección de Innovación Digital** (cuenta
`admin`) y **operada por técnicos y auditores de la Dirección de Servicios Tecnológicos**.

| Usuario | Contraseña | Rol | Dirección | Puede |
|---------|-----------|-----|-----------|-------|
| `admin` | `Demo2025` | Administrador | Innovación Digital | Todo: catálogos, cuentas, asignar técnicos, eliminar reportes |
| `tec1` (Ana García) | `Demo2025` | Técnica de Hardware | Servicios Tecnológicos | Crear/actualizar sus reportes, registrar soluciones, nuevos tipos |
| `tec2` (Luis Fernández) | `Demo2025` | Técnico de Redes | Servicios Tecnológicos | Igual que tec1 |
| `tec3` (María López) | `Demo2025` | Técnica de Software | Servicios Tecnológicos | Igual que tec1 |
| `tec4` (José Ramírez) | `Demo2025` | Soporte General | Servicios Tecnológicos | Igual que tec1 |
| `auditor` (Patricia Díaz) | `Demo2025` | Auditor | Servicios Tecnológicos | Solo lectura de todo + exportar informes |

**Consejo de prueba:** entra como `admin` para administrar, como `tec1` para sentir el flujo del
técnico, y como `auditor` para ver el modo supervisión.

### 8.1 Gestión de usuarios (solo admin)

Desde la vista **Usuarios** (sidebar → Administración), el admin gestiona manualmente todas las
cuentas: crear usuario, editar cargo, restablecer contraseña (revoca las sesiones del usuario),
activar/desactivar y eliminar con anonimización. Los técnicos y auditores **no se crean ni
sincronizan desde el LDAP universitario**: viven en la base local del servidor designado.

### 8.2 Derecho al olvido (eliminación de cuenta con aprobación)

1. El técnico o auditor pulsa **“Eliminar cuenta”** en el sidebar y envía su solicitud con un motivo.
2. El admin la recibe como notificación y la revisa en **Usuarios → Solicitudes de baja**.
3. Antes de aprobar, puede descargar la **copia de datos** del solicitante (JSON con sus reportes
   completos y estadísticas). Al aprobar, el sistema además guarda automáticamente un respaldo en
   `db/backups/respaldo-<usuario>-<fecha>.json`.
4. Al aprobarse: la cuenta se anonimiza, se desactiva y sus sesiones/notificaciones se borran. Al
   rechazarse: el usuario continúa activo y recibe la decisión como notificación.

---

## 9. Comandos disponibles

| Comando | Qué hace |
|---------|----------|
| `bun run dev` | **Limpia la BD + arranca el servidor de desarrollo** en el puerto 3000 |
| `bun run dev:lan` | Arranca desarrollo **accesible desde otros equipos de la red** (0.0.0.0, no borra la BD) |
| `bun run seed` | Carga los datos de demostración (`prisma/seed-demo.ts`) |
| `bun run db:fresh` | Limpia la BD manualmente (igual que el arranque automático) |
| `bun run db:push` | Sincroniza `prisma/schema.prisma` con la base (crea/actualiza tablas) |
| `bun run db:generate` | Regenera el cliente Prisma (tras cambios de esquema) |
| `bun run lint` | Revisa la calidad del código con ESLint |
| `bun run test` | Ejecuta **todas** las pruebas (unitarias + regresivas + usabilidad) |
| `bun run test:unit` | Solo pruebas unitarias de la lógica de dominio |
| `bun run test:regresion` | Solo pruebas regresivas de la API (usa `db/test.db`, aislada) |
| `bun run test:usabilidad` | Solo pruebas de usabilidad E2E (requiere el servidor corriendo) |
| `bun run build` | Compila la versión de producción |
| `bun run start` | Sirve la versión compilada (puerto 3000) |
| `bun run start:lan` | Sirve la versión compilada **accesible desde la red** (0.0.0.0) |

> Después de **editar `prisma/schema.prisma`**: ejecuta `bun run db:push` (y `bun run db:generate`
> si el editor marcara errores de tipos).

---

## 10. Estructura del proyecto

```
reportes-tecnicos/
├── prisma/
│   ├── schema.prisma        # Esquema de la BD (12 modelos: User, Reporte, TipoEquipo…)
│   ├── seed-demo.ts         # ⭐ Datos simulados (se cargan con: bun run seed)
│   └── reset-db.ts          # ⭐ Limpieza automática en cada arranque (predev)
├── db/custom.db             # Base de datos SQLite (se crea con db:push; se borra en cada dev)
├── .env                     # DATABASE_URL (ruta local del archivo SQLite)
├── public/uploads/          # Archivos adjuntos de los reportes
├── .vscode/                 # Configuración y extensiones recomendadas de VSC
├── src/
│   ├── app/
│   │   ├── page.tsx         # Única ruta "/" — monta la SPA
│   │   ├── layout.tsx       # Layout raíz + notificaciones (Toaster)
│   │   ├── globals.css      # Tema, animaciones y utilidades
│   │   └── api/             # 🔙 Backend (API Routes de Next.js)
│   │       ├── auth/            # login, sesión, eliminar cuenta
│   │       ├── reportes/        # CRUD + cambiar estado + archivos
│   │       ├── estadisticas/    # resumen, por-mes/tipo/área/técnico, ranking
│   │       ├── exportar/        # Excel, PDF (informe ejecutivo), Word
│   │       ├── tipos-tarea/     # catálogo de tipos de tarea
│   │       ├── tipos-equipo/    # catálogo de tipos de equipo
│   │       ├── notificaciones/  # push internas del sistema
│   │       └── setup-status/    # estado de la BD para la pantalla de login
│   ├── components/
│   │   ├── ui/              # Componentes base (shadcn/ui)
│   │   └── app/
│   │       ├── app-shell.tsx        # Layout general (sidebar fijo + contenido)
│   │       ├── sidebar.tsx          # Sidebar fijo con botón de colapso
│   │       ├── topbar.tsx           # Barra superior
│   │       ├── notificaciones.tsx   # Panel de campana
│   │       ├── push-notificaciones.tsx  # Push visuales (toasts animados)
│   │       └── views/               # Pantallas: Dashboard, Reportes, Form, Detalle,
│   │                                # Ranking, Estadísticas, Privacidad, Términos, Login
│   └── lib/
│       ├── constants.ts     # Catálogos, direcciones, niveles del ranking
│       ├── db.ts            # Cliente Prisma
│       ├── auth.ts          # Hash scrypt + sesiones
│       ├── hooks.ts         # Hooks de datos (TanStack Query)
│       ├── store.ts         # Estado global (Zustand)
│       └── stats.ts         # Cálculo de ranking y visibilidad por rol
└── GUIA-INSTALACION.md      # Esta guía
```

---

## 11. Verificación final (checklist)

Con la app corriendo (`bun run dev` + `bun run seed`), comprueba:

- [ ] Login con `admin / Demo2025` → entra al **Dashboard** con KPIs animados.
- [ ] **Reportes → Nuevo reporte**: el formulario abre con **prioridad Media** por defecto.
- [ ] En el mismo formulario, elige tipo de tarea **Otros** → aparece el campo para **definir un
      nuevo tipo de tarea**; al guardar, queda disponible en el listado.
- [ ] En **Equipos / Activos relacionados**: primero se **elige el tipo** (PC, switch, torre,
      impresora…), debajo se abre el formulario (código, marca, modelo, serie). La opción
      **Otro (definir nuevo tipo)** permite crear un tipo de equipo al momento.
- [ ] **Ranking**: podio y filtro compactos; botón **PDF ejecutivo** descarga el informe.
- [ ] **Estadísticas**: al abrir por primera vez en la sesión, los gráficos se **animan al hacer
      scroll**; el botón **Informe PDF ejecutivo** genera el reporte profesional.
- [ ] El **panel lateral** está fijo (no scrollea con el contenido) y el botón circular superior
      lo colapsa/expande con animación.
- [ ] **Notificaciones push**: crea un reporte con otra cuenta abierta en otra pestaña → aparece
      la tarjeta push animada en la esquina inferior derecha.
- [ ] **Privacidad** y **Términos** se leen bien y se adaptan a cualquier tamaño de pantalla
      (prueba estrechando la ventana).
- [ ] Cambia de tema claro/oscuro con el botón 🌙 del topbar.

---

## 12. Solución de problemas (FAQ)

| Problema | Causa probable | Solución |
|----------|----------------|----------|
| `Cannot find module '@prisma/client'` | Cliente de Prisma sin generar | `bun run db:generate` |
| `Error code 14: Unable to open the database file` | Ruta de `.env` incorrecta o carpeta `db/` inexistente | Verifica `DATABASE_URL="file:../db/custom.db"` y que exista la carpeta `db/` en la raíz |
| El login dice **«Base de datos vacía»** | Acabas de reiniciar la app (comportamiento esperado) | Ejecuta `bun run seed` en otra terminal y recarga |
| `EADDRINUSE: port 3000 is in use` | Otro proceso usa el puerto 3000 | Cierra el otro servidor o cambia el puerto en `package.json` (`next dev -p 3001`) |
| La página queda en blanco | Error de JavaScript en el navegador | Abre la consola (`F12` → Console), revisa el error y ejecuta `bun run lint` |
| `bun: command not found` | Bun no está en el PATH | Reinicia la terminal/IDE tras instalar Bun, o usa `npm run dev` |
| Errores de tipos en `db.usuario…` | Cliente Prisma desactualizado | `bun run db:generate` y recarga la ventana de VSC (`Ctrl+Shift+P` → Reload Window) |
| El seed falla con «not found» | Falta `db:push` antes del seed | Ejecuta `bun run db:push` y luego `bun run seed` |
| Cambié el esquema y no se refleja | Falta sincronizar | `bun run db:push` (ojo: reiniciar `dev` limpia los datos) |
| Los PDF no se descargan | Navegador bloqueó la descarga | Permite descargas del sitio; el archivo va a la carpeta de descargas |

> 🆘 **Último recurso:** borra `db/custom.db`, ejecuta `bun run db:push` + `bun run seed` y
> reinicia `bun run dev`.

---

## 13. Empaquetado futuro: escritorio y móvil

La app web puede empaquetarse sin reescribir código:

### 13.1 App de escritorio (Tauri — ligero, recomendado)

```bash
bun add -D @tauri-apps/cli
bunx tauri init          # Nombre: "Sistema de Reportes Técnicos", URL dev: http://localhost:3000
bunx tauri build         # Genera .msi/.exe (Windows), .dmg (macOS), .deb/.AppImage (Linux)
```

### 13.2 APK móvil (Capacitor)

```bash
bun add -D @capacitor/cli && bun add @capacitor/core @capacitor/android
bunx cap init "Reportes Técnicos" "cu.iris.reportes"
bun run build && bunx cap add android && bunx cap sync
bunx cap open android    # En Android Studio: Build → Build APK(s)
```

Requisitos: **Android Studio + JDK 17**. La app ya usa rutas relativas (`/api/...`), por lo que
funciona dentro del webview sin cambios.

---

## 14. Listo para producción (v1.0)

Mejoras de seguridad, arquitectura y robustez incluidas en la versión 1.0:

### 14.1 Seguridad

- **Anti fuerza bruta en el login**: 5 intentos por usuario+IP cada 15 minutos; al exceder, bloqueo
  temporal con mensaje claro (`src/lib/rate-limit.ts`). También se limita la creación masiva de
  reportes/usuarios.
- **Política de contraseñas**: mínimo 8 caracteres con letras y números, validada con Zod en
  `src/lib/validators.ts` (aplica a login, creación y restablecimiento).
- **Validación de TODA la entrada** de la API con esquemas Zod (reportes, usuarios, solicitudes,
  login): tipos, longitudes y formatos se rechazan con mensajes en español antes de tocar la BD.
- **Cabeceras de seguridad** en `next.config.ts`: `X-Frame-Options: DENY`, `nosniff`,
  `Referrer-Policy`, `Permissions-Policy` y sin `X-Powered-By`.
- **Sesiones seguras**: tokens de 256 bits, TTL de 7 días, limpieza automática de sesiones
  expiradas y revocación total al restablecer contraseña.
- **No enumeración de usuarios**: el login responde el mismo mensaje genérico exista o no la cuenta.
- **Autoprotección de admins**: no puedes desactivar/eliminar tu propia cuenta ni dejar el sistema
  sin administradores activos.
- **Subidas acotadas**: máximo 10 MB por archivo, servidos con `nosniff`.
- **`robots.txt`** bloquea la indexación del sistema institucional en buscadores públicos.

### 14.2 Arquitectura y mantenibilidad

- **Guard de autenticación/autorización** unificado (`guard()` en `src/lib/api-helpers.ts`) y
  **manejo de errores centralizado** (`conErrores()`) con respuestas uniformes sin filtrar detalles
  internos.
- **Manejo de estado** con Zustand (persistente) + TanStack Query (servidor); el buscador global
  (paleta ⌘K) y el tema viven en el store.
- **Error Boundary global**: los errores de render muestran una pantalla de recuperación
  (Reintentar / Ir al inicio) en lugar de una página en blanco.
- **Rendimiento**: las vistas pesadas (Estadísticas y Ranking, que cargan recharts) se cargan
  bajo demanda (`next/dynamic`), reduciendo el bundle inicial.

### 14.3 Modelo de usuarios: BD local aislada del LDAP

Las cuentas **no provienen del LDAP central** de la universidad. Residen en la base local del
servidor designado (`db/custom.db`, tabla `User` con campo `origen="local"`), de modo que:

- Cualquier incidencia en el sistema central de la universidad no afecta la autenticación local.
- No hay sincronización automática: **el admin crea y gestiona los usuarios manualmente** desde la
  vista Usuarios.
- Si en el futuro se desea conciliar con el directorio, el campo `origen` ya contempla el valor
  reservado `ldap_sync` sin cambiar el esquema.

### 14.4 Notas de operación

- El mensaje `[Fast Refresh] done in XXms` del terminal es **informativo**: aparece solo cuando
  guardas archivos mientras el servidor de desarrollo está corriendo; no es un error.
- Los respaldos de baja de cuentas se acumulan en `db/backups/`: inclúyelo en el plan de copias y
  súbelo a la lista de rutas privadas (no está dentro de `public/`, así que no es descargable).

---

## 15. Pruebas: unitarias, regresivas y de usabilidad

Ejecuta la suite completa con:

```bash
bun run test          # 50 pruebas en 3 niveles
```

| Nivel | Carpeta | Qué verifica |
|-------|---------|--------------|
| **Unitarias** | `tests/unit/` | Hash de contraseñas (scrypt), algoritmo de ranking, niveles, validadores Zod (incluida la prioridad “media” por defecto) y rate-limit |
| **Regresivas** | `tests/regresion/` | La API real contra `db/test.db` (aislada): login, roles, visibilidad por rol, creación de reportes, validaciones, flujo completo de solicitud de eliminación con respaldo y anonimización, protecciones de admins |
| **Usabilidad** | `tests/usabilidad/` | Caminos dorados del usuario contra el servidor en vivo: portada, sesión, listados, KPIs, catálogos del formulario, exportaciones Excel/PDF, cabeceras de seguridad y robots.txt |

La suite regresiva prepara su propia base (`db/test.db`) y la limpia en cada corrida: nunca toca
tus datos de desarrollo. Las pruebas de usabilidad se saltan solas si el servidor no está corriendo
y toleran el bloqueo temporal del anti fuerza bruta cuando se ejecutan repetidamente.

Además, `tests/usabilidad/CHECKLIST.md` contiene una **lista de verificación heurística manual**
(10 principios de Nielsen adaptados) para evaluar la interfaz en móvil, tableta y escritorio.

> Nota: tras repetidas corridas de la suite, el admin puede quedar bloqueado 15 minutos por el
> anti fuerza bruta (es el comportamiento esperado). Espera o reinicia el servidor de desarrollo.

---

## 16. Acceso desde otros equipos y otras redes

Por defecto la app solo se usa en el equipo donde corre. Para que otros usuarios
la abran desde sus navegadores hay tres escenarios, de más simple a más completo.

### 16.1 Acceso desde la misma red (LAN) — recomendado para el instituto

El servidor ya escucha en **todas las interfaces de red**. Solo necesitas:

1. Saber la IP del equipo servidor:

```bash
hostname -I        # Linux / WSL — primera IP listada
ipconfig           # Windows — busca "Dirección IPv4"
```

2. Asegurar que la app esté en modo red (ya lo está por defecto):

```bash
bun run dev:lan      # desarrollo, escucha en 0.0.0.0:3000 (NO borra la BD al reiniciar)
bun run build && bun run start:lan   # producción, escucha en 0.0.0.0:3000
```

3. Abrir el puerto en el cortafuegos si está activo:

```bash
sudo ufw allow 3000/tcp                      # Ubuntu/Debian (ufw)
sudo firewall-cmd --add-port=3000/tcp --permanent && sudo firewall-cmd --reload  # RHEL (firewalld)
```

4. Los demás usuarios abren en su navegador `http://IP-DEL-SERVIDOR:3000` y
   inician sesión con sus cuentas (demo: `admin / Demo2025`).

**Atajo:** el script `download/acceso-red.sh` hace todo automáticamente: detecta
las IPs, arranca la app en modo red si no corre, intenta abrir el firewall y
imprime las URL exactas para compartir:

```bash
bash download/acceso-red.sh
```

### 16.2 Acceso desde otra red (Internet) — opciones seguras

| Opción | Cómo | Cuándo usarla |
|--------|------|---------------|
| **VPN / Tailscale** (recomendada) | Instala Tailscale en el servidor y en cada usuario; accede con la IP `100.x.y.z` que asigna | Sin exponer puertos públicos; la más segura y la más simple |
| **Reenvío de puertos en el router** | Redirige un puerto externo (p. ej. 8443) hacia `IP-SERVIDOR:3000` | Solo con HTTPS obligatorio y contraseñas fuertes |
| **Proxy inverso con HTTPS** | Caddy o Nginx delante de la app, con dominio propio y certificado | Cuando existe dominio institucional y varios servicios |

Ejemplo de proxy inverso con Caddy (HTTPS automático) en el servidor:

```
reportes.institucion.edu {
    reverse_proxy localhost:3000
}
```

> Si publicas la app tras un dominio propio, añade ese dominio a
> `allowedDevOrigins` en `next.config.ts` (solo afecta al modo desarrollo).

### 16.3 Seguridad al exponer la app a otros usuarios

- Usa **siempre** el modo producción (`bun run build` + `bun run start:lan`) para
  uso real: activa las cabeceras anti-clickjacking y el rendimiento completo.
- El sistema ya incluye **anti fuerza bruta** (5 logins/15 min por usuario+IP),
  validación de datos con Zod, sesiones con expiración y contraseñas con política
  mínima de 8 caracteres.
- Cambia las contraseñas demo antes de habilitar usuarios reales (desde
  **Usuarios → editar → contraseña**, disponible para superadmin/admin).
- `robots.txt` ya bloquea indexadores; no enlaces la app desde sitios públicos.
- Haz copia periódica de `db/custom.db` (es un único archivo SQLite: basta copiarlo
  con la app detenida) o usa los respaldos automáticos de bajas en `db/backups/`.

---

**Desarrollado y mantenido por la Dirección de Innovación Digital** · Operación: Dirección de
Servicios Tecnológicos · Contacto: `innovacion.did@iris.uh.cu`

¿Dudas con algún paso? Revisa el historial del proyecto en `worklog.md`.
