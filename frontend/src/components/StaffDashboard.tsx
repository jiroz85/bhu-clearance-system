import { useState, useMemo, useEffect } from "react";

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
  student?: Record<string, unknown>;
  step: Step;
  createdAt?: string;
  submittedAt?: string;
};

type SortOption = "referenceId" | "submittedAt" | "studentName";
type FilterOption = "all" | "new" | "overdue";

export function StaffDashboard(props: {
  notifs: Array<{ id: string; title: string; body: string }>;
  pendingRows: PendingRow[];
  staffComment: string;
  setStaffComment: (v: string) => void;
  rejectReason: string;
  setRejectReason: (v: string) => void;
  rejectInstruction: string;
  setRejectInstruction: (v: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const {
    notifs,
    pendingRows,
    staffComment,
    setStaffComment,
    rejectReason,
    setRejectReason,
    rejectInstruction,
    setRejectInstruction,
    onApprove,
    onReject,
  } = props;

  // State for filtering and sorting
  const [sortBy, setSortBy] = useState<SortOption>("submittedAt");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter and sort logic
  const filteredAndSortedRows = useMemo(() => {
    let filtered = [...pendingRows];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (row) =>
          String(row.student?.name ?? "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          row.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(row.student?.studentId ?? "")
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
        case "studentName": {
          const nameA = String(a.student?.name ?? "").toLowerCase();
          const nameB = String(b.student?.name ?? "").toLowerCase();
          return nameA.localeCompare(nameB);
        }
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

  // Memoized date for overdue calculations
  const threeDaysAgo = useMemo(() => {
    const now = new Date();
    return new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterBy, sortBy]);

  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Department staff queue
          </h2>
          <p className="text-sm text-slate-600">
            You only see students whose <strong>active</strong> pending step
            matches your assigned office (strict 1→13 order).
          </p>
        </div>
        <div className="text-sm text-slate-600">
          Showing {paginatedRows.length} of {filteredAndSortedRows.length}{" "}
          students
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col gap-3 sm:flex-row">
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
      {notifs.length > 0 && (
        <ul className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-700">
          {notifs.slice(0, 5).map((n) => (
            <li key={n.id}>
              <span className="font-medium">{n.title}</span> — {n.body}
            </li>
          ))}
        </ul>
      )}
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
              key={row.referenceId}
              className="rounded border border-slate-200 p-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                <div>
                  <p className="font-semibold text-slate-800">
                    Student: {String(row.student?.name ?? row.studentUserId)} (
                    {String(row.student?.studentId ?? "—")})
                  </p>
                  <p className="text-sm text-slate-600">
                    Step {row.step.stepOrder}: {row.step.department} · Ref{" "}
                    {row.referenceId}
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
              <label className="mt-3 block text-xs font-medium text-slate-600">
                Comment
                <textarea
                  className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
                  rows={3}
                  value={staffComment}
                  onChange={(e) => setStaffComment(e.target.value)}
                />
              </label>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-medium text-slate-600">
                  Rejection reason
                  <input
                    className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                </label>
                <label className="block text-xs font-medium text-slate-600">
                  Instruction for student
                  <input
                    className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
                    value={rejectInstruction}
                    onChange={(e) => setRejectInstruction(e.target.value)}
                  />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                  onClick={onApprove}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                  onClick={onReject}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
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
    </section>
  );
}
