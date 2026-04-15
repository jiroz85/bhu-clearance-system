import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AdminCreateUserDto } from './dto/admin-create-user.dto';
import type { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import type { AdminListUsersDto } from './dto/admin-list-users.dto';
import type { BulkImportDto, BulkImportUserDto } from './dto/bulk-import.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createUser(dto: AdminCreateUserDto, actorUserId: string) {
    // Input sanitization
    const sanitizedDto = {
      ...dto,
      email: dto.email.toLowerCase().trim(),
      displayName: dto.displayName.trim(),
      staffDepartment: dto.staffDepartment?.trim(),
      studentUniversityId: dto.studentUniversityId?.trim(),
      studentDepartment: dto.studentDepartment?.trim(),
      studentYear: dto.studentYear?.trim(),
    };

    const actor = await this.prisma.user.findUnique({
      where: { id: actorUserId },
      select: { universityId: true },
    });
    if (!actor) {
      throw new BadRequestException('Invalid admin actor');
    }

    if (sanitizedDto.role === Role.STAFF) {
      if (!sanitizedDto.staffDepartment?.trim()) {
        throw new BadRequestException('Staff users require staffDepartment');
      }
    }

    const email = sanitizedDto.email;
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    if (sanitizedDto.studentUniversityId) {
      const sid = sanitizedDto.studentUniversityId;
      const dup = await this.prisma.user.findUnique({
        where: { studentUniversityId: sid },
      });
      if (dup) {
        throw new BadRequestException('Student university ID already in use');
      }
    }

    const passwordHash = await bcrypt.hash(
      sanitizedDto.password ||
        Math.random().toString(36).slice(-8) +
          Math.random().toString(36).slice(-8),
      BCRYPT_ROUNDS,
    );

    let staffDept: string | null = null;
    if (sanitizedDto.role === Role.STAFF) {
      const staffDeptInput = sanitizedDto.staffDepartment!.trim();
      const dep = await this.prisma.department.findFirst({
        where: {
          universityId: actor.universityId,
          name: { equals: staffDeptInput, mode: 'insensitive' },
        },
      });
      if (!dep) {
        throw new BadRequestException(
          `staffDepartment must match an entry in departments. Got: ${sanitizedDto.staffDepartment}`,
        );
      }
      staffDept = dep.name;
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        universityId: actor.universityId,
        passwordHash,
        displayName: sanitizedDto.displayName,
        role: sanitizedDto.role,
        staffDepartment: staffDept,
        studentUniversityId: sanitizedDto.studentUniversityId || null,
        studentDepartment: sanitizedDto.studentDepartment || null,
        studentYear: sanitizedDto.studentYear || null,
        status: sanitizedDto.status,
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
        status: true,
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

    const where: Record<string, any> = {
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

    const updateData: Record<string, any> = {};
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
    } as Record<string, any>);

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

    // Check if user has active clearances (only for active users)
    if (existing.status === 'ACTIVE') {
      const activeClearances = await this.prisma.clearance.count({
        where: {
          studentUserId: userId,
          status: { in: ['DRAFT', 'SUBMITTED', 'PAUSED_REJECTED'] },
        },
      });

      if (activeClearances > 0) {
        throw new BadRequestException(
          'Cannot delete user with active clearances. Set user status to INACTIVE first.',
        );
      }
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
      const userDto: BulkImportUserDto = dto.users[i];
      try {
        // Create AdminCreateUserDto properly with auto-generated password if not provided
        const createUserDto: AdminCreateUserDto = {
          email: userDto.email,
          password: userDto.password || this.generateSecurePassword(),
          displayName: userDto.displayName,
          role: userDto.role,
          staffDepartment: userDto.staffDepartment,
          studentUniversityId: userDto.studentUniversityId,
          studentDepartment: userDto.studentDepartment,
          studentYear: userDto.studentYear,
          status: userDto.status,
        };

        await this.createUser(createUserDto, actorUserId);
        results.created++;
      } catch (error: unknown) {
        results.failed++;
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`Row ${i + 1}: ${errorMessage}`);
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

  private generateSecurePassword(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const length = 16;
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}
