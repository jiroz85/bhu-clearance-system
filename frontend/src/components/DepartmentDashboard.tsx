import { useState, useMemo, useEffect } from "react";
import { LibraryChecklist } from "./departments/LibraryChecklist";
import { DormitoryInspection } from "./departments/DormitoryInspection";
import { FinanceCalculator } from "./departments/FinanceCalculator";
import { StandardChecklist } from "./departments/StandardChecklist";

export type DepartmentConfig = {
  name: string;
  code: string;
  stepOrder: number;
  displayName: string;
  description: string;
  color: string;
  icon: string;
  features: {
    requiresFinePayment: boolean;
    requiresItemReturn: boolean;
    requiresInspection: boolean;
    requiresDocumentUpload: boolean;
    allowsPartialApproval: boolean;
    requiresHODApproval: boolean;
  };
  fields: Array<{
    key: string;
    label: string;
    type:
      | "text"
      | "number"
      | "date"
      | "boolean"
      | "select"
      | "textarea"
      | "file";
    required: boolean;
    placeholder?: string;
    options?: string[];
  }>;
  metrics: Array<{
    key: string;
    label: string;
    type: "count" | "amount" | "percentage" | "duration";
  }>;
};

type Step = {
  id: string;
  stepOrder: number;
  department: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comment: string;
  reviewedAt?: string;
  createdAt: string;
};

type PendingRow = {
  id: string;
  referenceId: string;
  student: {
    id: string;
    displayName: string;
    studentUniversityId: string;
    studentDepartment: string;
    studentYear: string;
  };
  step: Step;
  submittedAt?: string;
  createdAt: string;
};

type DepartmentMetrics = {
  timeframe: string;
  summary: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    approvalRate: number;
    rejectionRate: number;
  };
  departmentMetrics: number[];
};

type SortOption = "referenceId" | "submittedAt" | "studentName";
type FilterOption = "all" | "new" | "overdue";

interface DepartmentDashboardProps {
  departmentConfig: DepartmentConfig;
  pendingRows: PendingRow[];
  metrics: DepartmentMetrics;
  notifs: Array<{ id: string; title: string; body: string }>;
  onApprove: (stepId: string, departmentData?: Record<string, unknown>) => void;
  onReject: (stepId: string, reason: string, instruction?: string) => void;
  onRefresh: () => void;
}

export function DepartmentDashboard({
  departmentConfig,
  pendingRows,
  metrics,
  notifs,
  onApprove,
  onReject,
  onRefresh,
}: DepartmentDashboardProps) {
  const [sortBy, setSortBy] = useState<SortOption>("submittedAt");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<PendingRow | null>(null);
  const [departmentData, setDepartmentData] = useState<Record<string, unknown>>(
    {},
  );
  const [rejectReason, setRejectReason] = useState("");
  const [rejectInstruction, setRejectInstruction] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const itemsPerPage = 10;

  // Initialize department data with default values
  useEffect(() => {
    const initialData: Record<string, unknown> = {};
    departmentConfig.fields.forEach((field) => {
      if (field.type === "boolean") {
        (initialData as Record<string, boolean>)[field.key] = false;
      } else if (field.type === "number") {
        (initialData as Record<string, number>)[field.key] = 0;
      } else {
        (initialData as Record<string, string>)[field.key] = "";
      }
    });
    setDepartmentData(initialData);
  }, [departmentConfig]);

  // Filter and sort logic
  const filteredAndSortedRows = useMemo(() => {
    let filtered = [...pendingRows];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (row) =>
          row.student.displayName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          row.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          row.student.studentUniversityId
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    // Apply status filter
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    switch (filterBy) {
      case "new":
        filtered = filtered.filter(
          (row) => row.submittedAt && new Date(row.submittedAt) >= oneDayAgo,
        );
        break;
      case "overdue":
        filtered = filtered.filter(
          (row) => row.submittedAt && new Date(row.submittedAt) <= threeDaysAgo,
        );
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "referenceId":
          return a.referenceId.localeCompare(b.referenceId);
        case "studentName":
          return a.student.displayName.localeCompare(b.student.displayName);
        case "submittedAt": {
          const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return dateB - dateA; // Most recent first
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [pendingRows, searchTerm, filterBy, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedRows.length / itemsPerPage);
  const paginatedRows = filteredAndSortedRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBy, sortBy]);

  const handleApprove = async () => {
    if (selectedRow && !isApproving) {
      setIsApproving(true);
      try {
        await onApprove(selectedRow.step.id, departmentData);
        setShowApproveModal(false);
        setSelectedRow(null);
      } finally {
        setIsApproving(false);
      }
    }
  };

  const handleReject = async () => {
    if (selectedRow && !isRejecting) {
      setIsRejecting(true);
      try {
        await onReject(selectedRow.step.id, rejectReason, rejectInstruction);
        setShowRejectModal(false);
        setSelectedRow(null);
        setRejectReason("");
        setRejectInstruction("");
      } finally {
        setIsRejecting(false);
      }
    }
  };

  const renderDepartmentComponent = () => {
    const componentProps = {
      departmentData: departmentData as Record<string, unknown>,
      onChange: setDepartmentData,
    };

    switch (departmentConfig.code) {
      case "LIBRARY":
        return <LibraryChecklist {...componentProps} />;
      case "DORMITORY":
        return <DormitoryInspection {...componentProps} />;
      case "FINANCE":
        return <FinanceCalculator {...componentProps} />;
      default:
        return (
          <StandardChecklist
            {...componentProps}
            fields={departmentConfig.fields}
            departmentName={departmentConfig.displayName}
            departmentColor={departmentConfig.color}
            departmentIcon={departmentConfig.icon}
          />
        );
    }
  };

  const threeDaysAgo = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto p-8 space-y-10 animate-fadeIn">
        {/* Department Header */}
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden hover:shadow-3xl transition-all duration-500">
          <div className="bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 px-12 py-10">
            <div className="flex items-center gap-10">
              <div
                className="flex h-28 w-28 items-center justify-center rounded-3xl text-3xl shadow-2xl border border-white/60 backdrop-blur-xl hover:scale-105 transition-transform duration-300"
                style={{ backgroundColor: `${departmentConfig.color}20` }}
              >
                {departmentConfig.icon}
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {departmentConfig.displayName}
                </h1>
                <p className="text-slate-600 mt-4 text-lg leading-relaxed">
                  {departmentConfig.description}
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-8 py-4 text-sm font-bold text-slate-700 border border-slate-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                    <svg
                      className="w-6 h-6 mr-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    Step {departmentConfig.stepOrder} of 13
                  </span>
                  {departmentConfig.features.requiresFinePayment && (
                    <span className="inline-flex items-center rounded-full bg-amber-50 px-8 py-4 text-sm font-bold text-amber-700 border border-amber-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                      <svg
                        className="w-6 h-6 mr-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      Fine Processing
                    </span>
                  )}
                  {departmentConfig.features.requiresItemReturn && (
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-8 py-4 text-sm font-bold text-blue-700 border border-blue-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
                      <svg
                        className="w-6 h-6 mr-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      Item Return Required
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onRefresh}
                className="group rounded-2xl bg-white px-10 py-6 text-slate-600 hover:bg-slate-50 transition-all duration-300 shadow-xl border border-slate-200/60 hover:shadow-2xl hover:-translate-y-1 hover:scale-105"
              >
                <svg
                  className="w-7 h-7 group-hover:rotate-180 transition-transform duration-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        {metrics ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/60 p-8 hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                    Total Requests
                  </p>
                  <p className="mt-3 text-2xl font-black text-slate-900">
                    {metrics.summary?.total || 0}
                  </p>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    Last {metrics.timeframe}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl p-4 shadow-lg hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-8 h-8 text-slate-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/60 p-8 hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                    Approved
                  </p>
                  <p className="mt-3 text-2xl font-black text-emerald-600">
                    {metrics.summary?.approved || 0}
                  </p>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    {metrics.summary?.approvalRate?.toFixed(1) || 0}% rate
                  </p>
                </div>
                <div className="bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-2xl p-4 shadow-lg hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-8 h-8 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/60 p-8 hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                    Rejected
                  </p>
                  <p className="mt-3 text-2xl font-black text-red-600">
                    {metrics.summary?.rejected || 0}
                  </p>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    {metrics.summary?.rejectionRate?.toFixed(1) || 0}% rate
                  </p>
                </div>
                <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-2xl p-4 shadow-lg hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-8 h-8 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/60 p-8 hover:shadow-3xl transition-all duration-500 hover:scale-105 hover:-translate-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-600 uppercase tracking-wider">
                    Pending
                  </p>
                  <p className="mt-3 text-2xl font-black text-amber-600">
                    {metrics.summary?.pending || 0}
                  </p>
                  <p className="text-sm text-slate-500 mt-2 font-medium">
                    Awaiting action
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl p-4 shadow-lg hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-8 h-8 text-amber-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-slate-400 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="text-slate-500 font-medium">Loading metrics...</p>
          </div>
        )}

        {/* Notifications */}
        {notifs.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 rounded-full p-2">
                <svg
                  className="w-5 h-5 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                Recent Notifications
              </h3>
            </div>
            <div className="space-y-3">
              {notifs.slice(0, 3).map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-4 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-200 rounded-full p-1 mt-1">
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{n.title}</p>
                      <p className="text-slate-600 mt-1">{n.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Queue Management */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-8 py-6 border-b border-slate-200/50">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Pending Clearances
                </h2>
                <p className="text-slate-600 mt-1">
                  Students requiring {departmentConfig.displayName} clearance
                </p>
              </div>
              <div className="bg-white rounded-lg px-4 py-2 shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-700">
                  Showing{" "}
                  <span className="text-slate-900 font-bold">
                    {paginatedRows.length}
                  </span>{" "}
                  of{" "}
                  <span className="text-slate-900 font-bold">
                    {filteredAndSortedRows.length}
                  </span>{" "}
                  students
                </p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row mb-8">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by name, ID, or reference..."
                  className="block w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as FilterOption)}
              >
                <option value="all">All Requests</option>
                <option value="new">New (last 24h)</option>
                <option value="overdue">Overdue (3+ days)</option>
              </select>
              <select
                className="px-4 py-3 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="submittedAt">Sort by Date</option>
                <option value="studentName">Sort by Name</option>
                <option value="referenceId">Sort by Reference</option>
              </select>
            </div>

            {/* Queue Table */}
            {paginatedRows.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium text-lg">
                  {searchTerm || filterBy !== "all"
                    ? "No students match your filters."
                    : "No pending students at your desk."}
                </p>
                <p className="text-slate-500 text-sm mt-2">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedRows.map((row) => (
                  <div
                    key={row.id}
                    className="group rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-200 bg-white"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-slate-100 rounded-full p-2">
                            <svg
                              className="w-4 h-4 text-slate-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-lg">
                              {row.student.displayName}
                            </p>
                            <p className="text-slate-600 font-medium">
                              ID: {row.student.studentUniversityId}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                              />
                            </svg>
                            <span className="text-slate-600">
                              {row.student.studentDepartment} • Year{" "}
                              {row.student.studentYear}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                            <span className="text-slate-600 font-mono">
                              {row.referenceId}
                            </span>
                          </div>
                          {row.submittedAt && (
                            <div className="flex items-center gap-2 sm:col-span-2">
                              <svg
                                className="w-4 h-4 text-slate-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span className="text-slate-500">
                                {new Date(row.submittedAt).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:items-end">
                        <div className="flex gap-2">
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700 border border-amber-200">
                            <svg
                              className="w-3 h-3 mr-1"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            PENDING
                          </span>
                          {row.submittedAt &&
                            new Date(row.submittedAt) <= threeDaysAgo && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 border border-red-200">
                                <svg
                                  className="w-3 h-3 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                  />
                                </svg>
                                OVERDUE
                              </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            className="group inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-all duration-200 shadow-md hover:shadow-lg"
                            onClick={() => {
                              setSelectedRow(row);
                              setShowApproveModal(true);
                            }}
                          >
                            <svg
                              className="w-4 h-4 group-hover:scale-110 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Approve
                          </button>
                          <button
                            type="button"
                            className="group inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-all duration-200 shadow-md hover:shadow-lg"
                            onClick={() => {
                              setSelectedRow(row);
                              setShowRejectModal(true);
                            }}
                          >
                            <svg
                              className="w-4 h-4 group-hover:scale-110 transition-transform"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 pt-6 mt-8">
                <div className="text-sm text-slate-600">
                  Page{" "}
                  <span className="font-semibold text-slate-900">
                    {currentPage}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-900">
                    {totalPages}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Previous
                  </button>
                  <button
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Approve Modal */}
        {showApproveModal && selectedRow && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slide-up">
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-8 py-6 border-b border-emerald-200">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 rounded-full p-2">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Approve Clearance
                    </h3>
                    <p className="text-slate-600">
                      {selectedRow.student.displayName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                {/* Department-Specific Component */}
                {departmentConfig.fields.length > 0 && (
                  <div className="space-y-6 mb-8">
                    <h4 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <svg
                        className="w-5 h-5 text-slate-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Department Information
                    </h4>
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      {renderDepartmentComponent()}
                    </div>
                  </div>
                )}

                <div className="flex gap-4 justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-200"
                    onClick={() => {
                      setShowApproveModal(false);
                      setSelectedRow(null);
                    }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    onClick={handleApprove}
                    disabled={isApproving}
                  >
                    {isApproving ? (
                      <>
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Approving...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Approve Clearance
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedRow && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-slide-up">
              <div className="bg-gradient-to-r from-red-50 to-red-100 px-8 py-6 border-b border-red-200">
                <div className="flex items-center gap-3">
                  <div className="bg-red-600 rounded-full p-2">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Reject Clearance
                    </h3>
                    <p className="text-slate-600">
                      {selectedRow.student.displayName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="space-y-6 mb-8">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Rejection Reason <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                      placeholder="Reason for rejection"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Instructions for Student
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 resize-none"
                      rows={4}
                      placeholder="What the student needs to do to resolve this"
                      value={rejectInstruction}
                      onChange={(e) => setRejectInstruction(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex gap-4 justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-200"
                    onClick={() => {
                      setShowRejectModal(false);
                      setSelectedRow(null);
                      setRejectReason("");
                      setRejectInstruction("");
                    }}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                    onClick={handleReject}
                    disabled={!rejectReason || isRejecting}
                  >
                    {isRejecting ? (
                      <>
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                        Rejecting...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                        Reject Clearance
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
