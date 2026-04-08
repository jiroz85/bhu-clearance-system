import { useState, useMemo } from "react";
import type {
  DepartmentConfig,
  DepartmentRequirement,
  DepartmentReviewPayload,
  DepartmentChecklistData,
  DepartmentPaymentData,
} from "./department-config";

// ============================================================================
// BASE TYPES
// ============================================================================

type Step = {
  stepOrder: number;
  department: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comment: string;
};

type PendingRow = {
  requestId: string;
  referenceId: string;
  studentUserId: string;
  student?: {
    name?: string;
    studentId?: string;
    studentDepartment?: string;
    studentYear?: string;
    displayName?: string;
    email?: string;
  };
  step: Step;
  createdAt?: string;
  submittedAt?: string;
};

type SortOption = "referenceId" | "submittedAt" | "studentName";
type FilterOption = "all" | "new" | "overdue";

// ============================================================================
// BASE DASHBOARD PROPS
// ============================================================================

export interface BaseDepartmentDashboardProps {
  // From App.tsx
  departmentConfig: DepartmentConfig;
  notifs: Array<{
    id: string;
    title: string;
    body: string;
    createdAt?: string;
  }>;
  pendingRows: PendingRow[];

  // Callbacks
  onReview: (payload: DepartmentReviewPayload) => void;
  onLoadData?: () => void; // For refreshing department-specific data

  // Optional department-specific data from backend
  departmentData?: Record<string, unknown>;
}

// ============================================================================
// REUSABLE UI COMPONENTS
// ============================================================================

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error";
}) {
  const variants = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}
    >
      {children}
    </div>
  );
}

// ============================================================================
// REQUIREMENT CHECKLIST COMPONENT
// ============================================================================

interface ChecklistProps {
  requirements: DepartmentRequirement[];
  data: DepartmentChecklistData;
  onChange: (data: DepartmentChecklistData) => void;
  disabled?: boolean;
}

export function DepartmentChecklist({
  requirements,
  data,
  onChange,
  disabled,
}: ChecklistProps) {
  const handleChange = (id: string, value: boolean | string | number) => {
    onChange({ ...data, [id]: value });
  };

  return (
    <div className="space-y-2">
      {requirements.map((req) => (
        <div key={req.id} className="flex items-start gap-2">
          {req.type === "checkbox" ? (
            <>
              <input
                type="checkbox"
                id={req.id}
                checked={!!data[req.id]}
                onChange={(e) => handleChange(req.id, e.target.checked)}
                disabled={disabled}
                className="mt-0.5 h-3 w-3 rounded border-slate-300 text-blue-600"
              />
              <label htmlFor={req.id} className="text-xs text-slate-700">
                {req.label}
                {req.required && <span className="ml-1 text-red-500">*</span>}
              </label>
            </>
          ) : req.type === "number" ? (
            <div className="flex-1">
              <label
                htmlFor={req.id}
                className="block text-xs font-medium text-slate-700"
              >
                {req.label}
                {req.required && <span className="ml-1 text-red-500">*</span>}
              </label>
              <input
                type="number"
                id={req.id}
                value={String(data[req.id] || "")}
                onChange={(e) =>
                  handleChange(req.id, parseFloat(e.target.value) || 0)
                }
                disabled={disabled}
                min={req.validation?.min}
                max={req.validation?.max}
                className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
              />
            </div>
          ) : req.type === "select" ? (
            <div className="flex-1">
              <label
                htmlFor={req.id}
                className="block text-xs font-medium text-slate-700"
              >
                {req.label}
                {req.required && <span className="ml-1 text-red-500">*</span>}
              </label>
              <select
                id={req.id}
                value={String(data[req.id] || "")}
                onChange={(e) => handleChange(req.id, e.target.value)}
                disabled={disabled}
                className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
              >
                <option value="">Select...</option>
                {req.options?.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex-1">
              <label
                htmlFor={req.id}
                className="block text-xs font-medium text-slate-700"
              >
                {req.label}
                {req.required && <span className="ml-1 text-red-500">*</span>}
              </label>
              <input
                type="text"
                id={req.id}
                value={String(data[req.id] || "")}
                onChange={(e) => handleChange(req.id, e.target.value)}
                disabled={disabled}
                pattern={req.validation?.pattern}
                className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1 text-xs"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// PAYMENT SECTION COMPONENT (for departments that collect fees)
// ============================================================================

interface PaymentSectionProps {
  data: DepartmentPaymentData;
  onChange: (data: DepartmentPaymentData) => void;
  disabled?: boolean;
}

export function PaymentSection({
  data,
  onChange,
  disabled,
}: PaymentSectionProps) {
  const updateField = <K extends keyof DepartmentPaymentData>(
    field: K,
    value: DepartmentPaymentData[K],
  ) => {
    onChange({ ...data, [field]: value });
  };

  const remaining = (data.amountDue || 0) - (data.amountPaid || 0);

  return (
    <Card className="bg-amber-50/50">
      <h4 className="mb-3 text-sm font-semibold text-slate-800">
        Payment Details
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-600">
            Amount Due
          </label>
          <input
            type="number"
            value={data.amountDue || ""}
            onChange={(e) =>
              updateField("amountDue", parseFloat(e.target.value) || 0)
            }
            disabled={disabled}
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">
            Amount Paid
          </label>
          <input
            type="number"
            value={data.amountPaid || ""}
            onChange={(e) =>
              updateField("amountPaid", parseFloat(e.target.value) || 0)
            }
            disabled={disabled}
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">
            Receipt Number
          </label>
          <input
            type="text"
            value={data.receiptNumber || ""}
            onChange={(e) => updateField("receiptNumber", e.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600">
            Payment Method
          </label>
          <select
            value={data.paymentMethod || ""}
            onChange={(e) => updateField("paymentMethod", e.target.value)}
            disabled={disabled}
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="mobile_money">Mobile Money</option>
            <option value="check">Check</option>
          </select>
        </div>
      </div>
      {remaining > 0 && (
        <div className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">
          Outstanding balance: <strong>{remaining.toLocaleString()} ETB</strong>
        </div>
      )}
      {remaining === 0 && data.amountDue > 0 && (
        <div className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-700">
          Payment complete ✓
        </div>
      )}
    </Card>
  );
}

// ============================================================================
// BASE DEPARTMENT DASHBOARD COMPONENT
// ============================================================================

export function BaseDepartmentDashboard({
  departmentConfig,
  notifs,
  pendingRows,
  onReview,
  children, // Department-specific extensions
}: BaseDepartmentDashboardProps & { children?: React.ReactNode }) {
  // Local state
  const [sortBy, setSortBy] = useState<SortOption>("submittedAt");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRow, setSelectedRow] = useState<PendingRow | null>(null);

  // Review form state
  const [staffComment, setStaffComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectInstruction, setRejectInstruction] = useState("");
  const [checklistData, setChecklistData] = useState<DepartmentChecklistData>(
    {},
  );
  const [paymentData, setPaymentData] = useState<DepartmentPaymentData>({
    amountDue: 0,
    amountPaid: 0,
  });

  const itemsPerPage = 10;

  // Filter and sort logic
  const filteredAndSortedRows = useMemo(() => {
    let filtered = [...pendingRows];

    if (searchTerm) {
      filtered = filtered.filter(
        (row) =>
          String(row.student?.name ?? row.student?.displayName ?? "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          row.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(row.student?.studentId ?? "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

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

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "referenceId":
          return a.referenceId.localeCompare(b.referenceId);
        case "studentName": {
          const nameA = String(
            a.student?.name ?? a.student?.displayName ?? "",
          ).toLowerCase();
          const nameB = String(
            b.student?.name ?? b.student?.displayName ?? "",
          ).toLowerCase();
          return nameA.localeCompare(nameB);
        }
        case "submittedAt": {
          const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
          const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
          return dateB - dateA;
        }
        default:
          return 0;
      }
    });

    return filtered;
  }, [pendingRows, searchTerm, filterBy, sortBy]);

  const totalPages = Math.ceil(filteredAndSortedRows.length / itemsPerPage);
  const paginatedRows = filteredAndSortedRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const threeDaysAgo = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  }, []);

  // Reset page when filters change - use event handler pattern
  const handleFilterChange = (newFilter: FilterOption) => {
    setFilterBy(newFilter);
    setCurrentPage(1);
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Reset form when selecting a new row
  const handleSelectRow = (row: PendingRow | null) => {
    if (row?.requestId !== selectedRow?.requestId) {
      setStaffComment("");
      setRejectReason("");
      setRejectInstruction("");
      setChecklistData({});
      setPaymentData({ amountDue: 0, amountPaid: 0 });
    }
    setSelectedRow(row);
  };

  const handleReview = (decision: "APPROVED" | "REJECTED") => {
    if (!selectedRow) return;
    if (!staffComment.trim() || staffComment.trim().length < 2) {
      alert("Approval/rejection requires a comment (min 2 characters).");
      return;
    }
    if (
      decision === "REJECTED" &&
      (!rejectReason.trim() || !rejectInstruction.trim())
    ) {
      alert("Rejection requires both reason and instruction.");
      return;
    }

    const payload: DepartmentReviewPayload = {
      decision,
      comment: staffComment.trim(),
      reason: decision === "REJECTED" ? rejectReason.trim() : undefined,
      instruction:
        decision === "REJECTED" ? rejectInstruction.trim() : undefined,
      checklist: checklistData,
      payment: departmentConfig.canCollectPayment ? paymentData : undefined,
    };

    onReview(payload);
    setSelectedRow(null);
  };

  const isOverdue = (submittedAt?: string) => {
    return submittedAt && new Date(submittedAt) <= threeDaysAgo;
  };

  return (
    <section className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            {departmentConfig.name} Dashboard
          </h2>
          <p className="text-xs text-slate-600">
            Step {departmentConfig.stepOrder}: {departmentConfig.description}
          </p>
        </div>
        <div className="text-sm text-slate-600">
          {selectedRow
            ? "Processing 1 student"
            : `Showing ${paginatedRows.length} of ${filteredAndSortedRows.length} students`}
        </div>
      </div>

      {/* Notifications */}
      {notifs.length > 0 && (
        <ul className="rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-xs text-slate-700">
          {notifs.slice(0, 5).map((n) => (
            <li key={n.id}>
              <span className="font-medium">{n.title}</span> — {n.body}
            </li>
          ))}
        </ul>
      )}

      {/* List View or Detail View */}
      {!selectedRow ? (
        <>
          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Search by name, ID, or reference..."
              className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            <select
              className="rounded border border-slate-200 px-2 py-1 text-xs"
              value={filterBy}
              onChange={(e) =>
                handleFilterChange(e.target.value as FilterOption)
              }
            >
              <option value="all">All Requests</option>
              <option value="new">New (last 24h)</option>
              <option value="overdue">Overdue (3+ days)</option>
            </select>
            <select
              className="rounded border border-slate-200 px-2 py-1 text-xs"
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
            >
              <option value="submittedAt">Sort by Date</option>
              <option value="studentName">Sort by Name</option>
              <option value="referenceId">Sort by Reference</option>
            </select>
          </div>

          {/* Empty State */}
          {paginatedRows.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-slate-600">
                {searchTerm || filterBy !== "all"
                  ? "No students match your filters."
                  : "No pending students at your desk."}
              </p>
            </div>
          ) : (
            /* Student List */
            <div className="space-y-3">
              {paginatedRows.map((row) => (
                <div
                  key={row.referenceId}
                  onClick={() => handleSelectRow(row)}
                  className="cursor-pointer rounded border border-slate-200 p-4 hover:bg-slate-50 hover:border-blue-300 transition-colors"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {String(
                          row.student?.name ??
                            row.student?.displayName ??
                            row.studentUserId,
                        )}
                      </p>
                      <p className="text-xs text-slate-600">
                        ID: {String(row.student?.studentId ?? "—")} · Ref:{" "}
                        {row.referenceId}
                      </p>
                      {row.student?.studentDepartment && (
                        <p className="text-xs text-slate-500">
                          Dept: {row.student.studentDepartment} · Year:{" "}
                          {row.student.studentYear ?? "—"}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="warning">PENDING</Badge>
                      {isOverdue(row.submittedAt) && (
                        <Badge variant="error">OVERDUE</Badge>
                      )}
                    </div>
                  </div>
                  {row.submittedAt && (
                    <p className="mt-2 text-xs text-slate-500">
                      Submitted: {new Date(row.submittedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-4">
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
        </>
      ) : (
        /* Detail View - Processing a Student */
        <div className="space-y-4">
          {/* Back Button & Student Info */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSelectRow(null)}
              className="rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              ← Back to List
            </button>
          </div>

          <Card className="bg-blue-50/50">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {String(
                    selectedRow.student?.name ??
                      selectedRow.student?.displayName ??
                      selectedRow.studentUserId,
                  )}
                </h3>
                <p className="text-xs text-slate-600">
                  Student ID: {String(selectedRow.student?.studentId ?? "—")} ·
                  Reference: {selectedRow.referenceId}
                </p>
                {selectedRow.student?.studentDepartment && (
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedRow.student.studentDepartment} · Year{" "}
                    {selectedRow.student.studentYear ?? "—"}
                  </p>
                )}
              </div>
              <Badge variant="warning">PENDING REVIEW</Badge>
            </div>
          </Card>

          {/* Department-specific extension slot */}
          {children}

          {/* Requirements Checklist */}
          <Card>
            <h4 className="mb-3 text-sm font-semibold text-slate-800">
              {departmentConfig.name} Requirements
              <span className="ml-2 text-xs font-normal text-slate-500">
                (All required items must be checked to approve)
              </span>
            </h4>
            <DepartmentChecklist
              requirements={departmentConfig.requirements}
              data={checklistData}
              onChange={setChecklistData}
            />
          </Card>

          {/* Payment Section (if applicable) */}
          {departmentConfig.canCollectPayment && (
            <PaymentSection data={paymentData} onChange={setPaymentData} />
          )}

          {/* Comments */}
          <Card>
            <label className="block text-sm font-medium text-slate-700">
              Review Comment <span className="text-red-500">*</span>
              <textarea
                className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
                rows={3}
                value={staffComment}
                onChange={(e) => setStaffComment(e.target.value)}
                placeholder="Enter your review comments..."
              />
            </label>
          </Card>

          {/* Rejection Fields */}
          <Card className="border-red-200 bg-red-50/30">
            <h4 className="mb-3 text-sm font-semibold text-slate-800">
              Rejection Details (if applicable)
            </h4>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Rejection Reason
                <input
                  className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why is this being rejected?"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Instruction for Student
                <input
                  className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
                  value={rejectInstruction}
                  onChange={(e) => setRejectInstruction(e.target.value)}
                  placeholder="What must the student do?"
                />
              </label>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleReview("APPROVED")}
              className="rounded bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              ✓ Approve Clearance
            </button>
            <button
              type="button"
              onClick={() => handleReview("REJECTED")}
              className="rounded bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              ✗ Reject Clearance
            </button>
            <button
              type="button"
              onClick={() => handleSelectRow(null)}
              className="rounded border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
