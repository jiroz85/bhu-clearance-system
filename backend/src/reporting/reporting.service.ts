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
    const whereClause: any = {
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

    // Get basic clearance counts
    const [
      totalClearances,
      fullyCleared,
      inProgress,
      pausedRejected,
      draft,
      cancelled,
    ] = await Promise.all([
      this.prisma.clearance.count({ where: whereClause }),
      this.prisma.clearance.count({
        where: { ...whereClause, status: 'FULLY_CLEARED' },
      }),
      this.prisma.clearance.count({
        where: { ...whereClause, status: 'SUBMITTED' },
      }),
      this.prisma.clearance.count({
        where: { ...whereClause, status: 'PAUSED_REJECTED' },
      }),
      this.prisma.clearance.count({
        where: { ...whereClause, status: 'DRAFT' },
      }),
      this.prisma.clearance.count({
        where: { ...whereClause, status: 'CANCELLED' },
      }),
    ]);

    const completionRate =
      totalClearances > 0 ? (fullyCleared / totalClearances) * 100 : 0;

    // Calculate average processing time
    const completedClearances = await this.prisma.clearance.findMany({
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
    });

    const averageProcessingTimeDays =
      completedClearances.length > 0
        ? completedClearances.reduce((sum, clearance) => {
            const start = clearance.submittedAt!.getTime();
            const end = clearance.completedAt!.getTime();
            return sum + (end - start) / (1000 * 60 * 60 * 24);
          }, 0) / completedClearances.length
        : 0;

    // Get rejection rates by department
    const rejectionRates = await this.getRejectionRatesByDepartment(
      universityId,
      filters,
    );

    // Get bottleneck departments
    const bottlenecks = await this.getBottleneckDepartments(
      universityId,
      filters,
    );

    // Get monthly trends
    const monthlyTrends = await this.getMonthlyTrends(universityId, filters);

    return {
      totalClearances,
      fullyCleared,
      inProgress,
      pausedRejected,
      draft,
      cancelled,
      completionRate,
      averageProcessingTimeDays,
      rejectionRateByDepartment: rejectionRates,
      bottleneckDepartments: bottlenecks,
      monthlyTrends,
    };
  }

  private async getRejectionRatesByDepartment(
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
      .map((stat) => {
        const rejection = departmentRejections.find(
          (r) => r.department === stat.department,
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
      .sort((a, b) => b.rejectionRate - a.rejectionRate);
  }

  private async getBottleneckDepartments(
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
      (acc, step) => {
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
      .map(([department, stats]) => {
        const averageTimeDays = stats.totalTime / stats.count;
        const pendingCount =
          pendingSteps.find((p) => p.department === department)?._count.id || 0;

        return {
          department,
          averageTimeDays,
          pendingCount,
          totalProcessed: stats.count,
        };
      })
      .sort((a, b) => b.averageTimeDays - a.averageTimeDays)
      .slice(0, 5); // Top 5 bottlenecks
  }

  private async getMonthlyTrends(
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
      (acc, clearance) => {
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

    return Object.values(monthlyData).map((data) => ({
      month: data.month,
      started: data.started,
      completed: data.completed,
      averageTimeDays:
        data.completedCount > 0 ? data.totalTime / data.completedCount : 0,
    }));
  }

  async getDepartmentPerformance(universityId: string): Promise<any[]> {
    const departments = await this.prisma.department.findMany({
      where: { universityId },
      include: {
        workflowSteps: true,
      },
    });

    // Get clearance steps for each department
    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const clearanceSteps = await this.prisma.clearanceStep.findMany({
          where: {
            department: dept.name,
            clearance: {
              universityId,
              status: { in: ['SUBMITTED', 'FULLY_CLEARED', 'PAUSED_REJECTED'] },
              submittedAt: { not: null },
            },
          },
          include: {
            clearance: {
              select: {
                status: true,
                submittedAt: true,
                completedAt: true,
              },
            },
          },
        });

        const allSteps = clearanceSteps;
        const approvedSteps = allSteps.filter((s) => s.status === 'APPROVED');
        const rejectedSteps = allSteps.filter((s) => s.status === 'REJECTED');
        const pendingSteps = allSteps.filter((s) => s.status === 'PENDING');

        const approvedWithTimes = approvedSteps.filter((s) => s.reviewedAt);
        const averageApprovalTimeHours =
          approvedWithTimes.length > 0
            ? approvedWithTimes.reduce((sum, step) => {
                const processingTime =
                  step.reviewedAt!.getTime() -
                  (step.clearance.submittedAt?.getTime() ||
                    step.createdAt.getTime());
                return sum + processingTime / (1000 * 60 * 60);
              }, 0) / approvedWithTimes.length
            : 0;

        return {
          department: dept.name,
          totalSteps: allSteps.length,
          approved: approvedSteps.length,
          rejected: rejectedSteps.length,
          pending: pendingSteps.length,
          approvalRate:
            allSteps.length > 0
              ? (approvedSteps.length / allSteps.length) * 100
              : 0,
          rejectionRate:
            allSteps.length > 0
              ? (rejectedSteps.length / allSteps.length) * 100
              : 0,
          averageProcessingTimeDays: averageApprovalTimeHours / 24,
        };
      }),
    );

    return departmentStats.sort(
      (a, b) => b.averageProcessingTimeDays - a.averageProcessingTimeDays,
    );
  }

  async exportExcelReport(
    universityId: string,
    filters?: ReportFilters,
  ): Promise<Buffer> {
    const metrics = await this.getClearanceMetrics(universityId, filters);
    const departmentPerformance =
      await this.getDepartmentPerformance(universityId);

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

    // Department Performance Sheet
    const deptData = [
      [
        'Department',
        'Total Steps',
        'Approved',
        'Rejected',
        'Pending',
        'Approval Rate (%)',
        'Rejection Rate (%)',
        'Avg Processing Time (Days)',
      ],
      ...departmentPerformance.map((dept) => [
        dept.department,
        dept.totalSteps,
        dept.approved,
        dept.rejected,
        dept.pending,
        dept.approvalRate.toFixed(2),
        dept.rejectionRate.toFixed(2),
        dept.averageProcessingTimeDays.toFixed(2),
      ]),
    ];

    const deptWs = XLSX.utils.aoa_to_sheet(deptData);
    XLSX.utils.book_append_sheet(wb, deptWs, 'Department Performance');

    // Rejection Rates Sheet
    const rejectionData = [
      ['Department', 'Total', 'Rejected', 'Rejection Rate (%)'],
      ...metrics.rejectionRateByDepartment.map((dept) => [
        dept.department,
        dept.total,
        dept.rejected,
        dept.rejectionRate.toFixed(2),
      ]),
    ];

    const rejectionWs = XLSX.utils.aoa_to_sheet(rejectionData);
    XLSX.utils.book_append_sheet(wb, rejectionWs, 'Rejection Rates');

    // Monthly Trends Sheet
    const trendsData = [
      ['Month', 'Started', 'Completed', 'Average Processing Time (Days)'],
      ...metrics.monthlyTrends.map((trend) => [
        trend.month,
        trend.started,
        trend.completed,
        trend.averageTimeDays.toFixed(2),
      ]),
    ];

    const trendsWs = XLSX.utils.aoa_to_sheet(trendsData);
    XLSX.utils.book_append_sheet(wb, trendsWs, 'Monthly Trends');

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(excelBuffer);
  }

  async exportPdfReport(
    universityId: string,
    filters?: ReportFilters,
  ): Promise<Buffer> {
    const metrics = await this.getClearanceMetrics(universityId, filters);
    const departmentPerformance =
      await this.getDepartmentPerformance(universityId);

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

    yPosition += 10;

    // Department Performance Section
    doc.setFontSize(16);
    doc.text('Department Performance', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    departmentPerformance.slice(0, 10).forEach((dept) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      const deptText = `${dept.department}: ${dept.approvalRate.toFixed(1)}% approval, ${dept.averageProcessingTimeDays.toFixed(1)} days avg`;
      doc.text(deptText, 20, yPosition);
      yPosition += 8;
    });

    // Generate buffer
    return Buffer.from(doc.output('arraybuffer'));
  }

  async getEnhancedDepartmentPerformance(
    universityId: string,
    timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<any[]> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(
          now.getFullYear(),
          Math.floor(now.getMonth() / 3) * 3,
          1,
        );
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const departments = await this.prisma.department.findMany({
      where: { universityId },
    });

    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const clearanceSteps = await this.prisma.clearanceStep.findMany({
          where: {
            department: dept.name,
            clearance: {
              universityId,
              createdAt: { gte: startDate },
            },
          },
          include: {
            clearance: {
              select: {
                student: {
                  select: {
                    displayName: true,
                    studentUniversityId: true,
                  },
                },
              },
            },
          },
        });

        const allSteps = clearanceSteps;
        const approvedSteps = allSteps.filter((s) => s.status === 'APPROVED');
        const rejectedSteps = allSteps.filter((s) => s.status === 'REJECTED');
        const pendingSteps = allSteps.filter((s) => s.status === 'PENDING');

        // Calculate overdue count (pending for more than 3 days)
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const overdueSteps = pendingSteps.filter(
          (s) => s.createdAt < threeDaysAgo,
        );

        const approvedWithTimes = approvedSteps.filter((s) => s.reviewedAt);
        const averageProcessingTimeHours =
          approvedWithTimes.length > 0
            ? approvedWithTimes.reduce((sum, step) => {
                const processingTime =
                  step.reviewedAt!.getTime() - step.createdAt.getTime();
                return sum + processingTime / (1000 * 60 * 60);
              }, 0) / approvedWithTimes.length
            : 0;

        // Generate trend data
        const trendData = await this.generateDepartmentTrendData(
          dept.name,
          universityId,
          startDate,
          now,
        );

        return {
          department: dept.name,
          metrics: {
            totalProcessed: allSteps.length,
            approved: approvedSteps.length,
            rejected: rejectedSteps.length,
            pending: pendingSteps.length,
            approvalRate:
              allSteps.length > 0
                ? (approvedSteps.length / allSteps.length) * 100
                : 0,
            averageProcessingTimeHours:
              Math.round(averageProcessingTimeHours * 10) / 10,
            overdueCount: overdueSteps.length,
          },
          trend: {
            period: timeframe || 'month',
            data: trendData,
          },
        };
      }),
    );

    return departmentStats.sort(
      (a, b) => b.metrics.approvalRate - a.metrics.approvalRate,
    );
  }

  async getBottleneckAnalysis(universityId: string): Promise<any[]> {
    const departments = await this.prisma.department.findMany({
      where: { universityId },
    });

    const bottleneckData = await Promise.all(
      departments.map(async (dept) => {
        const pendingClearances = await this.prisma.clearanceStep.findMany({
          where: {
            department: dept.name,
            status: 'PENDING',
            createdAt: {
              lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
          },
          include: {
            clearance: {
              include: {
                student: {
                  select: {
                    displayName: true,
                    studentUniversityId: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        });

        // Categorize bottlenecks by severity
        const now = new Date();
        const bottlenecks = pendingClearances.map((clearance) => {
          const pendingDays = Math.floor(
            (now.getTime() - clearance.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          );

          let type: 'CRITICAL' | 'URGENT' | 'WARNING';
          if (pendingDays >= 5) type = 'CRITICAL';
          else if (pendingDays >= 3) type = 'URGENT';
          else type = 'WARNING';

          return {
            type,
            clearanceId: clearance.id,
            studentName: clearance.clearance.student.displayName || 'Unknown',
            studentId: clearance.clearance.student.studentUniversityId || 'N/A',
            pendingDays,
            reason: clearance.comment || 'No specific reason provided',
          };
        });

        const recommendations =
          this.generateBottleneckRecommendations(bottlenecks);

        return {
          department: dept.name,
          bottlenecks,
          recommendations,
        };
      }),
    );

    return bottleneckData.filter((dept) => dept.bottlenecks.length > 0);
  }

  async getClearanceTrends(
    universityId: string,
    timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<any[]> {
    const now = new Date();
    let startDate: Date;
    let dataPoints: number;

    switch (timeframe) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dataPoints = 7;
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dataPoints = 30;
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        dataPoints = 90;
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dataPoints = 365;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dataPoints = 30;
    }

    const clearances = await this.prisma.clearance.findMany({
      where: {
        universityId,
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyData = clearances.reduce(
      (acc, clearance) => {
        const date = clearance.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD format

        if (!acc[date]) {
          acc[date] = {
            date,
            total: 0,
            completed: 0,
            pending: 0,
            rejected: 0,
          };
        }

        acc[date].total += 1;

        switch (clearance.status) {
          case 'FULLY_CLEARED':
            acc[date].completed += 1;
            break;
          case 'SUBMITTED':
            acc[date].pending += 1;
            break;
          case 'PAUSED_REJECTED':
            acc[date].rejected += 1;
            break;
        }

        return acc;
      },
      {} as Record<string, any>,
    );

    // Fill in missing dates with zeros
    const trends = [];
    for (let i = dataPoints - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().slice(0, 10);

      trends.push(
        dailyData[dateStr] || {
          date: dateStr,
          total: 0,
          completed: 0,
          pending: 0,
          rejected: 0,
        },
      );
    }

    return trends;
  }

  async exportEnhancedExcelReport(
    universityId: string,
    timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<Buffer> {
    const departmentPerformance = await this.getEnhancedDepartmentPerformance(
      universityId,
      timeframe,
    );
    const bottlenecks = await this.getBottleneckAnalysis(universityId);
    const trends = await this.getClearanceTrends(universityId, timeframe);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Enhanced Department Performance Sheet
    const deptData = [
      [
        'Department',
        'Total Processed',
        'Approved',
        'Rejected',
        'Pending',
        'Approval Rate (%)',
        'Avg Processing Time (Hours)',
        'Overdue Count',
      ],
      ...departmentPerformance.map((dept) => [
        dept.department,
        dept.metrics.totalProcessed,
        dept.metrics.approved,
        dept.metrics.rejected,
        dept.metrics.pending,
        dept.metrics.approvalRate.toFixed(2),
        dept.metrics.averageProcessingTimeHours,
        dept.metrics.overdueCount,
      ]),
    ];

    const deptWs = XLSX.utils.aoa_to_sheet(deptData);
    XLSX.utils.book_append_sheet(wb, deptWs, 'Department Performance');

    // Bottlenecks Sheet
    const bottleneckData = [
      [
        'Department',
        'Clearance ID',
        'Student Name',
        'Student ID',
        'Pending Days',
        'Severity',
        'Reason',
      ],
      ...bottlenecks.flatMap((dept) =>
        dept.bottlenecks.map((b: any) => [
          dept.department,
          b.clearanceId,
          b.studentName,
          b.studentId,
          b.pendingDays,
          b.type,
          b.reason,
        ]),
      ),
    ];

    const bottleneckWs = XLSX.utils.aoa_to_sheet(bottleneckData);
    XLSX.utils.book_append_sheet(wb, bottleneckWs, 'Bottlenecks');

    // Trends Sheet
    const trendsData = [
      ['Date', 'Total', 'Completed', 'Pending', 'Rejected'],
      ...trends.map((trend) => [
        trend.date,
        trend.total,
        trend.completed,
        trend.pending,
        trend.rejected,
      ]),
    ];

    const trendsWs = XLSX.utils.aoa_to_sheet(trendsData);
    XLSX.utils.book_append_sheet(wb, trendsWs, 'Trends');

    // Generate buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(excelBuffer);
  }

  async exportEnhancedPdfReport(
    universityId: string,
    timeframe?: 'week' | 'month' | 'quarter' | 'year',
  ): Promise<Buffer> {
    const departmentPerformance = await this.getEnhancedDepartmentPerformance(
      universityId,
      timeframe,
    );
    const bottlenecks = await this.getBottleneckAnalysis(universityId);

    // Create PDF document
    const doc = new jsPDF();
    let yPosition = 20;

    // Title
    doc.setFontSize(20);
    doc.text('Enhanced BHU Clearance Report', 20, yPosition);
    yPosition += 20;

    // Timeframe
    doc.setFontSize(12);
    doc.text(`Timeframe: ${timeframe || 'month'}`, 20, yPosition);
    yPosition += 15;

    // Department Performance Summary
    doc.setFontSize(16);
    doc.text('Department Performance Summary', 20, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    departmentPerformance.slice(0, 8).forEach((dept) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      const deptText = `${dept.department}: ${dept.metrics.approvalRate.toFixed(1)}% approval, ${dept.metrics.averageProcessingTimeHours}h avg, ${dept.metrics.overdueCount} overdue`;
      doc.text(deptText, 20, yPosition);
      yPosition += 8;
    });

    yPosition += 10;

    // Bottleneck Analysis
    doc.setFontSize(16);
    doc.text('Bottleneck Analysis', 20, yPosition);
    yPosition += 10;

    const totalBottlenecks = bottlenecks.reduce(
      (sum, dept) => sum + dept.bottlenecks.length,
      0,
    );
    doc.setFontSize(12);
    doc.text(`Total Bottlenecks: ${totalBottlenecks}`, 20, yPosition);
    yPosition += 10;

    if (bottlenecks.length > 0) {
      doc.setFontSize(10);
      bottlenecks.slice(0, 5).forEach((dept) => {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 20;
        }

        doc.text(
          `${dept.department}: ${dept.bottlenecks.length} bottlenecks`,
          20,
          yPosition,
        );
        yPosition += 6;

        dept.recommendations.slice(0, 2).forEach((rec: any) => {
          doc.text(`  • ${rec}`, 25, yPosition);
          yPosition += 5;
        });
        yPosition += 3;
      });
    }

    // Generate buffer
    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateDepartmentTrendData(
    departmentName: string,
    universityId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<any[]> {
    const clearanceSteps = await this.prisma.clearanceStep.findMany({
      where: {
        department: departmentName,
        clearance: {
          universityId,
          createdAt: { gte: startDate, lte: endDate },
        },
      },
      select: {
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by week for trend data
    const weeklyData = clearanceSteps.reduce(
      (acc, step) => {
        const weekStart = new Date(step.createdAt);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
        const weekKey = weekStart.toISOString().slice(0, 10);

        if (!acc[weekKey]) {
          acc[weekKey] = {
            date: weekKey,
            processed: 0,
            approved: 0,
            rejected: 0,
          };
        }

        acc[weekKey].processed += 1;
        if (step.status === 'APPROVED') acc[weekKey].approved += 1;
        if (step.status === 'REJECTED') acc[weekKey].rejected += 1;

        return acc;
      },
      {} as Record<string, any>,
    );

    return Object.values(weeklyData);
  }

  private generateBottleneckRecommendations(bottlenecks: any[]): string[] {
    const recommendations: string[] = [];
    const criticalCount = bottlenecks.filter(
      (b) => b.type === 'CRITICAL',
    ).length;
    const urgentCount = bottlenecks.filter((b) => b.type === 'URGENT').length;

    if (criticalCount > 0) {
      recommendations.push(
        `Immediate action required: ${criticalCount} clearances are over 5 days old`,
      );
    }

    if (urgentCount > 5) {
      recommendations.push('Consider delegating approvals to reduce backlog');
    }

    if (bottlenecks.length > 20) {
      recommendations.push(
        'High workload detected: consider bulk processing or temporary staff assistance',
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Clearance processing is within acceptable limits');
    }

    return recommendations;
  }
}
