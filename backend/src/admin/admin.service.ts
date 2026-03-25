import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AdminCreateUserDto } from './dto/admin-create-user.dto';

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
      const dup = await this.prisma.user.findUnique({ where: { studentUniversityId: sid } });
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
}
