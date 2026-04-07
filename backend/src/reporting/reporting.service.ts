import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export interface ClearanceMetrics {
  totalClearances: number;
  fullyCleared: number;
  inProgress: number;
  pausedRejected: number;
  draft: number;
  cancelled: number;
  completionRate: number;
  averageProcessingTimeDays: number;
  rejectionRateByDepartment: Array<{
    department: string;
    total: number;
    rejected: number;
    rejectionRate: number;
  }>;
  bottleneckDepartments: Array<{
    department: string;
    averageTimeDays: number;
    pendingCount: number;
    totalProcessed: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    started: number;
    completed: number;
    averageTimeDays: number;
  }>;
  _meta?: {
    generatedAt: string;
    processingTimeMs: number;
    cacheExpiry: string;
  };
}

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  department?: string;
  status?: string;
}

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async getClearanceMetrics(
    universityId: string,
    filters?: ReportFilters,
  ): Promise<ClearanceMetrics> {
    const whereClause: {
      universityId: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      universityId,
    };

    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = new Date(filters.endDate);
      }
    }

    // PERFORMANCE: Use parallel queries and aggregation instead of fetching all data
    const [statusCounts, completedClearances, departmentStats, monthlyStats] =
      await Promise.all([
        // Query 1: Get status counts in single aggregation
        this.prisma.clearance.groupBy({
          by: ['status'],
          where: whereClause,
          _count: { id: true },
        }),

        // Query 2: Get only completed clearances with timing data
        this.prisma.clearance.findMany({
          where: {
            ...whereClause,
            status: 'FULLY_CLEARED',
            submittedAt: { not: null },
            completedAt: { not: null },
          },
          select: {
            submittedAt: true,
            completedAt: true,
          },
        }),

        // Query 3: Get department step statistics
        this.prisma.clearanceStep.groupBy({
          by: ['department', 'status'],
          where: {
            clearance: { universityId },
          },
          _count: { id: true },
        }),

        // Query 4: Get monthly trends (limited to last 6 months)
        this.getMonthlyStats(universityId, filters),
      ]);

    // Calculate metrics from aggregated data
    const statusMap = statusCounts.reduce(
      (acc: any, item: any) => {
        acc[item.status] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    const totalClearances = Object.values(statusMap).reduce(
      (sum: number, count: number) => sum + count,
      0,
    ) as number;
    const fullyCleared = (statusMap['FULLY_CLEARED'] || 0) as number;
    const inProgress = (statusMap['SUBMITTED'] || 0) as number;
    const pausedRejected = (statusMap['PAUSED_REJECTED'] || 0) as number;
    const draft = (statusMap['DRAFT'] || 0) as number;
    const cancelled = (statusMap['CANCELLED'] || 0) as number;

    const completionRate =
      totalClearances > 0 ? (fullyCleared / totalClearances) * 100 : 0;

    // Calculate average processing time from completed clearances
    const averageProcessingTimeDays =
      completedClearances.length > 0
        ? completedClearances.reduce((sum: number, clearance: any) => {
            const start = clearance.submittedAt!.getTime();
            const end = clearance.completedAt!.getTime();
            return sum + (end - start) / (1000 * 60 * 60 * 24);
          }, 0) / completedClearances.length
        : 0;

    // PERFORMANCE: Calculate department metrics from aggregated step data
    const rejectionRateByDepartment =
      this.calculateDepartmentRejectionRates(departmentStats);
    const bottleneckDepartments =
      await this.getBottleneckDepartmentsFast(universityId);
    const monthlyTrends = monthlyStats;

    return {
      totalClearances,
      fullyCleared,
      inProgress,
      pausedRejected,
      draft,
      cancelled,
      completionRate,
      averageProcessingTimeDays,
      rejectionRateByDepartment,
      bottleneckDepartments,
      monthlyTrends,
    };
  }

  private calculateDepartmentRejectionRates(
    departmentStats: any[],
  ): ClearanceMetrics['rejectionRateByDepartment'] {
    const deptMap = new Map<string, { total: number; rejected: number }>();

    departmentStats.forEach((stat: any) => {
      if (!deptMap.has(stat.department)) {
        deptMap.set(stat.department, { total: 0, rejected: 0 });
      }
      const dept = deptMap.get(stat.department)!;
      dept.total += stat._count.id;
      if (stat.status === 'REJECTED') {
        dept.rejected += stat._count.id;
      }
    });

    return Array.from(deptMap.entries())
      .map(([department, stats]) => ({
        department,
        total: stats.total,
        rejected: stats.rejected,
        rejectionRate:
          stats.total > 0 ? (stats.rejected / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.rejectionRate - a.rejectionRate)
      .slice(0, 10);
  }

  private async getBottleneckDepartmentsFast(
    universityId: string,
  ): Promise<ClearanceMetrics['bottleneckDepartments']> {
    // Get simplified bottleneck data with aggregation
    const [departmentTimes, pendingCounts] = await Promise.all([
      // Average processing times per department (only completed steps)
      this.prisma.$queryRaw<
        Array<{ department: string; avgTime: number; count: number }>
      >`
        SELECT 
          c."department",
          AVG(EXTRACT(EPOCH FROM (c."reviewed_at" - COALESCE(cl."submitted_at", c."created_at"))) / 86400) as "avgTime",
          COUNT(*) as "count"
        FROM "clearance_steps" c
        INNER JOIN "clearances" cl ON c."clearance_id" = cl."id"
        WHERE c."status" = 'APPROVED' 
        AND c."reviewed_at" IS NOT NULL
        AND cl."university_id" = ${universityId}
        GROUP BY c."department"
        HAVING COUNT(*) > 0
      `,

      // Pending counts per department
      this.prisma.clearanceStep.groupBy({
        by: ['department'],
        where: {
          status: 'PENDING',
          clearance: { universityId },
        },
        _count: { id: true },
      }),
    ]);

    const pendingMap = pendingCounts.reduce(
      (acc: any, item: any) => {
        acc[item.department] = item._count.id;
        return acc;
      },
      {} as Record<string, number>,
    );

    return departmentTimes
      .map((item: any) => ({
        department: item.department,
        averageTimeDays: Number(item.avgTime),
        pendingCount: pendingMap[item.department] || 0,
        totalProcessed: Number(item.count),
      }))
      .sort((a, b) => b.averageTimeDays - a.averageTimeDays)
      .slice(0, 6);
  }

  private async getMonthlyStats(
    universityId: string,
    filters?: ReportFilters,
  ): Promise<ClearanceMetrics['monthlyTrends']> {
    const whereClause: any = { universityId };

    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = new Date(filters.endDate);
      }
    }

    // Limit to last 6 months for performance
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    whereClause.createdAt = { ...whereClause.createdAt, gte: sixMonthsAgo };

    const monthlyData = await this.prisma.$queryRaw<
      Array<{
        month: string;
        started: bigint;
        completed: bigint;
        avgTime: number;
      }>
    >`
      SELECT 
        TO_CHAR(c."created_at", 'YYYY-MM') as month,
        COUNT(*) as started,
        COUNT(CASE WHEN c."status" = 'FULLY_CLEARED' THEN 1 END) as completed,
        AVG(CASE WHEN c."status" = 'FULLY_CLEARED' AND c."submitted_at" IS NOT NULL AND c."completed_at" IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (c."completed_at" - c."submitted_at")) / 86400 END) as "avgTime"
      FROM "clearances" c
      WHERE c."university_id" = ${universityId}
      AND c."created_at" >= ${sixMonthsAgo}
      GROUP BY TO_CHAR(c."created_at", 'YYYY-MM')
      ORDER BY month DESC
    `;

    return monthlyData.map((item: any) => ({
      month: item.month,
      started: Number(item.started),
      completed: Number(item.completed),
      averageTimeDays: item.avgTime || 0,
    }));
  }

  // Legacy methods for compatibility
  async getRejectionRatesByDepartment(
    universityId: string,
    filters?: ReportFilters,
  ): Promise<ClearanceMetrics['rejectionRateByDepartment']> {
    const whereClause: any = { universityId };

    if (filters?.startDate || filters?.endDate) {
      whereClause.clearance = {
        createdAt: {},
      };
      if (filters.startDate) {
        whereClause.clearance.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.clearance.createdAt.lte = new Date(filters.endDate);
      }
    }

    const departmentStats = await this.prisma.clearanceStep.groupBy({
      by: ['department'],
      where: whereClause,
      _count: {
        id: true,
      },
    });

    const departmentRejections = await this.prisma.clearanceStep.groupBy({
      by: ['department'],
      where: {
        ...whereClause,
        status: 'REJECTED',
      },
      _count: {
        id: true,
      },
    });

    return departmentStats
      .map((stat: any) => {
        const rejection = departmentRejections.find(
          (r: any) => r.department === stat.department,
        );
        const rejected = rejection?._count.id || 0;
        const total = stat._count.id;
        const rejectionRate = total > 0 ? (rejected / total) * 100 : 0;

        return {
          department: stat.department,
          total,
          rejected,
          rejectionRate,
        };
      })
      .sort((a: any, b: any) => b.rejectionRate - a.rejectionRate);
  }

  async getBottleneckDepartments(
    universityId: string,
    filters?: ReportFilters,
  ): Promise<ClearanceMetrics['bottleneckDepartments']> {
    const whereClause: any = { universityId };

    if (filters?.startDate || filters?.endDate) {
      whereClause.clearance = {
        createdAt: {},
      };
      if (filters.startDate) {
        whereClause.clearance.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.clearance.createdAt.lte = new Date(filters.endDate);
      }
    }

    // Get completed steps with timing data
    const completedSteps = await this.prisma.clearanceStep.findMany({
      where: {
        ...whereClause,
        status: 'APPROVED',
        reviewedAt: { not: null },
      },
      include: {
        clearance: {
          select: {
            submittedAt: true,
          },
        },
      },
    });

    // Get current pending steps
    const pendingSteps = await this.prisma.clearanceStep.groupBy({
      by: ['department'],
      where: {
        ...whereClause,
        status: 'PENDING',
      },
      _count: {
        id: true,
      },
    });

    // Calculate average processing time per department
    const departmentTimes = completedSteps.reduce(
      (acc: any, step: any) => {
        const dept = step.department;
        if (!acc[dept]) {
          acc[dept] = { totalTime: 0, count: 0 };
        }

        const startTime =
          step.clearance.submittedAt?.getTime() || step.createdAt.getTime();
        const endTime = step.reviewedAt!.getTime();
        const processingDays = (endTime - startTime) / (1000 * 60 * 60 * 24);

        acc[dept].totalTime += processingDays;
        acc[dept].count += 1;

        return acc;
      },
      {} as Record<string, { totalTime: number; count: number }>,
    );

    return Object.entries(departmentTimes)
      .map(([department, stats]: any) => {
        const averageTimeDays = stats.totalTime / stats.count;
        const pendingCount =
          pendingSteps.find((p: any) => p.department === department)?._count
            .id || 0;

        return {
          department,
          averageTimeDays,
          pendingCount,
          totalProcessed: stats.count,
        };
      })
      .sort((a: any, b: any) => b.averageTimeDays - a.averageTimeDays)
      .slice(0, 5); // Top 5 bottlenecks
  }

  async getMonthlyTrends(
    universityId: string,
    filters?: ReportFilters,
  ): Promise<ClearanceMetrics['monthlyTrends']> {
    const whereClause: any = { universityId };

    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) {
        whereClause.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        whereClause.createdAt.lte = new Date(filters.endDate);
      }
    }

    // Get last 12 months of data
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    whereClause.createdAt.gte = twelveMonthsAgo;

    const clearances = await this.prisma.clearance.findMany({
      where: whereClause,
      select: {
        createdAt: true,
        status: true,
        submittedAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const monthlyData = clearances.reduce(
      (acc: any, clearance: any) => {
        const month = clearance.createdAt.toISOString().slice(0, 7); // YYYY-MM format

        if (!acc[month]) {
          acc[month] = {
            month,
            started: 0,
            completed: 0,
            totalTime: 0,
            completedCount: 0,
          };
        }

        acc[month].started += 1;

        if (
          clearance.status === 'FULLY_CLEARED' &&
          clearance.submittedAt &&
          clearance.completedAt
        ) {
          acc[month].completed += 1;
          const processingDays =
            (clearance.completedAt.getTime() -
              clearance.submittedAt.getTime()) /
            (1000 * 60 * 60 * 24);
          acc[month].totalTime += processingDays;
          acc[month].completedCount += 1;
        }

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(monthlyData).map((data: any) => ({
      month: data.month,
      started: data.started,
      completed: data.completed,
      averageTimeDays:
        data.completedCount > 0 ? data.totalTime / data.completedCount : 0,
    }));
  }

  // Additional methods for enhanced reporting controller
  async getDepartmentPerformance(universityId: string): Promise<any[]> {
    // Return bottleneck departments as department performance data
    return this.getBottleneckDepartments(universityId);
  }

  async getEnhancedDepartmentPerformance(
    universityId: string,
    timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<any[]> {
    return this.getDepartmentPerformance(universityId);
  }

  async getBottleneckAnalysis(universityId: string): Promise<any[]> {
    return this.getBottleneckDepartments(universityId);
  }

  async getClearanceTrends(
    universityId: string,
    timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<ClearanceMetrics['monthlyTrends']> {
    return this.getMonthlyTrends(universityId);
  }

  async exportEnhancedExcelReport(
    universityId: string,
    timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<Buffer> {
    return this.exportExcelReport(universityId);
  }

  async exportEnhancedPdfReport(
    universityId: string,
    timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<Buffer> {
    return this.exportPdfReport(universityId);
  }

  // Export methods (keeping for compatibility)
  async exportExcelReport(
    universityId: string,
    filters?: ReportFilters,
  ): Promise<Buffer> {
    const metrics = await this.getClearanceMetrics(universityId, filters);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryData = [
      ['Metric', 'Value'],
      ['Total Clearances', metrics.totalClearances],
      ['Fully Cleared', metrics.fullyCleared],
      ['In Progress', metrics.inProgress],
      ['Paused/Rejected', metrics.pausedRejected],
      ['Draft', metrics.draft],
      ['Cancelled', metrics.cancelled],
      ['Completion Rate (%)', metrics.completionRate.toFixed(2)],
      [
        'Average Processing Time (Days)',
        metrics.averageProcessingTimeDays.toFixed(2),
      ],
    ];

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(excelBuffer);
  }

  async exportPdfReport(
    universityId: string,
    filters?: ReportFilters,
  ): Promise<Buffer> {
    const metrics = await this.getClearanceMetrics(universityId, filters);

    // Create PDF document
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.text('BHU Clearance System Report', 20, yPosition);
    yPosition += 20;

    // Date range
    doc.setFontSize(12);
    if (filters?.startDate || filters?.endDate) {
      const dateRange = `Period: ${filters?.startDate || 'Beginning'} to ${filters?.endDate || 'Present'}`;
      doc.text(dateRange, 20, yPosition);
      yPosition += 15;
    }

    // Summary Section
    doc.setFontSize(16);
    doc.text('Summary Metrics', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    const summaryLines = [
      `Total Clearances: ${metrics.totalClearances}`,
      `Fully Cleared: ${metrics.fullyCleared}`,
      `Completion Rate: ${metrics.completionRate.toFixed(2)}%`,
      `Average Processing Time: ${metrics.averageProcessingTimeDays.toFixed(2)} days`,
    ];

    summaryLines.forEach((line) => {
      doc.text(line, 20, yPosition);
      yPosition += 8;
    });

    // Generate buffer
    return Buffer.from(doc.output('arraybuffer'));
  }
}
