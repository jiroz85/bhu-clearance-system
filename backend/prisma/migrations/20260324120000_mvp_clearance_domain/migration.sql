-- MVP domain: migrate Role enum (USER -> STUDENT), add clearance tables

CREATE TYPE "Role_new" AS ENUM ('STUDENT', 'STAFF', 'ADMIN');

ALTER TABLE "app_users" ADD COLUMN "role_new" "Role_new";

UPDATE "app_users"
SET "role_new" = CASE
  WHEN "role"::text = 'USER' THEN 'STUDENT'::"Role_new"
  WHEN "role"::text = 'ADMIN' THEN 'ADMIN'::"Role_new"
  ELSE 'STUDENT'::"Role_new"
END;

ALTER TABLE "app_users" DROP COLUMN "role";
ALTER TABLE "app_users" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "app_users" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "app_users" ALTER COLUMN "role" SET DEFAULT 'STUDENT'::"Role";

DROP TYPE "Role";
ALTER TYPE "Role_new" RENAME TO "Role";

ALTER TABLE "app_users" ADD COLUMN "student_university_id" VARCHAR(64);
ALTER TABLE "app_users" ADD COLUMN "student_department" VARCHAR(160);
ALTER TABLE "app_users" ADD COLUMN "student_year" VARCHAR(32);
ALTER TABLE "app_users" ADD COLUMN "staff_department" VARCHAR(160);

CREATE UNIQUE INDEX "app_users_student_university_id_key" ON "app_users"("student_university_id");
CREATE INDEX "app_users_staff_department_idx" ON "app_users"("staff_department");

-- CreateEnum
CREATE TYPE "ClearanceStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PAUSED_REJECTED', 'FULLY_CLEARED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "clearances" (
    "id" UUID NOT NULL,
    "student_user_id" UUID NOT NULL,
    "reference_id" VARCHAR(64) NOT NULL,
    "status" "ClearanceStatus" NOT NULL DEFAULT 'DRAFT',
    "current_step_order" INTEGER,
    "submitted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clearances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_steps" (
    "id" UUID NOT NULL,
    "clearance_id" UUID NOT NULL,
    "step_order" INTEGER NOT NULL,
    "department" VARCHAR(160) NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "clearance_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL,
    "clearance_step_id" UUID NOT NULL,
    "reviewer_user_id" UUID NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "comment" TEXT,
    "reason" TEXT,
    "instruction" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" VARCHAR(64) NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clearances_reference_id_key" ON "clearances"("reference_id");
CREATE INDEX "clearances_student_user_id_idx" ON "clearances"("student_user_id");
CREATE INDEX "clearances_status_idx" ON "clearances"("status");

CREATE INDEX "clearance_steps_clearance_id_idx" ON "clearance_steps"("clearance_id");
CREATE UNIQUE INDEX "clearance_steps_clearance_id_step_order_key" ON "clearance_steps"("clearance_id", "step_order");

CREATE INDEX "reviews_clearance_step_id_idx" ON "reviews"("clearance_step_id");
CREATE INDEX "reviews_reviewer_user_id_idx" ON "reviews"("reviewer_user_id");

CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

CREATE INDEX "notifications_user_id_read_idx" ON "notifications"("user_id", "read");

ALTER TABLE "clearances" ADD CONSTRAINT "clearances_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "clearance_steps" ADD CONSTRAINT "clearance_steps_clearance_id_fkey" FOREIGN KEY ("clearance_id") REFERENCES "clearances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_clearance_step_id_fkey" FOREIGN KEY ("clearance_step_id") REFERENCES "clearance_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "app_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
