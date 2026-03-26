import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../common/decorators/current-user.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { LoginDto, QuickLoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('api/auth')
export class AuthController {
  private readonly accessTokenCookieName = 'bhu_access_token';

  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto).then((r) => {
      const maxAgeSec = this.config.getOrThrow<number>('jwt.expiresInSec');
      res.cookie(this.accessTokenCookieName, r.access_token, {
        httpOnly: true,
        secure: this.config.get<string>('nodeEnv') === 'production',
        sameSite: 'lax',
        maxAge: maxAgeSec * 1000,
      });
      return r;
    });
  }

  // Development quick login - no password required
  @Post('quick-login')
  quickLogin(
    @Body() dto: QuickLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Convert to LoginDto with dummy password
    const loginDto: LoginDto = {
      email: dto.email,
      password: 'dev-password', // Dummy password, will be skipped in dev mode
    };

    return this.auth.login(loginDto).then((r) => {
      const maxAgeSec = this.config.getOrThrow<number>('jwt.expiresInSec');
      res.cookie(this.accessTokenCookieName, r.access_token, {
        httpOnly: true,
        secure: this.config.get<string>('nodeEnv') === 'production',
        sameSite: 'lax',
        maxAge: maxAgeSec * 1000,
      });
      return r;
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.getProfile(user.userId);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(this.accessTokenCookieName, { path: '/' });
    return { ok: true };
  }
}
