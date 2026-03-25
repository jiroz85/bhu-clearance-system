import { Injectable } from '@nestjs/common';
import type { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  }

  findByStudentUniversityId(studentUniversityId: string) {
    return this.prisma.user.findUnique({
      where: { studentUniversityId: studentUniversityId.trim() },
    });
  }

  async getDefaultUniversityId() {
    const uni = await this.prisma.university.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return uni?.id ?? null;
  }

  create(data: {
    universityId?: string;
    email: string;
    passwordHash: string;
    displayName?: string;
    role?: Role;
    studentUniversityId?: string | null;
    studentDepartment?: string | null;
    studentYear?: string | null;
  }) {
    if (!data.universityId) {
      throw new Error('universityId is required when creating user');
    }
    return this.prisma.user.create({
      data: {
        university: { connect: { id: data.universityId } },
        email: data.email.toLowerCase().trim(),
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        role: data.role,
        studentUniversityId: data.studentUniversityId ?? undefined,
        studentDepartment: data.studentDepartment ?? undefined,
        studentYear: data.studentYear ?? undefined,
      },
    });
  }
}
