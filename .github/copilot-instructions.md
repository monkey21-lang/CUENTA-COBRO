# Project conventions

- Keep all user-facing interface text in Spanish.
- Store currency as integer cents in Prisma and calculate totals again in the API.
- Preserve each invoice's service order using `InvoiceItem.position`.
- Treat invoice dates as date-only values in the UI and API; store them at UTC noon to avoid local timezone shifts.
- Use the existing App Router API routes and SQLite Prisma schema for invoice persistence.