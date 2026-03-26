import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { ClearanceService } from '../clearance/clearance.service';
import { AdminService } from './admin.service';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { AdminListUsersDto } from './dto/admin-list-users.dto';
import { BulkImportDto } from './dto/bulk-import.dto';
import { AdminOverrideDto } from './dto/admin-override.dto';

@Controller('api/admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly clearance: ClearanceService,
    private readonly auditService: AuditService,
  ) {}

  @Post('users')
  createUser(
    @CurrentUser('userId') actorId: string,
    @Body() dto: AdminCreateUserDto,
  ) {
    return this.admin.createUser(dto, actorId);
  }

  @Get('clearances')
  listClearances(@Query('skip') skip?: string, @Query('take') take?: string) {
    const s = Math.max(0, parseInt(skip ?? '0', 10) || 0);
    const t = Math.min(100, Math.max(1, parseInt(take ?? '50', 10) || 50));
    return this.clearance.listAllForAdmin(s, t);
  }

  @Get('reports/summary')
  summary() {
    return this.clearance.adminSummary();
  }

  @Get('audit')
  auditLog(@Query('take') take?: string) {
    const n = Math.min(500, Math.max(1, parseInt(take ?? '100', 10) || 100));
    return this.auditService.listRecent(n);
  }

  @Patch('override/:clearanceId')
  overrideStep(
    @CurrentUser('userId') actorId: string,
    @Param('clearanceId', new ParseUUIDPipe({ version: '4' }))
    clearanceId: string,
    @Body() dto: AdminOverrideDto,
  ) {
    return this.clearance.adminOverrideStep(actorId, clearanceId, dto);
  }

  // User Management endpoints
  @Get('users')
  listUsers(
    @CurrentUser('userId') actorId: string,
    @Query() dto: AdminListUsersDto,
  ) {
    return this.admin.listUsers(actorId, dto);
  }

  @Patch('users/:userId')
  updateUser(
    @CurrentUser('userId') actorId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.admin.updateUser(actorId, userId, dto);
  }

  @Delete('users/:userId')
  deleteUser(
    @CurrentUser('userId') actorId: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.admin.deleteUser(actorId, userId);
  }

  @Post('users/bulk-import')
  bulkImport(
    @CurrentUser('userId') actorId: string,
    @Body() dto: BulkImportDto,
  ) {
    return this.admin.bulkImportUsers(actorId, dto);
  }
}
