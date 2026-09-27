# Cuenta Clara

Aplicación web para crear cuentas de cobro personalizables, imprimirlas o guardarlas como PDF y consultarlas por fecha. Los documentos y sus servicios se almacenan en SQLite mediante Prisma.

## Requisitos

- Node.js 20.9 o superior
- npm

## Preparación

1. Instala las dependencias con `npm install`.
2. Verifica que `.env` contenga `DATABASE_URL="file:./dev.db"`.
3. Genera el cliente y crea o actualiza la base de datos:

```bash
npx prisma generate
npx prisma db push
```

4. Inicia el servidor con `npm run dev` y abre `http://localhost:3002`.

La base local de desarrollo se crea en `prisma/dev.db`. No se necesita una instancia externa.

El inicio de sesión local usa `AUTH_SECRET`, `ALBERT_PASSWORD` y `ANDRES_PASSWORD` en `.dev.vars`. Ese archivo está excluido de Git. En Cloudflare configura esas mismas variables como secretos del Worker desde **Settings → Variables and Secrets**; usa el usuario `Albert` o `Andres` y su contraseña correspondiente.

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

3. Copia el `database_id` que devuelve Wrangler en `wrangler.jsonc`, sustituyendo el UUID provisional `11111111-1111-4111-8111-111111111111`.
4. Aplica el esquema a D1:

```bash
npm run db:cloudflare:remote
```

5. Compila y previsualiza el Worker localmente con D1 local:

```bash
npm run db:cloudflare:local
npm run preview:cloudflare
```

6. Despliega en `workers.dev`:

```bash
npm run deploy:cloudflare
```

El workflow manual de GitHub Actions está en `.github/workflows/deploy-cloudflare.yml`. Configura los secretos `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` en GitHub y ejecútalo desde **Actions → Deploy Cuenta Clara to Cloudflare → Run workflow**. El UUID real de D1 debe estar configurado en `wrangler.jsonc` antes de ejecutarlo. También puedes desplegar desde Linux con `npm run deploy:cloudflare`.

OpenNext advierte que el build en Windows puede fallar al crear enlaces simbólicos. Para desplegar desde este equipo, usa WSL con una distro Linux instalada o ejecuta el workflow de GitHub Actions, que compila en Linux.

La app requiere inicio de sesión y protege la API de facturas con una cookie firmada HttpOnly. La sesión vence después de 12 horas. Las preferencias de marca, encabezado y contacto/pago se recuerdan en el navegador; no guardes datos bancarios en un equipo compartido.
