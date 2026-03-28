import { Controller, Get, Query, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { ReportingService, ReportFilters } from './reporting.service';

@Controller('api/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get('metrics')
  async getMetrics(
    @CurrentUser('universityId') universityId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
  ) {
    const filters: ReportFilters = {
      startDate,
      endDate,
      department,
      status,
    };

    return this.reportingService.getClearanceMetrics(universityId, filters);
  }

  @Get('department-performance')
  async getDepartmentPerformance(
    @CurrentUser('universityId') universityId: string,
    @Query('timeframe') timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ) {
    return this.reportingService.getEnhancedDepartmentPerformance(
      universityId,
      timeframe,
    );
  }

  @Get('bottlenecks')
  async getBottlenecks(@CurrentUser('universityId') universityId: string) {
    return this.reportingService.getBottleneckAnalysis(universityId);
  }

  @Get('trends')
  async getTrends(
    @CurrentUser('universityId') universityId: string,
    @Query('timeframe') timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ) {
    return this.reportingService.getClearanceTrends(universityId, timeframe);
  }

  @Get('export/excel')
  async exportExcel(
    @CurrentUser('universityId') universityId: string,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
  ) {
    const filters: ReportFilters = {
      startDate,
      endDate,
      department,
      status,
    };

    const buffer = await this.reportingService.exportExcelReport(
      universityId,
      filters,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename=clearance-report.xlsx',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('export/pdf')
  async exportPdf(
    @CurrentUser('universityId') universityId: string,
    @Res() res: Response,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('department') department?: string,
    @Query('status') status?: string,
  ) {
    const filters: ReportFilters = {
      startDate,
      endDate,
      department,
      status,
    };

    const buffer = await this.reportingService.exportPdfReport(
      universityId,
      filters,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=clearance-report.pdf',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('export/enhanced-excel')
  async exportEnhancedExcel(
    @CurrentUser('universityId') universityId: string,
    @Res() res: Response,
    @Query('timeframe') timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ) {
    const buffer = await this.reportingService.exportEnhancedExcelReport(
      universityId,
      timeframe,
    );

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename=enhanced-clearance-report.xlsx',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('export/enhanced-pdf')
  async exportEnhancedPdf(
    @CurrentUser('universityId') universityId: string,
    @Res() res: Response,
    @Query('timeframe') timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ) {
    const buffer = await this.reportingService.exportEnhancedPdfReport(
      universityId,
      timeframe,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        'attachment; filename=enhanced-clearance-report.pdf',
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }
}
