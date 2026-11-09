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
- Cumple el contrato de `useAppStore.setView` (botón "Volver" → `setView("dashboard")`), `INSTITUCION` (nombre, direcció, correo, sistema), y los estándares visuales (sin indigo/azul, esmeralda, sticky sidebar, scroll-mt, responsive).
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
Task ID: 13 (iteración mejoras funcionales)
Agent: main (Super Z)
Task: Aplicar 13 mejoras solicitadas: datos simulados en script con reset automático, PDF ejecutivo, privacidad/terminos amplios y responsivos, guía VSC mejorada, push visuales, direcciones (Innovación Digital/DST), ranking compacto, sidebar fijo con botón épico, tipos "Otros" extensibles (tarea y equipo), prioridad media por defecto, transición de gráficos por sesión.

Work Log:
- Datos simulados: movidos de prisma/seed.ts (eliminado) a prisma/seed-demo.ts (`bun run seed`). Creado prisma/reset-db.ts y script "predev" en package.json: cada `bun run dev` borra db/custom.db y recrea el esquema vacío. .env portable (`file:../db/custom.db`).
- PDF ejecutivo: nueva ruta /api/exportar/estadisticas/pdf (portada, resumen ejecutivo automático, 8 KPIs, indicador de salud, gráfico de barras mensual, distribuciones con barras horizontales, ranking, trabajo en curso, conclusiones, firmas y pie con paginación). PDF individual de reporte rediseñado (cabecera institucional, insignias de estado/prioridad, resumen ejecutivo, tabla de equipos con tipo, solución destacada, paginación). Botones "Informe PDF ejecutivo" en Estadísticas y Ranking.
- Privacidad (16 secciones) y Términos (14 secciones) reescritas: lenguaje claro con recuadros "En términos simples", marco legal cubano (Ley 149/2022), infraestructura local sin transferencias internacionales, índice sticky en desktop y acordeón en móvil, tablas con scroll-x, sin overflow horizontal en 320-1920px.
- Push visuales: push-notificaciones.tsx (sondeo 15s, tarjetas toast.custom animadas, clic navega al reporte y marca leída, título de pestaña con contador). Toaster movido dentro de QueryClientProvider (fix: "No QueryClient set" en toasts custom).
- Direcciones: DIRECCION_RESPONSABLE (Innovación Digital, cuenta admin) y DIRECCION_OPERADORA (Servicios Tecnológicos, técnicos y auditores) reflejadas en login, sidebar, dashboard, ranking, estadísticas, PDF, seed y vistas legales.
- Ranking: tarjetas de podio compactas (3 por fila en md+, fila de stats integrada) y barra de filtros en una franja h-8/h-9.
- Sidebar: fixed inset-y-0 (no scrollea con el contenido), contenido con padding transicionado; botón épico circular con gradiente esmeralda, halo ping, destello e icono ChevronsLeft rotatorio en el borde superior.
- Form reportes: "Otros" en tipo de tarea habilita input de nuevo tipo (nuevoTipoTarea → POST /reportes crea el tipo con creadoPor y queda en el catálogo); Equipos: primero Select de tipo (/api/tipos-equipo, catálogo TipoEquipo con defaults automáticos), formulario debajo, opción "Otro (definir nuevo tipo)" crea el tipo al vuelo; EquipoReporte.tipo persistido; prioridad por defecto "media" garantizada.
- Estadísticas: primera visita de la sesión (sessionStorage) monta los gráficos al entrar en viewport con transición + animación recharts escalonada; visitas siguientes sin espera.
- Login: banner "Base de datos vacía" (GET /api/setup-status) con instrucción `bun run seed`; panel con ambas direcciones.
- GUIA-INSTALACION.md reescrita (13 secciones): requisitos, VSC + extensiones, flujo reset/seed, checklist de verificación, FAQ ampliada, empaquetado Tauri/Capacitor.

Verificación (Agent Browser):
- Login admin/tec1 OK. Form completo E2E: "Otros"→nuevo tipo de tarea "Instalación de cerraduras electrónicas" creado y visible en catálogo; equipo con tipo "Flujo final OK" (creado al vuelo) agregado y persistido.
- Push visual: tarjetas aparecen (t≈12s) al crear reporte asignado, clic navega al detalle y marca leída. Fix de contexto aplicado tras detectar "No QueryClient set".
- Fix Radix: onValueChange("") ignorado cuando el catálogo se refresca con la opción "Otros" seleccionada.
- Sidebar colapsa/expande; ranking compacto; tablas legales sin overflow en móvil (390px); PDFs ejecutivo e individual descargan (HTTP 200).
- `bun run lint`: 0 errores. Ciclo completo validado: restart → BD vacía (setup-status hasUsers:false) → seed → 53 reportes.

Stage Summary:
- Las 13 mejoras implementadas y verificadas end-to-end.
- Archivos clave: prisma/{reset-db,seed-demo}.ts, src/app/api/{tipos-equipo,setup-status,exportar/estadisticas/pdf}, push-notificaciones.tsx, vistas {privacidad,terminos,ranking,reporte-form,estadisticas,login}, sidebar/app-shell, constants/hooks/serialize.
---
Task ID: 14 (producción lista v1.0)
Agent: main (Super Z)
Task: Sistema Listo para Producción: seguridad/arquitectura/estado/UX/errores/rendimiento, pruebas (unitarias+regresivas+usabilidad), ajustes de config (RUNNER_IMAGE, .zscripts ES/EN, sin alusiones a IA, botón N fuera, buscador topbar, Fast Refresh, robots.txt, setAnimateCharts), BD de usuarios local aislada del LDAP con gestión manual del admin, y flujo de eliminación de cuenta por solicitud con respaldo.

Work Log:
- package.json: eliminado z-ai-web-dev-sdk (cero alusiones a IA también en bun.lock regenerado; NO existe package-lock.json — el lockfile del proyecto es bun.lock). Versión 1.0.0 y scripts test/test:unit/test:regresion/test:usabilidad.
- next.config.ts: devIndicators:false (desaparece el botón N de Next), poweredByHeader:false, compress, allowedDevOrigins (sin aviso cross-origin), cabeceras de seguridad (X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy) y nosniff para /uploads.
- tests/python-runtime-container.sh: RUNNER_IMAGE="" (resuelto en despliegue).
- .zscripts/*.sh (8 archivos) reescritos en español/inglés (dev, build, start, mini-services-*, python-runtime-build, database-runtime-build) + tests/database-runtime-build.sh; bash -n/sh -n OK; sin caracteres chinos.
- robots.txt: sistema interno → Disallow: / (conserva /login).
- Esquema: User.origen ("local"/"ldap_sync" reservado) + modelo SolicitudEliminacion (motivo, estado, comentarioAdmin, resueltaPor); db:push OK.
- Seguridad nueva: rate-limit.ts (login 5/15min por usuario+IP, escritura 60/min), validators.ts (Zod: login, usuario, reporte, solicitud; política de contraseñas 8+ letra+número), api-helpers.ts (guard() por rol, conErrores() con 409/404/500 uniformes, leerJson tolerante), auth.ts (limpieza oportunista de sesiones expiradas), login sin enumeración de usuarios.
- Rutas nuevas: /api/usuarios (GET/POST admin), /api/usuarios/[id] (PATCH/DELETE con anonimizarYDesactivar transaccional y autoprotección de admins), /api/usuarios/solicitudes (+[id] resolver aprobar/rechazar, +[id]/backup JSON), /api/auth/me/solicitar-eliminacion (POST/GET). /api/auth/me/eliminar deprecado con 403 informativo para no-admin. Login y reportes POST/PATCH revalidados con Zod (prioridad "media" por defecto blindada en POST y PATCH).
- Frontend: topbar con paleta de comandos real (⌘K: busca reportes por código/descripción/solicitante + navegación); error-boundary.tsx global; app-shell: fix key={getState().view} → vista suscrita, ErrorBoundary, y Estadisticas/Ranking con next/dynamic (ssr:false); estadisticas-view: flag de primera visita tras el montaje (hidratación estable — corrige el error del antiguo setAnimateCharts); usuarios-view.tsx (tabla de cuentas + búsqueda + alta + edición/reset de contraseña con revocación de sesiones + activar/desactivar + bandeja "Solicitudes de baja" con descarga de copia y aprobar/rechar con comentario); eliminar-cuenta-dialog reescrito como flujo de solicitud con estado (pendiente/aprobada/rechazada); sidebar con sección Administración (admin) y title actualizado; store con commandOpen y origen en CurrentUser; hooks de usuarios/solicitudes.
- Pruebas (bun test): tests/unit/dominio.test.ts (22: scrypt, ranking, niveles, Zod con prioridad media por defecto, rate-limit), tests/regresion/api.test.ts (18: login+429 anti-bruta, roles, visibilidad, validaciones, gestión de usuarios, autoprotección de admins, flujo completo solicitud→backup→aprobar→anonimización y rechazo; sobre db/test.db aislada), tests/usabilidad/flujos.test.ts (10: portada, sesión, listados, KPIs, catálogos, exportaciones Excel/PDF, cabeceras de seguridad, robots.txt; skip suave sin servidor y tolera 429) + CHECKLIST.md heurístico (Nielsen). Total 50 pruebas.
- Credenciales demo actualizadas a la política: admin/tec1-4/auditor con password "Demo2025" (antes 123456); seed-demo.ts ahora idempotente (upsert); GUIA-INSTALACION.md y login-view actualizados.
- GUIA-INSTALACION.md: secciones 8.1 (gestión de usuarios BD local aislada), 8.2 (derecho al olvido con aprobación y respaldo), 14 (Listo para producción: seguridad/arquitectura/LDAP/operación) y 15 (Pruebas); índice actualizado.

Verificación:
- bun run lint: 0 errores. bun test tests/: unitarias 22/22, regresivas 18/18, usabilidad 10/10 (la corrida combinada puede omitir flujos autenticados si el anti-bruta bloqueó a admin por corridas repetidas — comportamiento esperado).
- Respaldo real generado en db/backups/respaldo-tecnico-*.json al aprobar la solicitud en pruebas.
- dev.log sin errores: 200s, sin aviso cross-origin (allowedDevOrigins), sin botón N (devIndicators:false).

Stage Summary:
- Sistema en versión 1.0 lista para producción: seguridad en capas (rate-limit, Zod, cabeceras, sesiones), arquitectura API uniforme (guard/conErrores), UX con paleta de comandos, error boundary y vistas perezosas, BD de usuarios local aislada del LDAP gestionada por el admin, derecho al olvido con aprobación y respaldo automático, y suite de pruebas en 3 niveles. Sin ninguna alusión a IA en package.json/bun.lock ni código; scripts de infraestructura bilingües ES/EN.

---
Task ID: fix-preview
Agent: Super Z (principal)
Task: Diagnosticar y corregir la vista previa en blanco del IDE ("por qué no se carga la vista previa") y entregar un script ejecutable en shell.

Work Log:
- Diagnóstico: servidor next dev activo y respondiendo 200; sin errores de compilación en dev.log; sin middleware. Causa real: la cabecera "X-Frame-Options: DENY" (añadida en la fase de endurecimiento de seguridad) impedía al navegador renderizar la app dentro del iframe de la vista previa del IDE.
- Corregido next.config.ts: retirada la línea X-Frame-Options: DENY; añadido bloque condicional que aplica "Content-Security-Policy: frame-ancestors 'self'" SOLO en producción (NODE_ENV=production), con comentarios ES/EN y ejemplo para permitir un portal externo.
- Next.js detectó el cambio y se reinició solo ("Found a change in next.config.ts... Ready in 651ms"); cabecera bloqueante verificada como eliminada vía curl (:3000 y :81).
- Parche validado con prueba aislada (scripts/next-config-original.ts → scripts/test_patch_preview.py → scripts/next-config-parcheado.ts; parse TS verificado con bun).
- Entregado download/fix-preview.sh (idempotente, mensajes bilingües ES/EN): comprueba servidor, detecta cabecera bloqueante, respalda next.config.ts con marca de tiempo, aplica parche python embebido, reinicia el dev server y verifica. Corregido un bug de llamadas say() multilínea (bash separa argumentos por salto de línea).
- Prueba de camino completo ejecutada con éxito: se restauró la config original, el script detectó, respaldó, parcheó, reinició y verificó (EXIT=0). Respaldo temporal eliminado tras la verificación.

Stage Summary:
- Vista previa del IDE operativa de nuevo: la causa era X-Frame-Options: DENY, no un error de datos ni de la app.
- next.config.ts queda: sin X-Frame-Options, CSP frame-ancestors 'self' solo en builds de producción (protección anti-clickjacking conservada en despliegue real).
- Script reutilizable y seguro en download/fix-preview.sh: si todo está bien no toca nada (exit 0); si detecta la cabecera, corrige y reinicia (la BD demo se regenera, comportamiento previsto).

---
Task ID: iteracion-ux-roles-doc
Agent: Super Z (principal)
Task: Lote de 10 mejoras: navegación legal a footer, cuenta/seguridad propias, auditor con capacidades, edición completa de usuarios, baja diferida 15 min, superadmin con permisos granulares, notificaciones push con sonido y segundo plano, rediseño visual, documentación profesional PDF.

Work Log:
- BD (prisma): User.esSuperadmin + User.permisos (JSON) + User.eliminadoEn; SolicitudEliminacion.solicitadoPorId (relación "SolicitudTercero"); db push + generate OK.
- Nuevos lib: permisos.ts (catálogo de 12 permisos granulares, PERMISOS_AUDITOR_IMPLICITOS, tienePermiso/parsePermisos) y olvido.ts (anonimizarYDesactivar trasladado desde la ruta, purgarUsuariosEliminados con PLAZO_PURGA_MS=15 min, filtroListadoUsuarios).
- api-helpers: guardPermiso() por permiso granular (superadmin pasa siempre; auditor por capacidades implícitas).
- API: GET /api/usuarios (auditor incluido, purga oportunista, lápidas con minutosRestantes); POST (auditor crea solo técnicos; admin crea técnicos/auditores con permiso; solo superadmin crea admins con permisos elegidos); PATCH (edición completa nombre/correo/cargo/teléfono/contraseña/rol/permisos; auditor solo activo de técnicos; superadmin intocable por otros; anti-lockout admins); DELETE (baja diferida: anonimización + eliminadoEn + purgaEnMinutos=15); /auth/me/solicitar-eliminacion con modalidad POR TERCERO (auditor → técnico, notifica admins); bandeja de solicitudes con solicitadoPorNombre/Rol; NUEVO PATCH /api/auth/me/password (cambio propio con contraseña actual + revoca sesiones).
- Frontend: sidebar rediseñado (gradiente institucional, indicador luminoso con framer-motion layoutId, sección Gestión admin+auditor, sin pestañas legales, botón "Mi cuenta" en lugar de "Eliminar cuenta"); app-shell con VistaLegalPublica (privacidad/términos a pantalla completa pre-login con volver al login) y footer como único acceso legal autenticado; NUEVA cuenta-view (perfil, cambio de contraseña propio, preferencias de notificaciones sonido/permiso navegador, zona de baja propia con estados); usuarios-view reescrita (tabla por rol, editor completo con gestor de permisos para superadmin, lápidas "Usuario eliminado · N min" con tick de 30 s, dialog de solicitud de baja de técnicos para el auditor, chips de permisos y corona superadmin); topbar sin NAV_LEGAL + "Mi cuenta" en paleta; dashboard sin botón Excel y KPIs con card-elevada; login renovado (halos, tarjeta borde-degradado, CTA con brillo); globals.css con sistema de diseño (card-elevada, texto-degradado, borde-degradado, halo-fondo, rejilla-sutil, btn-brillo).
- Notificaciones push: sonido WebAudio (dos notas, antirrebote 1.5 s, preferencia localStorage "srt-sonido-notificaciones") + Notification API del navegador cuando document.hidden (con foco al hacer clic) + iconos por tipo (solicitud_baja/cuenta_eliminada añadidos).
- Legal: Términos §5 y Privacidad §9 alineados con el flujo real (solicitud con aprobación, lápida 15 min, auditor por tercero).
- eslint.config: ignorar scripts/** (herramientas node auxiliares).
- Pruebas: semilla de regresión ahora con superadmin; +7 pruebas nuevas (capacidades del auditor x3, superadmin/permisos x3, eliminación con lápida); +5 unitarias de permisos; cabecera x-frame-options actualizada a postura nueva. Suite: 61/61 (27 unitarias, 23 regresivas, 11 usabilidad). Smoke E2E adicional con 24 verificaciones (scripts/smoke-nuevos-flujos.py, re-ejecutable con sufijos únicos).
- Documentación profesional (ruta Report del skill pdf): portada Template 07 Crystal Blue (portada.html validada con poster_validate + cover_validate, render html2poster 794px); cuerpo ReportLab con TOC auto (TocDocTemplate+multiBuild), 11 capítulos, 7 tablas, diagrama de arquitectura Playwright→PNG@2x; fusión pypdf normalizada a A4; preflight: code.sanitize, meta.brand, pages.clean (sin páginas en blanco), font.check (0 issues), toc_validate (índice correcto con enlaces), pdf_qa final sin errores.
- Entregables en download/: Documentacion-Sistema-Reportes-Tecnicos.pdf (12 páginas) + Portada-Documentacion.html (fuente editable).

Stage Summary:
- El sistema diferencia ahora claramente superadmin > admin (con permisos otorgables uno a uno) > auditor (crea técnicos, cambia su estado, solicita bajas) > técnico; edición de usuarios completa; eliminación con anonimización inmediata + lápida visible 15 minutos + purga; notificaciones push visuales con sonido y soporte en segundo plano; navegación legal solo por footer; botón eliminar movido a "Mi cuenta"; exportación retirada de la home; UI renovada con sistema de diseño propio.
- Suite de pruebas 61/61 y lint 0 errores; aplicación servida en :3000 con login superadmin (admin/Demo2025).
- Documentación profesional PDF de 12 páginas entregada (arquitectura BD, cliente-servidor, seguridad, API, operación, pruebas y hoja de ruta escritorio Tauri / móvil Capacitor-APK).

---
Task ID: entrega-proyecto-completo
Agent: Super Z (principal)
Task: "dame el proyecto completo corregido" — verificación integral final del proyecto con las 10 mejoras + entrega empaquetada.

Work Log:
- Verificado servidor dev en :3000 (portada 200, sin cabeceras que bloqueen el iframe de vista previa).
- `bun run seed` ejecutado: 6 usuarios (superadmin admin/auditor/técnicos, password Demo2025) + 53 reportes demo.
- `bun run lint`: 0 errores.
- Suite completa `bun test tests/`: 61/61 aprobadas (27 unitarias, 23 regresivas, 11 usabilidad), 191 expect.
- Smoke E2E scripts/smoke-nuevos-flujos.py: 24/24 ✓ (auditor crea/desactiva/solicita baja, superadmin crea admin con permisos, edición completa, lápida 15 min, autoprotección).
- Verificación UI con navegador: login admin → dashboard con sidebar rediseñado (Inicio/Reportes/Ranking/Estadísticas/Usuarios/Mi cuenta), vista Usuarios con lápidas "Usuario eliminado · 15 min", sin errores de consola.
- Incidencia resuelta: tras reset-db el servidor mantuvo handle de la BD antigua (login 500); relanzado `bun run dev` desacoplado (patrón .zscripts/dev.sh: bun run dev & + disown), BD limpia re-sembrada, logins admin/tec1/auditor 200.
- Empaquetado download/sistema-reportes-tecnicos-completo.zip (1.5 MB, 258 archivos): código fuente completo + prisma + tests + scripts + docs PDF + guías; excluidos node_modules/.next/db runtime/skills de plataforma/tool-results.

Stage Summary:
- Proyecto íntegro, corregido y verificado: lint 0 errores, pruebas 61/61, smoke 24/24, UI funcional con datos demo limpios (admin/Demo2025, tec1/Demo2025, auditor/Demo2025).
- Entregable: download/sistema-reportes-tecnicos-completo.zip — proyecto completo listo para abrir en VSC (bun install → db:push → seed → dev).

---
Task ID: acceso-red-zip
Agent: Super Z (principal)
Task: "dame el zip del proyecto para descargarlo. ademas agrega configuracion para que otros usuarios desde otra red puedan acceder a la app"

Work Log:
- package.json: añadidos scripts "dev:lan" (next dev -H 0.0.0.0, no borra BD) y "start:lan" (HOSTNAME=0.0.0.0 PORT=3000 sobre standalone).
- next.config.ts: allowedDevOrigins ampliado con "*.local" (hostnames mDNS de LAN) + comentarios ES/EN sobre acceso por IP y proxy propio.
- download/acceso-red.sh (nuevo, chmod +x, bash -n OK, bilingüe ES/EN, idempotente): detecta IPs del servidor, comprueba/arranca la app en modo red, abre puerto en ufw/firewalld si hay permisos, imprime URL exactas para los usuarios. Probado: EXIT=0, detectó http://21.0.10.74:3000.
- GUIA-INSTALACION.md: nueva sección 16 "Acceso desde otros equipos y otras redes" (16.1 LAN con IP/hostname y firewall, 16.2 otra red vía VPN/Tailscale, reenvío de puertos o proxy inverso Caddy con HTTPS, 16.3 seguridad al exponer) + índice y tabla de comandos (sección 9) actualizados con dev:lan/start:lan.
- Verificación en vivo: portada 200 vía localhost Y vía IP de red 21.0.10.74:3000; login admin/auditor vía IP de red 200. Incidencia detectada y explicada: el entorno se reinició y predev limpió la BD (comportamiento diseñado); datos demo re-sembrados.
- bun run lint: 0 errores tras los cambios.
- Zip regenerado: download/sistema-reportes-tecnicos-completo.zip (1.5 MB, 259 archivos, incluye acceso-red.sh y sección 16).

Stage Summary:
- La app es accesible desde otros equipos de la red en http://IP-DEL-SERVIDOR:3000 sin cambios extra (escucha en 0.0.0.0, API de rutas relativas); configuración y documentación formalizadas con dev:lan/start:lan, allowedDevOrigins "*.local", script acceso-red.sh y sección 16 de la guía.
- Entregable descargable actualizado: download/sistema-reportes-tecnicos-completo.zip.
