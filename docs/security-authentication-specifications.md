# BHU Clearance System - Security & Authentication Specifications

## Current Security State Analysis

### ✅ Already Implemented
- Basic JWT authentication structure
- Password hashing with bcrypt
- Prisma ORM integration
- Basic audit logging structure

### ❌ Critical Security Gaps

## 1. **Authentication System Enhancements**

### Current Issues
- No password reset functionality
- No session management
- No account lockout mechanism
- No 2FA support
- Missing refresh token rotation

### Required Implementation

#### 1.1 **Password Security**
```typescript
// Password Policy Requirements
interface PasswordPolicy {
  minLength: 12;
  requireUppercase: true;
  requireLowercase: true;
  requireNumbers: true;
  requireSpecialChars: true;
  preventCommonPasswords: true;
  preventPersonalInfo: true;
  maxAge: 90; // days
  historyCount: 12; // prevent reuse of last 12 passwords
}

// Password Validation
class PasswordValidator {
  validate(password: string, user?: User): ValidationResult {
    // Check length, complexity, common passwords
    // Check against user personal info
    // Check against password history
  }
}
```

#### 1.2 **Account Lockout System**
```typescript
interface AccountLockoutConfig {
  maxAttempts: 5;
  lockoutDuration: 15; // minutes
  permanentLockoutAfter: 3; // temporary lockouts
  resetAttemptsAfter: 30; // minutes
}

// Database Schema Addition
model AccountSecurity {
  id              String   @id @default(uuid())
  userId          String   @unique @map("user_id") @db.Uuid
  failedAttempts  Int      @default(0) @map("failed_attempts")
  lockedUntil     DateTime? @map("locked_until")
  permanentLock   Boolean  @default(false) @map("permanent_lock")
  lastFailedLogin DateTime? @map("last_failed_login")
  passwordChanged DateTime @default(now()) @map("password_changed")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

#### 1.3 **Session Management**
```typescript
interface RefreshTokenConfig {
  rotationEnabled: true;
  tokenExpiry: 7; // days
  maxActiveSessions: 3;
  revokeOnPasswordChange: true;
}

// Enhanced Refresh Token Schema
model RefreshToken {
  id           String   @id @default(uuid())
  userId       String   @map("user_id") @db.Uuid
  tokenHash    String   @map("token_hash")
  deviceFingerprint String? @map("device_fingerprint")
  ipAddress    String?  @map("ip_address")
  userAgent    String?  @map("user_agent")
  expiresAt    DateTime @map("expires_at")
  revokedAt    DateTime? @map("revoked_at")
  createdAt    DateTime @default(now()) @map("created_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([tokenHash])
  @@index([expiresAt])
}
```

#### 1.4 **Two-Factor Authentication**
```typescript
interface TwoFactorConfig {
  enabledForRoles: ['ADMIN', 'STAFF'];
  optionalForRoles: ['STUDENT'];
  backupCodesCount: 10;
  totpExpiry: 30; // seconds
}

// 2FA Schema Addition
model UserTwoFactor {
  id                String   @id @default(uuid())
  userId            String   @unique @map("user_id") @db.Uuid
  secret            String   @db.VarChar(32)
  backupCodes       String[] @map("backup_codes")
  enabled           Boolean  @default(false)
  lastUsedBackup    DateTime? @map("last_used_backup")
  createdAt         DateTime @default(now()) @map("created_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## 2. **Authorization & RBAC System**

### Current Issues
- Simple role enum instead of proper RBAC
- No granular permissions
- No resource-level access control

### Required Implementation

#### 2.1 **Complete RBAC Schema**
```typescript
// Permission Categories
enum PermissionCategory {
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  CLEARANCE_READ = 'clearance:read',
  CLEARANCE_WRITE = 'clearance:write',
  CLEARANCE_APPROVE = 'clearance:approve',
  CLEARANCE_OVERRIDE = 'clearance:override',
  DEPARTMENT_READ = 'department:read',
  DEPARTMENT_WRITE = 'department:write',
  SYSTEM_READ = 'system:read',
  SYSTEM_WRITE = 'system:write',
  AUDIT_READ = 'audit:read',
  REPORT_READ = 'report:read',
  REPORT_EXPORT = 'report:export'
}

// Role Definitions
const ROLE_PERMISSIONS = {
  STUDENT: [
    'user:read:own',
    'clearance:read:own',
    'clearance:write:own',
    'notification:read:own'
  ],
  STAFF: [
    'user:read:own',
    'clearance:read:department',
    'clearance:approve:department',
    'notification:read:own'
  ],
  ADMIN: [
    'user:*',
    'clearance:*',
    'department:*',
    'system:*',
    'audit:*',
    'report:*'
  ]
};
```

#### 2.2 **Resource-Level Access Control**
```typescript
interface AccessControlContext {
  userId: string;
  role: string;
  permissions: string[];
  department?: string;
  resourceType: string;
  resourceId: string;
  action: string;
}

class AccessControlService {
  canAccess(context: AccessControlContext): boolean {
    // Check role-based permissions
    // Check resource ownership
    // Check department-level access
    // Check special conditions
  }
}
```

## 3. **API Security Measures**

### 3.1 **Rate Limiting Strategy**
```typescript
interface RateLimitConfig {
  // Auth endpoints (strict)
  auth: {
    windowMs: 15 * 60 * 1000; // 15 minutes
    max: 5; // 5 attempts per window
    skipSuccessfulRequests: false;
  },
  
  // General API
  general: {
    windowMs: 15 * 60 * 1000;
    max: 100; // 100 requests per window
  },
  
  // Admin endpoints
  admin: {
    windowMs: 15 * 60 * 1000;
    max: 200; // 200 requests per window
  },
  
  // File operations
  file: {
    windowMs: 60 * 60 * 1000; // 1 hour
    max: 20; // 20 file operations per hour
  }
};
```

### 3.2 **Input Validation & Sanitization**
```typescript
// Validation Pipeline
class ValidationPipe {
  async transform(value: any, metadata: ArgumentMetadata) {
    // 1. Type validation
    // 2. Business rule validation
    // 3. SQL injection prevention
    // 4. XSS prevention
    // 5. File upload validation
  }
}

// Specific Validators
@ValidatorConstraint({ name: 'strongPassword', async: false })
export class StrongPasswordValidator implements ValidatorConstraintInterface {
  validate(password: string) {
    // Implement strong password validation
  }
}

@ValidatorConstraint({ name: 'noSqlInjection', async: false })
export class NoSqlInjectionValidator implements ValidatorConstraintInterface {
  validate(input: string) {
    // Check for SQL injection patterns
  }
}
```

### 3.3 **CORS & Security Headers**
```typescript
// Security Configuration
const securityConfig = {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
    optionsSuccessStatus: 200
  }
};
```

## 4. **Data Protection**

### 4.1 **Encryption Requirements**
```typescript
// At-Rest Encryption
interface EncryptionConfig {
  // Database fields to encrypt
  encryptedFields: [
    'user.email',
    'user.phone',
    'student_profiles.student_number',
    'audit_logs.details'
  ];
  
  // Encryption algorithm
  algorithm: 'aes-256-gcm';
  
  // Key management
  keyRotationDays: 90;
}

// In-Transit Encryption
const tlsConfig = {
  minVersion: 'TLSv1.2',
  ciphers: [
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305'
  ]
};
```

### 4.2 **Data Retention & Privacy**
```typescript
interface DataRetentionPolicy {
  // User data
  userAccounts: {
    retainAfterDeletion: 7; // days (for audit)
    anonymizeAfter: 365; // days
  };
  
  // Audit logs
  auditLogs: {
    retainDays: 2555; // 7 years
    compressAfterDays: 365;
  };
  
  // Clearance records
  clearanceRecords: {
    retainYears: 10; // permanent for legal
    archiveAfterYears: 2;
  };
  
  // Notifications
  notifications: {
    retainDays: 30;
    cleanupFrequency: 'daily';
  };
}
```

## 5. **Audit & Monitoring**

### 5.1 **Comprehensive Audit Logging**
```typescript
interface AuditLogEntry {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  success: boolean;
  errorMessage?: string;
}

// Audit Decorator
@AuditLog({
  action: 'CLEARANCE_APPROVE',
  resource: 'ClearanceStep',
  sensitiveFields: ['comment', 'rejectionReason']
})
async approveClearanceStep(stepId: string, decision: ApprovalDecision) {
  // Method implementation
}
```

### 5.2 **Security Monitoring**
```typescript
interface SecurityAlert {
  type: 'BRUTE_FORCE' | 'PRIVILEGE_ESCALATION' | 'DATA_BREACH' | 'SUSPICIOUS_ACTIVITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ipAddress: string;
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

// Security Monitoring Service
class SecurityMonitoringService {
  async detectAnomalies() {
    // Detect brute force attacks
    // Detect privilege escalation attempts
    // Detect unusual access patterns
    // Detect data access anomalies
  }
}
```

## 6. **Incident Response Plan**

### 6.1 **Security Incident Types**
```typescript
enum IncidentType {
  DATA_BREACH = 'DATA_BREACH',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  SYSTEM_COMPROMISE = 'SYSTEM_COMPROMISE',
  DENIAL_OF_SERVICE = 'DENIAL_OF_SERVICE',
  MALICIOUS_CODE = 'MALICIOUS_CODE',
  INSIDER_THREAT = 'INSIDER_THREAT'
}

interface IncidentResponse {
  immediateActions: string[];
  investigationSteps: string[];
  containmentMeasures: string[];
  recoverySteps: string[];
  notificationRequirements: string[];
  documentationRequirements: string[];
}
```

### 6.2 **Automated Response**
```typescript
class AutomatedSecurityResponse {
  async handleSecurityAlert(alert: SecurityAlert) {
    switch (alert.type) {
      case 'BRUTE_FORCE':
        await this.blockIPAddress(alert.ipAddress);
        await this.lockUserAccount(alert.userId);
        break;
      case 'PRIVILEGE_ESCALATION':
        await this.revokeUserSessions(alert.userId);
        await this.notifySecurityTeam(alert);
        break;
      // Additional cases
    }
  }
}
```

## Implementation Priority

### Phase 1: Critical Security (Week 1-2)
1. **Password policy enforcement**
2. **Account lockout system**
3. **Session management with refresh tokens**
4. **Basic RBAC implementation**

### Phase 2: Enhanced Security (Week 3-4)
1. **Two-factor authentication**
2. **Advanced rate limiting**
3. **Comprehensive audit logging**
4. **Security monitoring**

### Phase 3: Data Protection (Week 5-6)
1. **Field-level encryption**
2. **Data retention policies**
3. **Privacy controls**
4. **Incident response automation**

### Phase 4: Compliance & Monitoring (Week 7-8)
1. **Compliance reporting**
2. **Security dashboards**
3. **Automated security testing**
4. **Penetration testing preparation**

## Compliance Considerations

### 1. **Data Protection Regulations**
- GDPR compliance for EU students
- Local data protection laws
- Educational data privacy regulations

### 2. **Audit Requirements**
- Immutable audit trails
- Regulatory reporting capabilities
- Data access logging

### 3. **Security Standards**
- ISO 27001 alignment
- NIST Cybersecurity Framework
- OWASP Top 10 mitigation

## Testing Security

### 1. **Security Testing Types**
- Unit tests for security functions
- Integration tests for auth flows
- Penetration testing
- Vulnerability scanning
- Load testing for DoS resistance

### 2. **Security Test Coverage**
- Authentication bypass attempts
- Authorization escalation tests
- Input validation bypasses
- Session hijacking attempts
- Data exposure tests

This security specification provides a comprehensive framework for implementing enterprise-grade security in the BHU Clearance System.
