import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '../../../generated/prisma/enums';

export type AuthUser = {
  userId: string;
  universityId: string;
  email: string;
  role: Role;
  /** Canonical clearance desk name for STAFF users */
  staffDepartment: string | null;
};

export const CurrentUser = createParamDecorator((data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  const user = request.user;
  if (!user) {
    return undefined;
  }
  return data ? user[data] : user;
});
