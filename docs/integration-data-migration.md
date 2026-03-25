# BHU Clearance System - Integration Points & Data Migration Strategy

## Overview

This document outlines the integration points with existing university systems and provides a comprehensive data migration strategy for transitioning from manual paper-based clearance to the digital BHU Clearance System.

## 1. **Integration Points Analysis**

### 1.1 **Existing University Systems**

#### **Student Information System (SIS)**
```typescript
// Integration Interface
interface SISIntegration {
  // Student data synchronization
  syncStudentData(): Promise<StudentSyncResult>;
  
  // Real-time student verification
  verifyStudent(studentId: string): Promise<StudentVerification>;
  
  // Academic status updates
  updateAcademicStatus(studentId: string, status: AcademicStatus): Promise<void>;
  
  // Graduation status
  getGraduationStatus(studentId: string): Promise<GraduationStatus>;
}

// Expected Data Format from SIS
interface SISStudentData {
  studentId: string;
  universityId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone?: string;
  college: string;
  department: string;
  program: string;
  academicYear: string;
  admissionYear: number;
  expectedGraduationYear: number;
  currentStatus: 'ACTIVE' | 'GRADUATED' | 'SUSPENDED' | 'WITHDRAWN';
  gpa?: number;
  completedCredits?: number;
  totalCredits?: number;
}
```

#### **Library Management System**
```typescript
interface LibraryIntegration {
  // Check library clearance status
  getLibraryStatus(studentId: string): Promise<LibraryStatus>;
  
  // Overdue books and fines
  getOverdueItems(studentId: string): Promise<LibraryItem[]>;
  
  // Update clearance status
  updateClearanceStatus(studentId: string, status: 'CLEARED' | 'BLOCKED'): Promise<void>;
  
  // Generate library report
  generateClearanceReport(studentId: string): Promise<LibraryReport>;
}

interface LibraryStatus {
  hasOverdueBooks: boolean;
  outstandingFines: number;
  hasUnreturnedItems: boolean;
  canClear: boolean;
  blockReasons: string[];
}
```

#### **Financial System**
```typescript
interface FinancialIntegration {
  // Fee status check
  getFeeStatus(studentId: string): Promise<FeeStatus>;
  
  // Outstanding payments
  getOutstandingPayments(studentId: string): Promise<Payment[]>;
  
  // Payment history
  getPaymentHistory(studentId: string): Promise<PaymentHistory>;
  
  // Cost sharing status
  getCostSharingStatus(studentId: string): Promise<CostSharingStatus>;
}

interface FeeStatus {
  totalFees: number;
  paidAmount: number;
  balance: number;
  hasOutstandingFees: boolean;
  paymentPlanActive: boolean;
  canClear: boolean;
}
```

#### **Dormitory Management System**
```typescript
interface DormitoryIntegration {
  // Room assignment status
  getRoomStatus(studentId: string): Promise<RoomStatus>;
  
  // Check-out requirements
  getCheckoutRequirements(studentId: string): Promise<CheckoutRequirement[]>;
  
  // Key return status
  getKeyReturnStatus(studentId: string): Promise<KeyReturnStatus>;
  
  // Damage charges
  getDamageCharges(studentId: string): Promise<DamageCharge[]>;
}

interface RoomStatus {
  hasRoomAssignment: boolean;
  roomNumber?: string;
  building?: string;
  checkoutRequired: boolean;
  keyReturned: boolean;
  hasDamageCharges: boolean;
  canClear: boolean;
}
```

#### **Human Resources System**
```typescript
interface HRIntegration {
  // Staff data synchronization
  syncStaffData(): Promise<StaffSyncResult>;
  
  // Department assignments
  getDepartmentStaff(departmentCode: string): Promise<StaffMember[]>;
  
  // Staff verification
  verifyStaff(staffId: string): Promise<StaffVerification>;
  
  // Role assignments
  updateStaffRole(staffId: string, role: string, department: string): Promise<void>;
}
```

### 1.2 **Integration Architecture**

#### **API Gateway Pattern**
```typescript
// Integration Gateway Service
@Injectable()
export class IntegrationGatewayService {
  constructor(
    private readonly sisService: SISIntegrationService,
    private readonly libraryService: LibraryIntegrationService,
    private readonly financialService: FinancialIntegrationService,
    private readonly dormitoryService: DormitoryIntegrationService,
    private readonly hrService: HRIntegrationService,
  ) {}

  // Unified student data sync
  async syncStudentData(studentId: string): Promise<SyncResult> {
    const results = await Promise.allSettled([
      this.sisService.getStudentData(studentId),
      this.libraryService.getLibraryStatus(studentId),
      this.financialService.getFeeStatus(studentId),
      this.dormitoryService.getRoomStatus(studentId),
    ]);

    return this.aggregateSyncResults(results);
  }

  // Real-time status verification
  async verifyClearanceEligibility(studentId: string): Promise<EligibilityResult> {
    const [sisData, libraryStatus, feeStatus, roomStatus] = await Promise.all([
      this.sisService.verifyStudent(studentId),
      this.libraryService.getLibraryStatus(studentId),
      this.financialService.getFeeStatus(studentId),
      this.dormitoryService.getRoomStatus(studentId),
    ]);

    return {
      eligible: this.calculateEligibility(sisData, libraryStatus, feeStatus, roomStatus),
      blockingIssues: this.identifyBlockingIssues(libraryStatus, feeStatus, roomStatus),
      recommendations: this.generateRecommendations(sisData, libraryStatus, feeStatus, roomStatus),
    };
  }
}
```

#### **Message Queue Integration**
```typescript
// Event-driven integration
@Injectable()
export class IntegrationEventService {
  constructor(
    private readonly eventBus: EventBus,
    private readonly sisService: SISIntegrationService,
  ) {}

  @OnEvent('student.created')
  async handleStudentCreated(event: StudentCreatedEvent) {
    // Sync to SIS
    await this.sisService.createStudent(event.studentData);
    
    // Notify other systems
    this.eventBus.publish(new StudentSyncedEvent(event.studentId));
  }

  @OnEvent('clearance.completed')
  async handleClearanceCompleted(event: ClearanceCompletedEvent) {
    // Update SIS graduation status
    await this.sisService.updateGraduationStatus(event.studentId, 'CLEARED');
    
    // Notify financial system for final fee check
    await this.eventBus.publish(new FinalFeeCheckEvent(event.studentId));
  }
}
```

## 2. **Data Migration Strategy**

### 2.1 **Migration Phases**

#### **Phase 1: Discovery & Planning (Week 1-2)**
```typescript
// Data Discovery Service
@Injectable()
export class DataDiscoveryService {
  async analyzeLegacyData(): Promise<DataAnalysisResult> {
    const analysis = {
      totalStudents: await this.countLegacyStudents(),
      totalStaff: await this.countLegacyStaff(),
      dataQuality: await this.assessDataQuality(),
      missingFields: await this.identifyMissingFields(),
      duplicateRecords: await this.identifyDuplicates(),
      dataMapping: await this.createDataMapping(),
    };

    return analysis;
  }

  private async assessDataQuality(): Promise<DataQualityReport> {
    return {
      completeness: await this.checkCompleteness(),
      accuracy: await this.checkAccuracy(),
      consistency: await this.checkConsistency(),
      validity: await this.checkValidity(),
    };
  }
}
```

#### **Phase 2: Data Extraction (Week 3-4)**
```typescript
// Data Extraction Service
@Injectable()
export class DataExtractionService {
  async extractStudentData(): Promise<ExtractedStudentData[]> {
    // Extract from legacy system
    const legacyData = await this.extractFromLegacySystem();
    
    // Transform to new format
    const transformedData = await this.transformStudentData(legacyData);
    
    // Validate extracted data
    const validatedData = await this.validateExtractedData(transformedData);
    
    return validatedData;
  }

  private async transformStudentData(legacyData: LegacyStudentData[]): Promise<StudentData[]> {
    return legacyData.map(legacy => ({
      universityId: legacy.UNIV_ID,
      email: legacy.EMAIL_ADDRESS,
      firstName: legacy.FIRST_NAME,
      lastName: legacy.LAST_NAME,
      studentUniversityId: legacy.STUDENT_ID,
      studentDepartment: legacy.DEPARTMENT_NAME,
      studentYear: legacy.ACADEMIC_YEAR,
      role: 'STUDENT',
      // Map other fields...
    }));
  }
}
```

#### **Phase 3: Data Validation & Cleansing (Week 5-6)**
```typescript
// Data Validation Service
@Injectable()
export class DataValidationService {
  async validateStudentData(data: StudentData[]): Promise<ValidationResult> {
    const results = {
      valid: [],
      invalid: [],
      warnings: [],
    };

    for (const student of data) {
      const validation = await this.validateStudent(student);
      
      if (validation.isValid) {
        results.valid.push(student);
      } else {
        results.invalid.push({ student, errors: validation.errors });
      }

      if (validation.warnings.length > 0) {
        results.warnings.push({ student, warnings: validation.warnings });
      }
    }

    return results;
  }

  private async validateStudent(student: StudentData): Promise<StudentValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field validation
    if (!student.email) errors.push('Email is required');
    if (!student.firstName) errors.push('First name is required');
    if (!student.lastName) errors.push('Last name is required');

    // Email format validation
    if (student.email && !this.isValidEmail(student.email)) {
      errors.push('Invalid email format');
    }

    // Duplicate check
    if (await this.isDuplicateStudent(student)) {
      errors.push('Duplicate student record');
    }

    // Department validation
    if (!await this.isValidDepartment(student.studentDepartment)) {
      warnings.push('Unknown department');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
```

#### **Phase 4: Data Migration (Week 7-8)**
```typescript
// Data Migration Service
@Injectable()
export class DataMigrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validationService: DataValidationService,
  ) {}

  async migrateStudentData(data: StudentData[]): Promise<MigrationResult> {
    const result: MigrationResult = {
      total: data.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Process in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      const batchResult = await this.migrateBatch(batch);
      
      result.successful += batchResult.successful;
      result.failed += batchResult.failed;
      result.errors.push(...batchResult.errors);

      // Log progress
      console.log(`Migrated ${i + batch.length} of ${data.length} records`);
    }

    return result;
  }

  private async migrateBatch(batch: StudentData[]): Promise<BatchResult> {
    const result: BatchResult = {
      successful: 0,
      failed: 0,
      errors: [],
    };

    for (const student of batch) {
      try {
        await this.prisma.user.create({
          data: {
            email: student.email,
            passwordHash: await this.generateTempPassword(),
            role: 'STUDENT',
            displayName: `${student.firstName} ${student.lastName}`,
            studentUniversityId: student.studentUniversityId,
            studentDepartment: student.studentDepartment,
            studentYear: student.studentYear,
            universityId: student.universityId,
          },
        });

        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          studentId: student.studentUniversityId,
          error: error.message,
        });
      }
    }

    return result;
  }
}
```

#### **Phase 5: Verification & Reconciliation (Week 9-10)**
```typescript
// Data Reconciliation Service
@Injectable()
export class DataReconciliationService {
  async reconcileData(): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      sourceSystemCount: await this.getSourceSystemCount(),
      targetSystemCount: await this.getTargetSystemCount(),
      mismatchedRecords: [],
      missingRecords: [],
      duplicateRecords: [],
    };

    // Compare counts
    if (report.sourceSystemCount !== report.targetSystemCount) {
      report.missingRecords = await this.findMissingRecords();
    }

    // Find mismatches
    report.mismatchedRecords = await this.findMismatchedRecords();

    // Find duplicates in target
    report.duplicateRecords = await this.findDuplicateRecords();

    return report;
  }

  private async findMissingRecords(): Promise<string[]> {
    // Compare source and target to find missing records
    const sourceIds = await this.getSourceStudentIds();
    const targetIds = await this.getTargetStudentIds();
    
    return sourceIds.filter(id => !targetIds.includes(id));
  }
}
```

### 2.2 **Migration Scripts**

#### **Student Data Migration**
```sql
-- Student Data Migration Script
-- Step 1: Create staging table
CREATE TABLE staging_students (
    id SERIAL PRIMARY KEY,
    legacy_student_id VARCHAR(50),
    university_id VARCHAR(50),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(200),
    department VARCHAR(200),
    academic_year VARCHAR(20),
    phone VARCHAR(20),
    admission_year INTEGER,
    data_source VARCHAR(50),
    import_date TIMESTAMP DEFAULT NOW(),
    validation_status VARCHAR(20) DEFAULT 'PENDING'
);

-- Step 2: Data validation constraints
ALTER TABLE staging_students 
ADD CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
ADD CONSTRAINT chk_year_range CHECK (admission_year BETWEEN 2000 AND EXTRACT(YEAR FROM NOW()) + 1);

-- Step 3: Migration procedure
CREATE OR REPLACE FUNCTION migrate_students()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    student_record RECORD;
BEGIN
    FOR student_record IN 
        SELECT * FROM staging_students 
        WHERE validation_status = 'VALID'
    LOOP
        BEGIN
            INSERT INTO app_users (
                university_id,
                email,
                password_hash,
                role,
                display_name,
                student_university_id,
                student_department,
                student_year,
                created_at,
                updated_at
            ) VALUES (
                student_record.university_id,
                student_record.email,
                crypt('tempPassword123', gen_salt('bf')),
                'STUDENT',
                TRIM(student_record.first_name || ' ' || COALESCE(student_record.last_name, '')),
                student_record.legacy_student_id,
                student_record.department,
                student_record.academic_year,
                NOW(),
                NOW()
            );
            
            migrated_count := migrated_count + 1;
            
            UPDATE staging_students 
            SET validation_status = 'MIGRATED' 
            WHERE id = student_record.id;
            
        EXCEPTION WHEN OTHERS THEN
            UPDATE staging_students 
            SET validation_status = 'ERROR: ' || SQLERRM 
            WHERE id = student_record.id;
        END;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;
```

#### **Staff Data Migration**
```sql
-- Staff Data Migration Script
CREATE OR REPLACE FUNCTION migrate_staff()
RETURNS INTEGER AS $$
DECLARE
    migrated_count INTEGER := 0;
    staff_record RECORD;
    department_id UUID;
BEGIN
    FOR staff_record IN 
        SELECT * FROM staging_staff 
        WHERE validation_status = 'VALID'
    LOOP
        BEGIN
            -- Get department UUID
            SELECT id INTO department_id 
            FROM departments 
            WHERE code = staff_record.department_code;
            
            IF department_id IS NULL THEN
                RAISE EXCEPTION 'Department not found: %', staff_record.department_code;
            END IF;
            
            -- Insert user
            INSERT INTO app_users (
                university_id,
                email,
                password_hash,
                role,
                display_name,
                staff_department,
                created_at,
                updated_at
            ) VALUES (
                staff_record.university_id,
                staff_record.email,
                crypt('tempPassword123', gen_salt('bf')),
                'STAFF',
                TRIM(staff_record.first_name || ' ' || COALESCE(staff_record.last_name, '')),
                staff_record.department_name,
                NOW(),
                NOW()
            ) RETURNING id INTO staff_record.user_id;
            
            -- Insert staff profile
            INSERT INTO staff_profiles (
                user_id,
                department_id,
                title,
                hire_date,
                created_at,
                updated_at
            ) VALUES (
                staff_record.user_id,
                department_id,
                staff_record.title,
                staff_record.hire_date,
                NOW(),
                NOW()
            );
            
            migrated_count := migrated_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            UPDATE staging_staff 
            SET validation_status = 'ERROR: ' || SQLERRM 
            WHERE id = staff_record.id;
        END;
    END LOOP;
    
    RETURN migrated_count;
END;
$$ LANGUAGE plpgsql;
```

## 3. **Integration Implementation**

### 3.1 **SIS Integration Service**
```typescript
@Injectable()
export class SISIntegrationService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly httpService: HttpService) {
    this.baseUrl = process.env.SIS_API_URL;
    this.apiKey = process.env.SIS_API_KEY;
  }

  async getStudentData(studentId: string): Promise<SISStudentData> {
    try {
      const response = await this.httpService
        .get(`${this.baseUrl}/api/students/${studentId}`, {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        })
        .toPromise();

      return this.transformSISData(response.data);
    } catch (error) {
      throw new IntegrationException('SIS integration failed', error);
    }
  }

  async syncAllStudents(): Promise<SyncResult> {
    const batchSize = 100;
    let totalSynced = 0;
    let hasErrors = false;

    try {
      // Get total count first
      const totalCount = await this.getStudentCount();
      
      for (let offset = 0; offset < totalCount; offset += batchSize) {
        const students = await this.getStudentBatch(offset, batchSize);
        
        for (const student of students) {
          try {
            await this.syncStudent(student);
            totalSynced++;
          } catch (error) {
            console.error(`Failed to sync student ${student.studentId}:`, error);
            hasErrors = true;
          }
        }
      }

      return {
        totalProcessed: totalCount,
        successful: totalSynced,
        hasErrors,
        errors: hasErrors ? ['Some students failed to sync'] : [],
      };
    } catch (error) {
      throw new IntegrationException('Student sync failed', error);
    }
  }

  private async syncStudent(studentData: SISStudentData): Promise<void> {
    // Check if student exists
    const existingStudent = await this.prisma.user.findUnique({
      where: { studentUniversityId: studentData.studentId },
    });

    if (existingStudent) {
      // Update existing student
      await this.prisma.user.update({
        where: { id: existingStudent.id },
        data: {
          email: studentData.email,
          displayName: `${studentData.firstName} ${studentData.lastName}`,
          studentDepartment: studentData.department,
          studentYear: studentData.academicYear,
        },
      });
    } else {
      // Create new student
      await this.prisma.user.create({
        data: {
          universityId: studentData.universityId,
          email: studentData.email,
          passwordHash: await this.generateTempPassword(),
          role: 'STUDENT',
          displayName: `${studentData.firstName} ${studentData.lastName}`,
          studentUniversityId: studentData.studentId,
          studentDepartment: studentData.department,
          studentYear: studentData.academicYear,
        },
      });
    }
  }
}
```

### 3.2 **Library Integration Service**
```typescript
@Injectable()
export class LibraryIntegrationService {
  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async getLibraryStatus(studentId: string): Promise<LibraryStatus> {
    try {
      const response = await this.httpService
        .get(`${process.env.LIBRARY_API_URL}/api/patrons/${studentId}/status`)
        .toPromise();

      const data = response.data;
      
      return {
        hasOverdueBooks: data.overdueItems > 0,
        outstandingFines: data.totalFines,
        hasUnreturnedItems: data.unreturnedItems > 0,
        canClear: data.totalFines === 0 && data.unreturnedItems === 0,
        blockReasons: this.generateBlockReasons(data),
      };
    } catch (error) {
      // Return default status if integration fails
      return {
        hasOverdueBooks: false,
        outstandingFines: 0,
        hasUnreturnedItems: false,
        canClear: true,
        blockReasons: ['Unable to verify library status'],
      };
    }
  }

  async autoUpdateLibraryStatus(studentId: string): Promise<void> {
    const status = await this.getLibraryStatus(studentId);
    
    // Find active clearance request
    const clearance = await this.prisma.clearance.findFirst({
      where: {
        studentUserId: studentId,
        status: 'IN_PROGRESS',
      },
      include: {
        steps: {
          where: { department: 'Library' },
        },
      },
    });

    if (clearance && clearance.steps.length > 0) {
      const libraryStep = clearance.steps[0];
      
      if (status.canClear && libraryStep.status === 'PENDING') {
        // Auto-approve if no issues
        await this.prisma.clearanceStep.update({
          where: { id: libraryStep.id },
          data: {
            status: 'APPROVED',
            comment: 'Auto-approved: No library issues found',
            reviewedAt: new Date(),
          },
        });
      } else if (!status.canClear && libraryStep.status === 'APPROVED') {
        // Revoke approval if issues found
        await this.prisma.clearanceStep.update({
          where: { id: libraryStep.id },
          data: {
            status: 'PENDING',
            comment: 'Library issues detected: ' + status.blockReasons.join(', '),
          },
        });
      }
    }
  }

  private generateBlockReasons(data: any): string[] {
    const reasons: string[] = [];
    
    if (data.overdueItems > 0) {
      reasons.push(`${data.overdueItems} overdue items`);
    }
    
    if (data.totalFines > 0) {
      reasons.push(`Outstanding fines: ${data.totalFines} ETB`);
    }
    
    if (data.unreturnedItems > 0) {
      reasons.push(`${data.unreturnedItems} unreturned items`);
    }
    
    return reasons;
  }
}
```

## 4. **Data Synchronization**

### 4.1 **Scheduled Synchronization**
```typescript
@Injectable()
export class DataSyncService {
  constructor(
    private readonly sisService: SISIntegrationService,
    private readonly libraryService: LibraryIntegrationService,
    private readonly financialService: FinancialIntegrationService,
  ) {}

  @Cron('0 2 * * *') // Daily at 2 AM
  async dailyStudentSync(): Promise<void> {
    console.log('Starting daily student synchronization...');
    
    try {
      const result = await this.sisService.syncAllStudents();
      console.log(`Student sync completed: ${result.successful}/${result.totalProcessed}`);
      
      if (result.hasErrors) {
        await this.notifyAdmin('Student sync completed with errors', result.errors);
      }
    } catch (error) {
      console.error('Student sync failed:', error);
      await this.notifyAdmin('Student sync failed', [error.message]);
    }
  }

  @Cron('0 */6 * * *') // Every 6 hours
  async libraryStatusSync(): Promise<void> {
    console.log('Starting library status synchronization...');
    
    try {
      // Get students with active clearance requests
      const activeStudents = await this.getActiveClearanceStudents();
      
      for (const student of activeStudents) {
        await this.libraryService.autoUpdateLibraryStatus(student.id);
      }
      
      console.log(`Library status sync completed for ${activeStudents.length} students`);
    } catch (error) {
      console.error('Library status sync failed:', error);
    }
  }

  @Cron('0 3 * * 0') // Weekly on Sunday at 3 AM
  async fullDataReconciliation(): Promise<void> {
    console.log('Starting weekly data reconciliation...');
    
    try {
      const reconciliation = await this.reconciliationService.reconcileData();
      
      if (reconciliation.hasIssues) {
        await this.generateReconciliationReport(reconciliation);
        await this.notifyAdmin('Data reconciliation found issues', reconciliation.issues);
      }
      
      console.log('Data reconciliation completed');
    } catch (error) {
      console.error('Data reconciliation failed:', error);
    }
  }
}
```

### 4.2 **Real-time Synchronization**
```typescript
@Injectable()
export class RealtimeSyncService {
  constructor(
    private readonly eventBus: EventBus,
    private readonly sisService: SISIntegrationService,
  ) {}

  @OnEvent('student.updated')
  async handleStudentUpdate(event: StudentUpdatedEvent): Promise<void> {
    try {
      // Update local database
      await this.updateLocalStudent(event.studentId, event.updates);
      
      // Notify other systems if needed
      if (event.updates.department || event.updates.academicStatus) {
        await this.notifyClearanceSystem(event.studentId, event.updates);
      }
    } catch (error) {
      console.error('Failed to handle student update:', error);
    }
  }

  @OnEvent('library.status_changed')
  async handleLibraryStatusChange(event: LibraryStatusChangedEvent): Promise<void> {
    try {
      await this.updateClearanceStep(event.studentId, 'Library', event.newStatus);
      
      // Notify student if status changed
      if (event.notifyStudent) {
        await this.notificationService.notifyStudent(
          event.studentId,
          'Library clearance status updated',
          `Your library clearance status is now: ${event.newStatus}`
        );
      }
    } catch (error) {
      console.error('Failed to handle library status change:', error);
    }
  }
}
```

## 5. **Error Handling & Recovery**

### 5.1 **Integration Error Handling**
```typescript
@Injectable()
export class IntegrationErrorHandler {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly auditService: AuditService,
  ) {}

  async handleIntegrationError(
    integration: string,
    operation: string,
    error: Error,
    context?: any
  ): Promise<void> {
    // Log the error
    console.error(`Integration error in ${integration}.${operation}:`, error);
    
    // Create audit record
    await this.auditService.logIntegrationError({
      integration,
      operation,
      errorMessage: error.message,
      context,
      timestamp: new Date(),
    });

    // Determine error severity and action
    const severity = this.determineSeverity(error);
    
    switch (severity) {
      case 'LOW':
        // Log only, no notification
        break;
        
      case 'MEDIUM':
        // Notify IT team
        await this.notifyITTeam(integration, operation, error);
        break;
        
      case 'HIGH':
        // Notify all administrators
        await this.notifyAdministrators(integration, operation, error);
        // Consider failing over to backup system
        await this.initiateFailover(integration);
        break;
        
      case 'CRITICAL':
        // Emergency notification
        await this.emergencyNotification(integration, operation, error);
        // Stop dependent operations
        await this.pauseDependentOperations(integration);
        break;
    }
  }

  private determineSeverity(error: Error): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (error.code === 'TIMEOUT') return 'MEDIUM';
    if (error.code === 'CONNECTION_FAILED') return 'HIGH';
    if (error.code === 'AUTHENTICATION_FAILED') return 'CRITICAL';
    if (error.code === 'DATA_CORRUPTION') return 'CRITICAL';
    return 'LOW';
  }
}
```

### 5.2 **Data Recovery Procedures**
```typescript
@Injectable()
export class DataRecoveryService {
  async recoverFailedMigration(migrationId: string): Promise<RecoveryResult> {
    const migration = await this.getMigrationRecord(migrationId);
    
    if (!migration) {
      throw new Error('Migration record not found');
    }

    const result: RecoveryResult = {
      migrationId,
      recordsAttempted: 0,
      recordsRecovered: 0,
      recordsFailed: 0,
      errors: [],
    };

    try {
      // Get failed records
      const failedRecords = await this.getFailedRecords(migrationId);
      result.recordsAttempted = failedRecords.length;

      // Attempt to recover each record
      for (const record of failedRecords) {
        try {
          await this.recoverRecord(record);
          result.recordsRecovered++;
        } catch (error) {
          result.recordsFailed++;
          result.errors.push({
            recordId: record.id,
            error: error.message,
          });
        }
      }

      // Update migration status
      await this.updateMigrationStatus(migrationId, result);

      return result;
    } catch (error) {
      throw new RecoveryException('Recovery failed', error);
    }
  }

  private async recoverRecord(record: FailedRecord): Promise<void> {
    // Analyze failure reason
    const failureReason = await this.analyzeFailure(record);
    
    switch (failureReason.type) {
      case 'VALIDATION_ERROR':
        // Fix validation issues
        const fixedRecord = await this.fixValidationIssues(record);
        await this.retryMigration(fixedRecord);
        break;
        
      case 'DUPLICATE_RECORD':
        // Handle duplicates
        await this.resolveDuplicate(record);
        break;
        
      case 'DEPENDENCY_ERROR':
        // Fix dependency issues
        await this.resolveDependencies(record);
        break;
        
      default:
        throw new Error(`Unknown failure type: ${failureReason.type}`);
    }
  }
}
```

## 6. **Testing & Validation**

### 6.1 **Integration Testing**
```typescript
describe('Integration Services', () => {
  let sisService: SISIntegrationService;
  let libraryService: LibraryIntegrationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SISIntegrationService,
        LibraryIntegrationService,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
      ],
    }).compile();

    sisService = module.get<SISIntegrationService>(SISIntegrationService);
    libraryService = module.get<LibraryIntegrationService>(LibraryIntegrationService);
  });

  describe('SIS Integration', () => {
    it('should retrieve student data successfully', async () => {
      const mockStudentData = {
        studentId: '12345',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@bhu.edu',
      };

      mockHttpService.get.mockReturnValue(of({ data: mockStudentData }));

      const result = await sisService.getStudentData('12345');

      expect(result).toEqual(mockStudentData);
      expect(mockHttpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/students/12345'),
        expect.any(Object)
      );
    });

    it('should handle API failures gracefully', async () => {
      mockHttpService.get.mockReturnValue(throwError(new Error('API Error')));

      await expect(sisService.getStudentData('12345')).rejects.toThrow(
        IntegrationException
      );
    });
  });

  describe('Library Integration', () => {
    it('should check library clearance status', async () => {
      const mockStatus = {
        overdueItems: 0,
        totalFines: 0,
        unreturnedItems: 0,
      };

      mockHttpService.get.mockReturnValue(of({ data: mockStatus }));

      const result = await libraryService.getLibraryStatus('12345');

      expect(result.canClear).toBe(true);
      expect(result.hasOverdueBooks).toBe(false);
    });
  });
});
```

### 6.2 **Migration Testing**
```typescript
describe('Data Migration', () => {
  let migrationService: DataMigrationService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [DataMigrationService, PrismaService],
    }).compile();

    migrationService = module.get<DataMigrationService>(DataMigrationService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should migrate student data successfully', async () => {
    const testData = [
      {
        email: 'test1@bhu.edu',
        firstName: 'Test',
        lastName: 'Student1',
        studentUniversityId: '1001',
        studentDepartment: 'Computer Science',
        studentYear: '4',
        universityId: 'bhu-main',
      },
      {
        email: 'test2@bhu.edu',
        firstName: 'Test',
        lastName: 'Student2',
        studentUniversityId: '1002',
        studentDepartment: 'Engineering',
        studentYear: '3',
        universityId: 'bhu-main',
      },
    ];

    const result = await migrationService.migrateStudentData(testData);

    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);

    // Verify data in database
    const users = await prisma.user.findMany({
      where: {
        studentUniversityId: { in: ['1001', '1002'] },
      },
    });

    expect(users).toHaveLength(2);
    expect(users[0].email).toBe('test1@bhu.edu');
    expect(users[1].email).toBe('test2@bhu.edu');
  });
});
```

## 7. **Monitoring & Reporting**

### 7.1 **Integration Monitoring**
```typescript
@Injectable()
export class IntegrationMonitoringService {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly alertService: AlertService,
  ) {}

  async trackIntegrationMetrics(
    integration: string,
    operation: string,
    duration: number,
    success: boolean
  ): Promise<void> {
    // Record metrics
    this.metricsService.recordHistogram('integration_duration', duration, {
      integration,
      operation,
      success: success.toString(),
    });

    this.metricsService.recordCounter('integration_requests', 1, {
      integration,
      operation,
      status: success ? 'success' : 'failure',
    });

    // Check for alerts
    if (!success) {
      const failureRate = await this.getRecentFailureRate(integration);
      
      if (failureRate > 0.1) { // 10% failure rate
        await this.alertService.sendAlert({
          severity: 'HIGH',
          message: `High failure rate for ${integration}: ${failureRate.toFixed(2)}%`,
          integration,
          operation,
        });
      }
    }
  }

  async getIntegrationHealth(): Promise<IntegrationHealthReport> {
    const integrations = ['SIS', 'Library', 'Financial', 'Dormitory'];
    const report: IntegrationHealthReport = {
      overall: 'HEALTHY',
      integrations: {},
      lastUpdated: new Date(),
    };

    for (const integration of integrations) {
      const health = await this.checkIntegrationHealth(integration);
      report.integrations[integration] = health;

      if (health.status !== 'HEALTHY') {
        report.overall = 'DEGRADED';
      }
    }

    return report;
  }

  private async checkIntegrationHealth(integration: string): Promise<IntegrationHealth> {
    const recentMetrics = await this.getRecentMetrics(integration);
    
    return {
      status: this.calculateHealthStatus(recentMetrics),
      lastSuccess: recentMetrics.lastSuccess,
      averageResponseTime: recentMetrics.avgResponseTime,
      failureRate: recentMetrics.failureRate,
      errorCount: recentMetrics.errorCount,
    };
  }
}
```

## 8. **Implementation Timeline**

### 8.1 **Integration Implementation Schedule**
```markdown
## Integration Implementation Timeline

### Week 1-2: Integration Setup
- Set up API connections with external systems
- Configure authentication and security
- Implement basic health checks
- Set up monitoring and logging

### Week 3-4: SIS Integration
- Implement student data synchronization
- Set up real-time student updates
- Test data validation and transformation
- Implement error handling

### Week 5-6: Department System Integrations
- Library system integration
- Financial system integration
- Dormitory system integration
- HR system integration

### Week 7-8: Data Migration
- Extract data from legacy systems
- Validate and cleanse data
- Execute migration scripts
- Verify data integrity

### Week 9-10: Testing & Validation
- End-to-end integration testing
- Performance testing
- Security testing
- User acceptance testing

### Week 11-12: Go-Live Preparation
- Final system configuration
- Staff training
- Documentation completion
- Go-live checklist verification
```

This comprehensive integration and migration strategy ensures a smooth transition from manual processes to the digital BHU Clearance System while maintaining data integrity and system reliability.
