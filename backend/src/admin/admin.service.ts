import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role, UserStatus } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AdminCreateUserDto } from './dto/admin-create-user.dto';
import type { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import type { AdminListUsersDto } from './dto/admin-list-users.dto';
import type { BulkImportDto } from './dto/bulk-import.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createUser(dto: AdminCreateUserDto, actorUserId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { universityId: true },
    });
    if (!actor) {
      throw new BadRequestException('Invalid admin actor');
    }

    if (dto.role === Role.STAFF) {
      if (!dto.staffDepartment?.trim()) {
        throw new BadRequestException('Staff users require staffDepartment');
      }
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    if (dto.studentUniversityId) {
      const sid = dto.studentUniversityId.trim();
      const dup = await this.prisma.user.findUnique({
        where: { studentUniversityId: sid },
      });
      if (dup) {
        throw new BadRequestException('Student university ID already in use');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    let staffDept: string | null = null;
    if (dto.role === Role.STAFF) {
      const staffDeptInput = dto.staffDepartment!.trim();
      const dep = await this.prisma.department.findFirst({
        where: {
          universityId: actor.universityId,
          name: { equals: staffDeptInput, mode: 'insensitive' },
        },
      });
      if (!dep) {
        throw new BadRequestException(
          `staffDepartment must match an entry in departments. Got: ${dto.staffDepartment}`,
        );
      }
      staffDept = dep.name;
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        universityId: actor.universityId,
        passwordHash,
        displayName: dto.displayName.trim(),
        role: dto.role,
        staffDepartment: staffDept,
        studentUniversityId: dto.studentUniversityId?.trim() || null,
        studentDepartment: dto.studentDepartment?.trim() || null,
        studentYear: dto.studentYear?.trim() || null,
      },
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        staffDepartment: true,
        studentUniversityId: true,
        studentDepartment: true,
        studentYear: true,
        createdAt: true,
      },
    });

    await this.audit.log(actorUserId, 'ADMIN_USER_CREATED', 'user', user.id, {
      createdRole: user.role,
    });

    return user;
  }

  async listUsers(actorUserId: string, dto: AdminListUsersDto) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { universityId: true },
    });
    if (!actor) {
      throw new BadRequestException('Invalid admin actor');
    }

    const { skip = 0, take = 50, search, role, status, staffDepartment } = dto;

    const where: any = {
      universityId: actor.universityId,
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { studentUniversityId: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (staffDepartment) {
      where.staffDepartment = {
        contains: staffDepartment,
        mode: 'insensitive',
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          displayName: true,
          status: true,
          staffDepartment: true,
          studentUniversityId: true,
          studentDepartment: true,
          studentYear: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, skip, take };
  }

  async updateUser(
    actorUserId: string,
    userId: string,
    dto: AdminUpdateUserDto,
  ) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { universityId: true },
    });
    if (!actor) {
      throw new BadRequestException('Invalid admin actor');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId, universityId: actor.universityId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (
      existing.role === Role.ADMIN &&
      dto.role !== undefined &&
      dto.role !== Role.ADMIN
    ) {
      throw new BadRequestException('Cannot change ADMIN role');
    }

    if (dto.role === Role.STAFF && dto.staffDepartment) {
      const dept = await this.prisma.department.findFirst({
        where: {
          universityId: actor.universityId,
          name: { equals: dto.staffDepartment, mode: 'insensitive' },
        },
      });
      if (!dept) {
        throw new BadRequestException(
          `staffDepartment must match an entry in departments. Got: ${dto.staffDepartment}`,
        );
      }
    }

    if (
      dto.studentUniversityId &&
      dto.studentUniversityId !== existing.studentUniversityId
    ) {
      const duplicate = await this.prisma.user.findUnique({
        where: { studentUniversityId: dto.studentUniversityId },
      });
      if (duplicate && duplicate.id !== userId) {
        throw new BadRequestException('Student university ID already in use');
      }
    }

    const updateData: any = {};
    if (dto.displayName !== undefined)
      updateData.displayName = dto.displayName.trim();
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.staffDepartment !== undefined)
      updateData.staffDepartment = dto.staffDepartment.trim();
    if (dto.studentUniversityId !== undefined)
      updateData.studentUniversityId = dto.studentUniversityId?.trim();
    if (dto.studentDepartment !== undefined)
      updateData.studentDepartment = dto.studentDepartment?.trim();
    if (dto.studentYear !== undefined)
      updateData.studentYear = dto.studentYear?.trim();

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        displayName: true,
        status: true,
        staffDepartment: true,
        studentUniversityId: true,
        studentDepartment: true,
        studentYear: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.audit.log(actorUserId, 'ADMIN_USER_UPDATED', 'user', userId, {
      updatedFields: Object.keys(updateData),
    });

    return updated;
  }

  async deleteUser(actorUserId: string, userId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { universityId: true },
    });
    if (!actor) {
      throw new BadRequestException('Invalid admin actor');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId, universityId: actor.universityId },
    });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    if (existing.role === Role.ADMIN) {
      throw new BadRequestException('Cannot delete ADMIN user');
    }

    // Check if user has active clearances
    const activeClearances = await this.prisma.clearance.count({
      where: {
        studentUserId: userId,
        status: { in: ['DRAFT', 'SUBMITTED', 'PAUSED_REJECTED'] },
      },
    });

    if (activeClearances > 0) {
      throw new BadRequestException(
        'Cannot delete user with active clearances',
      );
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    await this.audit.log(actorUserId, 'ADMIN_USER_DELETED', 'user', userId);

    return { message: 'User deleted successfully' };
  }

  async bulkImportUsers(actorUserId: string, dto: BulkImportDto) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { universityId: true },
    });
    if (!actor) {
      throw new BadRequestException('Invalid admin actor');
    }

    const results = {
      created: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < dto.users.length; i++) {
      const userDto = dto.users[i];
      try {
        const password =
          Math.random().toString(36).slice(-8) +
          Math.random().toString(36).slice(-8);

        await this.createUser(
          {
            ...userDto,
            password,
          },
          actorUserId,
        );
        results.created++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    await this.audit.log(
      actorUserId,
      'ADMIN_BULK_IMPORT',
      'user',
      actorUserId,
      {
        totalUsers: dto.users.length,
        created: results.created,
        failed: results.failed,
      },
    );

    return results;
  }
}
