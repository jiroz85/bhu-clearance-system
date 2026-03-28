/**
 * Department Dashboard Architecture for BHU Clearance System
 * 
 * DESIGN PRINCIPLES:
 * 1. Single Source of Truth: All department configs in one file
 * 2. Composition over Inheritance: Base dashboard + department plugins
 * 3. Type Safety: Full TypeScript support for department-specific data
 * 4. Zero Code Duplication: Shared logic in base, unique UI in extensions
 * 5. Backend-First: Department-specific fields stored in database
 */

// ============================================================================
// 1. DEPARTMENT CONFIGURATION ARCHITECTURE
// ============================================================================

/**
 * Each department has:
 * - Unique requirements (what they check)
 * - Custom fields (what data they collect)
 * - Specific validation rules
 * - Custom UI components
 */

export type DepartmentCode = 
  | 'DEPT_HEAD'
  | 'LIBRARY'
  | 'BOOKSTORE'
  | 'DORMITORY'
  | 'CAFETERIA'
  | 'SPORTS'
  | 'POLICE'
  | 'DEAN'
  | 'ELEARNING'
  | 'CEP'
  | 'FINANCE'
  | 'COST_SHARING'
  | 'REGISTRAR';

export interface DepartmentRequirement {
  id: string;
  label: string;
  type: 'checkbox' | 'number' | 'text' | 'select' | 'date';
  required: boolean;
  options?: string[]; // for select type
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface DepartmentConfig {
  code: DepartmentCode;
  name: string;
  stepOrder: number;
  icon: string;
  description: string;
  // What this department checks before approval
  requirements: DepartmentRequirement[];
  // Can this department collect fines/fees?
  canCollectPayment: boolean;
  // Custom approval workflow
  approvalWorkflow: 'standard' | 'multi_level' | 'conditional';
  // Additional data this department tracks
  trackingFields: string[];
}

// ============================================================================
// 2. DEPARTMENT-SPECIFIC CONFIGURATIONS
// ============================================================================

export const DEPARTMENT_CONFIGS: Record<DepartmentCode, DepartmentConfig> = {
  DEPT_HEAD: {
    code: 'DEPT_HEAD',
    name: 'Department Head',
    stepOrder: 1,
    icon: 'Building',
    description: 'Academic department clearance - verifies student academic standing',
    requirements: [
      { id: 'academic_standing', label: 'Student in good academic standing', type: 'checkbox', required: true },
      { id: 'thesis_submitted', label: 'Thesis/Project submitted (if applicable)', type: 'checkbox', required: false },
      { id: 'advisor_approval', label: 'Advisor approval obtained', type: 'checkbox', required: true },
      { id: 'no_disciplinary_issues', label: 'No pending disciplinary actions', type: 'checkbox', required: true },
    ],
    canCollectPayment: false,
    approvalWorkflow: 'standard',
    trackingFields: ['advisorName', 'academicStatus', 'notes'],
  },

  LIBRARY: {
    code: 'LIBRARY',
    name: 'Library',
    stepOrder: 2,
    icon: 'BookOpen',
    description: 'Library clearance - verifies book returns and fine payments',
    requirements: [
      { id: 'books_returned', label: 'All borrowed books returned', type: 'checkbox', required: true },
      { id: 'fines_paid', label: 'Library fines paid', type: 'checkbox', required: true },
      { id: 'lost_books_cleared', label: 'Lost book claims resolved', type: 'checkbox', required: true },
    ],
    canCollectPayment: true,
    approvalWorkflow: 'standard',
    trackingFields: ['booksBorrowed', 'booksReturned', 'fineAmount', 'finePaid'],
  },

  BOOKSTORE: {
    code: 'BOOKSTORE',
    name: 'Bookstore',
    stepOrder: 3,
    icon: 'ShoppingCart',
    description: 'Textbook and material clearance',
    requirements: [
      { id: 'textbooks_returned', label: 'Unopened textbooks returned', type: 'checkbox', required: false },
      { id: 'lab_materials_cleared', label: 'Lab materials/equipment returned', type: 'checkbox', required: true },
      { id: 'outstanding_payments', label: 'No outstanding material payments', type: 'checkbox', required: true },
    ],
    canCollectPayment: true,
    approvalWorkflow: 'standard',
    trackingFields: ['materialsReturned', 'paymentDue', 'paymentReceived'],
  },

  DORMITORY: {
    code: 'DORMITORY',
    name: 'Dormitory',
    stepOrder: 4,
    icon: 'Home',
    description: 'Housing clearance - room condition and key return',
    requirements: [
      { id: 'room_key_returned', label: 'Room key returned', type: 'checkbox', required: true },
      { id: 'room_condition_ok', label: 'Room condition acceptable', type: 'checkbox', required: true },
      { id: 'damages_paid', label: 'Damage fees paid (if applicable)', type: 'checkbox', required: true },
      { id: 'personal_items_removed', label: 'All personal items removed', type: 'checkbox', required: true },
    ],
    canCollectPayment: true,
    approvalWorkflow: 'conditional', // Requires room inspection
    trackingFields: ['roomNumber', 'keyReturned', 'damageCharges', 'damagePaid', 'conditionNotes'],
  },

  CAFETERIA: {
    code: 'CAFETERIA',
    name: 'Cafeteria',
    stepOrder: 5,
    icon: 'Utensils',
    description: 'Meal service clearance',
    requirements: [
      { id: 'meal_card_returned', label: 'Meal card returned', type: 'checkbox', required: true },
      { id: 'meal_bills_paid', label: 'Outstanding meal bills paid', type: 'checkbox', required: true },
      { id: 'meal_plan_cancelled', label: 'Meal plan properly cancelled', type: 'checkbox', required: true },
    ],
    canCollectPayment: true,
    approvalWorkflow: 'standard',
    trackingFields: ['mealCardNumber', 'outstandingBalance', 'balancePaid'],
  },

  SPORTS: {
    code: 'SPORTS',
    name: 'Sports Office',
    stepOrder: 6,
    icon: 'Trophy',
    description: 'Athletics and sports equipment clearance',
    requirements: [
      { id: 'sports_uniform_returned', label: 'Sports uniform returned', type: 'checkbox', required: true },
      { id: 'equipment_returned', label: 'All borrowed equipment returned', type: 'checkbox', required: true },
      { id: 'team_clearance', label: 'Team/athletics clearance (if applicable)', type: 'checkbox', required: false },
      { id: 'facility_fees_paid', label: 'Sports facility fees paid', type: 'checkbox', required: true },
    ],
    canCollectPayment: true,
    approvalWorkflow: 'standard',
    trackingFields: ['uniformReturned', 'equipmentList', 'feesDue', 'feesPaid'],
  },

  POLICE: {
    code: 'POLICE',
    name: 'University Police',
    stepOrder: 7,
    icon: 'Shield',
    description: 'Security and safety clearance',
    requirements: [
      { id: 'id_card_returned', label: 'Student ID card returned', type: 'checkbox', required: true },
      { id: 'parking_permit_returned', label: 'Parking permit returned (if applicable)', type: 'checkbox', required: false },
      { id: 'no_security_incidents', label: 'No unresolved security incidents', type: 'checkbox', required: true },
      { id: 'no_outstanding_violations', label: 'No outstanding violations', type: 'checkbox', required: true },
    ],
    canCollectPayment: true, // For lost ID/parking fees
    approvalWorkflow: 'multi_level', // May need supervisor approval
    trackingFields: ['idCardReturned', 'parkingPermitReturned', 'incidentNotes', 'violationFees'],
  },

  DEAN: {
    code: 'DEAN',
    name: 'Student Dean',
    stepOrder: 8,
    icon: 'UserCheck',
    description: 'Student conduct and disciplinary clearance',
    requirements: [
      { id: 'conduct_clear', label: 'Student conduct record clear', type: 'checkbox', required: true },
      { id: 'disciplinary_resolved', label: 'All disciplinary matters resolved', type: 'checkbox', required: true },
      { id: 'grievances_cleared', label: 'Student grievances cleared', type: 'checkbox', required: true },
      { id: 'exit_interview', label: 'Exit interview completed (if required)', type: 'checkbox', required: false },
    ],
    canCollectPayment: false,
    approvalWorkflow: 'multi_level',
    trackingFields: ['conductStatus', 'disciplinaryNotes', 'exitInterviewDate'],
  },

  ELEARNING: {
    code: 'ELEARNING',
    name: 'E-learning Directorate',
    stepOrder: 9,
    icon: 'Monitor',
    description: 'Digital resources and online platform clearance',
    requirements: [
      { id: 'platform_access_revoked', label: 'LMS/platform access properly handled', type: 'checkbox', required: true },
      { id: 'digital_materials_returned', label: 'Digital materials/licenses returned', type: 'checkbox', required: true },
      { id: 'online_submissions_complete', label: 'All online submissions complete', type: 'checkbox', required: true },
      { id: 'tech_fees_paid', label: 'Technology fees paid', type: 'checkbox', required: true },
    ],
    canCollectPayment: true,
    approvalWorkflow: 'standard',
    trackingFields: ['lmsAccessStatus', 'techFeesDue', 'techFeesPaid'],
  },

  CEP: {
    code: 'CEP',
    name: 'CEP Coordinator',
    stepOrder: 10,
    icon: 'GraduationCap',
    description: 'Continuing Education Program clearance',
    requirements: [
      { id: 'cep_requirements_met', label: 'CEP program requirements completed', type: 'checkbox', required: true },
      { id: 'cep_certificates_collected', label: 'CEP certificates/diplomas collected', type: 'checkbox', required: true },
      { id: 'cep_fees_paid', label: 'CEP program fees paid', type: 'checkbox', required: true },
    ],
    canCollectPayment: true,
    approvalWorkflow: 'standard',
    trackingFields: ['cepProgram', 'programStatus', 'cepFeesDue', 'cepFeesPaid'],
  },

  FINANCE: {
    code: 'FINANCE',
    name: 'Finance',
    stepOrder: 11,
    icon: 'DollarSign',
    description: 'Financial clearance - comprehensive fee verification',
    requirements: [
      { id: 'tuition_paid', label: 'Full tuition paid', type: 'checkbox', required: true },
      { id: 'other_fees_paid', label: 'All other university fees paid', type: 'checkbox', required: true },
      { id: 'no_outstanding_balance', label: 'No outstanding balance', type: 'checkbox', required: true },
      { id: 'refund_processed', label: 'Refund processed (if applicable)', type: 'checkbox', required: false },
    ],
    canCollectPayment: true,
    approvalWorkflow: 'multi_level', // Finance officer + manager
    trackingFields: ['totalBalance', 'amountPaid', 'remainingBalance', 'receiptNumber'],
  },

  COST_SHARING: {
    code: 'COST_SHARING',
    name: 'Cost Sharing',
    stepOrder: 12,
    icon: 'Handshake',
    description: 'Cost-sharing agreement verification',
    requirements: [
      { id: 'cost_share_agreement', label: 'Cost-sharing agreement fulfilled', type: 'checkbox', required: true },
      { id: 'service_obligation_met', label: 'Service obligation completed (if applicable)', type: 'checkbox', required: false },
      { id: 'documentation_complete', label: 'All cost-share documentation complete', type: 'checkbox', required: true },
    ],
    canCollectPayment: false,
    approvalWorkflow: 'standard',
    trackingFields: ['agreementType', 'obligationStatus', 'documentationComplete'],
  },

  REGISTRAR: {
    code: 'REGISTRAR',
    name: 'College Registrar',
    stepOrder: 13,
    icon: 'FileText',
    description: 'Final academic verification and transcript hold clearance',
    requirements: [
      { id: 'academic_record_complete', label: 'Academic record complete', type: 'checkbox', required: true },
      { id: 'transcript_hold_cleared', label: 'Transcript hold cleared', type: 'checkbox', required: true },
      { id: 'degree_audit_complete', label: 'Degree audit completed', type: 'checkbox', required: true },
      { id: 'graduation_eligible', label: 'Eligible for graduation/withdrawal', type: 'checkbox', required: true },
    ],
    canCollectPayment: false,
    approvalWorkflow: 'multi_level', // Registrar + Deputy Registrar
    trackingFields: ['transcriptStatus', 'degreeAuditStatus', 'graduationStatus'],
  },
};

// ============================================================================
// 3. HELPER FUNCTIONS
// ============================================================================

export function getDepartmentConfig(stepOrder: number): DepartmentConfig | undefined {
  return Object.values(DEPARTMENT_CONFIGS).find(d => d.stepOrder === stepOrder);
}

export function getDepartmentConfigByCode(code: DepartmentCode): DepartmentConfig {
  return DEPARTMENT_CONFIGS[code];
}

export function getDepartmentName(stepOrder: number): string {
  const config = getDepartmentConfig(stepOrder);
  return config?.name || 'Unknown Department';
}

// Map workflow constants to department codes
export const WORKFLOW_TO_DEPARTMENT_CODE: Record<string, DepartmentCode> = {
  'Department Head': 'DEPT_HEAD',
  'Library': 'LIBRARY',
  'Bookstore': 'BOOKSTORE',
  'Dormitory': 'DORMITORY',
  'Cafeteria': 'CAFETERIA',
  'Sports Office': 'SPORTS',
  'University Police': 'POLICE',
  'Student Dean': 'DEAN',
  'E-learning Directorate': 'ELEARNING',
  'CEP Coordinator': 'CEP',
  'Finance': 'FINANCE',
  'Cost Sharing': 'COST_SHARING',
  'College Registrar Coordinator': 'REGISTRAR',
};

export function getDepartmentCodeFromName(name: string): DepartmentCode | undefined {
  const normalized = name.toLowerCase().trim();
  const entry = Object.entries(WORKFLOW_TO_DEPARTMENT_CODE).find(
    ([key]) => key.toLowerCase().trim() === normalized
  );
  return entry?.[1];
}

// ============================================================================
// 4. TYPE DEFINITIONS FOR DEPARTMENT-SPECIFIC DATA
// ============================================================================

export interface DepartmentChecklistData {
  [requirementId: string]: boolean | string | number;
}

export interface DepartmentPaymentData {
  amountDue: number;
  amountPaid: number;
  paymentMethod?: string;
  receiptNumber?: string;
  paymentDate?: string;
}

export interface DepartmentReviewPayload {
  decision: 'APPROVED' | 'REJECTED';
  comment: string;
  reason?: string;
  instruction?: string;
  // Department-specific data
  checklist: DepartmentChecklistData;
  payment?: DepartmentPaymentData;
  // Additional tracking data
  trackingData?: Record<string, string | number | boolean>;
}

// ============================================================================
// 5. UI COMPONENT REGISTRY (for dynamic rendering)
// ============================================================================

export type DepartmentUIComponent = 
  | 'LibraryChecklist'
  | 'DormitoryInspection'
  | 'FinanceCalculator'
  | 'PoliceVerification'
  | 'SportsEquipment'
  | 'StandardChecklist';

export const DEPARTMENT_UI_COMPONENTS: Record<DepartmentCode, DepartmentUIComponent[]> = {
  DEPT_HEAD: ['StandardChecklist'],
  LIBRARY: ['LibraryChecklist'],
  BOOKSTORE: ['StandardChecklist'],
  DORMITORY: ['DormitoryInspection'],
  CAFETERIA: ['StandardChecklist'],
  SPORTS: ['SportsEquipment'],
  POLICE: ['PoliceVerification'],
  DEAN: ['StandardChecklist'],
  ELEARNING: ['StandardChecklist'],
  CEP: ['StandardChecklist'],
  FINANCE: ['FinanceCalculator'],
  COST_SHARING: ['StandardChecklist'],
  REGISTRAR: ['StandardChecklist'],
};

// ============================================================================
// 6. VALIDATION RULES
// ============================================================================

export function validateDepartmentChecklist(
  code: DepartmentCode,
  data: DepartmentChecklistData
): { valid: boolean; errors: string[] } {
  const config = DEPARTMENT_CONFIGS[code];
  const errors: string[] = [];

  for (const req of config.requirements) {
    if (req.required) {
      const value = data[req.id];
      if (req.type === 'checkbox' && value !== true) {
        errors.push(`${req.label} is required`);
      }
      if (req.type === 'number' && (typeof value !== 'number' || value < 0)) {
        errors.push(`${req.label} must be a valid number`);
      }
      if (req.type === 'text' && (!value || String(value).trim() === '')) {
        errors.push(`${req.label} is required`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
