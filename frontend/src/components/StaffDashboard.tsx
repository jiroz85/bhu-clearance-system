import { useState, useMemo } from "react";

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

  return (
    <section className="space-y-8 animate-fadeIn">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/50 overflow-hidden hover:shadow-3xl transition-all duration-500">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-8 py-8 border-b border-emerald-100/50 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Department Staff Queue
              </h2>
              <p className="text-emerald-100 mt-2 text-sm leading-relaxed">
                You only see students whose{" "}
                <strong className="text-emerald-50">active</strong> pending step
                matches your assigned office (strict 1→13 order).
              </p>
            </div>
            <div className="bg-white/25 backdrop-blur-md rounded-2xl px-8 py-4 border border-white/40 shadow-xl">
              <div className="text-center">
                <p className="text-xs font-medium text-emerald-100 mb-1">
                  Showing
                </p>
                <p className="text-sm font-bold text-white">
                  {paginatedRows.length}
                </p>
                <p className="text-xs font-medium text-emerald-100">
                  of {filteredAndSortedRows.length} students
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Filters and Controls */}
          <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl p-4 border border-slate-200/50 mb-6 shadow-lg backdrop-blur-sm">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                  <svg
                    className="h-6 w-6 text-slate-400"
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
                  className="block w-full pl-14 pr-5 py-3 border border-slate-200 rounded-2xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 shadow-lg hover:shadow-xl bg-white/80 backdrop-blur-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <select
                  className="px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as FilterOption)}
                >
                  <option value="all">All Requests</option>
                  <option value="new">New (last 24h)</option>
                  <option value="overdue">Overdue (3+ days)</option>
                </select>
                <select
                  className="px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-300 shadow-lg hover:shadow-xl font-medium"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                >
                  <option value="submittedAt">Sort by Date</option>
                  <option value="studentName">Sort by Name</option>
                  <option value="referenceId">Sort by Reference</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notifications */}
          {notifs.length > 0 && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-4 shadow-lg">
              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 shadow-lg">
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
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Recent Notifications
                    </h4>
                    <span className="bg-amber-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                      {notifs.length} new
                    </span>
                  </div>
                  <div className="space-y-2">
                    {notifs.slice(0, 5).map((n, index) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 p-2 bg-white/70 backdrop-blur-sm rounded-xl border border-amber-100 hover:bg-white transition-all duration-200"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="w-2 h-2 bg-amber-400 rounded-full mt-2 animate-pulse"></div>
                        <div className="flex-1">
                          <span className="font-medium text-slate-800 text-xs">
                            {n.title}
                          </span>
                          <span className="text-slate-600 text-xs ml-2">
                            — {n.body}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Queue Items */}
          {paginatedRows.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mb-6 shadow-lg">
                <svg
                  className="w-10 h-10 text-slate-400"
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
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                {searchTerm || filterBy !== "all"
                  ? "No students match your filters."
                  : "No pending students at your desk."}
              </h3>
              <p className="text-slate-600 text-sm">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {paginatedRows.map((row, index) => (
                <div
                  key={row.referenceId}
                  className="group rounded-2xl border border-slate-200 overflow-hidden hover:shadow-2xl hover:border-slate-300 transition-all duration-300 bg-white transform hover:-translate-y-1"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="bg-gradient-to-r from-slate-50 to-white p-4 border-b border-slate-100">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl p-3 border border-slate-200">
                            <svg
                              className="w-5 h-5 text-slate-600"
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
                            <p className="font-bold text-slate-900 text-sm">
                              {String(row.student?.name ?? row.studentUserId)}
                            </p>
                            <p className="text-slate-600 font-medium">
                              ID: {String(row.student?.studentId ?? "—")}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
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
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            <span className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 font-medium text-blue-700 text-xs">
                              Step {row.step.stepOrder}: {row.step.department}
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
                            <span className="inline-flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-mono font-medium text-slate-700 text-xs">
                              Ref: {row.referenceId}
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
                              <span className="text-slate-500 text-xs">
                                {new Date(row.submittedAt).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 sm:items-end">
                        <div className="flex gap-2">
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 border border-amber-200 shadow-sm">
                            <svg
                              className="w-3 h-3 mr-1 animate-pulse"
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
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 border border-red-200 shadow-sm">
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
                      </div>
                    </div>
                  </div>

                  {/* Action Section */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-slate-100 border-t border-slate-200">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          <svg
                            className="w-4 h-4 inline mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          Comment
                        </label>
                        <textarea
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 resize-none shadow-sm hover:shadow"
                          rows={3}
                          value={staffComment}
                          onChange={(e) => setStaffComment(e.target.value)}
                          placeholder="Add any comments or notes..."
                        />
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            <svg
                              className="w-4 h-4 inline mr-2"
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
                            Rejection Reason
                          </label>
                          <input
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            <svg
                              className="w-4 h-4 inline mr-2"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Instruction for Student
                          </label>
                          <input
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow"
                            value={rejectInstruction}
                            onChange={(e) =>
                              setRejectInstruction(e.target.value)
                            }
                            placeholder="What student needs to do"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button
                          type="button"
                          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-6 py-3 text-xs font-semibold text-white hover:from-emerald-700 hover:to-green-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex-1"
                          onClick={onApprove}
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
                          className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-pink-600 px-6 py-3 text-xs font-semibold text-white hover:from-red-700 hover:to-pink-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex-1"
                          onClick={onReject}
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
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 mt-6">
              <div className="text-xs text-slate-600">
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
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  <svg
                    className="w-3 h-3"
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
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow"
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <svg
                    className="w-3 h-3"
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
    </section>
  );
}
