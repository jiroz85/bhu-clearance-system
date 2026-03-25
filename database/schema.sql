-- BHU Student Clearance System - PostgreSQL schema (LEGACY)
-- Stack target: NestJS + PostgreSQL + React
--
-- NOTE (production):
-- This file is kept for reference only. The running backend uses Prisma migrations
-- (`backend/prisma/migrations`) as the single source of truth for the DB schema.

-- =========================
-- 1) Extensions
-- =========================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================
-- 2) Enums
-- =========================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'clearance_request_status') THEN
        CREATE TYPE clearance_request_status AS ENUM (
            'DRAFT',
            'IN_PROGRESS',
            'PAUSED_REJECTED',
            'FULLY_CLEARED',
            'CANCELLED'
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'step_status') THEN
        CREATE TYPE step_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
        CREATE TYPE notification_channel AS ENUM ('IN_APP', 'EMAIL', 'SMS');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM ('QUEUED', 'SENT', 'FAILED', 'READ');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'actor_type') THEN
        CREATE TYPE actor_type AS ENUM ('SYSTEM', 'USER');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_recheck_status') THEN
        CREATE TYPE request_recheck_status AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');
    END IF;
END$$;

-- =========================
-- 3) RBAC Tables
-- =========================
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(120) UNIQUE NOT NULL,
    name VARCHAR(160) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- =========================
-- 4) Users and Identity
-- =========================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    university_id VARCHAR(40) UNIQUE NOT NULL, -- student/staff unique ID number
    email VARCHAR(180) UNIQUE,
    phone VARCHAR(32),
    password_hash TEXT NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    middle_name VARCHAR(80),
    last_name VARCHAR(80) NOT NULL,
    status user_status NOT NULL DEFAULT 'ACTIVE',
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(160) NOT NULL,
    office_phone VARCHAR(32),
    office_email VARCHAR(180),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id),
    title VARCHAR(120),
    hire_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    student_number VARCHAR(40) UNIQUE NOT NULL,
    college VARCHAR(180),
    department_name VARCHAR(180),
    program VARCHAR(120),
    academic_year VARCHAR(30),
    admission_year SMALLINT,
    graduation_year SMALLINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 5) Workflow Config
-- =========================
CREATE TABLE IF NOT EXISTS clearance_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(160) NOT NULL,
    version INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (name, version)
);

CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES clearance_workflows(id) ON DELETE CASCADE,
    step_order SMALLINT NOT NULL CHECK (step_order >= 1),
    department_id UUID NOT NULL REFERENCES departments(id),
    step_code VARCHAR(64) NOT NULL,
    step_name VARCHAR(160) NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    sla_hours INTEGER DEFAULT 72 CHECK (sla_hours > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (workflow_id, step_order),
    UNIQUE (workflow_id, department_id),
    UNIQUE (workflow_id, step_code)
);

-- =========================
-- 6) Clearance Core
-- =========================
CREATE TABLE IF NOT EXISTS clearance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_no VARCHAR(64) UNIQUE NOT NULL,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    workflow_id UUID NOT NULL REFERENCES clearance_workflows(id),
    status clearance_request_status NOT NULL DEFAULT 'IN_PROGRESS',
    current_step_order SMALLINT NOT NULL DEFAULT 1 CHECK (current_step_order >= 1),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    registrar_validated_by UUID REFERENCES users(id),
    registrar_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clearance_requests_student ON clearance_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_clearance_requests_status ON clearance_requests(status);
CREATE INDEX IF NOT EXISTS idx_clearance_requests_reference_no ON clearance_requests(reference_no);

CREATE TABLE IF NOT EXISTS clearance_step_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clearance_request_id UUID NOT NULL REFERENCES clearance_requests(id) ON DELETE CASCADE,
    workflow_step_id UUID NOT NULL REFERENCES workflow_steps(id),
    step_order SMALLINT NOT NULL CHECK (step_order >= 1),
    department_id UUID NOT NULL REFERENCES departments(id),
    assigned_staff_id UUID REFERENCES users(id),
    reviewed_by UUID REFERENCES users(id),
    status step_status NOT NULL DEFAULT 'PENDING',
    comment TEXT,
    rejection_reason TEXT,
    rejection_instruction TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (clearance_request_id, step_order),
    UNIQUE (clearance_request_id, workflow_step_id),
    CONSTRAINT chk_rejection_details
        CHECK (
            status <> 'REJECTED'
            OR (rejection_reason IS NOT NULL AND rejection_instruction IS NOT NULL)
        )
);

CREATE INDEX IF NOT EXISTS idx_step_reviews_request ON clearance_step_reviews(clearance_request_id);
CREATE INDEX IF NOT EXISTS idx_step_reviews_department_status ON clearance_step_reviews(department_id, status);
CREATE INDEX IF NOT EXISTS idx_step_reviews_assigned_staff ON clearance_step_reviews(assigned_staff_id);

-- =========================
-- 7) Re-check / Appeal
-- =========================
CREATE TABLE IF NOT EXISTS recheck_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clearance_request_id UUID NOT NULL REFERENCES clearance_requests(id) ON DELETE CASCADE,
    clearance_step_review_id UUID NOT NULL REFERENCES clearance_step_reviews(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status request_recheck_status NOT NULL DEFAULT 'OPEN',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id),
    resolution_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_recheck_open ON recheck_requests(status, requested_at);

-- =========================
-- 8) Certificate & Documents
-- =========================
CREATE TABLE IF NOT EXISTS clearance_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clearance_request_id UUID UNIQUE NOT NULL REFERENCES clearance_requests(id) ON DELETE CASCADE,
    certificate_no VARCHAR(64) UNIQUE NOT NULL,
    file_url TEXT NOT NULL,
    qr_payload TEXT,
    issued_by UUID REFERENCES users(id),
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checksum_sha256 VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(160) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    template_body TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (code, version)
);

-- =========================
-- 9) Notification System
-- =========================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL DEFAULT 'IN_APP',
    title VARCHAR(180) NOT NULL,
    body TEXT NOT NULL,
    status notification_status NOT NULL DEFAULT 'QUEUED',
    related_entity_type VARCHAR(80),
    related_entity_id UUID,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    next_retry_at TIMESTAMPTZ,
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================
-- 10) Audit & Security
-- =========================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_type actor_type NOT NULL DEFAULT 'USER',
    actor_user_id UUID REFERENCES users(id),
    action VARCHAR(120) NOT NULL,
    entity_type VARCHAR(120) NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user ON auth_refresh_tokens(user_id, expires_at DESC);

-- =========================
-- 11) Reporting Cache (optional speed-up)
-- =========================
CREATE TABLE IF NOT EXISTS report_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_by UUID REFERENCES users(id),
    report_type VARCHAR(80) NOT NULL,
    filters JSONB,
    file_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- =========================
-- 12) Updated_at utility trigger
-- =========================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_updated_at') THEN
        CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_roles_updated_at') THEN
        CREATE TRIGGER trg_roles_updated_at
        BEFORE UPDATE ON roles
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_departments_updated_at') THEN
        CREATE TRIGGER trg_departments_updated_at
        BEFORE UPDATE ON departments
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_staff_profiles_updated_at') THEN
        CREATE TRIGGER trg_staff_profiles_updated_at
        BEFORE UPDATE ON staff_profiles
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_student_profiles_updated_at') THEN
        CREATE TRIGGER trg_student_profiles_updated_at
        BEFORE UPDATE ON student_profiles
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clearance_requests_updated_at') THEN
        CREATE TRIGGER trg_clearance_requests_updated_at
        BEFORE UPDATE ON clearance_requests
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clearance_step_reviews_updated_at') THEN
        CREATE TRIGGER trg_clearance_step_reviews_updated_at
        BEFORE UPDATE ON clearance_step_reviews
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    END IF;
END$$;

-- =========================
-- 13) Strict workflow enforcement trigger
-- =========================
CREATE OR REPLACE FUNCTION enforce_step_order_and_update_request()
RETURNS TRIGGER AS $$
DECLARE
    prev_status step_status;
    max_step SMALLINT;
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    SELECT MAX(step_order) INTO max_step
    FROM clearance_step_reviews
    WHERE clearance_request_id = NEW.clearance_request_id;

    -- Only allow approve/reject transitions from PENDING
    IF OLD.status <> 'PENDING' AND NEW.status IN ('APPROVED', 'REJECTED') THEN
        RAISE EXCEPTION 'Only PENDING step can be reviewed';
    END IF;

    -- Enforce strict order: previous step must be APPROVED
    IF NEW.step_order > 1 AND NEW.status IN ('APPROVED', 'REJECTED') THEN
        SELECT status INTO prev_status
        FROM clearance_step_reviews
        WHERE clearance_request_id = NEW.clearance_request_id
          AND step_order = NEW.step_order - 1;

        IF prev_status IS DISTINCT FROM 'APPROVED' THEN
            RAISE EXCEPTION 'Cannot review step % before step % is APPROVED',
                NEW.step_order, NEW.step_order - 1;
        END IF;
    END IF;

    -- Review metadata required for approve/reject
    IF NEW.status IN ('APPROVED', 'REJECTED') AND (NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL) THEN
        RAISE EXCEPTION 'reviewed_by and reviewed_at are required for reviewed steps';
    END IF;

    -- Update parent request status
    IF NEW.status = 'REJECTED' THEN
        UPDATE clearance_requests
        SET status = 'PAUSED_REJECTED',
            current_step_order = NEW.step_order,
            updated_at = NOW()
        WHERE id = NEW.clearance_request_id;
    ELSIF NEW.status = 'APPROVED' THEN
        IF NEW.step_order < max_step THEN
            UPDATE clearance_requests
            SET status = 'IN_PROGRESS',
                current_step_order = NEW.step_order + 1,
                updated_at = NOW()
            WHERE id = NEW.clearance_request_id;
        ELSE
            UPDATE clearance_requests
            SET status = 'FULLY_CLEARED',
                current_step_order = NEW.step_order,
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = NEW.clearance_request_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_enforce_step_order') THEN
        CREATE TRIGGER trg_enforce_step_order
        BEFORE UPDATE ON clearance_step_reviews
        FOR EACH ROW
        EXECUTE FUNCTION enforce_step_order_and_update_request();
    END IF;
END$$;

-- =========================
-- 14) Seed minimum master data
-- =========================
-- Workflow
INSERT INTO clearance_workflows (id, name, version, is_active)
VALUES (gen_random_uuid(), 'BHU Standard Exit Clearance', 1, TRUE)
ON CONFLICT (name, version) DO NOTHING;

-- Departments in strict order
INSERT INTO departments (code, name) VALUES
('DEPT_HEAD', 'Department Head'),
('LIBRARY', 'Library'),
('BOOKSTORE', 'Bookstore'),
('DORMITORY', 'Dormitory'),
('CAFETERIA', 'Cafeteria'),
('SPORTS', 'Sports Office'),
('POLICE', 'University Police'),
('STUDENT_DEAN', 'Student Dean'),
('ELEARNING', 'E-learning Directorate'),
('CEP', 'CEP Coordinator'),
('FINANCE', 'Finance'),
('COST_SHARING', 'Cost Sharing'),
('COLLEGE_REG_COORD', 'College Registrar Coordinator')
ON CONFLICT (code) DO NOTHING;

-- Bind steps to active workflow if missing
WITH active_wf AS (
    SELECT id FROM clearance_workflows WHERE name = 'BHU Standard Exit Clearance' AND version = 1
)
INSERT INTO workflow_steps (workflow_id, step_order, department_id, step_code, step_name, is_required)
SELECT aw.id, s.step_order, d.id, s.step_code, s.step_name, TRUE
FROM active_wf aw
JOIN (
    VALUES
    (1, 'STEP_01_DEPT_HEAD', 'Department Head', 'DEPT_HEAD'),
    (2, 'STEP_02_LIBRARY', 'Library', 'LIBRARY'),
    (3, 'STEP_03_BOOKSTORE', 'Bookstore', 'BOOKSTORE'),
    (4, 'STEP_04_DORMITORY', 'Dormitory', 'DORMITORY'),
    (5, 'STEP_05_CAFETERIA', 'Cafeteria', 'CAFETERIA'),
    (6, 'STEP_06_SPORTS', 'Sports Office', 'SPORTS'),
    (7, 'STEP_07_POLICE', 'University Police', 'POLICE'),
    (8, 'STEP_08_STUDENT_DEAN', 'Student Dean', 'STUDENT_DEAN'),
    (9, 'STEP_09_ELEARNING', 'E-learning Directorate', 'ELEARNING'),
    (10, 'STEP_10_CEP', 'CEP Coordinator', 'CEP'),
    (11, 'STEP_11_FINANCE', 'Finance', 'FINANCE'),
    (12, 'STEP_12_COST_SHARING', 'Cost Sharing', 'COST_SHARING'),
    (13, 'STEP_13_COLLEGE_REG_COORD', 'College Registrar Coordinator', 'COLLEGE_REG_COORD')
) AS s(step_order, step_code, step_name, department_code)
ON TRUE
JOIN departments d ON d.code = s.department_code
ON CONFLICT (workflow_id, step_order) DO NOTHING;

-- =========================
-- 15) Useful view for dashboards
-- =========================
CREATE OR REPLACE VIEW vw_student_clearance_progress AS
SELECT
    cr.id AS clearance_request_id,
    cr.reference_no,
    cr.student_id,
    cr.status AS request_status,
    cr.current_step_order,
    COUNT(*) FILTER (WHERE csr.status = 'APPROVED') AS approved_steps,
    COUNT(*) FILTER (WHERE csr.status = 'REJECTED') AS rejected_steps,
    COUNT(*) AS total_steps
FROM clearance_requests cr
JOIN clearance_step_reviews csr ON csr.clearance_request_id = cr.id
GROUP BY cr.id, cr.reference_no, cr.student_id, cr.status, cr.current_step_order;

