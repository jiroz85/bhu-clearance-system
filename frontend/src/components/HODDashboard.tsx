import { useState, useEffect } from "react";
import { api } from "../api";

type HODOverview = {
  department: {
    name: string;
    displayName: string;
    stepOrder: number;
  };
  metrics: {
    totalClearances: number;
    pendingClearances: number;
    overdueClearances: number;
    approvedToday: number;
    approvedThisWeek: number;
    approvedThisMonth: number;
    completionRate: number;
  };
  staff: {
    total: number;
    members: Array<{
      id: string;
      displayName: string;
      email: string;
    }>;
  };
  alerts: {
    overdueCount: number;
    highPendingCount: number;
  };
};

type DepartmentClearance = {
  id: string;
  step: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  reviewedAt: string | null;
  comment: string | null;
  student: {
    id: string;
    displayName: string | null;
    email: string;
    studentUniversityId: string | null;
    studentDepartment: string | null;
  };
  clearanceId: string;
  isOverdue: boolean;
};

type DepartmentStatistics = {
  timeframe: string;
  period: {
    start: string;
    end: string;
  };
  metrics: {
    totalProcessed: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    rejectionRate: number;
    averageProcessingTimeHours: number;
  };
};

export function HODDashboard() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "clearances" | "statistics"
  >("overview");

  // Overview state
  const [overview, setOverview] = useState<HODOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  // Clearances state
  const [clearances, setClearances] = useState<DepartmentClearance[]>([]);
  const [clearancesTotal, setClearancesTotal] = useState(0);
  const [clearancesLoading, setClearancesLoading] = useState(false);
  const [clearancesError, setClearancesError] = useState<string | null>(null);
  const [clearanceFilters, setClearanceFilters] = useState({
    status: "ALL" as "PENDING" | "APPROVED" | "REJECTED" | "ALL",
    overdue: false,
    search: "",
  });
  const [clearancePagination, setClearancePagination] = useState({
    skip: 0,
    take: 20,
  });

  // Statistics state
  const [statistics, setStatistics] = useState<DepartmentStatistics | null>(
    null,
  );
  const [statisticsLoading, setStatisticsLoading] = useState(false);
  const [statisticsError, setStatisticsError] = useState<string | null>(null);
  const [statisticsTimeframe, setStatisticsTimeframe] = useState<
    "day" | "week" | "month" | "quarter" | "year"
  >("month");

  // Modal states
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [selectedClearance, setSelectedClearance] =
    useState<DepartmentClearance | null>(null);
  const [overrideForm, setOverrideForm] = useState({
    action: "APPROVE" as "APPROVE" | "REJECT",
    reason: "",
  });
  const [delegateForm, setDelegateForm] = useState({
    delegateUserId: "",
    reason: "",
  });

  // Load overview data
  const loadOverview = async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const { data } = await api.get<HODOverview>(
        "/api/hod-dashboard/overview",
      );
      setOverview(data);
    } catch (error: any) {
      setOverviewError(error.message || "Failed to load overview");
    } finally {
      setOverviewLoading(false);
    }
  };

  // Load clearances data
  const loadClearances = async () => {
    setClearancesLoading(true);
    setClearancesError(null);
    try {
      const params = new URLSearchParams({
        skip: clearancePagination.skip.toString(),
        take: clearancePagination.take.toString(),
      });

      if (clearanceFilters.status !== "ALL") {
        params.append("status", clearanceFilters.status);
      }
      if (clearanceFilters.overdue) {
        params.append("overdue", "true");
      }
      if (clearanceFilters.search) {
        params.append("search", clearanceFilters.search);
      }

      const { data } = await api.get<{
        clearances: DepartmentClearance[];
        total: number;
        skip: number;
        take: number;
      }>(`/api/hod-dashboard/clearances?${params}`);

      setClearances(data.clearances);
      setClearancesTotal(data.total);
    } catch (error: any) {
      setClearancesError(error.message || "Failed to load clearances");
    } finally {
      setClearancesLoading(false);
    }
  };

  // Load statistics data
  const loadStatistics = async () => {
    setStatisticsLoading(true);
    setStatisticsError(null);
    try {
      const params = statisticsTimeframe
        ? `?timeframe=${statisticsTimeframe}`
        : "";
      const { data } = await api.get<DepartmentStatistics>(
        `/api/hod-dashboard/statistics${params}`,
      );
      setStatistics(data);
    } catch (error: any) {
      setStatisticsError(error.message || "Failed to load statistics");
    } finally {
      setStatisticsLoading(false);
    }
  };

  // Handle override decision
  const handleOverrideDecision = async () => {
    if (!selectedClearance) return;

    try {
      await api.post(
        `/api/hod-dashboard/override/${selectedClearance.id}`,
        overrideForm,
      );
      setShowOverrideModal(false);
      setSelectedClearance(null);
      setOverrideForm({ action: "APPROVE", reason: "" });
      loadClearances();
      loadOverview();
    } catch (error: any) {
      setClearancesError(error.message || "Failed to override decision");
    }
  };

  // Handle delegation
  const handleDelegateApproval = async () => {
    if (!selectedClearance) return;

    try {
      await api.post(
        `/api/hod-dashboard/delegate/${selectedClearance.id}`,
        delegateForm,
      );
      setShowDelegateModal(false);
      setSelectedClearance(null);
      setDelegateForm({ delegateUserId: "", reason: "" });
      loadClearances();
    } catch (error: any) {
      setClearancesError(error.message || "Failed to delegate approval");
    }
  };

  // Export analytics
  const handleExportAnalytics = async (format: "pdf" | "excel") => {
    try {
      const params = statisticsTimeframe
        ? `?format=${format}&timeframe=${statisticsTimeframe}`
        : `?format=${format}`;
      const { data } = await api.get(
        `/api/hod-dashboard/export/analytics${params}`,
      );
      window.open(data.downloadUrl, "_blank");
    } catch (error: any) {
      setStatisticsError(error.message || "Failed to export analytics");
    }
  };

  // Load data based on active tab
  useEffect(() => {
    if (activeTab === "overview") {
      loadOverview();
    } else if (activeTab === "clearances") {
      loadClearances();
    } else if (activeTab === "statistics") {
      loadStatistics();
    }
  }, [activeTab, clearanceFilters, clearancePagination, statisticsTimeframe]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-100 text-emerald-700";
      case "REJECTED":
        return "bg-red-100 text-red-700";
      case "PENDING":
        return "bg-amber-100 text-amber-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-slate-900">
            HOD Dashboard
            {overview && (
              <span className="ml-2 text-base font-medium text-slate-600">
                - {overview.department.displayName}
              </span>
            )}
          </h1>
          <div className="flex gap-2">
            <button
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => handleExportAnalytics("pdf")}
            >
              📄 Export PDF
            </button>
            <button
              className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onClick={() => handleExportAnalytics("excel")}
            >
              📊 Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex space-x-4 border-b border-slate-200">
          {[
            { id: "overview", label: "Overview" },
            { id: "clearances", label: "Clearances" },
            { id: "statistics", label: "Statistics" },
            { id: "bottlenecks", label: "Bottlenecks" },
            { id: "staff", label: "Staff Performance" },
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
          {overviewLoading && (
            <p className="text-sm text-slate-600">Loading overview...</p>
          )}
          {overviewError && (
            <p className="text-sm text-red-700">{overviewError}</p>
          )}
          {overview && !overviewLoading && !overviewError && (
            <>
              {/* Metrics Cards */}
              <div className="rounded-xl bg-white p-5 shadow-sm md:col-span-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  Department Metrics
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <h3 className="text-sm font-medium text-slate-600">
                      Total Clearances
                    </h3>
                    <p className="mt-2 text-xl font-bold text-slate-900">
                      {overview.metrics.totalClearances}
                    </p>
                  </div>
                  <div className="rounded-lg bg-amber-50 p-4">
                    <h3 className="text-sm font-medium text-amber-600">
                      Pending
                    </h3>
                    <p className="mt-2 text-xl font-bold text-amber-700">
                      {overview.metrics.pendingClearances}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <h3 className="text-sm font-medium text-emerald-600">
                      Approved Today
                    </h3>
                    <p className="mt-2 text-xl font-bold text-emerald-700">
                      {overview.metrics.approvedToday}
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h3 className="text-sm font-medium text-blue-600">
                      Completion Rate
                    </h3>
                    <p className="mt-2 text-xl font-bold text-blue-700">
                      {overview.metrics.completionRate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Alerts & Notifications
                </h2>
                <div className="mt-4 space-y-3">
                  {overview.alerts.overdueCount > 0 && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                      <div className="flex items-center">
                        <span className="text-red-700">⚠️</span>
                        <span className="ml-2 text-sm font-medium text-red-900">
                          {overview.alerts.overdueCount} overdue clearances
                          require attention
                        </span>
                      </div>
                    </div>
                  )}
                  {overview.alerts.highPendingCount > 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                      <div className="flex items-center">
                        <span className="text-amber-700">📋</span>
                        <span className="ml-2 text-sm font-medium text-amber-900">
                          High pending volume:{" "}
                          {overview.alerts.highPendingCount} clearances
                        </span>
                      </div>
                    </div>
                  )}
                  {overview.alerts.overdueCount === 0 &&
                    overview.alerts.highPendingCount === 0 && (
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                        <div className="flex items-center">
                          <span className="text-emerald-700">✅</span>
                          <span className="ml-2 text-sm font-medium text-emerald-900">
                            All clearances are within normal processing time
                          </span>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Staff Overview */}
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  Department Staff
                </h2>
                <div className="mt-4">
                  <div className="text-sm text-slate-600">
                    Total staff members: <strong>{overview.staff.total}</strong>
                  </div>
                  <div className="mt-2 max-h-40 overflow-auto">
                    {overview.staff.members.map((staff) => (
                      <div
                        key={staff.id}
                        className="py-1 text-sm text-slate-700"
                      >
                        {staff.displayName} ({staff.email})
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Clearances Tab */}
      {activeTab === "clearances" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Department Clearances
            </h2>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <select
                className="rounded border border-slate-200 px-3 py-2 text-sm"
                value={clearanceFilters.status}
                onChange={(e) =>
                  setClearanceFilters({
                    ...clearanceFilters,
                    status: e.target.value as any,
                  })
                }
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
              <input
                type="text"
                placeholder="Search students..."
                className="rounded border border-slate-200 px-3 py-2 text-sm"
                value={clearanceFilters.search}
                onChange={(e) =>
                  setClearanceFilters({
                    ...clearanceFilters,
                    search: e.target.value,
                  })
                }
              />
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={clearanceFilters.overdue}
                  onChange={(e) =>
                    setClearanceFilters({
                      ...clearanceFilters,
                      overdue: e.target.checked,
                    })
                  }
                />
                Overdue only
              </label>
            </div>
          </div>

          {/* Clearances List */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            {clearancesLoading && (
              <p className="text-sm text-slate-600">Loading clearances...</p>
            )}
            {clearancesError && (
              <p className="text-sm text-red-700">{clearancesError}</p>
            )}
            {!clearancesLoading && !clearancesError && (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200">
                    <tr className="text-left text-slate-600">
                      <th className="pb-2 font-medium">Student</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Submitted</th>
                      <th className="pb-2 font-medium">Reviewed</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clearances.map((clearance) => (
                      <tr
                        key={clearance.id}
                        className="border-b border-slate-100"
                      >
                        <td className="py-3">
                          <div>
                            <div className="font-medium text-slate-900">
                              {clearance.student.displayName ||
                                clearance.student.email}
                            </div>
                            <div className="text-xs text-slate-500">
                              {clearance.student.studentUniversityId} •{" "}
                              {clearance.student.studentDepartment}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(
                                clearance.status,
                              )}`}
                            >
                              {clearance.status}
                            </span>
                            {clearance.isOverdue && (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                                Overdue
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-slate-700">
                          {new Date(clearance.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-slate-700">
                          {clearance.reviewedAt
                            ? new Date(
                                clearance.reviewedAt,
                              ).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            {clearance.status === "PENDING" && (
                              <>
                                <button
                                  className="text-xs text-blue-600 hover:text-blue-800"
                                  onClick={() => {
                                    setSelectedClearance(clearance);
                                    setShowOverrideModal(true);
                                  }}
                                >
                                  Override
                                </button>
                                <button
                                  className="text-xs text-green-600 hover:text-green-800"
                                  onClick={() => {
                                    setSelectedClearance(clearance);
                                    setShowDelegateModal(true);
                                  }}
                                >
                                  Delegate
                                </button>
                              </>
                            )}
                            {clearance.comment && (
                              <button
                                className="text-xs text-slate-600 hover:text-slate-800"
                                title={clearance.comment}
                              >
                                View Comment
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {clearances.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No clearances found
                  </p>
                )}
              </div>
            )}

            {/* Pagination */}
            {clearancesTotal > clearancePagination.take && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() =>
                    setClearancePagination({
                      ...clearancePagination,
                      skip: Math.max(
                        0,
                        clearancePagination.skip - clearancePagination.take,
                      ),
                    })
                  }
                  disabled={clearancePagination.skip === 0}
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page{" "}
                  {Math.floor(
                    clearancePagination.skip / clearancePagination.take,
                  ) + 1}{" "}
                  of {Math.ceil(clearancesTotal / clearancePagination.take)}
                </span>
                <button
                  className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() =>
                    setClearancePagination({
                      ...clearancePagination,
                      skip: clearancePagination.skip + clearancePagination.take,
                    })
                  }
                  disabled={
                    clearancePagination.skip + clearancePagination.take >=
                    clearancesTotal
                  }
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other tabs would be implemented similarly... */}
      {activeTab === "statistics" && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Department Statistics
          </h2>
          <div className="mt-4">
            <select
              className="rounded border border-slate-200 px-3 py-2 text-sm"
              value={statisticsTimeframe}
              onChange={(e) => setStatisticsTimeframe(e.target.value as any)}
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
          {statisticsLoading && (
            <p className="text-sm text-slate-600">Loading statistics...</p>
          )}
          {statisticsError && (
            <p className="text-sm text-red-700">{statisticsError}</p>
          )}
          {statistics && !statisticsLoading && !statisticsError && (
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <h3 className="text-sm font-medium text-slate-600">
                  Total Processed
                </h3>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {statistics.metrics.totalProcessed}
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-4">
                <h3 className="text-sm font-medium text-emerald-600">
                  Approval Rate
                </h3>
                <p className="mt-2 text-xl font-bold text-emerald-700">
                  {statistics.metrics.approvalRate.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4">
                <h3 className="text-sm font-medium text-blue-600">
                  Avg Processing Time
                </h3>
                <p className="mt-2 text-xl font-bold text-blue-700">
                  {statistics.metrics.averageProcessingTimeHours}h
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && selectedClearance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">
              Override Decision
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Action
                </label>
                <select
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  value={overrideForm.action}
                  onChange={(e) =>
                    setOverrideForm({
                      ...overrideForm,
                      action: e.target.value as any,
                    })
                  }
                >
                  <option value="APPROVE">Approve</option>
                  <option value="REJECT">Reject</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  value={overrideForm.reason}
                  onChange={(e) =>
                    setOverrideForm({ ...overrideForm, reason: e.target.value })
                  }
                  placeholder="Enter reason for override..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setShowOverrideModal(false);
                  setSelectedClearance(null);
                  setOverrideForm({ action: "APPROVE", reason: "" });
                }}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={handleOverrideDecision}
              >
                Override Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delegate Modal */}
      {showDelegateModal && selectedClearance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">
              Delegate Approval
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Delegate To
                </label>
                <select
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  value={delegateForm.delegateUserId}
                  onChange={(e) =>
                    setDelegateForm({
                      ...delegateForm,
                      delegateUserId: e.target.value,
                    })
                  }
                >
                  <option value="">Select staff member...</option>
                  {overview?.staff.members.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason (optional)
                </label>
                <textarea
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  rows={3}
                  value={delegateForm.reason}
                  onChange={(e) =>
                    setDelegateForm({ ...delegateForm, reason: e.target.value })
                  }
                  placeholder="Enter reason for delegation..."
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setShowDelegateModal(false);
                  setSelectedClearance(null);
                  setDelegateForm({ delegateUserId: "", reason: "" });
                }}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={handleDelegateApproval}
                disabled={!delegateForm.delegateUserId}
              >
                Delegate Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
