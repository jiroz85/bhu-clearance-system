export const CLEARANCE_WORKFLOW_DEPARTMENTS = [
  'Department head',
  'Library',
  'University Book store',
  'Dormitory',
  'Student Cafeteria Service',
  'Sport Master',
  'University police',
  'Office of the student Dean',
  'e-Learning Management directorate',
  'College Continues Education Program Coordinator',
  'Finance Administration',
  'Office of the cost sharing',
  'College Registrar Coordinator',
] as const;

export type WorkflowDepartment =
  (typeof CLEARANCE_WORKFLOW_DEPARTMENTS)[number];

export function normalizeDepartment(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function isWorkflowDepartment(value: string): boolean {
  const n = normalizeDepartment(value);
  return CLEARANCE_WORKFLOW_DEPARTMENTS.some(
    (d) => normalizeDepartment(d) === n,
  );
}
