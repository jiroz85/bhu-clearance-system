-- Multi-tenant foundation (university_id on core domain tables)

CREATE TABLE IF NOT EXISTS "universities" (
  "id" UUID NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "universities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "universities_code_key" UNIQUE ("code"),
  CONSTRAINT "universities_name_key" UNIQUE ("name")
);

INSERT INTO "universities" ("id", "code", "name", "is_active")
SELECT gen_random_uuid(), 'BHU', 'Bule Hora University', true
WHERE NOT EXISTS (SELECT 1 FROM "universities" WHERE "code" = 'BHU');

ALTER TABLE "app_users" ADD COLUMN IF NOT EXISTS "university_id" UUID;
ALTER TABLE "clearances" ADD COLUMN IF NOT EXISTS "university_id" UUID;
ALTER TABLE "clearance_steps" ADD COLUMN IF NOT EXISTS "university_id" UUID;
ALTER TABLE "departments" ADD COLUMN IF NOT EXISTS "university_id" UUID;
ALTER TABLE "clearance_workflows" ADD COLUMN IF NOT EXISTS "university_id" UUID;
ALTER TABLE "workflow_steps" ADD COLUMN IF NOT EXISTS "university_id" UUID;
ALTER TABLE "certificates" ADD COLUMN IF NOT EXISTS "university_id" UUID;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "university_id" UUID;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "university_id" UUID;

UPDATE "app_users"
SET "university_id" = (SELECT "id" FROM "universities" WHERE "code" = 'BHU' LIMIT 1)
WHERE "university_id" IS NULL;

UPDATE "clearances"
SET "university_id" = (SELECT "university_id" FROM "app_users" u WHERE u."id" = "clearances"."student_user_id")
WHERE "university_id" IS NULL;

UPDATE "clearance_steps"
SET "university_id" = (SELECT "university_id" FROM "clearances" c WHERE c."id" = "clearance_steps"."clearance_id")
WHERE "university_id" IS NULL;

UPDATE "departments"
SET "university_id" = (SELECT "id" FROM "universities" WHERE "code" = 'BHU' LIMIT 1)
WHERE "university_id" IS NULL;

UPDATE "clearance_workflows"
SET "university_id" = (SELECT "id" FROM "universities" WHERE "code" = 'BHU' LIMIT 1)
WHERE "university_id" IS NULL;

UPDATE "workflow_steps"
SET "university_id" = (SELECT "university_id" FROM "clearance_workflows" w WHERE w."id" = "workflow_steps"."workflow_id")
WHERE "university_id" IS NULL;

UPDATE "certificates"
SET "university_id" = (SELECT "university_id" FROM "clearances" c WHERE c."id" = "certificates"."clearance_id")
WHERE "university_id" IS NULL;

UPDATE "notifications"
SET "university_id" = (SELECT "university_id" FROM "app_users" u WHERE u."id" = "notifications"."user_id")
WHERE "university_id" IS NULL;

UPDATE "audit_logs"
SET "university_id" = (SELECT "university_id" FROM "app_users" u WHERE u."id" = "audit_logs"."actor_user_id")
WHERE "university_id" IS NULL;

ALTER TABLE "app_users" ALTER COLUMN "university_id" SET NOT NULL;
ALTER TABLE "clearances" ALTER COLUMN "university_id" SET NOT NULL;
ALTER TABLE "clearance_steps" ALTER COLUMN "university_id" SET NOT NULL;
ALTER TABLE "departments" ALTER COLUMN "university_id" SET NOT NULL;
ALTER TABLE "clearance_workflows" ALTER COLUMN "university_id" SET NOT NULL;
ALTER TABLE "workflow_steps" ALTER COLUMN "university_id" SET NOT NULL;
ALTER TABLE "certificates" ALTER COLUMN "university_id" SET NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "university_id" SET NOT NULL;

ALTER TABLE "app_users" ADD CONSTRAINT "app_users_university_id_fkey"
FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clearances" ADD CONSTRAINT "clearances_university_id_fkey"
FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clearance_steps" ADD CONSTRAINT "clearance_steps_university_id_fkey"
FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "departments" ADD CONSTRAINT "departments_university_id_fkey"
FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "clearance_workflows" ADD CONSTRAINT "clearance_workflows_university_id_fkey"
FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_university_id_fkey"
FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_university_id_fkey"
FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_university_id_fkey"
FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_university_id_fkey"
FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "app_users_university_id_idx" ON "app_users"("university_id");
CREATE INDEX IF NOT EXISTS "clearances_university_id_idx" ON "clearances"("university_id");
CREATE INDEX IF NOT EXISTS "clearance_steps_university_id_idx" ON "clearance_steps"("university_id");
CREATE INDEX IF NOT EXISTS "departments_university_id_idx" ON "departments"("university_id");
CREATE INDEX IF NOT EXISTS "clearance_workflows_university_id_idx" ON "clearance_workflows"("university_id");
CREATE INDEX IF NOT EXISTS "workflow_steps_university_id_idx" ON "workflow_steps"("university_id");
CREATE INDEX IF NOT EXISTS "certificates_university_id_idx" ON "certificates"("university_id");
CREATE INDEX IF NOT EXISTS "notifications_university_id_idx" ON "notifications"("university_id");
CREATE INDEX IF NOT EXISTS "audit_logs_university_id_idx" ON "audit_logs"("university_id");

