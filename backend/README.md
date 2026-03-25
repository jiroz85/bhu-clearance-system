# BHU Clearance — Backend

NestJS API with **PostgreSQL** (via **Prisma 7**), **JWT** authentication, and **ADMIN / USER** role guards.

## Layout (best practices)

```text
src/
  main.ts                 # bootstrap, global validation pipe
  app.module.ts           # root module wiring
  app.controller.ts       # legacy demo clearance routes (see note below)
  app.service.ts          # in-memory demo data (until domain moves to Prisma)
  config/                 # `ConfigModule` factory + env validation (fail-fast)
  prisma/                 # `PrismaService` + global `PrismaModule`
  auth/                   # login, register, JWT strategy, `GET /api/auth/me`
  users/                  # persistence helpers for `User` (extend here)
  common/
    decorators/           # `@Roles()`, `@CurrentUser()`
    guards/               # `JwtAuthGuard`, `RolesGuard`

prisma/
  schema.prisma           # DB schema (starts with `app_users` for auth)
  migrations/             # versioned SQL migrations
  seed.ts                 # optional bootstrap admin

generated/prisma/         # Prisma Client (gitignored; run `npm run postinstall` / `prisma generate`)
```

**Separation:** Auth lives in `auth/` + `users/`. Clearance demo logic stays in `app.service.ts` until you map it to Prisma models and dedicated modules (`clearance/`, `departments/`, etc.).

## Environment

Copy [.env.example](./.env.example) to `.env`. Required variables are validated at startup:

- `DATABASE_URL` — PostgreSQL connection string  
- `JWT_SECRET` — signing secret (use a long random value in production)  
- `JWT_EXPIRES_IN_SEC` — access token lifetime in seconds (default `604800` = 7 days)

## Database

Local Postgres (recommended):

```bash
docker compose up -d
npm run db:migrate
npm run db:seed
```

- `db:migrate` runs `prisma migrate deploy` (apply existing migrations).  
- During active schema design, use `npm run db:migrate:dev`.  
- `db:seed` creates an **ADMIN** user (see logs for email; override with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).

The Prisma table is **`app_users`** so it does not clash with the legacy `database/schema.sql` `users` table until you unify schemas.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run postinstall` | `prisma generate` (client in `generated/prisma`) |
| `npm run db:migrate` | Apply migrations (CI/prod) |
| `npm run db:migrate:dev` | Create/apply migrations in development |
| `npm run db:seed` | Seed bootstrap admin |
| `npm run db:studio` | Prisma Studio |

## Auth API

| Method | Path | Auth |
|--------|------|------|
| `POST` | `/api/auth/register` | Public — creates **USER** only |
| `POST` | `/api/auth/login` | Public |
| `GET` | `/api/auth/me` | Bearer JWT |

Admin-only demo routes (require `Authorization: Bearer <token>` with role **ADMIN**):

- `POST /api/admin/users`  
- `PATCH /api/admin/override/:requestId`  
- `GET /api/admin/reports/summary`  
- `GET /api/admin/audit`  

All other `/api/*` demo routes (student/staff/clearance) are **currently public** — lock them down with `JwtAuthGuard` and finer roles when you wire real domain logic.

## Security notes

- Passwords: bcrypt (12 rounds).  
- JWT payload is re-validated in `JwtStrategy` (user must still exist).  
- Register **never** assigns `ADMIN`; use seed or a future protected provisioning flow.

## NestJS reference

[NestJS documentation](https://docs.nestjs.com)
