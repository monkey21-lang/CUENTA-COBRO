# Cuenta Clara

Aplicación web para crear cuentas de cobro personalizables, imprimirlas o guardarlas como PDF y consultarlas por fecha. Los documentos y sus servicios se almacenan en SQLite mediante Prisma.

## Requisitos

- Node.js 20.9 o superior
- npm

## Preparación

1. Instala las dependencias con `npm install`.
2. Verifica que `.env` contenga `DATABASE_URL="file:./dev.db"` y que `.dev.vars` defina `AUTH_SECRET`, `ALBERT_PASSWORD` y `ANDRES_PASSWORD`. Puedes partir de `.dev.vars.example`; ese archivo nunca debe contener contraseñas reales.
3. Genera el cliente, crea la tabla `User` y carga los dos usuarios:

```bash
npm run db:generate
npm run db:migrate:local
npm run db:seed:users
```

4. Inicia el servidor con `npm run dev` y abre `http://localhost:3002`.

La base local de desarrollo se crea en `prisma/dev.db`. No se necesita una instancia externa.

El seed local lee `ALBERT_PASSWORD` y `ANDRES_PASSWORD` desde `.dev.vars` y los guarda en la tabla `User` como hashes PBKDF2. Ese archivo está excluido de Git. En Cloudflare el Worker solo necesita `AUTH_SECRET` como secreto en **Settings → Variables and Secrets**; GitHub Actions usa los secretos `ALBERT_PASSWORD` y `ANDRES_PASSWORD` al sembrar D1.

## Uso

- Edita el título, marca, logo, número y fecha del documento.
- Completa los datos del cliente, agrega servicios y aplica un descuento.
- Revisa la vista previa y usa **Imprimir** para imprimir o guardar el documento como PDF.
- Usa **Guardar cuenta** para persistirlo en SQLite.
- En **Historial**, filtra por fechas y abre cualquier documento para consultarlo o volver a imprimirlo.

## Comandos

- `npm run dev`: servidor de desarrollo.
- `npm run lint`: análisis estático.
- `npm run build`: compilación de producción.
- `npx prisma studio`: explorador visual de la base de datos.

## Desplegar en Cloudflare Workers

La app usa SQLite local durante `npm run dev` y Cloudflare D1 persistente al ejecutarse en Workers. El build usa OpenNext para Cloudflare y conserva Next.js 16.

1. Inicia sesión en Cloudflare desde la terminal:

```bash
npx wrangler login
```

2. Crea la base D1:

```bash
npx wrangler d1 create cuenta-clara
```

3. Copia el `database_id` que devuelve Wrangler en `wrangler.jsonc` si aún no está configurado.
4. Aplica las migraciones y crea/actualiza los usuarios iniciales:

```bash
npm run db:migrate:cloudflare:remote
npm run db:seed:users:remote
```

5. Compila y previsualiza el Worker localmente con D1 local:

```bash
npm run db:migrate:cloudflare:local
npm run db:seed:users:d1-local
npm run preview:cloudflare
```

6. Despliega en `workers.dev`:

```bash
npm run deploy:cloudflare
```

El workflow manual de GitHub Actions está en `.github/workflows/deploy-cloudflare.yml`. Configura los secretos `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ALBERT_PASSWORD` y `ANDRES_PASSWORD` en GitHub y ejecútalo desde **Actions → Deploy Cuenta Clara to Cloudflare → Run workflow**. En Cloudflare añade también `AUTH_SECRET` como secreto del Worker desde **Settings → Variables and Secrets**; usa una clave aleatoria de al menos 32 caracteres. El UUID real de D1 debe estar configurado en `wrangler.jsonc` antes de ejecutarlo. También puedes desplegar desde Linux con `npm run deploy:cloudflare`.

La tabla `User` almacena hashes PBKDF2, nunca contraseñas en texto plano. Para cambios futuros del esquema, crea una nueva migración SQL con `npx prisma migrate diff --from-local-d1 --to-schema-datamodel prisma/schema.prisma --script --output prisma/migrations/000N_descripcion.sql` y aplícala con los comandos `db:migrate:cloudflare:*`.

OpenNext advierte que el build en Windows puede fallar al crear enlaces simbólicos. Para desplegar desde este equipo, usa WSL con una distro Linux instalada o ejecuta el workflow de GitHub Actions, que compila en Linux.

La app requiere inicio de sesión y protege la API de facturas con una cookie firmada HttpOnly. La sesión vence después de 12 horas. Las preferencias de marca, encabezado y contacto/pago se recuerdan en el navegador; no guardes datos bancarios en un equipo compartido.
