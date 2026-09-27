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

La base local se crea en `prisma/dev.db`. No se necesita una instancia externa.

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
