# BHU Clearance System - Database Schema Gaps Analysis

## Current State vs Required Schema

### ✅ Already Implemented (Prisma Schema)
- Basic User model with roles
- Clearance and ClearanceStep models
- Department model
- Workflow and WorkflowStep models
- Review model
- Certificate model
- AuditLog model
- Notification model

### ❌ Critical Missing Tables

#### 1. **RBAC System**
```sql
-- Missing: Complete Role-Based Access Control
- roles table (with permissions)
- permissions table
- role_permissions table
- user_roles table
```

#### 2. **Enhanced User Profiles**
```sql
-- Missing: Detailed user profiles
- staff_profiles table (title, hire_date, department assignment)
- student_profiles table (student_number, college, program, academic_year)
```

#### 3. **Re-check/Appeal System**
```sql
-- Missing: Student appeal mechanism
- recheck_requests table
```

#### 4. **Document Management**
```sql
-- Missing: Template system
- document_templates table
```

#### 5. **Advanced Notification System**
```sql
-- Missing: Robust notification delivery
- notification_queue table
- notification_channel enum (EMAIL, SMS, IN_APP)
- notification_status enum (QUEUED, SENT, FAILED, READ)
```

#### 6. **Security & Authentication**
```sql
-- Missing: Security features
- auth_refresh_tokens table
- user_status enum (ACTIVE, INACTIVE, SUSPENDED)
```

#### 7. **Reporting System**
```sql
-- Missing: Report generation
- report_exports table
```

#### 8. **Workflow Enforcement**
```sql
-- Missing: Database-level workflow enforcement
- enforce_step_order trigger
- set_updated_at trigger for all tables
```

## Priority Implementation Order

### Phase 1: Core Security & RBAC
1. **roles, permissions, role_permissions, user_roles tables**
2. **auth_refresh_tokens table**
3. **user_status enum and account lockout**

### Phase 2: Enhanced User Management
1. **staff_profiles table**
2. **student_profiles table**
3. **User import/export functionality**

### Phase 3: Advanced Workflow
1. **recheck_requests table**
2. **document_templates table**
3. **Workflow enforcement triggers**

### Phase 4: Notifications & Reporting
1. **notification_queue table**
2. **report_exports table**
3. **Advanced notification channels**

## Schema Inconsistencies to Fix

### 1. **Role System Mismatch**
- Current: Simple enum (STUDENT, STAFF, ADMIN)
- Required: Full RBAC with permissions
- **Action**: Replace enum with proper role system

### 2. **Missing Workflow Enforcement**
- Current: Application-level only
- Required: Database-level triggers
- **Action**: Implement strict order enforcement trigger

### 3. **Incomplete User Profiles**
- Current: Basic user info
- Required: Detailed student/staff profiles
- **Action**: Add profile tables with proper relationships

### 4. **Limited Notification System**
- Current: Basic in-app notifications
- Required: Multi-channel with queue
- **Action**: Expand notification system

## Data Migration Considerations

### When Upgrading Schema:
1. **Backup existing data**
2. **Create new tables**
3. **Migrate user roles to RBAC system**
4. **Create default permissions**
5. **Update application code**
6. **Test workflow enforcement**

## Recommended Next Steps

1. **Implement RBAC system first** - Critical for security
2. **Add workflow enforcement triggers** - Ensures data integrity
3. **Expand user profiles** - Required for proper clearance
4. **Build re-check system** - Essential for student appeals
5. **Enhance notifications** - Improves user experience
