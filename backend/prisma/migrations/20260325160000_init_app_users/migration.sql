-- Prisma Migrate — initial auth tables (table `app_users` avoids clash with legacy `database/schema.sql` `users`)

CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

CREATE TABLE "app_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "display_name" VARCHAR(160),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

CREATE INDEX "app_users_role_idx" ON "app_users"("role");
