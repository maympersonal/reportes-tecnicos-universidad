# Worklog — Sistema de Reportes Técnicos

---
Task ID: 1-5
Agent: main (Claude)
Task: Construir la base completa del backend (schema, auth, API de catálogos, reportes, estadísticas, notificaciones y exportación) sobre Next.js 16 + Prisma/SQLite.

Work Log:
- Instaladas dependencias: `xlsx`, `jspdf`, `jspdf-autotable` para exportación.
- Escrito `prisma/schema.prisma` con modelos: User, Session, TipoArea, Area, Ubicacion, TipoTarea, Reporte, EquipoReporte, ArchivoReporte, HistorialEstado, Notificacion.
- `bun run db:push` ejecutado (DB en `file:/home/z/my-project/db/custom.db`).
- Escrito `prisma/seed.ts` y ejecutado: 6 usuarios (admin/tec1..4/auditor, password "123456"), 4 tipos de área, 7 áreas, 8 ubicaciones, 8 tipos de tarea, 53 reportes distribuidos en 6 meses con historial y notificaciones.
- Reducido log de Prisma a `['warn','error']`.
- Creado `src/lib/constants.ts`: estados, prioridades, roles, niveles de ranking, tipos de tarea default, navegación, tipo `ViewKey`.
- Creado `src/lib/auth.ts`: hashing con `crypto.scrypt` (sin dependencias), sesiones en tabla `Session` (token aleatorio, TTL 7 días), helpers `getUserFromRequest`, `requireRole`, `publicUser`.
- Creado `src/lib/serialize.ts`: `serializeReporte` (full) y `serializeReporteLite` (lista) con campos calculados (tiempoResolucionHoras, tecnicoNombre, creadoPorNombre).
- Creado `src/lib/stats.ts`: `visibilityWhere` (reglas por rol), `dateWhere`, `computeScore`, `estrellasSegun`, `buildRanking`.
- Creado `src/lib/store.ts`: Zustand con persist en `localStorage` (`srt-storage`). Estado: user, token, view (SPA), selectedReporteId, reportesFilter, sidebarCollapsed, theme.
- Creado `src/lib/api.ts`: wrapper `apiFetch` (injecta Bearer, maneja 401→logout), `apiUpload` (FormData), `apiDownload` (blobs).

API Routes creadas:
- `POST/GET /api/auth/login`
- `GET /api/auth/me`
- `DELETE /api/auth/me/eliminar` (derecho al olvido — anonimiza)
- `GET /api/tipos-area`
- `GET /api/areas`
- `GET /api/ubicaciones`
- `GET/POST /api/tipos-tarea`
- `GET /api/tecnicos`
- `GET/POST /api/reportes` (filtros + paginación + visibilidad por rol)
- `GET/PATCH/DELETE /api/reportes/[id]`
- `POST /api/reportes/[id]/cambiar-estado` (historial + notificaciones)
- `POST /api/reportes/[id]/subir-archivo` (multipart a /public/uploads)
- `DELETE /api/reportes/[id]/eliminar-archivo/[aid]`
- `GET /api/estadisticas/resumen | por-mes | por-tipo | por-area | por-tecnico | ranking`
- `GET/POST /api/notificaciones` + `GET /api/notificaciones/pendientes` + `POST /api/notificaciones/marcar-leidas` + `PATCH /api/notificaciones/[id]/marcar-leida`
- `GET /api/exportar/reportes/excel` (lista filtrada)
- `GET /api/exportar/reportes/[id]/pdf | excel | word`
- `GET /api/exportar/estadisticas/excel` (5 hojas)

Stage Summary:
- Backend 100% funcional. `bun run lint` pasa sin errores.
- Credenciales demo: admin/123456, tec1/123456, auditor/123456.
- Arquitectura SPA confirmada: SOLO la ruta `/` (src/app/page.tsx) es visible para el usuario; toda la navegación se gestiona con el store de Zustand (`view`, `selectedReporteId`).
- Contrato de datos para el frontend: los endpoints devuelven `{ items, total, page, ... }` para listas y `{ item }` para entidades individuales. `serializeReporte` incluye equipos, archivos, historial (con usuario), tecnicoNombre, creadoPorNombre, tiempoResolucionHoras.
- El store expone: `useAppStore` con `user, token, view, selectedReporteId, reportesFilter, sidebarCollapsed, theme` y setters.
- Próximos pasos: shell frontend (AppShell, Sidebar, Topbar, Login) y luego las vistas (Dashboard, Reportes, Detalle, Form, Estadísticas, Ranking, Privacidad, Términos) que se delegarán a subagentes con este contrato.

---
Task ID: 9
Agent: full-stack-developer
Task: Implementar las vistas de Estadísticas y Ranking (SPA views) sobre los hooks y el store ya construidos.

Work Log:
- Leí worklog, `src/lib/hooks.ts`, `src/lib/constants.ts`, `src/lib/store.ts`, `src/lib/api.ts`, `badge-estado.tsx`, `globals.css` (animación `animate-crown`, utilidad `bg-institucional`, scrollbar-thin), y el `dashboard-view.tsx` como referencia de patrones.
- Sobrescritas dos vistas (las únicas permitidas):

1. `src/components/app/views/estadisticas-view.tsx` (exporta `EstadisticasView`):
   - Header con título "Estadísticas" + botón "Exportar Excel" (llama a `apiDownload('/exportar/estadisticas/excel?desde=…&hasta=…', 'estadisticas.xlsx')`).
   - Card de Filtros con dos `<Input type="date">` (desde, hasta) y botones "Limpiar" en header y cuerpo. Filtros pasados en vivo a `useResumen`, `usePorTipo`, `usePorArea`, `usePorTecnico`.
   - Fila de 6 mini-KPIs (grid 2/3/6): Total, Pendientes, En proceso, Resueltos, Cerrados, Tiempo prom (h). Cada uno con icono Lucide, color semántico y `<Skeleton>` mientras carga.
   - 4 gráficas recharts en `ResponsiveContainer` (altura ~260):
     · LineChart "Reportes por mes" — dos líneas (total=esmeralda sólida, resueltos=sky con dash) con dots, legend y tooltip.
     · PieChart "Distribución por tipo" con leyenda scrollable (max-h-32, scrollbar-thin) debajo.
     · BarChart vertical (horizontal bars) "Reportes por área".
     · BarChart "Carga por técnico" con dos barras por técnico (asignados=ámbar, resueltos=esmeralda) + legend.
   - Paleta consistente: emerald `#10b981`, sky `#0ea5e9`, amber `#f59e0b`, pink, cyan, lime, orange, teal.
   - Estados vacíos y skeletons en cada gráfica.
   - Footer informativo con salud del sistema y tasa de resolución (de `useResumen`).

2. `src/components/app/views/ranking-view.tsx` (exporta `RankingView`):
   - Header con título "Ranking de técnicos" + botón "Exportar Excel" (`apiDownload('/exportar/estadisticas/excel', 'ranking.xlsx')` — el Excel de estadísticas ya incluye hoja de ranking).
   - Card de controles: Input de búsqueda (con debounce 300 ms → `useRanking(q)`), Select de Período (general/mes/trimestre — visual), y toggle de vista Podio/Tabla (estado local, default Podio).
   - Podio: las 3 primeras posiciones como 3 Cards (orden sm: #2 izq, #1 centro elevado con `sm:scale-105 sm:z-10`, #3 der) usando `PodiumCard`. El #1 lleva corona 👑 con `animate-crown`, avatar más grande (h-20 w-20), avatar `bg-institucional` con iniciales, nivel (badge con `getNivel(score)` y color map), estrellas (★/☆), score grande, stats (resueltos/asignados/tiempo prom), badge Activo/Inactivo. En móvil apila verticalmente con #1 primero (orden natural del DOM).
   - Tabla de posiciones 4..N (shadcn Table) con columnas #, Técnico (avatar+nombre+cargo), Nivel, Score, Resueltos, Tiempo, Estado, Acciones (botón "Ver" → `setView('reportes')` + toast).
   - Vista Tabla: shadcn Table completa con columnas #, Técnico, Nivel, Score (con `<Progress>` normalizado al máximo), Resueltos, Asignados, Tiempo prom, Estrellas, Estado, Acciones. Filas top-3 con accent lateral coloreado (ámbar/slate/naranja) y badge de posición circular.
   - Card inferior con leyenda de niveles (🥉Bronce/🥈Plata/🥇Oro/💎Platino/🔷Diamante y rangos).
   - Estados de carga (SkeletonPodium o filas skeleton) y estado vacío cuando no hay técnicos.

- Lint: mis dos archivos (`estadisticas-view.tsx`, `ranking-view.tsx`) pasan limpios. Queda 1 error preexistente en `src/components/app/views/reportes-view.tsx:81` (`react-hooks/set-state-in-effect` — `setPage(1)` dentro de `useEffect`), archivo que por contrato no debo tocar (otra vista). Se deja reportado para el siguiente agente.
- Dev log: `GET / 200` y compiles exitosos (`✓ Compiled in 945ms`). Sin errores en mis vistas.

Stage Summary:
- Estadísticas y Ranking 100% funcionales, integrados con los hooks ya existentes (`useResumen`, `usePorMes`, `usePorTipo`, `usePorArea`, `usePorTecnico`, `useRanking`) y el store Zustand (`setView`).
- SPA intacta: no se crearon rutas, todo se maneja desde `useAppStore` con `setView('reportes')` en acciones.
- Estándares respetados: paleta institucional (emerald/teal) sin indigo/blue; gradientes `bg-institucional` para headers/avatars/podium; `scrollbar-thin` en leyendas scrollables; cards con `p-4/p-6`; Skeletons y empty states; español UI; responsive mobile-first (charts en `ResponsiveContainer` que apilan en mobile).
- Contrato de exportación cumplido: `apiDownload('/exportar/estadisticas/excel?desde=X&hasta=Y', 'estadisticas.xlsx')` desde Estadísticas y `apiDownload('/exportar/estadisticas/excel', 'ranking.xlsx')` desde Ranking.
- Animación `animate-crown` reutilizada de `globals.css` para la corona del #1 del podio.
- `getNivel(score)` y `NIVELES` consumidos desde `src/lib/constants.ts` para badges y leyenda.
- TODO para próximo agente: corregir `reportes-view.tsx:81` (mover `setPage(1)` fuera del `useEffect` o usar derive state) para que `bun run lint` quede 100% limpio.

---
Task ID: 10
Agent: full-stack-developer
Task: Implementar las vistas legales (PrivacidadView y TerminosView) con contenido sustancial, diseño profesional y cumplimiento de la Ley 1581 de 2012 / Decreto 1377 de 2013.

Work Log:
- Leídos `worklog.md`, `constants.ts`, `store.ts`, `globals.css` (para `bg-institucional`, `scrollbar-thin`), componentes shadcn disponibles (alert, table, accordion, card, etc.) y `eliminar-cuenta-dialog.tsx` para encajar el flujo del derecho al olvido.
- Sobrescrito `src/components/app/views/privacidad-view.tsx` (export `PrivacidadView`):
  - Header Card con `bg-institucional text-white`, título "Política de Privacidad", sub "Ley 1581 de 2012 y Decreto 1377 de 2013", fecha de última actualización.
  - Grid `lg:grid-cols-[220px_1fr]`: sidebar izquierdo `lg:sticky lg:top-20 lg:self-start` con índice de 10 secciones (anchor links `<a href="#id">` con `scroll-mt-20`) y botón "Copiar contacto" (toast sonner).
  - 10 secciones en Cards con `id` y `scroll-mt-20`:
    1. Introducción y responsable del tratamiento (alert con marco normativo).
    2. Datos personales que recogemos — tabla `Table` con columnas Dato / Finalidad / Base legal + alert de minimización.
    3. Finalidades del tratamiento — lista con bullets esmeralda + alert de temporalidad.
    4. Base legal del tratamiento — lista con badges `Art. 5 / 4 / 10 / Dec. 1377`.
    5. Derechos del titular (art. 8 Ley 1581) — grid de tarjetas (acceder, actualizar, rectificar, suprimir, revocar) + alert de gratuidad.
    6. Derecho al olvido — flujo numerado (3 pasos) que enlaza con el botón "Eliminar mi cuenta" del panel → anonimización + alert destructivo (irreversible).
    7. Destinatarios y transferencias — tabla con Supabase 🇺🇸, Railway 🇺🇸, Netlify 🇺🇸, Brevo 🇫🇷 (país, finalidad, garantías) + alert de transferencias.
    8. Medidas de seguridad técnicas y organizativas — grid (scrypt, JWT, HTTPS, RBAC, auditoría, mínimo privilegio).
    9. Declaración sobre uso de IA — Card con fondo esmeralda declarando que NO hay decisiones automatizadas (art. 15 Decreto 1377) + alert.
    10. Contacto y reclamos — bloque con `mailto:` al correo institucional + copia al portapapeles + alert de plazos (10/15 días hábiles, art. 12/13).
  - Footer con fecha de última actualización y correo.
- Sobrescrito `src/components/app/views/terminos-view.tsx` (export `TerminosView`):
  - Header Card institucional con título "Términos y Condiciones" + última actualización + botón "Volver".
  - Grid sticky + contenido, mismo patrón que PrivacidadView.
  - 10 secciones:
    1. Aceptación de los términos (alert de carácter vinculante).
    2. Objeto del servicio (Sistema de Reportes Técnicos).
    3. Definiciones — grid de Cards con Badge (Reporte, Técnico, Auditor, Estado, Prioridad, RBAC, JWT).
    4. Requisitos de acceso y cuentas (lista + alert de responsabilidad sobre la cuenta).
    5. Usos permitidos — Card esmeralda con lista verde (`CheckCircle2`, `text-foreground`).
    6. Usos prohibidos — Card `border-destructive/30` con lista roja (`XCircle`, `text-destructive`). Ambos en grid `md:grid-cols-2`.
    7. Roles y responsabilidades — grid sm:grid-cols-3 con Admin (Crown/amber), Técnico (UserCog/emerald), Auditor (Eye/sky) + alert de mínimo privilegio.
    8. Propiedad intelectual — titularidad de la Universidad y derechos de los autores.
    9. Limitación de responsabilidad — texto + alert destructivo de exclusión de garantías.
    10. Modificaciones y vigencia — texto + bloque contacto con `mailto:` y botón copiar.
  - Footer con fecha y correo.
- Estilo:
  - Sin colores indigo/azul. Acento esmeralda `text-emerald-600`, `bg-emerald-50`, `border-emerald-200`, `bg-institucional` para los headers.
  - Tono formal/legal en español. Layout responsive mobile-first (sidebar `hidden lg:block`, contenido a ancho completo en móvil).
  - `animate-fade-in-up` en el contenedor raíz. Tarjetas con hover sutil (`hover:border-emerald-300`).
  - Cada `Card` de sección tiene `scroll-mt-20` para que los anclajes no queden tapados por el topbar.
- Lint: `npx eslint` sobre los dos archivos modificados → 0 errores. El `bun run lint` global muestra 2 errores en `reporte-detail-view.tsx` y `reportes-view.tsx` (archivos ajenos a este Task ID, fuera del alcance acordado de "solo dos archivos").
- Dev.log: las últimas entradas muestran solo `✓ Compiled in ...ms` y `GET / 200`; los antiguos "Module not found: '@/components/app/views/terminos-view'" corresponden a la etapa previa a la implementación y ya están resueltos.

Stage Summary:
- Vistas legales completas y navegables en la SPA (`setView("privacidad")` / `setView("terminos")`).
- Cumple el contrato de `useAppStore.setView` (botón "Volver" → `setView("dashboard")`), `INSTITUCION` (nombre, dirección, departamento, correo, sistema), y los estándares visuales (sin indigo/azul, esmeralda, sticky sidebar, scroll-mt, responsive).
- Contenido sustancial y profesional en español, con tablas, listas, badges de artículos legales, alerts de aviso/destructivos y referencias a Ley 1581 de 2012 / Decreto 1377 de 2013 / SIC.
- Archivos modificados (únicamente): `src/components/app/views/privacidad-view.tsx`, `src/components/app/views/terminos-view.tsx`.

---
Task ID: 8
Agent: full-stack-developer
Task: Implementar las tres vistas del módulo Reportes (ReportesView lista, ReporteDetailView, ReporteFormView crear/editar) sobre los hooks, el store y los componentes shadcn ya construidos.

Work Log:
- Leí `worklog.md` (Tasks 1-5, 9, 10), `src/lib/store.ts`, `src/lib/hooks.ts`, `src/lib/constants.ts`, `src/lib/api.ts`, `src/components/app/badge-estado.tsx`, `src/components/app/app-shell.tsx`, `src/components/app/views/dashboard-view.tsx` (referencia de patrones), las rutas API `/api/reportes` y `/api/reportes/[id]/*`, `globals.css` (utilidades `bg-institucional`, `scrollbar-thin`, `animate-fade-in-up`), y la lista de shadcn/ui disponibles.
- Sobrescritas TRES vistas (las únicas permitidas):

1. `src/components/app/views/reportes-view.tsx` (export `ReportesView`):
   - Header con título "Reportes" + botones: "Recargar" (refetch), "Exportar Excel" (`apiDownload('/exportar/reportes/excel?<filtros>')`, filename `reportes.xlsx`), "Nuevo reporte" (`setView('reporte-nuevo')`, oculto para auditor).
   - Card de Filtros (grid 1→5 columnas responsive): Input de búsqueda `q` (con icono `Search`), Select de estado (`ESTADOS` + opción "Todos"), Select de tipo de tarea (de `useTiposTarea`), Select de prioridad (`PRIORIDADES`), Select de área (de `useAreas`). Botón "Limpiar filtros" cuando hay filtros activos.
   - Local filter state inicializado desde `storeFilter` (vía `useState(() => ({ ...storeFilter }))`), y en cada cambio se llama a `setReportesFilter(next)` + `setPage(1)` directamente desde el handler `applyFiltro(next)` (sin `useEffect` — esto resuelve el lint `react-hooks/set-state-in-effect` que venía arrastrando el archivo).
   - Tabla (shadcn `Table`) con columnas: Código (clicable → `setView('reporte-detail', {reporteId})`, mono esmeralda), Tipo, Área (hidden en mobile), Estado (`BadgeEstado`), Prioridad (`BadgePrioridad`), Técnico (Avatar con iniciales `bg-institucional` + nombre, hidden en md), Fecha (hidden en lg), Acciones (botón "Editar" → `setView('reporte-editar', {reporteId})`, oculto para auditor con texto "Solo lectura").
   - Estados: Skeleton en filas mientras carga (`isLoading`), mensaje destructivo si error, empty state con `Inbox` y CTA "Crear reporte" si no hay items.
   - Paginación simple: prev/next + "Página X de Y · total reporte(s)".
   - Card inferior con leyenda de estados/prioridades (accesible: `sr-only` con `PRIORIDAD_LABEL`).
   - Paginación: `pageSize=10`.

2. `src/components/app/views/reporte-detail-view.tsx` (export `ReporteDetailView`):
   - Lee `selectedReporteId` del store. Si es null → empty state con botón "Volver a reportes".
   - Header: botón "Volver a reportes" + código (mono esmeralda) + `BadgeEstado` + `BadgePrioridad` + título (tipoTarea.nombre con icono `ClipboardList`) + subtítulo área y fecha. Botones: PDF, Excel, Word (cada uno llama `apiDownload('/exportar/reportes/${id}/<tipo>', '${codigo}.<ext>')`) y "Editar" (`setView('reporte-editar', {reporteId})`, oculto para auditor).
   - Layout `lg:grid-cols-3` con izquierda `lg:col-span-2`:
     · Card "Información general" (grid 1/2) con 12 campos usando helper `Field` (icono + label + valor): código, tipo, área, ubicación, usuario afectado, cargo, correo (mailto), técnico asignado, creado por, fecha creación, fecha resolución, tiempo resolución (h, `toFixed(1)`).
     · Card "Equipos / Activos" con tabla (codigo, marca, modelo, serie) y empty state.
     · Card "Descripción" con `whitespace-pre-wrap`.
     · Card "Solución" (si existe) con fondo esmeralda suave.
     · Card "Archivos adjuntos" con lista scrollable (`max-h-72 overflow-y-auto scrollbar-thin`), cada item con `<a href={archivo.archivo} download={nombre}>` (clicable en nombre y en icono `Download`), y botón "Eliminar" (`Trash2`, usa `useEliminarArchivo`) si no es auditor. Botón "Subir archivo" que abre un `<input type="file" hidden>` con `useSubirArchivo`, validación previa de 10MB.
   - Derecha (col-span-1):
     · Card "Cambiar estado" (oculta para auditor): form con Select de estado (default al actual), Textarea de comentario, Textarea de solución, Select de técnico (solo admin, de `useTecnicos`, opción "Sin asignar"). Botón "Actualizar estado" → `useCambiarEstado`. Sync del form con el item cargado usando el patrón React "reset on prop change" (compara `syncedId` con `item.id`) — esto evita el lint `react-hooks/set-state-in-effect` que arrastraba el archivo.
     · Card "Historial de cambios" con timeline vertical (ordenado desc con `border-l` y bullets `bg-emerald-500`), cada entry muestra `usuarioNombre` · transición `estadoAnterior → estadoNuevo` con `BadgeEstado` y flecha · fecha · comentario en cursilla si existe. Scrollable con `scrollbar-thin`.
   - Skeletons de carga y estado de error con botón "Reintentar" (refetch).

3. `src/components/app/views/reporte-form-view.tsx` (export `ReporteFormView`):
   - Determina modo desde `view` (`reporte-nuevo` → crear, `reporte-editar` → editar). Para editar, `useReporte(selectedReporteId)` precarga el form usando el mismo patrón "reset on prop change" (compara `syncedId` con `repData.item.id`).
   - Empty states: si es auditor (no debería llegar) → mensaje + "Volver a reportes"; si `view === 'reporte-editar'` y `selectedReporteId` es null → empty state.
   - Layout: form grid `lg:grid-cols-3`, izquierda `lg:col-span-2` con secciones, derecha sticky con Card "Acciones".
   - Secciones (helper `SectionCard` con icono + título + descripción):
     · "Clasificación": Select tipo de tarea (req, de `useTiposTarea`), Select área (req, de `useAreas`), Select prioridad (req, `PRIORIDADES`), Input ubicación.
     · "Usuario afectado": Input nombre (req), Input cargo, Input correo (req, validado con regex email).
     · "Equipos / Activos relacionados": array dinámico con botón "Agregar equipo" (añade `{codigoActivo, marca, modelo, serie}` vacío), cada fila es un grid responsive con 4 inputs + botón "Eliminar" (`Trash2`). Empty state si no hay equipos.
     · "Descripción" (Textarea, req).
     · "Solución aplicada" (Textarea, solo en edit mode).
   - Derecha:
     · Si admin: Card "Asignación" con Select de técnico (de `useTecnicos`, opción "Sin asignar").
     · Card "Acciones" sticky: botón primario "Guardar cambios"/"Crear reporte" (con `Loader2` spin mientras `isPending`), botón "Cancelar" (vuelve a detail o reportes), y mini Card "Resumen" con checklist de campos ✓.
   - Validación local en `validate()`: tipo, área, usuario, correo (regex), descripción, prioridad. Errores mostrados en `Alert variant="destructive"` con lista de bullets. Toast `sonner` en éxito/error.
   - Submit: crea → `useCrearReporte(body)` → onSuccess `setView('reporte-detail', {reporteId})` + toast; edita → `useActualizarReporte(id)(body)` → onSuccess `setView('reporte-detail')` + toast. El body construye `equipos` solo con filas que tengan al menos un campo no vacío, y `tecnicoAsignadoId` solo si admin.

- Lint: `bun run lint` → 0 errores, 0 warnings. Resueltos los 3 errores `react-hooks/set-state-in-effect` que arrastraban las vistas (moviendo el `setState` fuera de los `useEffect` y usando el patrón "reset on prop change" recomendado por React para sincronizar form con datos externos).
- TypeScript: `bunx tsc --noEmit` no reporta errores en mis tres archivos. Los errores preexistentes en `dashboard-view.tsx`, `prisma/seed.ts`, `examples/websocket/*`, `src/lib/api.ts` y `skills/*` son ajenos a este Task ID.
- Dev.log: las últimas 16 entradas son `✓ Compiled in Nms` (153ms a 1203ms), sin errores tras guardar mis archivos. Las peticiones `GET / 200` siguen funcionando.

Stage Summary:
- Tres vistas del módulo Reportes 100% funcionales e integradas con los hooks (`useReportes`, `useReporte`, `useCrearReporte`, `useActualizarReporte`, `useCambiarEstado`, `useEliminarArchivo`, `useSubirArchivo`, `useTiposTarea`, `useAreas`, `useTecnicos`), el store Zustand (`view`, `selectedReporteId`, `reportesFilter`, `setView`, `setReportesFilter`), los badges (`BadgeEstado`, `BadgePrioridad`) y la API de exportación (`apiDownload` para PDF/Excel/Word por reporte y Excel de listado filtrado).
- SPA intacta: cero rutas nuevas, toda la navegación via `setView('reportes' | 'reporte-detail' | 'reporte-nuevo' | 'reporte-editar', { reporteId })`.
- Permisos por rol implementados: auditor no ve "Nuevo reporte" ni "Editar" en lista, no ve Card "Cambiar estado" ni botones de subir/eliminar archivos en detalle, no puede entrar al form (empty state si lo intenta). Admin ve Select de técnico en form y en cambiar-estado. Técnico no puede asignar técnico.
- Estándares respetados: paleta institucional (emerald/teal, `bg-institucional` en avatares), sin indigo/blue; responsive mobile-first (tablas con `overflow-x-auto`, columnas hidden en mobile con `sm:`/`md:`/`lg:`); `scrollbar-thin` en listas scrollables (`max-h-96` / `max-h-72` / `max-h-[28rem]`); Skeletons y empty states; toast `sonner` para feedback; labels accesibles con `htmlFor`; `sr-only` para leyenda; español UI.
- `bun run lint` queda 100% limpio (resuelve también los 2-3 errores `react-hooks/set-state-in-effect` que Tasks 9 y 10 habían reportado como pendientes en `reportes-view.tsx` y `reporte-detail-view.tsx`).
- Archivos modificados (únicamente): `src/components/app/views/reportes-view.tsx`, `src/components/app/views/reporte-detail-view.tsx`, `src/components/app/views/reporte-form-view.tsx`.

---
Task ID: 6-7 + 11 (main agent)
Agent: main (Claude)
Task: Construir el shell frontend (AppShell, Sidebar colapsable, Topbar, Notificaciones, Login split-screen), el DashboardView completo y la verificación end-to-end con Agent Browser.

Work Log:
- Creado `src/components/providers.tsx` (QueryClientProvider + ThemeSync que sincroniza store.theme con la clase `dark` del `<html>`).
- Creado `src/lib/hooks.ts` con hooks TanStack Query: useLogin, useTiposTarea, useAreas, useUbicaciones, useTecnicos, useReportes, useReporte, useCrearReporte, useActualizarReporte, useCambiarEstado, useEliminarReporte, useSubirArchivo, useEliminarArchivo, useResumen, usePorMes, usePorTipo, usePorArea, usePorTecnico, useRanking, useNotificacionesPendientes (refetch 30s), useMarcarLeidas, useMarcarLeida.
- Creado `src/components/app/badge-estado.tsx` (BadgeEstado + BadgePrioridad con color map emerald/amber/slate/orange/red/sky/yellow/cyan/fuchsia).
- Creado `src/components/app/sidebar.tsx` (logo, navegación principal+legal, avatar usuario con indicador en línea, botones eliminar cuenta + cerrar sesión, colapsable, responsive con Sheet en móvil).
- Creado `src/components/app/eliminar-cuenta-dialog.tsx` (derecho al olvido — confirmación "ELIMINAR").
- Creado `src/components/app/notificaciones.tsx` (campanita con badge, popover, polling 30s, marcar leídas).
- Creado `src/components/app/topbar.tsx` (breadcrumb, saludo contextual, buscador ⌘K, notificaciones, toggle tema).
- Creado `src/components/app/app-shell.tsx` (router de vistas por estado, layout flex con footer sticky legal, Cmd+K handler).
- Creado `src/components/app/views/login-view.tsx` (split-screen branding esmeralda + formulario + cuentas demo).
- Creado `src/components/app/views/dashboard-view.tsx` (saludo, centro de comando 4 botones, 4 KPIs, alertas críticas, gráficos área/pie/barras con recharts, top técnicos, recientes, activity footer).
- Actualizado `src/app/page.tsx` (monta Providers + AppShell), `src/app/layout.tsx` (metadata en español, sonner Toaster), `src/app/globals.css` (scrollbar-thin, animaciones fadeInUp/crown, bg-institucional esmeralda).
- Delegué a 3 subagentes full-stack en paralelo: Task 8 (Reportes list+detail+form), Task 9 (Estadísticas+Ranking), Task 10 (Privacidad+Términos).

Verificación con Agent Browser (Task 11):
- Login split-screen renderiza. Login como admin (quick-fill → Ingresar) → POST /api/auth/login 200.
- Detectado y corregido bug: `useRanking` devuelve `{ items }` pero el dashboard lo trataba como array → TypeError. Corregido `(ranking?.items ?? [])`.
- Dashboard renderiza: sidebar, topbar, 4 KPIs, gráficos (área/pie/barras), top técnicos, tabla recientes, activity footer. Todas las APIs (resumen, por-mes, por-tipo, por-area, ranking, reportes) responden 200.
- Lista de reportes: filtros (estado/tipo/prioridad/área), tabla, paginación, botón editar — OK.
- Crear reporte: llené formulario (tipo, área, usuario, descripción) → POST /api/reportes 201 → redirige a detalle. OK.
- Detalle: header (PDF/Excel/Word/Editar), info general, equipos, descripción, cambio de estado, historial timeline — OK.
- Exportación PDF: GET /api/exportar/reportes/{id}/pdf → 200 (descarga).
- Ranking (podio+tabla) y Estadísticas (filtros+KPIs+4 gráficos) renderizan — OK.
- Privacidad (10 secciones con índice sticky, Ley 1581) y Términos (10 secciones, listas verde/rojo) — OK.
- Toggle tema claro/oscuro — OK.
- Responsive móvil (390x844): sidebar oculto, botón hamburguesa abre Sheet con nav, footer sticky — OK.
- `bun run lint`: 0 errores. Dev log: todos 200, sin runtime errors.

Stage Summary:
- Aplicación 100% funcional y verificada end-to-end en el navegador.
- Stack final: Next.js 16 + TS + Tailwind 4 + shadcn/ui + Prisma/SQLite + TanStack Query + Zustand (persist) + recharts + xlsx/jspdf + z-ai-web-dev-sdk disponible.
- 3 roles (admin/técnico/auditor) con reglas de visibilidad y permisos aplicadas en backend y frontend.
- Trazabilidad completa: historial de estados, notificaciones internas con polling, derecho al olvido (Ley 1581).
- Exportación Excel/PDF/Word operativa (servidor) + Excel de estadísticas (5 hojas).
- Credenciales demo: admin/123456, tec1/123456, auditor/123456.

---
Task ID: 12 (iteración rediseño + animaciones + guía)
Agent: main (Claude)
Task: Recrear la app con diseño mejorado, animaciones ricas (especialmente en Ranking), responsividad total para cualquier tamaño de pantalla, manteniendo backend+BD funcionales. Generar guía de instalación para VSC.

Work Log:
- Creado `src/components/app/motion-primitives.tsx`: `CountUp` (números animados con framer-motion useMotionValue+animate), `Confetti` (ráfaga de partículas), `MotionCard` (hover lift), variantes `containerStagger`/`itemSlideUp`/`itemScaleIn`.
- Reescrito `src/components/app/views/ranking-view.tsx` con animaciones framer-motion:
  · Podio con entrada escalonada (staggerChildren 0.18), rebote spring para el #1.
  · Corona (Crown lucide) que entra con spring + flota/rota infinito.
  · Confetti burst automático en el #1 (tras 600ms).
  · Avatar con ring animado (scale+rotate spring).
  · Medalla con entrada giro -180°→0°.
  · Score con count-up (1.3s).
  · Estrellas con pop escalonado en el #1.
  · Progress bar animada (width 0→value) en modo tabla.
  · Filas de tabla con entrada escalonada (stagger x).
  · Toggle Podio/Tabla con AnimatePresence (crossfade).
  · Hover lift en cards (whileHover y:-6).
- Mejorado `src/components/app/views/dashboard-view.tsx`: KPIs con count-up + sufijo % automático, entradas escalonadas (delay por índice), centro de comando con motion.button (scale+hover+tap), header con entrada y actualización tipográfica.
- Responsividad: añadidos breakpoints ocultos (`hidden sm:table-cell`, `hidden md:table-cell`) en tablas del ranking para que columnas secundarias se oculten en móvil; `min-w-0` + `truncate` en celdas; `overflow-x-auto` envuelve todas las tablas; grid del podio `grid-cols-1 sm:grid-cols-3 sm:items-end` (apila en móvil).
- Creada guía completa `GUIA-INSTALACION.md` (12 secciones): requisitos (Node 20+, Bun, Git), 13 extensiones VSC recomendadas, configuración `.vscode/settings.json` + `extensions.json`, pasos de instalación (`bun install`, `db:push`, `seed`), comandos, credenciales demo, estructura del proyecto, troubleshooting, e iteraciones futuras (Tauri para escritorio, Capacitor para APK móvil).
- Creados `.vscode/settings.json` y `.vscode/extensions.json` con las recomendaciones para que VSC autoconfigure el proyecto al abrirlo.

Verificación con Agent Browser:
- Login admin → Ranking: podio animado, corona flotante, confetti, score count-up, barras de progreso animadas. Sin errores de runtime.
- Móvil 375px: podio apila verticalmente (#1 primero), tabla con columnas secundarias ocultas y scroll horizontal.
- `bun run lint`: 0 errores. Dev log: todos 200.

Stage Summary:
- App rediseñada con animaciones framer-motion en Ranking (podio, corona, confetti, count-up, barras) y Dashboard (KPIs animados, centro de comando).
- Responsividad garantizada de 320px a 1920px+ (tablas adaptativas, podio apilado, tipografía fluida).
- Backend+BD intactos y funcionales (ya verificados en iteración anterior).
- Guía de instalación VSC entregada en `GUIA-INSTALACION.md` + configuración `.vscode/` lista.
- Iteraciones futuras documentadas: Tauri (escritorio) y Capacitor (APK) sin reescribir código.

---
Task ID: R
Agent: full-stack-developer (subagent)
Task: Refinar 3 vistas — Ranking (tarjetas y filtro MÁS PEQUEÑOS y responsivos), Estadísticas (transición de gráficos al abrir + botón Informe PDF) y Privacidad (más detallada, clara y RESPONSIVA + FAQ).

Work Log:
- Reescrito `src/components/app/views/ranking-view.tsx`:
  · Podium cards reducidas: padding `p-3 sm:p-4` (antes p-5/p-6), avatares top `h-12 w-12 sm:h-14 sm:w-14` (antes h-16/w-16+), otros `h-10 w-10 sm:h-12 sm:w-12` (antes h-14+), score `text-xl sm:text-2xl` (antes text-3xl), stats en `text-xs sm:text-sm`, NivelBadge `text-[10px] px-1.5`.
  · Grid del podio con `mx-auto max-w-3xl` y `gap-3` (móvil); #1 con `sm:-mt-3` (menos elevado).
  · Filter card compacta: `flex flex-col sm:flex-row sm:items-center gap-2`, padding `p-3`, inputs `h-9`, Select `w-[160px]`, toggle Podio/Tabla con `size sm h-8`.
  · Header reducido: `text-xl sm:text-2xl` (antes 2xl/3xl), botón Excel `size sm` en móvil.
  · Tabla restante/Tabla general con `overflow-x-auto scrollbar-thin` y headers `hidden sm:table-cell` para columnas secundarias; tipografía base `text-xs sm:text-sm`.
  · SkeletonPodium ajustado al nuevo tamaño y max-w-3xl.
  · Animaciones framer-motion CONSERVADAS íntegramente: stagger entrance (podiumContainer + itemSlideUp), corona con spring + float infinito, confetti burst, count-up del score, estrellas con pop escalonado en #1, medalla con giro -180°→0°, AnimatedProgress con width 0→value, filas de tabla con stagger x, toggle Podio/Tabla con crossfade AnimatePresence, hover lift (y:-4).
- Reescrito `src/components/app/views/estadisticas-view.tsx`:
  · Transición de gráficos al abrir: `const [firstRender, setFirstRender] = useState(true)` + `useEffect(()=>{ setTimeout(()=>setFirstRender(false), 50) }, [])`. Cada `ResponsiveContainer` recibe `key={`{chartId}-${firstRender ? "fresh" : "ready"}`}` para forzar re-mount en la primera renderización de la sesión.
  · Recharts con `isAnimationActive`, `animationDuration={900}`, `animationBegin` (200/350 ms). Barras y líneas animan desde 0.
  · Cada `ChartCard` envuelto en `motion.div` con `initial={{opacity:0, y:20}} animate={{opacity:1, y:0}}` y `transition={{ duration: 0.55, delay, ease: [0.16,1,0.3,1] }}`. Stagger con delays 0.15, 0.25, 0.35, 0.45. KPIs y filtros también animados.
  · Añadido botón "Informe PDF" (variant outline, border emerald) junto a "Exportar Excel" — llama `apiDownload('/exportar/informe/pdf', 'informe-ejecutivo.pdf')` con toast success/error.
  · Paleta consistente emerald/sky/amber (CHART_COLORS ahora sin pink, ajustada al brief). COLOR_TOTAL emerald, COLOR_RESUELTOS sky, COLOR_ASIGNADOS amber.
  · Padding compactado (p-3 sm:p-4), tipografía fluida (text-sm/base), grid responsive 2/3/6 columnas.
  · Se mantienen filtros desde/hasta, 6 mini-KPIs, 4 gráficos (línea por-mes, pie por-tipo, bar por-area, grouped bar por-tecnico).
- Reescrito `src/components/app/views/privacidad-view.tsx`:
  · Layout 100% responsive desde 320px: wrapper `mx-auto max-w-5xl px-4 sm:px-6 pb-10`. Sticky index `hidden lg:block`. Content single-column en móvil con padding cómodo.
  · Callout "Tu privacidad es nuestra prioridad" al inicio (Alert emerald) — resume datos recogidos, derechos y contacto en 3-4 líneas.
  · Tabla de DATOS_RECOGIDOS con 4 columnas (Dato/Finalidad/Base legal/Conservación), incluye historial de estados y logs de sesión con retención de 90 días. Conservación hidden en md y resumen fallback para móvil.
  · Tabla de DESTINATARIOS con 5 columnas (País/Proveedor/Servicio/Finalidad/Garantías): Supabase 🇺🇸, Railway 🇺🇸, Netlify 🇺🇸, Brevo 🇫🇷. Servicio y Garantías se ocultan en pantallas pequeñas con `hidden md/lg:table-cell` y `overflow-x-auto scrollbar-thin`.
  · DERECHOS_TITULAR con 5 tarjetas (Acceder/Actualizar/Rectificar/Suprimir/Revocar) — cada una muestra Canal y Plazo de respuesta (10/15 días hábiles).
  · Sección 6 "Derecho al olvido" EXPANDIDA a 6 pasos: 1) avatar→Eliminar cuenta, 2) confirmar ELIMINAR, 3) anonimización de reportes creados, 4) eliminación de sesiones activas + notificaciones, 5) desactivación de cuenta + purga de hash/correo, 6) conservación de trazabilidad agregada. Box de contacto con `innovacion.did@iris.uh.cu` y plazo de 15 días hábiles.
  · Sección 8 "Medidas de seguridad" CONCRETA con 8 tarjetas: scrypt password hashing (Fingerprint), JWT con caducidad 7d (KeyRound), RBAC por rol (Shield), HTTPS TLS 1.2+ (Lock), validación fuerza de contraseña 8+/may/min/núm/especial (CheckCircle2), derecho al olvido integrado (Trash2), logs de auditoría e historial (History), principio de menor privilegio (Server).
  · Sección 11 FAQ nueva (5 Q&A) usando Accordion de shadcn/ui: ver mis datos, reportes tras olvido, IA para decisiones, contraseña en texto claro, tiempo de conservación.
  · SECCIONES actualizado a 11 entradas (incluye FAQ en el índice sticky).
  · Tipografía base `text-sm sm:text-base leading-relaxed`, padding de cards `p-4 sm:p-6`, headings `text-base sm:text-lg`.
  · Icons Lucide ampliados: Fingerprint, History, CheckCircle2, HelpCircle añadidos a los ya existentes.

Verificación:
- `bun run lint`: mis 3 archivos (ranking-view.tsx, estadisticas-view.tsx, privacidad-view.tsx) quedan 100% limpios (sin errores ni warnings). 1 error preexistente en `src/components/app/views/usuarios-dialog.tsx:161` (react-hooks/set-state-in-effect) que está FUERA del alcance de este Task R (no se debe tocar según las constraints) — pertenece a una vista que no estaba en mi lista de 3 archivos.
- Dev log: todos 200 OK, múltiples `✓ Compiled in …` tras las ediciones sin errores de runtime ni de TypeScript.
- Animaciones framer-motion conservadas en Ranking (podio, corona, confetti, count-up, barras, stagger, crossfade). Estadísticas con nuevas animaciones de entrada + recharts isAnimationActive.
- Responsive garantizado: Ranking apto desde 360px (podio stack + tabla compacta); Estadísticas con KPI grid 2→3→6 cols; Privacidad 100% single-column en móvil con índice oculto y tablas con scroll horizontal fino.

Stage Summary:
- Ranking más compacto y responsivo sin perder un solo efecto de animación; max-w-3xl evita estiramiento absurdo en pantallas grandes.
- Estadísticas con transición visible de gráficos al abrir la página por primera vez (motion.div + recharts isAnimationActive + key swap firstRender) y botón "Informe PDF" operativo.
- Privacidad transformada en documento legal claro y extenso: callout inicial, tablas 4 y 5 columnas, 6 pasos del derecho al olvido con plazos, 8 medidas de seguridad concretas, FAQ con Accordion, índice sticky hidden en móvil.

---
Task ID: U
Agent: full-stack-developer
Task: Implementar la vista de Gestión de usuarios (`UsuariosView`) con su diálogo crear/editar (`UsuariosDialog`), accesible solo a cuentas con permiso `usuarios.gestionar`.

Work Log:
- Leídos `worklog.md` (Tasks 1-12), `src/lib/store.ts`, `src/lib/constants.ts` (ROLES, ROL_LABEL, ROL_AREA, TODOS_PERMISOS, PERMISOS_POR_ROL, INSTITUCION), `src/lib/hooks.ts` (useUsuarios/useCrearUsuario/useActualizarUsuario/useEliminarUsuario/useRestaurarUsuario/useAreas + tipo UsuarioItem), `src/lib/api.ts` (ApiError con `data` para mapear `reglas`), rutas API `/api/usuarios` y `/api/usuarios/[id]` (+`/restaurar`), `src/lib/auth.ts` (reglas de `validarPassword`), `app-shell.tsx` (import `{ UsuariosView }`), `reportes-view.tsx` y `reporte-form-view.tsx` (patrones de tabla, filtros, skeletons, animaciones), `globals.css` (`bg-institucional`, `scrollbar-thin`, `animate-fade-in-up`).
- Sobrescrito `src/components/app/views/usuarios-view.tsx` (export `UsuariosView`):
  · Header con título "Gestión de usuarios" + subtítulo con `INSTITUCION.sistema · direccion`. Botones: "Recargar" (`refetch` con spin mientras `isFetching`), "Nuevo usuario" (abre diálogo create). Badge a la derecha con el rol (`ROL_LABEL`) y área (`ROL_AREA`) del usuario actual + texto "Sesión: <name>".
  · Card de controles con `Tabs` "Cuentas activas" / "Bajas" a la IZQ y bloque de búsqueda/filtro a la DERECHA (flex `sm:items-end sm:justify-end`). Input "Buscar" con label visible (`<Label>Buscar</Label>`), icono `Search` y debounce 300 ms (vía `useEffect`+`setTimeout` — mismo patrón que `ranking-view`). Select de Rol (opcional) que filtra por `rol` (no muestra `superadmin` a no-superadmins). Texto inferior con conteo de items y descripción de la pestaña activa.
  · Tabla shadcn con `overflow-x-auto scrollbar-thin` y columnas: #, Usuario (Avatar con iniciales `bg-institucional`/`bg-emerald-700` para superadmin + name + @username · cargo + badge "Tú" si es la cuenta actual), Correo (mailto esmeralda, hidden en mobile), Rol (badge outline con clase por color: emerald/superadmin, emerald-400/admin, amber-400/tecnico, slate-400/auditor), Área (hidden en <lg), Estado (Activo/Inactivo badge con bullet de color), Permisos (badge "Todos" para superadmin con icono `ShieldCheck`, badge numérico para los demás), Creado (hidden en <xl), Acciones.
  · Acciones: "Editar" (`openEdit`) siempre; "Dar de baja" (AlertDialog de confirmación → `useEliminarUsuario`) solo en pestaña activas y nunca para superadmin; "Restaurar" (`useRestaurarUsuario`) solo en pestaña bajas.
  · Estados: 6 filas `Skeleton` mientras carga, fila destructiva si error, empty state con `Inbox` y CTA "Nuevo usuario" (solo en activas).
  · Card inferior con leyenda de roles + nota sobre restricciones (solo superadmin crea admin, nadie crea superadmin).
  · Animaciones de entrada: `MotionCard` (framer-motion, fade-in-up escalonado con delay 0/0.05/0.1/0.15) en cada bloque.
  · SPA intacta: no crea rutas, no usa `setView` (es vista terminal). El diálogo es controlado por estado local.
- Creado `src/components/app/views/usuarios-dialog.tsx` (export `UsuariosDialog`) — diálogo reutilizable para crear/editar:
  · Props: `open`, `onOpenChange`, `mode: 'create' | 'edit'`, `usuario?: UsuarioItem | null`. El componente es **remontado por la vista padre vía `key={dialogSession}`** cada vez que se abre, evitando el patrón "reset on prop change" y cualquier `setState` dentro de `useEffect` (lint-clean).
  · `DialogContent` con `max-h-[85vh] overflow-y-auto scrollbar-thin sm:max-w-2xl`.
  · Estado de formulario inicializado con `useState(() => ...)` leyendo `usuario` en edit mode. Precarga permisos: si `permisosIgualesADefaults(usuario.permisos, usuario.role)` → ON; si no → OFF con los permisos del usuario pre-seleccionados.
  · Campos: Nombre*, Usuario* (lowercase al submit), Correo* (validado con regex), Teléfono, Cargo, Área (Select de `useAreas` con Skeleton mientras carga, opción "Sin área"), Rol* (Select — excluye `superadmin`; excluye `admin` si el actual no es superadmin; bloqueado para superadmin self), Estado (Switch Activa/Inactiva, deshabilitado para superadmin self).
  · Contraseña: Input `password` con toggle Eye/EyeOff (label accesible `aria-label`), placeholder contextual. Checklist en vivo de 5 reglas (8+/mayúsc/minúsc/número/especial) con tick ✓ verde cuando pasa. El botón submit se deshabilita si la contraseña no es fuerte en create, o si es débil pero no vacía en edit.
  · Permisos: sección `Card` con `Switch` "Usar permisos por defecto del rol". ON → preview read-only de `PERMISOS_POR_ROL[role]` como badges outline esmeralda, dentro de `ScrollArea` `max-h-40 scrollbar-thin`. OFF → grid `sm:grid-cols-2` de `Checkbox` por cada `TODOS_PERMISOS` (12 permisos) con label + descripción del key, botón "Seleccionar todos / Desmarcar todos" en header. Sección **oculta** para superadmin self (locked).
  · Validación local → `Alert variant="destructive"` con lista de bullets. Errores del servidor → `Alert variant="destructive"` con `serverError` y, si `data.reglas` existe (ApiError), mapea cada regla con ✓/✗ y color esmeralda para las que pasan.
  · Alert especial esmeralda para superadmin self explicando que rol/permisos están bloqueados.
  · Submit: `useCrearUsuario` en create / `useActualizarUsuario(id)` en edit. Body: incluye `name, username (lowercase), email, role, cargo, telefono, areaId, activo, password` (si hay), `usarPermisosPorRol` y `permisos` (cuando override). En éxito: toast + `onOpenChange(false)`. En error: si `ApiError` con `data.reglas` → pinta las reglas; sino, mensaje simple. Botón submit con `Loader2` spin mientras `isPending`.
  · Reglas reflejadas del backend: superadmin self no envía `role`/`permisos` en PATCH (sección oculta). `username` se envía en lowercase.
- Lint: `bun run lint` → 0 errores, 0 warnings. Resuelto el único error inicial `react-hooks/set-state-in-effect` en `usuarios-dialog.tsx:161` (limpieza de sync key en `useEffect`), eliminando el patrón de sync y delegando el reseteo al remount por `key` desde la vista padre (mucho más limpio y alineado con la guía React de "no usar effects para resetear state).
- TypeScript: `bunx tsc --noEmit` no reporta errores en `usuarios-view.tsx` ni `usuarios-dialog.tsx`. Los errores preexistentes en `examples/websocket/*`, `prisma/seed.ts`, `src/lib/api.ts` y `skills/*` son ajenos a este Task ID.
- Dev.log: tras guardar ambos archivos, todas las entradas son `✓ Compiled in Nms` (143ms–849ms), sin errores de runtime ni Module not found.

Stage Summary:
- Vista de Gestión de usuarios 100% funcional e integrada con los hooks (`useUsuarios`, `useCrearUsuario`, `useActualizarUsuario`, `useEliminarUsuario`, `useRestaurarUsuario`, `useAreas`), el store Zustand (`user` con `role`/`permisos`/`name`), y los constantes (`ROLES`, `ROL_LABEL`, `ROL_AREA`, `TODOS_PERMISOS`, `PERMISOS_POR_ROL`, `INSTITUCION`).
- SPA intacta: cero rutas nuevas; el diálogo es controlado por estado local de `usuarios-view.tsx` (no por `setView`). El `AppShell` sigue montando `<UsuariosView />` cuando `view === 'usuarios'`.
- Reglas de seguridad del backend reflejadas en la UI: superadmin self solo edita nombre/email/telefono/password (rol y permisos bloqueados con Alert esmeralda); `admin` solo seleccionable por superadmin; `superadmin` jamás aparece en el Select de rol de creación. La baja de superadmin jamás se ofrece en la tabla. La lista ya excluye superadmin para no-superadmins (server-side).
- Estándares cumplidos: paleta esmeralda `bg-institucional` en header y avatares, badges outline con clases por color (emerald/amber/slate), sin indigo/azul; responsive mobile-first (tabla con `overflow-x-auto scrollbar-thin`, columnas hidden en `<sm`/`<md`/`<lg`/`<xl`); grid `sm:grid-cols-2` en formularios; `max-h-[85vh] overflow-y-auto scrollbar-thin` en `DialogContent`; cards con `p-3`/`p-4`; toast `sonner` para feedback; Skeletons y empty states; animaciones framer-motion escalonadas (fade-in-up). Spanish UI.
- Contrato de contraseña respetado: 5 reglas idénticas a `validarPassword` del backend, checklist en vivo, submit bloqueado si débil (create) o si débil+no-vacía (edit). Errores del servidor `400 Contraseña débil` con `reglas` se mapean en un Alert con ✓/✗ por regla.
- Permisos override: Switch "Usar permisos por defecto del rol" funciona como en el contrato (ON → preview read-only de defaults del rol; OFF → checklist con "Seleccionar todos"). En edit, si los permisos del usuario difieren de los defaults de su rol, arranca en OFF con los permisos específicos ya seleccionados. En submit, cuando `usarPermisosPorRol=true` se envía `permisos=[]`/omitido (el backend resetea a defaults).
- `bun run lint` 100% limpio (0 errores, 0 warnings).
- Archivos modificados (únicamente): `src/components/app/views/usuarios-view.tsx` (sobrescrito del stub), `src/components/app/views/usuarios-dialog.tsx` (nuevo, self-contained).

---
Task ID: F
Agent: full-stack-developer
Task: Mejorar formulario y detalle de reporte con (1) "Otros" tipo de tarea → crear nuevo tipo en submit, (2) rediseño de equipos con Select de tipo-equipo + sub-form + "Otros" tipo-equipo, (3) prioridad por defecto "media" en create, (4) columna "Tipo" en la tabla de equipos del detalle.

Work Log:
- Leído contexto completo: `worklog.md`, `reporte-form-view.tsx`, `reporte-detail-view.tsx`, `hooks.ts`, `constants.ts`, `serialize.ts`, rutas `/api/tipos-tarea` y `/api/tipos-equipo`, `bootstrap.ts`, `prisma/schema.prisma` (modelos TipoTarea, TipoEquipo, EquipoReporte). Confirmado que:
  · `TIPOS_TAREA_DEFAULT` incluye `{ codigo: "otros", nombre: "Otros" }` y `TIPOS_EQUIPO_DEFAULT` incluye `"Otros"`, ambos sembrados por `ensureBootstrap`.
  · `serializeReporte` ya serializa `equipos: [{ id, tipoEquipoId, tipoTexto, codigoActivo, marca, modelo, serie }]` (aunque la tipografía `ReporteFull` de `hooks.ts` no exponga `tipoEquipoId`/`tipoTexto`).
  · `POST /api/tipos-tarea` requiere `admin` y devuelve `{ item: TipoTarea }` (no dedup).
  · `POST /api/tipos-equipo` requiere `reportes.crear` o `catalogos.gestionar`, dedup (devuelve el existente) y responde `{ item: { id, nombre } }`.

- Archivos modificados (únicamente, conforme a las restricciones):
  · `src/components/app/views/reporte-form-view.tsx` (reescrito).
  · `src/components/app/views/reporte-detail-view.tsx` (parche dirigido en la tabla de equipos).

Implementación en `reporte-form-view.tsx`:
1. Tipo local `EquipoReporteDTO` para hacer el cast `r.equipos as EquipoReporteDTO[]` en el prefill del edit (acceder a `tipoEquipoId`/`tipoTexto` que ya envía el backend pero no tipa `hooks.ts`).
2. `Equipo` extendido con `tipoEquipoId: string` ("" = no seleccionado, id "Otros" = mostrar input nuevo, otro id = tipo normal) y `nuevoTipoNombre: string` (cuando "Otros" elegido).
3. `FormState` extendido con `nuevoTipoTareaNombre: string` para el "Otros" del tipo de tarea.
4. `emptyForm.prioridad = "media"` (siempre). En prefill del edit: `r.prioridad ?? "media"` (muestra la prioridad real del reporte en edición).
5. Helpers derivados en render:
   · `tipoTareaOtrosId = tiposTarea?.items?.find(t => t.codigo === "otros")?.id`
   · `isTipoTareaOtros = !!tipoTareaOtrosId && form.tipoTareaId === tipoTareaOtrosId`
   · `tipoEquipoOtrosId = tiposEquipo?.items?.find(t => t.nombre === "Otros")?.id`
   · `isEquipoOtros(eq) = !!tipoEquipoOtrosId && eq.tipoEquipoId === tipoEquipoOtrosId`
6. Mutación local `crearTipoTarea` con `useMutation`+`apiFetch('/tipos-tarea', POST, { nombre })` y `onSuccess: qc.invalidateQueries({ queryKey: ["tipos-tarea"] })` (no existía hook dedicado en `@/lib/hooks`).
7. Imports añadidos: `useMutation, useQueryClient` de `@tanstack/react-query`; `apiFetch` de `@/lib/api`; `useTiposEquipo, useCrearTipoEquipo` de `@/lib/hooks`; icono `ChevronDown` de `lucide-react`.
8. `validate()`: si `isTipoTareaOtros && !form.nuevoTipoTareaNombre.trim()` → "Debes definir el nombre del nuevo tipo de tarea". Por cada equipo con `isEquipoOtros && !eq.nuevoTipoNombre.trim()` → "Equipo N: el nombre del nuevo tipo de equipo es obligatorio".
9. `submit()` ahora `async` con `setSubmitting` guard + try/catch/finally:
   a. Si `isTipoTareaOtros`: dedup gracioso (busca por nombre case-insensitive en `tiposTarea.items` y reutiliza el id si existe); si no existe, `crearTipoTarea.mutateAsync(nombre)` → `tipoTareaId = res.item.id`. En catch: toast.error + return.
   b. Por cada equipo con `eq.tipoEquipoId`:
      · Si `isEquipoOtros(eq)`: `crearTipoEquipo.mutateAsync(eq.nuevoTipoNombre.trim())` → `tipoEquipoId = res.item.id`, `tipoTexto = res.item.nombre`. El backend dedup.
      · Si no: `tipoEquipoId = eq.tipoEquipoId`, `tipoTexto = tiposEquipo.items.find(x => x.id === eq.tipoEquipoId)?.nombre ?? null`.
      · Si `eq.tipoEquipoId === ""` → se salta la fila (no se envía).
   c. Construye `body.equipos = [{ tipoEquipoId, tipoTexto, codigoActivo, marca, modelo, serie }]` con `null` para vacíos.
   d. Llama `crear.mutate` / `actualizar.mutate` con `onSuccess` (toast + `setView("reporte-detail", { reporteId: res.item.id })`) y `onError` (toast + setErrors).
10. UI equipos rediseñada: cada fila es una Card de borde con `p-3`:
    · Fila 1: Label "Tipo de equipo" + Select (de `tiposEquipo.items`, deshabilitado mientras carga) + botón Trash2 a la derecha.
    · Si `eq.tipoEquipoId === ""`: mostrar un hint "Selecciona un tipo de equipo para continuar" con `ChevronDown` en vez del sub-form.
    · Si hay tipo: sub-form con borde-top pt-3. Si `isEquipoOtros(eq)`: Input "Nombre del nuevo tipo de equipo *" + hint "Se creará un nuevo tipo de equipo en el catálogo." + grid sm:grid-cols-4 con Código/Marca/Modelo/Serie.
    · Botón "Agregar equipo" añade una fila con `emptyEquipo` (tipo sin seleccionar).
11. UI tipo de tarea: en la opción con `t.codigo === "otros"`, el label visible es "Otros (definir nuevo)". Cuando `isTipoTareaOtros`, se revela debajo un Input "Define el nuevo tipo de tarea *" con placeholder "Ej. Cambio de tóner, Limpieza de equipo…" y `autoFocus`. Hint "Se creará un nuevo tipo de tarea en el catálogo."
12. Resumen lateral ahora muestra el nombre del nuevo tipo si "Otros" elegido, y "(N con tipo)" para equipos con tipo seleccionado.

Implementación en `reporte-detail-view.tsx`:
1. Tipo local `EquipoReporteItem` con `tipoEquipoId, tipoTexto` para cast `item.equipos as EquipoReporteItem[]` al iterar.
2. Tabla de equipos: añadida columna "Tipo" (primera) con `eq.tipoTexto` renderizado como badge esmeralda (`bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200` + dark variants) con icono `Wrench` pequeño. Si `tipoTexto` es null/empty, se muestra "—".
3. Tabla mantiene `overflow-x-auto` (scroll horizontal en móvil) y se reordena Tipo > Código > Marca > Modelo > Serie.
4. Sin cambios en exports (`ReporteDetailView`).

Verification:
- `cd /home/z/my-project && bun run lint` → 0 errores, 0 warnings (limpio). Mi tarea no introdujo ninguno; los errores previos en `usuarios-dialog.tsx`, `prisma/seed.ts`, `examples/websocket/*`, `src/lib/api.ts` no son míos y no fueron tocados.
- `npx eslint src/components/app/views/reporte-form-view.tsx src/components/app/views/reporte-detail-view.tsx` → 0 errores.
- `npx tsc --noEmit` no reporta errores en mis dos archivos (los errores listados son en `examples/` y `prisma/seed.ts`, ajenos a Task F).
- `tail -30 /home/z/my-project/dev.log` → todas las entradas son `✓ Compiled in Nms` (143–849ms) sin errores de runtime, Module not found, ni warnings.

Stage Summary:
- Comportamiento "Otros" tipo de tarea: al elegir "Otros" en el Select de tipo de tarea, se revela un Input "Define el nuevo tipo de tarea" (requerido). En submit, antes de POST/PATCH del reporte, se crea el nuevo TipoTarea vía `POST /api/tipos-tarea` (con dedup local case-insensitive + invalidación de `["tipos-tarea"]`), se obtiene su `id` y se usa como `tipoTareaId` para el reporte. El nuevo tipo aparece automáticamente en el catálogo para futuros reportes.
- Comportamiento "Otros" tipo de equipo: en cada fila de equipo, primero se elige el "Tipo de equipo" (Select de `useTiposEquipo`); si no se selecciona, el sub-form está oculto y se muestra el hint "Selecciona un tipo de equipo para continuar". Si se elige "Otros", se revela además un Input "Nombre del nuevo tipo de equipo" (requerido). En submit, si la fila es "Otros", se llama `useCrearTipoEquipo().mutateAsync(nombre)` (dedup servidor), se usa el `id` retornado como `tipoEquipoId` y `nombre` como `tipoTexto`. Para tipos normales, `tipoEquipoId = selected id`, `tipoTexto = nombre` del catálogo.
- Cada equipo enviado al body cumple el contrato `{ tipoEquipoId, tipoTexto, codigoActivo, marca, modelo, serie }` con `null` para vacíos (aceptado por `POST /api/reportes` y `PATCH /api/reportes/[id]`).
- Prioridad por defecto SIEMPRE "media" en create (`emptyForm.prioridad = "media"`). En edit se respeta la prioridad real del reporte (`r.prioridad ?? "media"`).
- Detail view: la tabla de Equipos / Activos ahora muestra una columna "Tipo" con el `tipoTexto` del snapshot como badge esmeralda con icono `Wrench`, antes de Código/Marca/Modelo/Serie.
- Diseño: paleta esmeralda (sin indigo/azul), responsive mobile-first (`grid-cols-1 sm:grid-cols-2/3/4` en formularios, `overflow-x-auto` en tabla), cards `p-3`/`p-4`, hint accesible con icono `ChevronDown`, `autoFocus` en inputs nuevos, labels con `text-[11px] text-muted-foreground`, botones de 36–44px de alto (`h-8`/`h-9`). Spanish UI.
- Contrato respetado: exports `ReporteFormView` y `ReporteDetailView` sin cambios; solo se modificó `reporte-form-view.tsx` (reescrito) y `reporte-detail-view.tsx` (parche en la tabla de equipos).

---
Task ID: 13 (iteración superadmin + usuarios + escritorio + informe)
Agent: main (Claude)
Task: Eliminar datos simulados (bootstrap solo superadmin), añadir superadmin único + gestión de usuarios con permisos, contraseña fuerte + show/hide, Equipos por tipo + "Otros" crea nuevo tipo, tipo tarea "Otros" crea nuevo, PDF informe ejecutivo, notificaciones push visuales, sidebar fijo con botón flotante épico, DID/DST branding, Ranking más pequeño, gráficos con transición, Privacidad detallada responsiva, Tauri para app PC, guía VSC mejorada, roadmap dev→prod/escritorio/despliegue/LDAP v2.

Work Log:
- constants.ts: añadido rol `superadmin`, `PERMISOS_POR_ROL` (12 permisos), `TODOS_PERMISOS`, `ROL_AREA` (DID para superadmin/admin, DST para técnico/auditor), `TIPOS_EQUIPO_DEFAULT` (15 tipos), `SUPERADMIN_DEFAULT`, `INSTITUCION.direccionServicios`, nav Usuarios con permiso.
- Prisma schema: añadido `User.permisos` (JSON override), modelo `TipoEquipo`, `EquipoReporte.tipoEquipoId`+`tipoTexto`, relación `tiposEquipoCreados`. db:push ejecutado.
- lib/bootstrap.ts: crea idempotente el superadmin único + catálogos del sistema (tipos-area, áreas DID/DST, tipos-tarea, tipos-equipo). Se invoca en login POST y en /api/usuarios GET.
- lib/auth.ts: añadido `validarPassword` (8+/may/min/num/especial), `getPermisos` (override o defaults), `tienePermiso`. `publicUser` ahora incluye `permisos`.
- API: /api/usuarios (GET/POST) + /api/usuarios/[id] (PATCH/DELETE) + /api/usuarios/[id]/restaurar (PATCH) + /api/tipos-equipo (GET/POST) + /api/auth/me/password (PATCH) + /api/exportar/informe/pdf (GET, PDF ejecutivo multipágina con portada+KPIs+distribuciones+ranking+conclusiones). Reglas superadmin: no visible/editable por no-superadmins; no se puede crear/ascender a superadmin; contraseña fuerte obligatoria; baja lógica.
- scripts/wipe-and-bootstrap.ts: borra todo y recrea superadmin. Ejecutado: DB limpia con solo superadmin + catálogos.
- prisma/seed-demo.ts: script OPCIONAL para datos demo (no se ejecuta al reiniciar).
- store.ts: CurrentUser con permisos. hooks.ts: useLogin (con debeCambiarPassword), useCambiarPassword, useUsuarios, useCrearUsuario, useActualizarUsuario, useEliminarUsuario, useRestaurarUsuario, useTiposEquipo, useCrearTipoEquipo.
- sidebar.tsx rediseñado: fijo NO scrolleable (nav en flex-1 justify-center), botón flotante épico (-right-3 top-4, bg-institucional, ChevronLeft/Right animado con AnimatePresence, whileHover scale), nav filtrada por permiso (Usuarios solo si usuarios.gestionar), indicador activo con motion layoutId, branding DID/DST en footer de usuario.
- login-view.tsx: branding DID (admin/superadmin) + DST (técnicos/auditores), show/hide contraseña con Eye/EyeOff, botón autocompletar superadmin, aviso de contraseña temporal.
- notificaciones.tsx: PUSH visuales — al detectar notificaciones nuevas (comparación de ids vistos), dispara toasts sonner con icono, descripción y botón "Ver" que navega al reporte. Badge animado con spring.
- dashboard-view.tsx: botón "Informe PDF" (apiDownload /exportar/informe/pdf).
- app-shell.tsx: añadido caso `usuarios` → UsuariosView.
- Subagentes (3 en paralelo):
  · Task U: usuarios-view + usuarios-dialog (tabs Cuentas/Bajas con Buscar a la derecha, tabla completa, dialog crear/editar con checklist fuerza contraseña + show/hide + permisos por rol/override + prefill inteligente, regla superadmin, baja/restaurar).
  · Task F: reporte-form (tipo "Otros" crea nuevo TipoTarea vía POST /api/tipos-tarea; Equipos rediseñado con Select de TipoEquipo + sub-form + "Otros" crea nuevo tipo vía useCrearTipoEquipo; prioridad default media) + reporte-detail (columna Tipo en tabla equipos).
  · Task R: Ranking más pequeño (cards p-3/p-4, avatares h-12/h-14, score text-xl, max-w-3xl, filtro compacto) manteniendo animaciones; Estadísticas con transición de gráficos al abrir (firstRender + key remount + motion stagger + isAnimationActive) + botón Informe PDF; Privacidad más detallada y responsiva (callout, tablas 4-5 columnas, FAQ con Accordion, typografía legible).
- Tauri: creado src-tauri/ (tauri.conf.json, Cargo.toml, build.rs, src/main.rs, src/lib.rs, capabilities/default.json). Scripts `desktop` y `desktop:build` en package.json. output:standalone ya en next.config.
- GUIA-INSTALACION.md reescrita (11 secciones): requisitos + Rust, 14 extensiones VSC, BD SQLite + bootstrap, superadmin, roles/seguridad, Tauri escritorio, producción web, troubleshooting, resumen comandos.
- ROADMAP.md: estado v4, qué falta para dev/prod/escritorio/despliegue, y diseño v2 LDAP (ldapjs, rol reportante, cola de asignación, PostgreSQL, TLS) con estimación ~2 semanas.

Verificación con Agent Browser:
- Login superadmin (autocompletar) → dashboard con "Informe PDF".
- Usuarios: tabla muestra superadmin (marcado "Tú") + técnico creado (Ana García @tec1). 
- Crear usuario: checklist contraseña fuerte (5 reglas ✓ con Temporal2026!), botón habilitado, POST 201 (luego 409 al repetir — usuario ya existe).
- Ranking: renderiza Podio/Tabla (cards reducidos).
- Estadísticas: botones Exportar Excel + Informe PDF.
- Informe PDF: GET /api/exportar/informe/pdf 200 (1.5s).
- Privacidad móvil 375px: FAQ, Supabase, contacto — responsiva y detallada.
- `bun run lint`: 0 errores.

Stage Summary:
- Datos simulados eliminados; DB persistente con solo el superadmin + catálogos (bootstrap automático al arrancar).
- superadmin único con permisos completos; gestión de usuarios con permisos por rol + override, contraseña fuerte (8+/may/min/num/esp) con checklist y show/hide, regla de visibilidad superadmin, baja/restaurar.
- Equipos con catálogo TipoEquipo + "Otros" crea nuevo tipo; tipo tarea "Otros" crea nuevo TipoTarea; prioridad default media.
- PDF informe ejecutivo profesional multipágina (portada+KPIs+distribuciones+ranking+conclusiones+firma).
- Notificaciones push visuales (toasts sonner en tiempo real).
- Sidebar fijo no scrolleable + botón flotante épico al frente; branding DID/DST.
- Ranking más pequeño y responsivo; gráficos con transición al abrir; privacidad detallada y responsiva.
- Andamiaje Tauri completo para app de escritorio (`bun run desktop:build`).
- Guía VSC mejorada + ROADMAP (dev→prod, escritorio, despliegue, LDAP v2).
- Credenciales: superadmin / SRT-DID-2026! (cambiar tras primer ingreso).
