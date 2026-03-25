# BHU Student Clearance System

Full-stack starter implementation for the Bule Hora University digital student clearance workflow.

## Stack

- Frontend: React + TypeScript + Tailwind CSS (Vite)
- Backend: NestJS + TypeScript
- Database design: PostgreSQL schema in `database/schema.sql`

## Implemented

- Strict 13-step clearance workflow design (in DB schema and backend logic)
- Student dashboard data model and progress view
- Staff review endpoints with approve/reject actions
- Rejection reason/instruction validation
- Re-check request flow
- Admin user creation, override action, and summary report endpoint
- Certificate generation rule (only after full clearance)
- Comprehensive PostgreSQL schema with RBAC, notifications, certificates, and audit logs

## Run backend

```bash
cd backend
npm install
npm run start:dev
```

Backend URL: `http://localhost:3000`

### Main API routes

- `GET /api/health`
- `GET /api/workflow`
- `GET /api/student/:studentUserId/dashboard`
- `POST /api/student/:studentUserId/recheck`
- `GET /api/student/:studentUserId/certificate`
- `GET /api/staff/:department/pending`
- `PATCH /api/staff/reviews/:requestId/:stepOrder`
- `POST /api/admin/users`
- `PATCH /api/admin/override/:requestId`
- `GET /api/admin/reports/summary`

## Run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Database

Apply schema on PostgreSQL:

```bash
psql -U <user> -d <db_name> -f database/schema.sql
```

The schema includes:
- all core clearance tables
- strict workflow enforcement trigger
- seeded BHU departments and 13 ordered steps

## Next production step

Replace in-memory backend service storage with Prisma repositories mapped to the schema in `database/schema.sql`.

