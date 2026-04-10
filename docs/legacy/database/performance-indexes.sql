-- Performance optimization indexes for BHU Clearance System reporting

-- Index for clearance status counts (used in getClearanceMetrics)
CREATE INDEX IF NOT EXISTS "idx_clearance_university_status" ON "Clearance" ("universityId", "status");

-- Index for clearance date filtering (used in reports with date filters)
CREATE INDEX IF NOT EXISTS "idx_clearance_university_created" ON "Clearance" ("universityId", "createdAt");

-- Composite index for completed clearances timing calculations
CREATE INDEX IF NOT EXISTS "idx_clearance_completed_timing" ON "Clearance" ("universityId", "status", "submittedAt", "completedAt") 
WHERE "status" = 'FULLY_CLEARED';

-- Index for department step statistics (used in department rejection rates)
CREATE INDEX IF NOT EXISTS "idx_clearance_step_university_department_status" ON "ClearanceStep" ("clearanceId", "department", "status");

-- Index for bottleneck analysis (pending steps and timing)
CREATE INDEX IF NOT EXISTS "idx_clearance_step_pending_timing" ON "ClearanceStep" ("department", "status", "reviewedAt", "createdAt")
WHERE "status" IN ('PENDING', 'APPROVED');

-- Index for monthly trends (date-based grouping)
CREATE INDEX IF NOT EXISTS "idx_clearance_monthly_trends" ON "Clearance" ("universityId", "createdAt", "status");

-- Partial index for approved steps with timing data (used in bottleneck calculations)
CREATE INDEX IF NOT EXISTS "idx_clearance_step_approved_timing" ON "ClearanceStep" ("department", "reviewedAt", "clearanceId")
WHERE "status" = 'APPROVED' AND "reviewedAt" IS NOT NULL;

-- Index for audit log queries (admin dashboard)
CREATE INDEX IF NOT EXISTS "idx_audit_created" ON "AuditLog" ("createdAt" DESC);

-- Index for user management queries
CREATE INDEX IF NOT EXISTS "idx_user_role_status" ON "User" ("role", "status", "createdAt");

-- Analyze tables to update statistics after index creation
ANALYZE "Clearance";
ANALYZE "ClearanceStep";
ANALYZE "AuditLog";
ANALYZE "User";
