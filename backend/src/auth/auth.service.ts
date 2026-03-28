import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '../../generated/prisma/enums';
import { UsersService } from '../users/users.service';
import type { JwtPayload } from './strategies/jwt.strategy';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (!dto.email?.trim()) {
      throw new BadRequestException('Email is required');
    }

    if (!dto.password || dto.password.length < 10) {
      throw new BadRequestException(
        'Password must be at least 10 characters long',
      );
    }

    const normalizedEmail = dto.email.toLowerCase().trim();
    const existing = await this.users.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const defaultUniversityId = await this.users.getDefaultUniversityId();
    if (!defaultUniversityId) {
      throw new ConflictException('No active university configured');
    }

    if (dto.studentUniversityId?.trim()) {
      const normalizedStudentId = dto.studentUniversityId.trim();
      const existingId =
        await this.users.findByStudentUniversityId(normalizedStudentId);
      if (existingId) {
        throw new ConflictException('Student university ID already registered');
      }
    }

    const user = await this.users.create({
      universityId: defaultUniversityId,
      email: normalizedEmail,
      passwordHash,
      displayName: dto.displayName?.trim() || undefined,
      role: Role.STUDENT,
      studentUniversityId: dto.studentUniversityId?.trim() || undefined,
      studentDepartment: dto.studentDepartment?.trim() || undefined,
      studentYear: dto.studentYear?.trim() || undefined,
    });

    return this.buildAuthResponse(
      user.id,
      user.universityId,
      user.email,
      user.role,
      user.displayName,
      user.staffDepartment,
    );
  }

  async login(dto: LoginDto) {
    if (!dto.email?.trim()) {
      throw new BadRequestException('Email is required');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user account is active
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // For development: Skip password check and login based on email only
    // Remove this block in production!
    if (process.env.NODE_ENV !== 'production') {
      return this.buildAuthResponse(
        user.id,
        user.universityId,
        user.email,
        user.role,
        user.displayName,
        user.staffDepartment,
      );
    }

    // Production: Validate password
    if (!dto.password || dto.password.length < 1) {
      throw new BadRequestException('Password is required');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(
      user.id,
      user.universityId,
      user.email,
      user.role,
      user.displayName,
      user.staffDepartment,
    );
  }

  async getProfile(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.displayName,
      universityId: user.universityId,
      staffDepartment: user.staffDepartment,
      studentUniversityId: user.studentUniversityId,
      studentDepartment: user.studentDepartment,
      studentYear: user.studentYear,
      createdAt: user.createdAt,
    };
  }

  private async buildAuthResponse(
    userId: string,
    universityId: string,
    email: string,
    role: Role,
    displayName: string | null,
    staffDepartment?: string | null,
  ) {
    const payload: JwtPayload = { sub: userId, universityId, email, role };
    const access_token = await this.jwt.signAsync(payload);

    return {
      access_token,
      user: {
        id: userId,
        universityId,
        email,
        role,
        displayName,
        staffDepartment,
      },
    };
  }
}
