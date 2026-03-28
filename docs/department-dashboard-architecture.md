# BHU Clearance System - Department Dashboard Architecture

## Executive Summary

This document outlines a **zero-duplication architecture** for implementing 13 department-specific dashboards that extend the existing `BaseDepartmentDashboard` foundation.

---

## 1. Core Architecture: The "Plugin Pattern"

### Design Philosophy
```
┌─────────────────────────────────────────────────────────────┐
│                    BASE DASHBOARD                          │
│  (Shared: Lists, Filters, Pagination, Common UI)           │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Library    │   │  Dormitory   │   │   Finance    │
│  Dashboard   │   │  Dashboard   │   │  Dashboard   │
│  - Book list │   │  - Room insp │   │  - Calculator│
│  - Fine calc │   │  - Key track  │   │  - Receipts  │
└──────────────┘   └──────────────┘   └──────────────┘
```

### Key Principle
**Composition over Inheritance**: Each department dashboard "plugs into" the base dashboard via:
1. **Config-driven UI** - Department config defines requirements checklist
2. **Extension slots** - Base dashboard renders department-specific components via `children`
3. **Shared state management** - Base handles common state, extensions handle specific data

---

## 2. File Structure (Zero Duplication)

```
frontend/src/components/departments/
├── department-config.ts          # ✓ EXISTS - All 13 dept configs
├── BaseDepartmentDashboard.tsx   # ✓ EXISTS - Shared foundation
│
├── extensions/                   # 🆕 Department-specific extensions
│   ├── LibraryExtension.tsx      # Book return tracking, fine calculator
│   ├── DormitoryExtension.tsx    # Room inspection, key tracking
│   ├── FinanceExtension.tsx      # Payment calculator, receipt verification
│   ├── PoliceExtension.tsx       # ID verification, incident notes
│   ├── SportsExtension.tsx       # Equipment checklist, uniform tracking
│   └── StandardExtension.tsx     # Default for depts without special needs
│
├── DepartmentDashboard.tsx       # 🆕 Router that selects correct extension
└── index.ts                      # 🆕 Clean exports

backend/src/clearance/
├── clearance.service.ts          # ✓ EXISTS - Update for dept data
├── staff-clearance.controller.ts # ✓ EXISTS - Add dept endpoints
├── dto/
│   ├── review-step.dto.ts        # ✓ EXISTS - Update for dept payload
│   └── department-data.dto.ts    # 🆕 Department-specific data types
└── department-data.service.ts    # 🆕 Handle dept-specific persistence
```

---

## 3. Role & Permission Architecture

### Current State
```prisma
enum Role {
  STUDENT
  STAFF      // Has staffDepartment field
  ADMIN
}
```

### Department Assignment Strategy
**Option A: Single Department per Staff** (Current - Recommended)
```typescript
// User.staffDepartment = "Library"
// Staff can only review Library steps
```
**Pros**: Simple, secure, clear accountability  
**Cons**: Staff can't cover multiple desks

**Option B: Multiple Departments per Staff** (Future Enhancement)
```typescript
// New table: StaffDepartmentAssignment
model StaffDepartment {
  userId      String
  department  String
  isPrimary   Boolean
  canReview   Boolean
}
```

### Permission Matrix

| Permission | Admin | Department Head | Staff | Student |
|------------|-------|----------------|-------|---------|
| Review own dept steps | ✓ | ✓ | ✓ | ✗ |
| Review other depts | ✓ | ✗ | ✗ | ✗ |
| View dept analytics | ✓ | ✓ | ✗ | ✗ |
| Configure dept settings | ✓ | ✓ | ✗ | ✗ |
| View student details | ✓ | ✓ | ✓ (limited) | ✓ (own only) |

### Implementation: Department Guard
```typescript
// backend/src/common/guards/department.guard.ts
@Injectable()
export class DepartmentGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    const targetDepartment = context.getArgs()[0].params.department;
    
    if (user.role === Role.ADMIN) return true;
    return normalizeDepartment(user.staffDepartment) === 
           normalizeDepartment(targetDepartment);
  }
}
```

---

## 4. Department-Specific Dashboard Variations

### Category A: Payment-Collecting Departments (6)
These departments handle fines/fees and need payment tracking:

| Dept | Step | Key Responsibilities | Special UI |
|------|------|---------------------|------------|
| **Library** | 2 | Book returns, lost books, fines | Book scanner, fine calculator, due date lookup |
| **Bookstore** | 3 | Textbook returns, material fees | Return checklist, material condition notes |
| **Dormitory** | 4 | Key return, room inspection, damages | Room condition form, damage photo upload, key tracker |
| **Cafeteria** | 5 | Meal card return, outstanding bills | Card scanner, balance lookup |
| **Sports** | 6 | Equipment return, uniform, facility fees | Equipment checklist, condition assessment |
| **Police** | 7 | ID return, parking permit, violations | ID scanner, incident lookup, violation fees |
| **E-Learning** | 9 | Platform access, digital materials, tech fees | Access revocation check, tech fee calculator |
| **CEP** | 10 | Program completion, certificates, fees | Program status check, cert verification |
| **Finance** | 11 | Comprehensive fee verification | Multi-fee calculator, receipt verification, balance lookup |

### Category B: Non-Payment Departments (4)
These departments verify compliance without handling money:

| Dept | Step | Key Responsibilities | Special UI |
|------|------|---------------------|------------|
| **Dept Head** | 1 | Academic standing, thesis, advisor approval | Academic record lookup, thesis status, advisor confirmation |
| **Student Dean** | 8 | Conduct record, disciplinary, grievances | Conduct lookup, disciplinary notes, exit interview scheduling |
| **Cost Sharing** | 12 | Agreement fulfillment, service obligation | Agreement doc verification, obligation tracking |
| **Registrar** | 13 | Academic record, transcript, graduation | Transcript hold check, degree audit, graduation status |

### Category C: Conditional Workflow Departments (3)
These need multi-level approval or conditional logic:

| Dept | Workflow Type | Special Logic |
|------|--------------|---------------|
| **Dormitory** | Conditional | Requires room inspection before approval |
| **Police** | Multi-level | Supervisor approval for violations > X amount |
| **Finance** | Multi-level | Officer + Manager dual approval for refunds |
| **Registrar** | Multi-level | Registrar + Deputy Registrar for final step |

---

## 5. Extending the Base Dashboard: Implementation Pattern

### Step 1: Department Extension Component
```typescript
// extensions/LibraryExtension.tsx
export function LibraryExtension({ 
  studentId, 
  onDataChange 
}: { 
  studentId: string;
  onDataChange: (data: LibraryData) => void;
}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [fineAmount, setFineAmount] = useState(0);
  
  useEffect(() => {
    // Fetch student's borrowed books
    fetch(`/api/staff/library/books/${studentId}`)
      .then(r => r.json())
      .then(setBooks);
  }, [studentId]);
  
  return (
    <Card>
      <h4>Library Check</h4>
      <BookList books={books} onUpdate={setBooks} />
      <FineCalculator 
        books={books} 
        onCalculate={setFineAmount} 
      />
    </Card>
  );
}
```

### Step 2: Department Dashboard Router
```typescript
// DepartmentDashboard.tsx
const DEPARTMENT_EXTENSIONS: Record<DepartmentCode, React.FC> = {
  LIBRARY: LibraryExtension,
  DORMITORY: DormitoryExtension,
  FINANCE: FinanceExtension,
  // ... etc
  DEFAULT: StandardExtension,
};

export function DepartmentDashboard(props: BaseDepartmentDashboardProps) {
  const Extension = DEPARTMENT_EXTENSIONS[props.departmentConfig.code] 
    || DEPARTMENT_EXTENSIONS.DEFAULT;
  
  return (
    <BaseDepartmentDashboard {...props}>
      {props.selectedRow && (
        <Extension 
          studentId={props.selectedRow.studentUserId}
          onDataChange={(data) => {
            // Merge with review payload
            props.onDepartmentDataChange(data);
          }}
        />
      )}
    </BaseDepartmentDashboard>
  );
}
```

### Step 3: Backend Data Persistence
```typescript
// Update ClearanceStep to store department-specific JSON
clearance_step.departmentData = {
  library: {
    booksReturned: [...],
    fineAmount: 150,
    finePaid: true,
    receiptNumber: "LIB-2024-001"
  }
};
```

---

## 6. Database Migration Strategy

### Minimal Schema Changes
```prisma
// Add to ClearanceStep model
model ClearanceStep {
  // ... existing fields ...
  
  /// Department-specific review data (JSON for flexibility)
  departmentData Json? @map("department_data")
  
  /// For multi-level workflows: who approved
  secondaryReviewerId String? @map("secondary_reviewer_id")
  secondaryReviewedAt DateTime? @map("secondary_reviewed_at")
}
```

### Migration Benefits
- **JSON field**: No schema changes needed for new department fields
- **Versioned**: Each department can evolve independently
- **Queryable**: PostgreSQL supports JSON querying if needed

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1)
1. ✅ Create architecture document (this file)
2. 🔄 Add `departmentData` JSON column to database
3. 🔄 Create `DepartmentGuard` for API protection
4. 🔄 Update backend DTOs to accept department data

### Phase 2: Core Extensions (Week 2)
1. 🔄 Create 3 high-priority department extensions:
   - Library (most complex, with book tracking)
   - Finance (payment-heavy)
   - Dormitory (conditional workflow)
2. 🔄 Integrate extensions into `DepartmentDashboard` router
3. 🔄 Test end-to-end flow

### Phase 3: Complete Extensions (Week 3)
1. 🔄 Create remaining 10 department extensions
2. 🔄 Add department-specific API endpoints
3. 🔄 Implement multi-level approval workflows

### Phase 4: Polish & HOD Dashboard (Week 4)
1. 🔄 Bulk import fix (as planned)
2. 🔄 HOD dashboard with oversight across departments
3. 🔄 Testing and refinement

---

## 8. Code Reuse Statistics

| Component | Lines of Code | Reused Across |
|-----------|--------------|---------------|
| BaseDepartmentDashboard | ~760 | All 13 departments |
| DepartmentChecklist | ~100 | All 13 departments |
| PaymentSection | ~80 | 6 payment depts |
| StandardExtension | ~50 | 4 non-special depts |
| LibraryExtension | ~200 | Library only |
| **Total without reuse** | ~4,500 lines | - |
| **Total with reuse** | ~1,800 lines | **60% reduction** |

---

## 9. Key Design Decisions

### Why JSON for department data?
- Flexibility: Each department has different data needs
- Migration-free: No schema changes for new fields
- Type safety: Validated via DTOs before persistence

### Why single extension per department?
- Clear separation of concerns
- Easy to test and maintain
- New departments follow same pattern

### Why keep `staffDepartment` as string?
- Matches existing workflow step department names
- Human-readable in database
- No need for department ID lookups

---

## Next Steps

1. **Review this architecture** - Does it meet your requirements?
2. **Approve approach** - I'll start with Phase 1 implementation
3. **Prioritize departments** - Which 3 should we build first?

Recommended first 3: **Library** (most complex), **Finance** (highest volume), **Dormitory** (conditional workflow)
