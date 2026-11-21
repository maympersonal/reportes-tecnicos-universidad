# Base de datos

Desde la raíz del proyecto, con las dependencias instaladas y un `.env` que contenga
`DATABASE_URL="file:../db/custom.db"`:

```bash
npm run db:push
npm run seed
npm run dev
```

`schema.prisma` define las tablas y genera el cliente Prisma. `seed.ts` crea el
administrador definido en `src/lib/constants.ts`, las dos áreas institucionales
y los catálogos faltantes. Conserva registros, contraseñas y estados existentes.
El inicio de sesión también invoca esta inicialización. Las tablas deben existir antes.

## Actualización del contador de reportes

Después de actualizar el código, ejecuta `npm run db:push` y `npm run db:generate`
antes de iniciar el servidor. Esto agrega `ContadorReporte` sin borrar reportes.

Los códigos `RPT-AAAA-NNNN` usan un contador persistente por año. En la primera
creación de cada año, el contador parte del mayor sufijo numérico de los códigos
existentes de ese año; ignora códigos de demostración y sufijos no numéricos.
Sin reportes previos, empieza en `0001`. No se modifican los códigos existentes.
Los números de reportes eliminados antes de esta actualización no se pueden
deducir de la base actual.

La reserva del número, el reporte, sus equipos y el historial inicial se guardan
en una transacción. Borrar reportes no reduce el contador, y un fallo al guardar
revierte también la reserva. El número puede superar los cuatro dígitos.

`npm test` incluye pruebas del SQL real con SQLite temporal y conexiones en
workers independientes, además de pruebas de la transacción del endpoint con
un adaptador de prueba. No modifica `db/custom.db`.

## Ejemplos opcionales

```bash
npm run seed:demo
```

Agrega seis cuentas (`demo.admin`, `demo.tec1` a `demo.tec4`, `demo.auditor`) y 21
reportes con códigos `DEMO-0001` a `DEMO-0021`. Las cuentas nuevas usan `DEMO_PASSWORD`
si está definida, o `Temporal2026!`. Repetir el comando no cambia sus contraseñas ni
duplica los reportes. Los identificadores `seed-demo.*` y códigos `DEMO-*` se reservan
para estos ejemplos. No se ejecuta en producción.

## Reinicio manual de pruebas

`dev` y `dev:lan` conservan los datos. `db:fresh` (también `db:reset`) borra y recrea
las tablas y carga únicamente los datos básicos. Exige `NODE_ENV=development`,
`--confirm-reset` y una base local `db/development.db` o `db/test.db`, sin enlaces.
Nunca admite `db/custom.db`. Detén el servidor antes del reinicio.

Ejemplo en Bash, sobre una base de desarrollo separada:

```bash
NODE_ENV=development DATABASE_URL="file:../db/development.db" npm run db:fresh -- --confirm-reset
```

Para usar esa misma base en la aplicación, configura esa `DATABASE_URL` en `.env`.
El reinicio lee `.env`; las variables de la terminal tienen prioridad. Usa Node.js
22 o posterior. No elimina archivos adjuntos de `public/uploads`.

Con Bun puedes usar `bun run` en lugar de `npm run`; para la confirmación:
`bun run db:fresh --confirm-reset`.

## Pruebas de los scripts

`npm run test:db` requiere Node.js 22.13 o posterior. Comprueba conservación de
datos, repetición de seeds, propagación de errores y restricciones del reinicio.
Usa dobles de Prisma y archivos temporales; no modifica la base de la aplicación.

Las instalaciones anteriores convierten el rol `superadmin` a `admin` al ejecutar
el bootstrap (inicio de sesión o `seed`). Se conservan el nombre de usuario, la
contraseña, el estado de la cuenta y las relaciones. Las instalaciones nuevas
crean la cuenta inicial `admin`. Los administradores tienen todos los permisos;
los permisos personalizados se aplican a técnicos y auditores.
