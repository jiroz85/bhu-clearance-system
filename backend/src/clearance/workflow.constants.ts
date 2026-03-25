export const CLEARANCE_WORKFLOW_DEPARTMENTS = [
  'Department Head',
  'Library',
  'Bookstore',
  'Dormitory',
  'Cafeteria',
  'Sports Office',
  'University Police',
  'Student Dean',
  'E-learning Directorate',
  'CEP Coordinator',
  'Finance',
  'Cost Sharing',
  'College Registrar Coordinator',
] as const;

export type WorkflowDepartment = (typeof CLEARANCE_WORKFLOW_DEPARTMENTS)[number];

export function normalizeDepartment(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function isWorkflowDepartment(value: string): boolean {
  const n = normalizeDepartment(value);
  return CLEARANCE_WORKFLOW_DEPARTMENTS.some((d) => normalizeDepartment(d) === n);
}
