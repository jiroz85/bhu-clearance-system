import { useState, useEffect } from "react";
import { api } from "../api";

type DepartmentPerformance = {
  department: string;
  metrics: {
    totalProcessed: number;
    approved: number;
    rejected: number;
    pending: number;
    approvalRate: number;
    averageProcessingTimeHours: number;
    overdueCount: number;
  };
  trend: {
    period: string;
    data: Array<{
      date: string;
      processed: number;
      approved: number;
      rejected: number;
    }>;
  };
};

type BottleneckData = {
  department: string;
  bottlenecks: Array<{
    type: "CRITICAL" | "URGENT" | "WARNING";
    clearanceId: string;
    studentName: string;
    studentId: string;
    pendingDays: number;
    reason: string;
  }>;
  recommendations: string[];
};

type ClearanceTrend = {
  date: string;
  total: number;
  completed: number;
  pending: number;
  rejected: number;
};

export function EnhancedReporting() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "departments" | "bottlenecks" | "trends"
  >("overview");
  const [timeframe, setTimeframe] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");

  // Data states
  const [departmentPerformance, setDepartmentPerformance] = useState<
    DepartmentPerformance[]
  >([]);
  const [bottleneckData, setBottleneckData] = useState<BottleneckData[]>([]);
  const [clearanceTrends, setClearanceTrends] = useState<ClearanceTrend[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load department performance data
  const loadDepartmentPerformance = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<DepartmentPerformance[]>(
        `/api/reports/department-performance?timeframe=${timeframe}`,
      );
      setDepartmentPerformance(data);
    } catch (error: any) {
      setError(error.message || "Failed to load department performance");
    } finally {
      setLoading(false);
    }
  };

  // Load bottleneck data
  const loadBottleneckData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<BottleneckData[]>(
        "/api/reports/bottlenecks",
      );
      setBottleneckData(data);
    } catch (error: any) {
      setError(error.message || "Failed to load bottleneck analysis");
    } finally {
      setLoading(false);
    }
  };

  // Load clearance trends
  const loadClearanceTrends = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<ClearanceTrend[]>(
        `/api/reports/trends?timeframe=${timeframe}`,
      );
      setClearanceTrends(data);
    } catch (error: any) {
      setError(error.message || "Failed to load clearance trends");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "departments") {
      loadDepartmentPerformance();
    } else if (activeTab === "bottlenecks") {
      loadBottleneckData();
    } else if (activeTab === "trends") {
      loadClearanceTrends();
    }
  }, [activeTab, timeframe]);

  const getPerformanceColor = (rate: number) => {
    if (rate >= 90) return "text-emerald-600 bg-emerald-50";
    if (rate >= 75) return "text-blue-600 bg-blue-50";
    if (rate >= 60) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getProcessingTimeColor = (hours: number) => {
    if (hours <= 24) return "text-emerald-600 bg-emerald-50";
    if (hours <= 48) return "text-blue-600 bg-blue-50";
    if (hours <= 72) return "text-amber-600 bg-amber-50";
    return "text-red-600 bg-red-50";
  };

  const getBottleneckSeverityColor = (type: string) => {
    switch (type) {
      case "CRITICAL":
        return "bg-red-100 text-red-700 border-red-200";
      case "URGENT":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "WARNING":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-bold text-slate-900">
            Enhanced Analytics & Reporting
          </h1>
          <div className="flex gap-2">
            <select
              className="rounded border border-slate-200 px-3 py-2 text-sm"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
            <button
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => {
                const params = new URLSearchParams({ timeframe });
                window.open(
                  `/api/reports/export/enhanced-excel?${params}`,
                  "_blank",
                );
              }}
            >
              📊 Export Excel
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => {
                const params = new URLSearchParams({ timeframe });
                window.open(
                  `/api/reports/export/enhanced-pdf?${params}`,
                  "_blank",
                );
              }}
            >
              📄 Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex space-x-4 border-b border-slate-200">
          {[
            { id: "overview", label: "Overview" },
            { id: "departments", label: "Department Performance" },
            { id: "bottlenecks", label: "Bottleneck Analysis" },
            { id: "trends", label: "Clearance Trends" },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`pb-2 px-1 text-sm font-medium ${
                activeTab === tab.id
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              System Overview
            </h2>
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <h3 className="text-sm font-medium text-slate-600">
                    Total Departments
                  </h3>
                  <p className="mt-2 text-lg font-bold text-slate-900">13</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-4">
                  <h3 className="text-sm font-medium text-blue-600">
                    Active Clearances
                  </h3>
                  <p className="mt-2 text-lg font-bold text-blue-700">
                    {departmentPerformance.reduce(
                      (sum, dept) => sum + dept.metrics.pending,
                      0,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Quick Insights
            </h2>
            <div className="mt-4 space-y-3">
              {departmentPerformance
                .sort((a, b) => b.metrics.approvalRate - a.metrics.approvalRate)
                .slice(0, 3)
                .map((dept) => (
                  <div
                    key={dept.department}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-400">
                        #
                        {departmentPerformance.findIndex(
                          (d) => d.department === dept.department,
                        ) + 1}
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {dept.department}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${getPerformanceColor(dept.metrics.approvalRate)}`}
                    >
                      {dept.metrics.approvalRate.toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Department Performance Tab */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          {loading && (
            <p className="text-sm text-slate-600">
              Loading department performance...
            </p>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {!loading && !error && (
            <div className="rounded-xl bg-white shadow-sm">
              <div className="p-5">
                <h2 className="text-base font-semibold text-slate-900">
                  Department Performance Metrics
                </h2>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-slate-600">
                      <th className="pb-3 pl-5 pr-2 font-medium">Department</th>
                      <th className="pb-3 px-2 font-medium">Processed</th>
                      <th className="pb-3 px-2 font-medium">Approval Rate</th>
                      <th className="pb-3 px-2 font-medium">Avg Time</th>
                      <th className="pb-3 px-2 font-medium">Overdue</th>
                      <th className="pb-3 px-2 font-medium">Pending</th>
                      <th className="pb-3 pl-2 pr-5 font-medium">
                        Performance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentPerformance.map((dept) => (
                      <tr
                        key={dept.department}
                        className="border-b border-slate-100"
                      >
                        <td className="py-4 pl-5 pr-2">
                          <div className="font-medium text-slate-900">
                            {dept.department}
                          </div>
                        </td>
                        <td className="py-4 px-2 text-slate-700">
                          {dept.metrics.totalProcessed}
                        </td>
                        <td className="py-4 px-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${getPerformanceColor(dept.metrics.approvalRate)}`}
                          >
                            {dept.metrics.approvalRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${getProcessingTimeColor(dept.metrics.averageProcessingTimeHours)}`}
                          >
                            {dept.metrics.averageProcessingTimeHours}h
                          </span>
                        </td>
                        <td className="py-4 px-2">
                          {dept.metrics.overdueCount > 0 ? (
                            <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                              {dept.metrics.overdueCount}
                            </span>
                          ) : (
                            <span className="text-slate-500">—</span>
                          )}
                        </td>
                        <td className="py-4 px-2 text-slate-700">
                          {dept.metrics.pending}
                        </td>
                        <td className="py-4 pl-2 pr-5">
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                dept.metrics.approvalRate >= 90
                                  ? "bg-emerald-600"
                                  : dept.metrics.approvalRate >= 75
                                    ? "bg-blue-600"
                                    : dept.metrics.approvalRate >= 60
                                      ? "bg-amber-600"
                                      : "bg-red-600"
                              }`}
                              style={{ width: `${dept.metrics.approvalRate}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bottleneck Analysis Tab */}
      {activeTab === "bottlenecks" && (
        <div className="space-y-4">
          {loading && (
            <p className="text-sm text-slate-600">
              Loading bottleneck analysis...
            </p>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {!loading && !error && (
            <>
              {bottleneckData.map((dept) => (
                <div
                  key={dept.department}
                  className="rounded-xl bg-white p-5 shadow-sm"
                >
                  <h3 className="text-base font-semibold text-slate-900 mb-4">
                    {dept.department}
                  </h3>

                  {dept.bottlenecks.length > 0 ? (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        {dept.bottlenecks.map((bottleneck) => (
                          <div
                            key={bottleneck.clearanceId}
                            className={`rounded-lg border p-4 ${getBottleneckSeverityColor(bottleneck.type)}`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-medium uppercase">
                                    {bottleneck.type}
                                  </span>
                                  <span className="text-xs">
                                    • {bottleneck.pendingDays} days pending
                                  </span>
                                </div>
                                <div className="font-medium text-sm mb-1">
                                  {bottleneck.studentName}
                                </div>
                                <div className="text-xs opacity-75 mb-2">
                                  {bottleneck.studentId}
                                </div>
                                {bottleneck.reason && (
                                  <div className="text-xs mt-2">
                                    {bottleneck.reason}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {dept.recommendations.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <h4 className="text-sm font-medium text-blue-900 mb-2">
                            Recommendations:
                          </h4>
                          <ul className="text-xs text-blue-700 space-y-1">
                            {dept.recommendations.map((rec) => (
                              <li key={rec}>• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <span className="text-emerald-600 text-lg">✅</span>
                      <p className="text-sm text-slate-600 mt-2">
                        No bottlenecks detected
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === "trends" && (
        <div className="space-y-4">
          {loading && (
            <p className="text-sm text-slate-600">
              Loading clearance trends...
            </p>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {!loading && !error && (
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900 mb-4">
                Clearance Trends Over Time
              </h2>

              {/* Simple trend visualization */}
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <h3 className="text-sm font-medium text-emerald-600">
                      Total Completed
                    </h3>
                    <p className="mt-2 text-lg font-bold text-emerald-700">
                      {clearanceTrends.reduce(
                        (sum, trend) => sum + trend.completed,
                        0,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h3 className="text-sm font-medium text-blue-600">
                      Currently Pending
                    </h3>
                    <p className="mt-2 text-lg font-bold text-blue-700">
                      {clearanceTrends.reduce(
                        (sum, trend) => sum + trend.pending,
                        0,
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-4">
                    <h3 className="text-sm font-medium text-amber-600">
                      Total Rejected
                    </h3>
                    <p className="mt-2 text-lg font-bold text-amber-700">
                      {clearanceTrends.reduce(
                        (sum, trend) => sum + trend.rejected,
                        0,
                      )}
                    </p>
                  </div>
                </div>

                {/* Trend Line Chart Simulation */}
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-slate-600 mb-4">
                    Daily Volume Trends
                  </h3>
                  <div className="space-y-2">
                    {clearanceTrends.slice(-7).map((trend) => (
                      <div key={trend.date} className="flex items-center gap-4">
                        <div className="w-20 text-xs text-slate-600">
                          {trend.date}
                        </div>
                        <div className="flex-1 flex items-center gap-1">
                          <div
                            className="bg-emerald-500 h-4 rounded"
                            style={{
                              width: `${(trend.completed / Math.max(...clearanceTrends.map((t) => t.total))) * 100}%`,
                            }}
                            title={`Completed: ${trend.completed}`}
                          />
                          <div
                            className="bg-blue-500 h-4 rounded"
                            style={{
                              width: `${(trend.pending / Math.max(...clearanceTrends.map((t) => t.total))) * 100}%`,
                            }}
                            title={`Pending: ${trend.pending}`}
                          />
                          <div
                            className="bg-amber-500 h-4 rounded"
                            style={{
                              width: `${(trend.rejected / Math.max(...clearanceTrends.map((t) => t.total))) * 100}%`,
                            }}
                            title={`Rejected: ${trend.rejected}`}
                          />
                        </div>
                        <div className="w-12 text-xs text-slate-600 text-right">
                          {trend.total}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs">
                    <div className="w-20"></div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-emerald-500 rounded"></div>
                        <span>Completed</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span>Pending</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-amber-500 rounded"></div>
                        <span>Rejected</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
