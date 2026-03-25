# BHU Clearance - Missing Features and Practical Additions

This document lists important features not explicitly detailed in the prompt but recommended for a production rollout.

## 1) Authentication and Account Safety

- Password reset flow (email/phone OTP + token expiry).
- Optional two-factor authentication for admin/staff.
- Session management page (revoke active sessions).
- Account lockout on repeated failed login attempts.
- Strong password policy with history checks.

## 2) Authorization Hardening

- Fine-grained permissions per action (view, approve, reject, override, export).
- Scope checks in backend guards:
  - Student can access only own records.
  - Staff can access only their department step.
  - Admin can access all records.
- Explicit override reason required for admin override.

## 3) Workflow and Policy Controls

- Configurable workflow versions per academic year.
- Emergency bypass policy (disabled by default, audited always).
- SLA breach detection per step (overdue queue).
- Auto-reminders for pending steps.
- Lock completed requests from unauthorized edits.

## 4) Student Experience

- Clear timeline view (who acted, when, and why).
- Re-check status timeline (submitted -> reviewed -> resolved).
- Certificate verification page by reference number / QR.
- Mobile-first UI with low-bandwidth mode.
- Multi-language support (English + Afaan Oromo + Amharic as needed).

## 5) Staff Experience

- Department work queue with:
  - Sort by oldest pending
  - Filter by college/department/year
  - Bulk actions where policy allows
- Saved filters for repeated staff workflows.
- "Needs attention" labels (re-check open, overdue, incomplete info).

## 6) Admin and Governance

- User import via CSV/Excel for semester onboarding.
- Role assignment templates (per office).
- Dashboard KPIs:
  - Average clearance completion time
  - Rejection rate by department
  - Bottleneck step ranking
- Data retention policy and archival process.

## 7) Reporting and Exports

- Scheduled reports by email (daily/weekly/monthly).
- Export audit logs with tamper-evident checksum.
- Certificate issuance reports by period/college.
- Re-check analytics (resolution time and outcomes).

## 8) Notifications

- Template-based notifications with placeholders.
- Retry policy and dead-letter handling for failed SMS/email.
- User preferences for channel selection.
- Digest notifications (optional, to reduce message spam).

## 9) Security and Compliance

- At-rest encryption for sensitive fields (or encrypted disk + strict access).
- TLS everywhere and secure cookie/token handling.
- Privacy-by-design logs (avoid storing secrets in logs).
- Periodic permission review and audit.

## 10) Reliability and Operations

- Environment-specific config (dev/stage/prod).
- Health checks, metrics, and structured logs.
- Backup/restore drills for PostgreSQL.
- Queue worker monitoring for notifications and report generation.
- CI/CD with migration checks and rollback strategy.

## 11) Testing Strategy

- Unit tests for approval/rejection business rules.
- Integration tests for strict step order (1 -> 13).
- End-to-end tests:
  - Student flow
  - Staff review flow
  - Admin override flow
  - Certificate generation and verification
- Load tests for peak graduation periods.

## 12) Suggested Milestone Plan

1. Foundation
   - Auth, RBAC, user management, departments, workflow config.
2. Core Clearance
   - Request creation, 13-step processing, strict locking, rejection and re-check.
3. Dashboards
   - Student/staff/admin views, search and filters, notifications.
4. Certificate + Reports
   - PDF generation, QR verification, exports.
5. Hardening
   - Audit coverage, security controls, tests, monitoring, deployment.

