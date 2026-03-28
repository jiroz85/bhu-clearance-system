/**
 * All 13 department dashboard components
 * Fast Refresh compatible - only exports components
 */

import {
  BaseDepartmentDashboard,
  type BaseDepartmentDashboardProps,
} from "./BaseDepartmentDashboard";
import { DEPARTMENT_CONFIGS } from "./department-config";

// Re-export types for convenience
export type { BaseDepartmentDashboardProps };

// ============================================================================
// 1. DEPARTMENT HEAD
// ============================================================================

export function DepartmentHeadDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.DEPT_HEAD}
    />
  );
}

// ============================================================================
// 2. LIBRARY
// ============================================================================

export function LibraryDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.LIBRARY}
    >
      {/* Library-specific extension: Book lookup info */}
      <div className="rounded border border-blue-200 bg-blue-50/50 p-3">
        <h5 className="text-sm font-medium text-blue-900">Library Quick Reference</h5>
        <ul className="mt-2 space-y-1 text-xs text-blue-800">
          <li>• Check library management system for borrowed books</li>
          <li>• Verify fine payments in financial records</li>
          <li>• Confirm lost book claims are resolved</li>
        </ul>
      </div>
    </BaseDepartmentDashboard>
  );
}

// ============================================================================
// 3. BOOKSTORE
// ============================================================================

export function BookstoreDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.BOOKSTORE}
    />
  );
}

// ============================================================================
// 4. DORMITORY
// ============================================================================

export function DormitoryDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.DORMITORY}
    >
      {/* Dormitory-specific extension: Room inspection checklist */}
      <div className="rounded border border-amber-200 bg-amber-50/50 p-3">
        <h5 className="text-sm font-medium text-amber-900">Room Inspection Guide</h5>
        <div className="mt-2 grid gap-2 text-xs text-amber-800 sm:grid-cols-2">
          <div>
            <strong>Check:</strong>
            <ul className="ml-4 list-disc">
              <li>Walls (damage, marks)</li>
              <li>Furniture condition</li>
              <li>Electrical fixtures</li>
              <li>Windows & locks</li>
            </ul>
          </div>
          <div>
            <strong>Common Issues:</strong>
              <ul className="ml-4 list-disc">
              <li>Unauthorized painting</li>
              <li>Broken furniture</li>
              <li>Missing keys</li>
              <li>Unclean condition</li>
            </ul>
          </div>
        </div>
      </div>
    </BaseDepartmentDashboard>
  );
}

// ============================================================================
// 5. CAFETERIA
// ============================================================================

export function CafeteriaDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.CAFETERIA}
    />
  );
}

// ============================================================================
// 6. SPORTS OFFICE
// ============================================================================

export function SportsOfficeDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.SPORTS}
    >
      {/* Sports-specific extension */}
      <div className="rounded border border-green-200 bg-green-50/50 p-3">
        <h5 className="text-sm font-medium text-green-900">Sports Equipment Check</h5>
        <ul className="mt-2 space-y-1 text-xs text-green-800">
          <li>• Verify all borrowed equipment is returned</li>
          <li>• Check uniform condition (clean, no damage)</li>
          <li>• Confirm team captain has signed off (if applicable)</li>
        </ul>
      </div>
    </BaseDepartmentDashboard>
  );
}

// ============================================================================
// 7. UNIVERSITY POLICE
// ============================================================================

export function UniversityPoliceDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.POLICE}
    >
      {/* Police-specific extension */}
      <div className="rounded border border-red-200 bg-red-50/50 p-3">
        <h5 className="text-sm font-medium text-red-900">Security Verification Checklist</h5>
        <div className="mt-2 space-y-2 text-xs text-red-800">
          <p><strong>Check in system:</strong></p>
          <ul className="ml-4 list-disc">
            <li>ID card return logged</li>
            <li>No pending security incidents</li>
            <li>Parking permits returned (if issued)</li>
            <li>No outstanding violation tickets</li>
          </ul>
        </div>
      </div>
    </BaseDepartmentDashboard>
  );
}

// ============================================================================
// 8. STUDENT DEAN
// ============================================================================

export function StudentDeanDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.DEAN}
    >
      {/* Dean-specific extension */}
      <div className="rounded border border-purple-200 bg-purple-50/50 p-3">
        <h5 className="text-sm font-medium text-purple-900">Conduct Record Check</h5>
        <ul className="mt-2 space-y-1 text-xs text-purple-800">
          <li>• Review student conduct file</li>
          <li>• Verify all disciplinary matters resolved</li>
          <li>• Check for pending grievances</li>
          <li>• Confirm exit interview completed (graduating students)</li>
        </ul>
      </div>
    </BaseDepartmentDashboard>
  );
}

// ============================================================================
// 9. E-LEARNING DIRECTORATE
// ============================================================================

export function ELearningDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.ELEARNING}
    >
      {/* E-learning specific extension */}
      <div className="rounded border border-cyan-200 bg-cyan-50/50 p-3">
        <h5 className="text-sm font-medium text-cyan-900">Digital Resources Check</h5>
        <ul className="mt-2 space-y-1 text-xs text-cyan-800">
          <li>• LMS account access status</li>
          <li>• Online course completion verification</li>
          <li>• Digital library access cleanup</li>
          <li>• Technology fee payment confirmation</li>
        </ul>
      </div>
    </BaseDepartmentDashboard>
  );
}

// ============================================================================
// 10. CEP COORDINATOR
// ============================================================================

export function CEPDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.CEP}
    />
  );
}

// ============================================================================
// 11. FINANCE
// ============================================================================

export function FinanceDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.FINANCE}
    >
      {/* Finance-specific extension */}
      <div className="rounded border border-emerald-200 bg-emerald-50/50 p-3">
        <h5 className="text-sm font-medium text-emerald-900">Financial Clearance Guide</h5>
        <div className="mt-2 text-xs text-emerald-800">
          <p className="mb-2"><strong>Required checks:</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Full tuition payment for all semesters</li>
            <li>All administrative fees paid</li>
            <li>Lab/material fees cleared</li>
            <li>No holds on student account</li>
            <li>Refund processed if applicable</li>
          </ul>
        </div>
      </div>
    </BaseDepartmentDashboard>
  );
}

// ============================================================================
// 12. COST SHARING
// ============================================================================

export function CostSharingDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.COST_SHARING}
    >
      {/* Cost-sharing specific extension */}
      <div className="rounded border border-indigo-200 bg-indigo-50/50 p-3">
        <h5 className="text-sm font-medium text-indigo-900">Cost-Sharing Verification</h5>
        <ul className="mt-2 space-y-1 text-xs text-indigo-800">
          <li>• Verify cost-sharing agreement fulfillment</li>
          <li>• Check service obligation completion (if applicable)</li>
          <li>• Confirm all documentation submitted</li>
          <li>• Validate sponsor letter (if sponsored student)</li>
        </ul>
      </div>
    </BaseDepartmentDashboard>
  );
}

// ============================================================================
// 13. COLLEGE REGISTRAR
// ============================================================================

export function CollegeRegistrarDashboard(
  props: Omit<BaseDepartmentDashboardProps, "departmentConfig">,
) {
  return (
    <BaseDepartmentDashboard
      {...props}
      departmentConfig={DEPARTMENT_CONFIGS.REGISTRAR}
    >
      {/* Registrar-specific extension - Final clearance info */}
      <div className="rounded border border-slate-300 bg-slate-50 p-3">
        <h5 className="text-sm font-medium text-slate-900">Final Academic Verification</h5>
        <div className="mt-2 text-xs text-slate-700">
          <p className="mb-2"><strong>This is the FINAL step:</strong></p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Complete academic record review</li>
            <li>Degree audit verification</li>
            <li>Transcript hold clearance</li>
            <li>Graduation eligibility confirmation</li>
          </ul>
          <p className="mt-2 text-amber-700">
            ⚠️ After this approval, student will be FULLY CLEARED
          </p>
        </div>
      </div>
    </BaseDepartmentDashboard>
  );
}
