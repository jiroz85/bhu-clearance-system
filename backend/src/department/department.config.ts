import { CLEARANCE_WORKFLOW_DEPARTMENTS } from '../clearance/workflow.constants';

// Use CLEARANCE_WORKFLOW_DEPARTMENTS for validation
export function validateDepartmentConfig(): boolean {
  const configDepts = Object.keys(DEPARTMENT_CONFIGS);
  const workflowDepts = CLEARANCE_WORKFLOW_DEPARTMENTS;

  return (
    configDepts.every((dept) =>
      workflowDepts.includes(
        dept as (typeof CLEARANCE_WORKFLOW_DEPARTMENTS)[number],
      ),
    ) && workflowDepts.every((dept) => configDepts.includes(dept))
  );
}

export interface DepartmentConfig {
  name: string;
  code: string;
  stepOrder: number;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  features: DepartmentFeatures;
  fields: DepartmentField[];
  metrics: DepartmentMetric[];
  validations: DepartmentValidation[];
}

export interface DepartmentFeatures {
  requiresFinePayment: boolean;
  requiresItemReturn: boolean;
  requiresInspection: boolean;
  requiresDocumentUpload: boolean;
  allowsPartialApproval: boolean;
  requiresHODApproval: boolean;
}

export interface DepartmentField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'textarea' | 'file';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: string;
}

export interface DepartmentMetric {
  key: string;
  label: string;
  type: 'count' | 'amount' | 'percentage' | 'duration';
  calculation: string;
}

export interface DepartmentValidation {
  rule: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export const DEPARTMENT_CONFIGS: Record<string, DepartmentConfig> = {
  'Department Head': {
    name: 'Department Head',
    code: 'DEPT_HEAD',
    stepOrder: 1,
    displayName: 'Department Head Office',
    description: 'Academic requirements and thesis clearance',
    color: '#8B5CF6',
    icon: '🏛️',
    features: {
      requiresFinePayment: false,
      requiresItemReturn: false,
      requiresInspection: false,
      requiresDocumentUpload: true,
      allowsPartialApproval: false,
      requiresHODApproval: true,
    },
    fields: [
      {
        key: 'thesisSubmitted',
        label: 'Thesis Submitted',
        type: 'boolean',
        required: true,
      },
      {
        key: 'supervisorClearance',
        label: 'Supervisor Clearance',
        type: 'select',
        required: true,
        options: ['Approved', 'Pending', 'Rejected'],
      },
      {
        key: 'academicStanding',
        label: 'Academic Standing',
        type: 'select',
        required: true,
        options: ['Good', 'Probation', 'Warning'],
      },
    ],
    metrics: [
      {
        key: 'thesisSubmissionRate',
        label: 'Thesis Submission Rate',
        type: 'percentage',
        calculation: 'count(thesisSubmitted = true) / total',
      },
      {
        key: 'avgProcessingTime',
        label: 'Average Processing Time',
        type: 'duration',
        calculation: 'avg(submittedAt - approvedAt)',
      },
    ],
    validations: [
      {
        rule: 'thesisSubmitted === true',
        message: 'Thesis must be submitted before clearance',
        severity: 'error',
      },
    ],
  },

  Library: {
    name: 'Library',
    code: 'LIBRARY',
    stepOrder: 2,
    displayName: 'University Library',
    description: 'Book returns and library clearance',
    color: '#3B82F6',
    icon: '📚',
    features: {
      requiresFinePayment: true,
      requiresItemReturn: true,
      requiresInspection: false,
      requiresDocumentUpload: false,
      allowsPartialApproval: true,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'booksReturned',
        label: 'Books Returned',
        type: 'number',
        required: true,
        placeholder: 'Number of books returned',
      },
      {
        key: 'outstandingBooks',
        label: 'Outstanding Books',
        type: 'number',
        required: true,
        placeholder: 'Number of books still outstanding',
      },
      {
        key: 'fineAmount',
        label: 'Fine Amount (ETB)',
        type: 'number',
        required: false,
        placeholder: 'Total fine amount in ETB',
      },
      {
        key: 'finePaid',
        label: 'Fine Paid',
        type: 'boolean',
        required: false,
      },
    ],
    metrics: [
      {
        key: 'totalFinesCollected',
        label: 'Total Fines Collected',
        type: 'amount',
        calculation: 'sum(fineAmount where finePaid = true)',
      },
      {
        key: 'booksReturnRate',
        label: 'Books Return Rate',
        type: 'percentage',
        calculation: 'count(booksReturned > 0) / total',
      },
    ],
    validations: [
      {
        rule: 'outstandingBooks === 0',
        message: 'All books must be returned',
        severity: 'error',
      },
      {
        rule: 'fineAmount > 0 && !finePaid',
        message: 'Outstanding fines must be paid',
        severity: 'warning',
      },
    ],
  },

  Bookstore: {
    name: 'Bookstore',
    code: 'BOOKSTORE',
    stepOrder: 3,
    displayName: 'University Bookstore',
    description: 'Textbook returns and balance settlement',
    color: '#10B981',
    icon: '📖',
    features: {
      requiresFinePayment: true,
      requiresItemReturn: true,
      requiresInspection: false,
      requiresDocumentUpload: false,
      allowsPartialApproval: true,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'textbooksReturned',
        label: 'Textbooks Returned',
        type: 'number',
        required: true,
        placeholder: 'Number of textbooks returned',
      },
      {
        key: 'outstandingBalance',
        label: 'Outstanding Balance (ETB)',
        type: 'number',
        required: true,
        placeholder: 'Balance amount in ETB',
      },
      {
        key: 'balancePaid',
        label: 'Balance Paid',
        type: 'boolean',
        required: true,
      },
    ],
    metrics: [
      {
        key: 'totalBalanceCollected',
        label: 'Total Balance Collected',
        type: 'amount',
        calculation: 'sum(outstandingBalance where balancePaid = true)',
      },
      {
        key: 'textbookReturnRate',
        label: 'Textbook Return Rate',
        type: 'percentage',
        calculation: 'count(textbooksReturned > 0) / total',
      },
    ],
    validations: [
      {
        rule: 'balancePaid === true',
        message: 'Outstanding balance must be paid',
        severity: 'error',
      },
    ],
  },

  Dormitory: {
    name: 'Dormitory',
    code: 'DORMITORY',
    stepOrder: 4,
    displayName: 'Student Dormitory',
    description: 'Room key return and inspection clearance',
    color: '#F59E0B',
    icon: '🏠',
    features: {
      requiresFinePayment: true,
      requiresItemReturn: true,
      requiresInspection: true,
      requiresDocumentUpload: true,
      allowsPartialApproval: false,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'roomKeyReturned',
        label: 'Room Key Returned',
        type: 'boolean',
        required: true,
      },
      {
        key: 'roomNumber',
        label: 'Room Number',
        type: 'text',
        required: true,
        placeholder: 'e.g., A-101',
      },
      {
        key: 'inspectionStatus',
        label: 'Room Inspection Status',
        type: 'select',
        required: true,
        options: ['Passed', 'Minor Issues', 'Major Issues', 'Failed'],
      },
      {
        key: 'damageFine',
        label: 'Damage Fine (ETB)',
        type: 'number',
        required: false,
        placeholder: 'Damage fine amount',
      },
      {
        key: 'inspectionReport',
        label: 'Inspection Report',
        type: 'file',
        required: false,
      },
    ],
    metrics: [
      {
        key: 'inspectionPassRate',
        label: 'Room Inspection Pass Rate',
        type: 'percentage',
        calculation: 'count(inspectionStatus = "Passed") / total',
      },
      {
        key: 'totalDamageFines',
        label: 'Total Damage Fines',
        type: 'amount',
        calculation: 'sum(damageFine)',
      },
    ],
    validations: [
      {
        rule: 'roomKeyReturned === true',
        message: 'Room key must be returned',
        severity: 'error',
      },
      {
        rule: 'inspectionStatus === "Failed"',
        message: 'Room inspection failed - issues must be resolved',
        severity: 'error',
      },
    ],
  },

  Cafeteria: {
    name: 'Cafeteria',
    code: 'CAFETERIA',
    stepOrder: 5,
    displayName: 'University Cafeteria',
    description: 'Meal card balance clearance',
    color: '#EF4444',
    icon: '🍽️',
    features: {
      requiresFinePayment: true,
      requiresItemReturn: false,
      requiresInspection: false,
      requiresDocumentUpload: false,
      allowsPartialApproval: true,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'mealCardBalance',
        label: 'Meal Card Balance (ETB)',
        type: 'number',
        required: true,
        placeholder: 'Remaining balance in ETB',
      },
      {
        key: 'cardReturned',
        label: 'Meal Card Returned',
        type: 'boolean',
        required: true,
      },
      {
        key: 'balanceRefunded',
        label: 'Balance Refunded',
        type: 'boolean',
        required: false,
      },
    ],
    metrics: [
      {
        key: 'totalRefunds',
        label: 'Total Refunds Processed',
        type: 'amount',
        calculation: 'sum(mealCardBalance where balanceRefunded = true)',
      },
      {
        key: 'cardReturnRate',
        label: 'Meal Card Return Rate',
        type: 'percentage',
        calculation: 'count(cardReturned = true) / total',
      },
    ],
    validations: [
      {
        rule: 'cardReturned === true',
        message: 'Meal card must be returned',
        severity: 'error',
      },
      {
        rule: 'mealCardBalance > 0 && !balanceRefunded',
        message: 'Remaining balance should be refunded',
        severity: 'warning',
      },
    ],
  },

  'Sports Office': {
    name: 'Sports Office',
    code: 'SPORTS',
    stepOrder: 6,
    displayName: 'Sports & Recreation',
    description: 'Sports equipment and jersey clearance',
    color: '#06B6D4',
    icon: '⚽',
    features: {
      requiresFinePayment: true,
      requiresItemReturn: true,
      requiresInspection: false,
      requiresDocumentUpload: false,
      allowsPartialApproval: true,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'jerseyReturned',
        label: 'Sports Jersey Returned',
        type: 'boolean',
        required: true,
      },
      {
        key: 'equipmentReturned',
        label: 'Equipment Returned',
        type: 'text',
        required: true,
        placeholder: 'List of equipment returned',
      },
      {
        key: 'equipmentFine',
        label: 'Equipment Fine (ETB)',
        type: 'number',
        required: false,
        placeholder: 'Fine for lost/damaged equipment',
      },
    ],
    metrics: [
      {
        key: 'equipmentReturnRate',
        label: 'Equipment Return Rate',
        type: 'percentage',
        calculation: 'count(equipmentReturned is not null) / total',
      },
      {
        key: 'totalEquipmentFines',
        label: 'Total Equipment Fines',
        type: 'amount',
        calculation: 'sum(equipmentFine)',
      },
    ],
    validations: [
      {
        rule: 'jerseyReturned === true',
        message: 'Sports jersey must be returned',
        severity: 'error',
      },
    ],
  },

  'University Police': {
    name: 'University Police',
    code: 'POLICE',
    stepOrder: 7,
    displayName: 'University Police Office',
    description: 'Security clearance and conduct verification',
    color: '#6366F1',
    icon: '👮',
    features: {
      requiresFinePayment: false,
      requiresItemReturn: false,
      requiresInspection: false,
      requiresDocumentUpload: false,
      allowsPartialApproval: false,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'securityClearance',
        label: 'Security Clearance Status',
        type: 'select',
        required: true,
        options: ['Clear', 'Under Review', 'Issues Found'],
      },
      {
        key: 'disciplinaryRecord',
        label: 'Disciplinary Record',
        type: 'select',
        required: true,
        options: ['Clean', 'Minor Issues', 'Major Issues'],
      },
      {
        key: 'policeComments',
        label: 'Police Comments',
        type: 'textarea',
        required: false,
        placeholder: 'Additional comments or notes',
      },
    ],
    metrics: [
      {
        key: 'clearanceRate',
        label: 'Security Clearance Rate',
        type: 'percentage',
        calculation: 'count(securityClearance = "Clear") / total',
      },
      {
        key: 'disciplinaryIssues',
        label: 'Disciplinary Issues Found',
        type: 'count',
        calculation: 'count(disciplinaryRecord != "Clean")',
      },
    ],
    validations: [
      {
        rule: 'securityClearance === "Issues Found"',
        message: 'Security issues must be resolved before clearance',
        severity: 'error',
      },
    ],
  },

  'Student Dean': {
    name: 'Student Dean',
    code: 'DEAN',
    stepOrder: 8,
    displayName: 'Student Dean Office',
    description: 'Student conduct and welfare clearance',
    color: '#8B5CF6',
    icon: '🎓',
    features: {
      requiresFinePayment: false,
      requiresItemReturn: false,
      requiresInspection: false,
      requiresDocumentUpload: true,
      allowsPartialApproval: false,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'conductStatus',
        label: 'Student Conduct Status',
        type: 'select',
        required: true,
        options: ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'],
      },
      {
        key: 'welfareClearance',
        label: 'Welfare Clearance',
        type: 'boolean',
        required: true,
      },
      {
        key: 'counselingCompleted',
        label: 'Exit Counseling Completed',
        type: 'boolean',
        required: true,
      },
      {
        key: 'deanComments',
        label: "Dean's Comments",
        type: 'textarea',
        required: false,
      },
    ],
    metrics: [
      {
        key: 'counselingCompletionRate',
        label: 'Exit Counseling Completion Rate',
        type: 'percentage',
        calculation: 'count(counselingCompleted = true) / total',
      },
      {
        key: 'conductIssues',
        label: 'Conduct Issues',
        type: 'count',
        calculation: 'count(conductStatus = "Needs Improvement")',
      },
    ],
    validations: [
      {
        rule: 'welfareClearance === true',
        message: 'Welfare clearance must be completed',
        severity: 'error',
      },
      {
        rule: 'counselingCompleted === false',
        message: 'Exit counseling is required',
        severity: 'warning',
      },
    ],
  },

  'E-learning Directorate': {
    name: 'E-learning Directorate',
    code: 'ELEARNING',
    stepOrder: 9,
    displayName: 'E-learning Directorate',
    description: 'Digital accounts and device clearance',
    color: '#0EA5E9',
    icon: '💻',
    features: {
      requiresFinePayment: false,
      requiresItemReturn: true,
      requiresInspection: false,
      requiresDocumentUpload: false,
      allowsPartialApproval: true,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'laptopReturned',
        label: 'University Laptop Returned',
        type: 'boolean',
        required: true,
      },
      {
        key: 'accountDeactivated',
        label: 'E-learning Account Deactivated',
        type: 'boolean',
        required: true,
      },
      {
        key: 'deviceCondition',
        label: 'Device Condition',
        type: 'select',
        required: false,
        options: ['Excellent', 'Good', 'Fair', 'Poor'],
      },
      {
        key: 'deviceFine',
        label: 'Device Fine (ETB)',
        type: 'number',
        required: false,
      },
    ],
    metrics: [
      {
        key: 'deviceReturnRate',
        label: 'Device Return Rate',
        type: 'percentage',
        calculation: 'count(laptopReturned = true) / total',
      },
      {
        key: 'accountDeactivationRate',
        label: 'Account Deactivation Rate',
        type: 'percentage',
        calculation: 'count(accountDeactivated = true) / total',
      },
    ],
    validations: [
      {
        rule: 'laptopReturned === true',
        message: 'University laptop must be returned',
        severity: 'error',
      },
      {
        rule: 'accountDeactivated === false',
        message: 'E-learning account must be deactivated',
        severity: 'warning',
      },
    ],
  },

  'CEP Coordinator': {
    name: 'CEP Coordinator',
    code: 'CEP',
    stepOrder: 10,
    displayName: 'CEP Coordinator Office',
    description: 'Community Engagement Program clearance',
    color: '#84CC16',
    icon: '🤝',
    features: {
      requiresFinePayment: false,
      requiresItemReturn: false,
      requiresInspection: false,
      requiresDocumentUpload: true,
      allowsPartialApproval: false,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'communityServiceCompleted',
        label: 'Community Service Hours Completed',
        type: 'boolean',
        required: true,
      },
      {
        key: 'serviceHours',
        label: 'Service Hours Completed',
        type: 'number',
        required: true,
        placeholder: 'Number of hours completed',
      },
      {
        key: 'cepCertificate',
        label: 'CEP Certificate Submitted',
        type: 'file',
        required: true,
      },
      {
        key: 'communityFeedback',
        label: 'Community Feedback',
        type: 'select',
        required: false,
        options: ['Excellent', 'Good', 'Satisfactory', 'Poor'],
      },
    ],
    metrics: [
      {
        key: 'serviceCompletionRate',
        label: 'Service Completion Rate',
        type: 'percentage',
        calculation: 'count(communityServiceCompleted = true) / total',
      },
      {
        key: 'avgServiceHours',
        label: 'Average Service Hours',
        type: 'count',
        calculation: 'avg(serviceHours)',
      },
    ],
    validations: [
      {
        rule: 'communityServiceCompleted === true',
        message: 'Community service must be completed',
        severity: 'error',
      },
      {
        rule: 'serviceHours < 40',
        message: 'Minimum 40 service hours required',
        severity: 'error',
      },
    ],
  },

  Finance: {
    name: 'Finance',
    code: 'FINANCE',
    stepOrder: 11,
    displayName: 'Finance Office',
    description: 'Financial clearance and fee verification',
    color: '#059669',
    icon: '💰',
    features: {
      requiresFinePayment: true,
      requiresItemReturn: false,
      requiresInspection: false,
      requiresDocumentUpload: false,
      allowsPartialApproval: false,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'tuitionFeesPaid',
        label: 'Tuition Fees Paid',
        type: 'boolean',
        required: true,
      },
      {
        key: 'outstandingBalance',
        label: 'Outstanding Balance (ETB)',
        type: 'number',
        required: true,
        placeholder: 'Total outstanding amount',
      },
      {
        key: 'paymentReceipt',
        label: 'Payment Receipt Submitted',
        type: 'file',
        required: false,
      },
      {
        key: 'financialClearance',
        label: 'Financial Clearance Status',
        type: 'select',
        required: true,
        options: ['Cleared', 'Partial', 'Pending'],
      },
    ],
    metrics: [
      {
        key: 'totalRevenue',
        label: 'Total Revenue Collected',
        type: 'amount',
        calculation:
          'sum(outstandingBalance where financialClearance = "Cleared")',
      },
      {
        key: 'clearanceRate',
        label: 'Financial Clearance Rate',
        type: 'percentage',
        calculation: 'count(financialClearance = "Cleared") / total',
      },
    ],
    validations: [
      {
        rule: 'tuitionFeesPaid === true',
        message: 'All tuition fees must be paid',
        severity: 'error',
      },
      {
        rule: 'outstandingBalance > 0',
        message: 'Outstanding balance must be cleared',
        severity: 'error',
      },
    ],
  },

  'Cost Sharing': {
    name: 'Cost Sharing',
    code: 'COST_SHARING',
    stepOrder: 12,
    displayName: 'Cost Sharing Office',
    description: 'Cost sharing and scholarship verification',
    color: '#DC2626',
    icon: '🎓',
    features: {
      requiresFinePayment: false,
      requiresItemReturn: false,
      requiresInspection: false,
      requiresDocumentUpload: true,
      allowsPartialApproval: false,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'scholarshipStatus',
        label: 'Scholarship Status',
        type: 'select',
        required: true,
        options: ['Active', 'Completed', 'Terminated', 'Pending'],
      },
      {
        key: 'costSharingObligation',
        label: 'Cost Sharing Obligation Met',
        type: 'boolean',
        required: true,
      },
      {
        key: 'scholarshipDocuments',
        label: 'Scholarship Documents Submitted',
        type: 'file',
        required: false,
      },
      {
        key: 'sponsorClearance',
        label: 'Sponsor Clearance Received',
        type: 'boolean',
        required: false,
      },
    ],
    metrics: [
      {
        key: 'scholarshipCompletionRate',
        label: 'Scholarship Completion Rate',
        type: 'percentage',
        calculation: 'count(scholarshipStatus = "Completed") / total',
      },
      {
        key: 'obligationFulfillmentRate',
        label: 'Obligation Fulfillment Rate',
        type: 'percentage',
        calculation: 'count(costSharingObligation = true) / total',
      },
    ],
    validations: [
      {
        rule: 'costSharingObligation === true',
        message: 'Cost sharing obligation must be met',
        severity: 'error',
      },
      {
        rule: 'scholarshipStatus === "Active" && !sponsorClearance',
        message: 'Sponsor clearance required for active scholarships',
        severity: 'warning',
      },
    ],
  },

  'College Registrar Coordinator': {
    name: 'College Registrar Coordinator',
    code: 'REGISTRAR',
    stepOrder: 13,
    displayName: 'College Registrar Office',
    description: 'Final academic record verification',
    color: '#7C3AED',
    icon: '📋',
    features: {
      requiresFinePayment: false,
      requiresItemReturn: false,
      requiresInspection: false,
      requiresDocumentUpload: true,
      allowsPartialApproval: false,
      requiresHODApproval: false,
    },
    fields: [
      {
        key: 'academicRecordVerified',
        label: 'Academic Record Verified',
        type: 'boolean',
        required: true,
      },
      {
        key: 'transcriptIssued',
        label: 'Final Transcript Issued',
        type: 'boolean',
        required: true,
      },
      {
        key: 'degreeRequirements',
        label: 'Degree Requirements Met',
        type: 'boolean',
        required: true,
      },
      {
        key: 'finalClearance',
        label: 'Final Clearance Status',
        type: 'select',
        required: true,
        options: ['Approved', 'Pending', 'Rejected'],
      },
      {
        key: 'registrarComments',
        label: "Registrar's Comments",
        type: 'textarea',
        required: false,
      },
    ],
    metrics: [
      {
        key: 'finalClearanceRate',
        label: 'Final Clearance Rate',
        type: 'percentage',
        calculation: 'count(finalClearance = "Approved") / total',
      },
      {
        key: 'transcriptIssuanceRate',
        label: 'Transcript Issuance Rate',
        type: 'percentage',
        calculation: 'count(transcriptIssued = true) / total',
      },
    ],
    validations: [
      {
        rule: 'academicRecordVerified === true',
        message: 'Academic records must be verified',
        severity: 'error',
      },
      {
        rule: 'degreeRequirements === false',
        message: 'Degree requirements must be met',
        severity: 'error',
      },
    ],
  },
};

export function getDepartmentConfig(
  departmentName: string,
): DepartmentConfig | null {
  return DEPARTMENT_CONFIGS[departmentName] || null;
}

export function getAllDepartmentConfigs(): DepartmentConfig[] {
  return Object.values(DEPARTMENT_CONFIGS);
}

export function getDepartmentByCode(code: string): DepartmentConfig | null {
  return (
    Object.values(DEPARTMENT_CONFIGS).find((config) => config.code === code) ||
    null
  );
}

export function getDepartmentByStepOrder(
  stepOrder: number,
): DepartmentConfig | null {
  return (
    Object.values(DEPARTMENT_CONFIGS).find(
      (config) => config.stepOrder === stepOrder,
    ) || null
  );
}
