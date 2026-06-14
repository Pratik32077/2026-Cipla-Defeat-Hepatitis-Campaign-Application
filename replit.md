# CIPLA Defeat Hepatitis Doctor Video Management Platform

A production-ready, enterprise-grade Healthcare Campaign Management Platform for CIPLA's "Defeat Hepatitis" campaign. Manages 7000+ doctors through ~83 field managers across India.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/cipla-platform run dev` — run the frontend (port 24127)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET` — JWT secret

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, React Query, wouter
- API: Express 5, JWT authentication (jsonwebtoken + bcryptjs)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle schema: admins, managers, doctors, videos, audit-logs
- `artifacts/api-server/src/routes/` — Express route handlers (auth, managers, doctors, videos, analytics, audit-logs)
- `artifacts/api-server/src/middlewares/auth.ts` — JWT auth middleware
- `artifacts/cipla-platform/src/` — React frontend
- `artifacts/cipla-platform/src/hooks/use-auth.tsx` — Auth context provider
- `artifacts/cipla-platform/src/pages/` — Admin and Manager pages
- `attached_assets/` — Brand logos (Cipla, Defeat Hepatitis, Tenvir AF, IB Records)

## Architecture decisions

- JWT stored in localStorage under key `cipla_token`; custom-fetch.ts injects it as Bearer token on every API call
- Role-based access: `admin` sees all data; `manager` sees only their own doctors/videos
- Manager login uses Employee Code as username (e.g. EMP001)
- Contact number is globally unique across all doctors (validated server-side)
- Videos are auto-created as `pending` when a doctor is added; video engine integrates later

## Product

- **Admin portal**: 4 pre-configured admins, manage 83+ managers, view all 7000+ doctors, campaign analytics, leaderboard, audit logs
- **Manager portal**: login via employee code, add doctors, track video generation status
- **Dual dashboard**: Admin sees global campaign stats; Manager sees own progress vs target

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Admin Credentials

| Name | Username | Password |
|---|---|---|
| Pratik Tiwari | `Pratik Tiwari` | `Pratik@1234` |
| Anusha Ramani | `Anusha Ramani` | `Anusha@1234` |
| Alok Dubey | `Alok Dubey` | `Alok@1234` |
| Vaibhav Sipla | `Vaibhav Sipla` | `Vaibhav@1234` |

## Sample Manager Credentials

| Employee Code | Password |
|---|---|
| `EMP001` | `Pratik@1234` (same hash used for seeding) |

## Gotchas

- Managers use Employee Code as username (not name)
- VIDEO endpoint for download/preview is a stub — video engine not yet integrated
- Always run `pnpm --filter @workspace/api-spec run codegen` after spec changes
- The `bcrypt` package (native) is externalized in esbuild; `bcryptjs` (pure JS) is used instead

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
