export enum DepartmentRole {
  STAFF = 'STAFF',
  HOD = 'HOD',
  ADMIN = 'ADMIN',
}

export enum DepartmentPermission {
  // Basic permissions
  VIEW_QUEUE = 'VIEW_QUEUE',
  APPROVE_STEPS = 'APPROVE_STEPS',
  REJECT_STEPS = 'REJECT_STEPS',

  // Advanced permissions
  VIEW_METRICS = 'VIEW_METRICS',
  EXPORT_REPORTS = 'EXPORT_REPORTS',
  BULK_OPERATIONS = 'BULK_OPERATIONS',

  // HOD specific permissions
  OVERRIDE_DECISIONS = 'OVERRIDE_DECISIONS',
  DELEGATE_APPROVALS = 'DELEGATE_APPROVALS',
  VIEW_DEPARTMENT_ANALYTICS = 'VIEW_DEPARTMENT_ANALYTICS',

  // Admin permissions
  MANAGE_DEPARTMENT_USERS = 'MANAGE_DEPARTMENT_USERS',
  CONFIGURE_WORKFLOW = 'CONFIGURE_WORKFLOW',
  SYSTEM_SETTINGS = 'SYSTEM_SETTINGS',
}

export interface DepartmentUser {
  id: string;
  userId: string;
  departmentId: string;
  role: DepartmentRole;
  permissions: DepartmentPermission[];
  isActive: boolean;
  assignedAt: Date;
}

export interface DepartmentPermissionMatrix {
  [DepartmentRole.STAFF]: DepartmentPermission[];
  [DepartmentRole.HOD]: DepartmentPermission[];
  [DepartmentRole.ADMIN]: DepartmentPermission[];
}

export const DEPARTMENT_PERMISSION_MATRIX: DepartmentPermissionMatrix = {
  [DepartmentRole.STAFF]: [
    DepartmentPermission.VIEW_QUEUE,
    DepartmentPermission.APPROVE_STEPS,
    DepartmentPermission.REJECT_STEPS,
    DepartmentPermission.VIEW_METRICS,
  ],
  [DepartmentRole.HOD]: [
    DepartmentPermission.VIEW_QUEUE,
    DepartmentPermission.APPROVE_STEPS,
    DepartmentPermission.REJECT_STEPS,
    DepartmentPermission.VIEW_METRICS,
    DepartmentPermission.EXPORT_REPORTS,
    DepartmentPermission.BULK_OPERATIONS,
    DepartmentPermission.OVERRIDE_DECISIONS,
    DepartmentPermission.DELEGATE_APPROVALS,
    DepartmentPermission.VIEW_DEPARTMENT_ANALYTICS,
  ],
  [DepartmentRole.ADMIN]: [
    DepartmentPermission.VIEW_QUEUE,
    DepartmentPermission.APPROVE_STEPS,
    DepartmentPermission.REJECT_STEPS,
    DepartmentPermission.VIEW_METRICS,
    DepartmentPermission.EXPORT_REPORTS,
    DepartmentPermission.BULK_OPERATIONS,
    DepartmentPermission.OVERRIDE_DECISIONS,
    DepartmentPermission.DELEGATE_APPROVALS,
    DepartmentPermission.VIEW_DEPARTMENT_ANALYTICS,
    DepartmentPermission.MANAGE_DEPARTMENT_USERS,
    DepartmentPermission.CONFIGURE_WORKFLOW,
    DepartmentPermission.SYSTEM_SETTINGS,
  ],
};

export function hasPermission(
  userRole: DepartmentRole,
  permission: DepartmentPermission,
): boolean {
  return DEPARTMENT_PERMISSION_MATRIX[userRole].includes(permission);
}

export function getPermissionsForRole(
  role: DepartmentRole,
): DepartmentPermission[] {
  return DEPARTMENT_PERMISSION_MATRIX[role] || [];
}
