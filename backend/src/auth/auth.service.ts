import {
  ConflictException,
  Injectable,
  UnauthorizedException,
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
    const existing = await this.users.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const defaultUniversityId = await this.users.getDefaultUniversityId();
    if (!defaultUniversityId) {
      throw new ConflictException('No active university configured');
    }

    if (dto.studentUniversityId) {
      const existingId = await this.users.findByStudentUniversityId(
        dto.studentUniversityId.trim(),
      );
      if (existingId) {
        throw new ConflictException('Student university ID already registered');
      }
    }

    const user = await this.users.create({
      universityId: defaultUniversityId,
      email: dto.email,
      passwordHash,
      displayName: dto.displayName,
      role: Role.STUDENT,
      studentUniversityId: dto.studentUniversityId?.trim() || null,
      studentDepartment: dto.studentDepartment?.trim() || null,
      studentYear: dto.studentYear?.trim() || null,
    });

    return this.buildAuthResponse(
      user.id,
      user.universityId,
      user.email,
      user.role,
      user.displayName,
    );
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // For development: Skip password check and login based on email
    // Remove this in production!
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔓 Development login: ${dto.email} as ${user.role}`);
      return this.buildAuthResponse(
        user.id,
        user.universityId,
        user.email,
        user.role,
        user.displayName,
      );
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
      },
    };
  }
}
