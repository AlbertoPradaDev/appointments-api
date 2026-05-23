# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev       # start dev server on http://localhost:3000
npm run build     # production build
npm run lint      # run ESLint
```

### Prisma (v7 — uses prisma.config.ts, not the CLI defaults)

```bash
npx prisma migrate dev --name <name>   # create and apply a migration
npx prisma migrate deploy              # apply migrations in production
npx prisma generate                    # regenerate client after schema changes
npx prisma studio                      # open DB browser
```

The Prisma client is generated to `app/generated/prisma/` (not the default `node_modules`). Always import from `../../lib/prisma` or `../lib/prisma`, never directly from the generated path.

## Architecture

This is a pure REST API — no frontend pages. All logic lives in Next.js App Router route handlers under `app/api/`.

### Multi-tenancy model

Each business (`Negocio`) is a tenant. All resources (services, schedules, appointments, etc.) are scoped by `negocioId`. Authentication is via `x-api-key` header resolved to a `Negocio` record.

- `POST /api/negocios` — register a new business (no auth, returns the API key)
- All other endpoints require the `x-api-key` header

### Auth pattern

Every protected route calls `verificarApiKey(req)` from `app/lib/auth.ts`, which returns `{ error, status, negocio }`. If `error` is set, return early. Otherwise use `negocio` for the scoped DB queries.

### Availability logic (`/api/disponibilidad`)

Slot generation order:
1. Reject if date is in `DiaBloqueado`
2. Reject if no `Horario` exists for that weekday
3. Load `Pausa` records and existing non-cancelled `Cita` records for the day
4. Iterate the working window in `servicio.duracion`-minute increments, skipping slots that overlap a pausa or an existing cita

### Data model summary

- `Negocio` → owns everything; has a unique `apiKey`
- `Horario` → weekly schedule (one per `diaSemana` per negocio)
- `Pausa` → breaks within a working day (must fall inside the Horario window)
- `Servicio` → bookable service with a duration in minutes and optional price
- `DiaBloqueado` → specific calendar dates closed for business
- `Cita` → appointment linking a `Negocio`, `Servicio`, and a client; states: `pendiente`, `confirmada`, `cancelada`

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon) |

Set in `.env` / `.env.local` for local dev; injected by Vercel in production.
