-- Add DB-driven workflow + departments + certificate persistence

-- =========================
-- 1) Departments
-- =========================
CREATE TABLE IF NOT EXISTS "departments" (
  "id" UUID NOT NULL,
  "code" VARCHAR(64) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "departments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "departments_code_key" UNIQUE ("code"),
  CONSTRAINT "departments_name_key" UNIQUE ("name")
);

-- =========================
-- 2) Clearance Workflows
-- =========================
CREATE TABLE IF NOT EXISTS "clearance_workflows" (
  "id" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "version" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "clearance_workflows_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "clearance_workflows_name_version_key" UNIQUE ("name", "version")
);

-- =========================
-- 3) Workflow Steps
-- =========================
CREATE TABLE IF NOT EXISTS "workflow_steps" (
  "id" UUID NOT NULL,
  "workflow_id" UUID NOT NULL,
  "step_order" INTEGER NOT NULL,
  "department_id" UUID NOT NULL,
  "step_code" VARCHAR(64) NOT NULL,
  "step_name" VARCHAR(160) NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "workflow_steps_workflow_id_step_order_key" UNIQUE ("workflow_id", "step_order"),
  CONSTRAINT "workflow_steps_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "clearance_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "workflow_steps_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "workflow_steps_department_id_idx" ON "workflow_steps"("department_id");

-- =========================
-- 4) Certificates
-- =========================
CREATE TABLE IF NOT EXISTS "certificates" (
  "id" UUID NOT NULL,
  "clearance_id" UUID NOT NULL,
  "student_user_id" UUID NOT NULL,
  "certificate_number" VARCHAR(64) NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL,
  "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "file_url" TEXT NOT NULL,
  "checksum_sha256" VARCHAR(64) NOT NULL,
  "verification_code" TEXT,
  CONSTRAINT "certificates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "certificates_clearance_id_key" UNIQUE ("clearance_id"),
  CONSTRAINT "certificates_certificate_number_key" UNIQUE ("certificate_number"),
  CONSTRAINT "certificates_clearance_id_fkey" FOREIGN KEY ("clearance_id") REFERENCES "clearances"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "certificates_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "app_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "certificates_student_user_id_idx" ON "certificates"("student_user_id");

