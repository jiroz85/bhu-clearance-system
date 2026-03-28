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
  onApprove: (stepId: string, departmentData?: Record<string, any>) => void;
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
  const [departmentData, setDepartmentData] = useState<Record<string, any>>({});
  const [rejectReason, setRejectReason] = useState("");
  const [rejectInstruction, setRejectInstruction] = useState("");
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const itemsPerPage = 10;

  // Initialize department data with default values
  useEffect(() => {
    const initialData: Record<string, any> = {};
    departmentConfig.fields.forEach((field) => {
      if (field.type === "boolean") {
        initialData[field.key] = false;
      } else if (field.type === "number") {
        initialData[field.key] = 0;
      } else {
        initialData[field.key] = "";
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
        case "submittedAt":
          const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return dateB - dateA; // Most recent first
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

  const renderDepartmentField = (field: any) => {
    const value = departmentData[field.key] || "";
    const setValue = (newValue: any) => {
      setDepartmentData((prev) => ({ ...prev, [field.key]: newValue }));
    };

    switch (field.type) {
      case "text":
      case "number":
        return (
          <input
            type={field.type}
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            placeholder={field.placeholder}
            value={value}
            onChange={(e) =>
              setValue(
                field.type === "number"
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
            required={field.required}
          />
        );
      case "textarea":
        return (
          <textarea
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            rows={3}
            placeholder={field.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required={field.required}
          />
        );
      case "select":
        return (
          <select
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case "boolean":
        return (
          <div className="mt-1 flex items-center">
            <input
              type="checkbox"
              className="rounded border-slate-200"
              checked={value}
              onChange={(e) => setValue(e.target.checked)}
              required={field.required}
            />
            <span className="ml-2 text-sm text-slate-600">{field.label}</span>
          </div>
        );
      case "file":
        return (
          <input
            type="file"
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            onChange={(e) => setValue(e.target.files?.[0])}
            required={field.required}
          />
        );
      default:
        return null;
    }
  };

  const renderDepartmentComponent = () => {
    switch (departmentConfig.code) {
      case "LIBRARY":
        return (
          <LibraryChecklist
            departmentData={departmentData}
            onChange={setDepartmentData}
          />
        );
      case "DORMITORY":
        return (
          <DormitoryInspection
            departmentData={departmentData}
            onChange={setDepartmentData}
          />
        );
      case "FINANCE":
        return (
          <FinanceCalculator
            departmentData={departmentData}
            onChange={setDepartmentData}
          />
        );
      default:
        return (
          <StandardChecklist
            departmentData={departmentData}
            onChange={setDepartmentData}
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
    <div className="space-y-6">
      {/* Department Header */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl"
            style={{ backgroundColor: `${departmentConfig.color}20` }}
          >
            {departmentConfig.icon}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-slate-900">
              {departmentConfig.displayName}
            </h1>
            <p className="text-slate-600">{departmentConfig.description}</p>
            <div className="mt-2 flex gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Step {departmentConfig.stepOrder} of 13
              </span>
              {departmentConfig.features.requiresFinePayment && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  Fine Processing
                </span>
              )}
              {departmentConfig.features.requiresItemReturn && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  Item Return Required
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onRefresh}
            className="rounded border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-600">Total Requests</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {metrics.summary?.total || 0}
            </div>
            <div className="text-xs text-slate-500">
              Last {metrics.timeframe}
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-600">Approved</div>
            <div className="mt-1 text-2xl font-bold text-emerald-600">
              {metrics.summary?.approved || 0}
            </div>
            <div className="text-xs text-slate-500">
              {metrics.summary?.approvalRate?.toFixed(1) || 0}% rate
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-600">Rejected</div>
            <div className="mt-1 text-2xl font-bold text-red-600">
              {metrics.summary?.rejected || 0}
            </div>
            <div className="text-xs text-slate-500">
              {metrics.summary?.rejectionRate?.toFixed(1) || 0}% rate
            </div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-600">Pending</div>
            <div className="mt-1 text-2xl font-bold text-amber-600">
              {metrics.summary?.pending || 0}
            </div>
            <div className="text-xs text-slate-500">Awaiting action</div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-white p-8 shadow-sm text-center">
          <div className="text-slate-500">Loading metrics...</div>
        </div>
      )}

      {/* Notifications */}
      {notifs.length > 0 && (
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-slate-900 mb-3">
            Recent Notifications
          </h3>
          <div className="space-y-2">
            {notifs.slice(0, 3).map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-sm"
              >
                <span className="font-medium text-slate-700">{n.title}</span>
                <span className="text-slate-600 ml-2">— {n.body}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue Management */}
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Pending Clearances
            </h2>
            <p className="text-sm text-slate-600">
              Students requiring {departmentConfig.displayName} clearance
            </p>
          </div>
          <div className="text-sm text-slate-600">
            Showing {paginatedRows.length} of {filteredAndSortedRows.length}{" "}
            students
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row mb-6">
          <input
            type="text"
            placeholder="Search by name, ID, or reference..."
            className="flex-1 rounded border border-slate-200 px-3 py-2 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="rounded border border-slate-200 px-3 py-2 text-sm"
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as FilterOption)}
          >
            <option value="all">All Requests</option>
            <option value="new">New (last 24h)</option>
            <option value="overdue">Overdue (3+ days)</option>
          </select>
          <select
            className="rounded border border-slate-200 px-3 py-2 text-sm"
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
          <div className="text-center py-8">
            <p className="text-sm text-slate-600">
              {searchTerm || filterBy !== "all"
                ? "No students match your filters."
                : "No pending students at your desk."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedRows.map((row) => (
              <div
                key={row.id}
                className="rounded border border-slate-200 p-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {row.student.displayName} (
                      {row.student.studentUniversityId})
                    </p>
                    <p className="text-sm text-slate-600">
                      {row.student.studentDepartment} • Year{" "}
                      {row.student.studentYear}
                    </p>
                    <p className="text-sm text-slate-600">
                      Ref: {row.referenceId}
                    </p>
                    {row.submittedAt && (
                      <p className="text-xs text-slate-500">
                        Submitted: {new Date(row.submittedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-1 text-xs font-medium">
                      PENDING
                    </span>
                    {row.submittedAt &&
                      new Date(row.submittedAt) <= threeDaysAgo && (
                        <span className="rounded-full bg-red-100 text-red-700 px-2 py-1 text-xs font-medium">
                          OVERDUE
                        </span>
                      )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    onClick={() => {
                      setSelectedRow(row);
                      setShowApproveModal(true);
                    }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                    onClick={() => {
                      setSelectedRow(row);
                      setShowRejectModal(true);
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-6">
            <div className="text-sm text-slate-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <button
                className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showApproveModal && selectedRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Approve Clearance - {selectedRow.student.displayName}
            </h3>

            {/* Department-Specific Component */}
            {departmentConfig.fields.length > 0 && (
              <div className="space-y-4 mb-6">
                <h4 className="text-sm font-medium text-slate-700">
                  Department Information
                </h4>
                {renderDepartmentComponent()}
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setShowApproveModal(false);
                  setSelectedRow(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed"
                onClick={handleApprove}
                disabled={isApproving}
              >
                {isApproving ? "Approving..." : "Approve Clearance"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Reject Clearance - {selectedRow.student.displayName}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded border border-slate-200 p-2 text-sm"
                  placeholder="Reason for rejection"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  Instructions for Student
                </label>
                <textarea
                  className="w-full rounded border border-slate-200 p-2 text-sm"
                  rows={3}
                  placeholder="What the student needs to do to resolve this"
                  value={rejectInstruction}
                  onChange={(e) => setRejectInstruction(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setShowRejectModal(false);
                  setSelectedRow(null);
                  setRejectReason("");
                  setRejectInstruction("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed"
                onClick={handleReject}
                disabled={!rejectReason || isRejecting}
              >
                {isRejecting ? "Rejecting..." : "Reject Clearance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
