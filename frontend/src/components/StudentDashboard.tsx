type Step = {
  id: string;
  stepOrder: number;
  department: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comment: string;
  reviewedAt?: string;
  createdAt?: string;
};

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

export function StudentDashboard(props: {
  loading?: boolean;
  studentMeta: {
    name: string;
    studentId: string | null;
    department: string | null;
    year: string | null;
  } | null;
  clearanceId: string | null;
  clearanceStatus: string;
  referenceId: string;
  approved: number;
  progress: number;
  steps: Step[];
  notifs: NotificationItem[];
  recheckMessage: string;
  setRecheckMessage: (v: string) => void;
  canCert: boolean;
  rejectedStep: Step | undefined;
  onCreateDraft: () => void;
  onSubmitClearance: () => void;
  onSubmitRecheck: () => void;
  onDownloadCertificatePdf: () => void;
  badgeClass: (s: Step["status"]) => string;
}) {
  const {
    studentMeta,
    clearanceId,
    clearanceStatus,
    referenceId,
    approved,
    progress,
    steps,
    notifs,
    recheckMessage,
    setRecheckMessage,
    canCert,
    rejectedStep,
    onCreateDraft,
    onSubmitClearance,
    onSubmitRecheck,
    onDownloadCertificatePdf,
    badgeClass,
  } = props;

  if (props.loading) {
    return (
      <section className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 p-16 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-200 rounded-full mb-8 shadow-2xl border border-blue-100/60">
              <svg
                className="w-12 h-12 text-blue-600 animate-pulse"
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
            <div className="space-y-4">
              <div className="h-3 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-full animate-pulse w-64 mx-auto"></div>
              <div className="h-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full animate-pulse w-48 mx-auto"></div>
              <div className="h-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-full animate-pulse w-32 mx-auto"></div>
            </div>
            <p className="text-slate-600 font-bold text-lg mt-8">
              Loading clearance data…
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 animate-fadeIn">
      {/* Student Info Header */}
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/60 overflow-hidden hover:shadow-3xl transition-all duration-500">
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-4 py-3 border-b border-blue-100/60 relative overflow-hidden">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-2xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-white rounded-full blur-xl animate-pulse delay-500"></div>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/25 backdrop-blur-xl rounded-xl p-3 border border-white/40 shadow-lg hover:scale-105 transition-transform duration-300">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white tracking-tight">
                Student Dashboard
              </h2>
              {studentMeta && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-blue-100">
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-xl rounded-lg px-2 py-1 shadow-md border border-white/30 hover:bg-white/20 transition-all duration-300">
                    <svg
                      className="w-3 h-3 text-blue-200"
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
                    <span className="font-bold text-blue-50 text-xs">
                      {studentMeta.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-xl rounded-lg px-2 py-1 shadow-md border border-white/30 hover:bg-white/20 transition-all duration-300">
                    <svg
                      className="w-3 h-3 text-blue-200"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                      />
                    </svg>
                    <span className="font-bold text-blue-50 text-xs">
                      ID: {studentMeta.studentId ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-xl rounded-lg px-2 py-1 shadow-md border border-white/30 hover:bg-white/20 transition-all duration-300">
                    <svg
                      className="w-3 h-3 text-blue-200"
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
                    <span className="font-bold text-blue-50 text-xs">
                      {studentMeta.department ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/15 backdrop-blur-xl rounded-lg px-2 py-1 shadow-md border border-white/30 hover:bg-white/20 transition-all duration-300">
                    <svg
                      className="w-3 h-3 text-blue-200"
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
                    <span className="font-bold text-blue-50 text-xs">
                      Year {studentMeta.year ?? "—"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-3">
          {!clearanceId && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 via-blue-200 to-indigo-200 rounded-2xl mb-4 shadow-lg hover:scale-105 transition-transform duration-300">
                <svg
                  className="w-8 h-8 text-blue-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                Start Your Clearance Process
              </h3>
              <p className="text-slate-600 text-base mb-6 max-w-2xl mx-auto leading-relaxed">
                Begin your 13-step clearance journey to complete your university
                requirements
              </p>
              <button
                type="button"
                className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 px-8 py-4 text-base font-semibold text-white hover:from-blue-700 hover:via-indigo-700 hover:to-indigo-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1 relative overflow-hidden"
                onClick={onCreateDraft}
              >
                {/* Button shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                <svg
                  className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300 relative z-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="relative z-10 text-base">
                  Start New Clearance
                </span>
              </button>
            </div>
          )}

          {clearanceId && clearanceStatus === "DRAFT" && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-amber-100 to-orange-200 rounded-2xl mb-4 shadow-lg hover:scale-105 transition-transform duration-300">
                <svg
                  className="w-6 h-6 text-amber-600"
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
              <h3 className="text-xl font-semibold text-slate-900 mb-4">
                Draft Clearance Ready
              </h3>
              <div className="mb-4">
                <p className="text-slate-600 text-base mb-2 font-medium">
                  Reference Number:
                </p>
                <div className="inline-flex items-center bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg px-3 py-2 shadow-md">
                  <svg
                    className="w-4 h-4 text-amber-600 mr-2"
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
                  <span className="font-mono font-semibold text-amber-800 text-base">
                    {referenceId}
                  </span>
                </div>
              </div>
              <p className="text-slate-600 text-base mb-6 max-w-2xl mx-auto">
                Submit to begin the 13-step workflow process
              </p>
              <button
                type="button"
                className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 px-8 py-4 text-base font-semibold text-white hover:from-emerald-700 hover:to-green-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 hover:-translate-y-1"
                onClick={onSubmitClearance}
              >
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
                Submit for Clearance
              </button>
            </div>
          )}

          {clearanceStatus && clearanceStatus !== "DRAFT" && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
                <div>
                  <div className="text-base font-semibold text-slate-900 mb-2">
                    Clearance Progress
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">
                        Status:
                      </span>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700 border border-blue-200">
                        {clearanceStatus}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 font-medium">
                        Reference:
                      </span>
                      <span className="inline-flex items-center bg-white border border-slate-200 rounded px-3 py-1 font-mono text-sm font-medium">
                        {referenceId}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-center lg:text-right">
                  <div className="inline-flex flex-col items-center lg:items-end">
                    <div className="text-base font-semibold text-slate-600 mb-1">
                      {progress}%
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-medium">{approved}/13</span>
                      <span>steps completed</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                    style={{ width: `${progress}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-indigo-600 animate-pulse"></div>
                  </div>
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>Start</span>
                  <span>Complete</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notifs.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 border-b border-amber-100">
            <div className="flex items-center gap-2">
              <div className="bg-amber-600 rounded-full p-1">
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
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Notifications
                </h3>
                <p className="text-sm text-slate-600">
                  Recent updates and alerts
                </p>
              </div>
            </div>
          </div>
          <div className="p-3">
            <div className="space-y-4">
              {notifs.slice(0, 8).map((n) => (
                <div
                  key={n.id}
                  className="group rounded-lg border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-3 hover:shadow-md transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <div className="bg-slate-200 rounded-full p-1 mt-0.5">
                      <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-slate-900 text-sm">
                          {n.title}
                        </p>
                        <p className="text-sm text-slate-500">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">
                        {n.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Clearance Progress */}
      {steps.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-8 py-6 border-b border-purple-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  Clearance Progress
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  Track your 13-step clearance journey
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  id="timeline-view-btn"
                  className="px-6 py-3 rounded-xl bg-blue-100 text-blue-700 font-semibold transition-all duration-200 text-base"
                  onClick={() => {
                    document
                      .querySelector(".steps-timeline")
                      ?.classList.remove("hidden");
                    document
                      .querySelector(".steps-table")
                      ?.classList.add("hidden");
                    document
                      .getElementById("timeline-view-btn")
                      ?.classList.add("bg-blue-100", "text-blue-700");
                    document
                      .getElementById("timeline-view-btn")
                      ?.classList.remove(
                        "text-slate-600",
                        "hover:bg-slate-100",
                      );
                    document
                      .getElementById("table-view-btn")
                      ?.classList.remove("bg-blue-100", "text-blue-700");
                    document
                      .getElementById("table-view-btn")
                      ?.classList.add("text-slate-600", "hover:bg-slate-100");
                  }}
                >
                  <svg
                    className="w-5 h-5 inline mr-2"
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
                  Timeline
                </button>
                <button
                  id="table-view-btn"
                  className="px-6 py-3 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold transition-all duration-200 text-base"
                  onClick={() => {
                    document
                      .querySelector(".steps-table")
                      ?.classList.remove("hidden");
                    document
                      .querySelector(".steps-timeline")
                      ?.classList.add("hidden");
                    document
                      .getElementById("table-view-btn")
                      ?.classList.add("bg-blue-100", "text-blue-700");
                    document
                      .getElementById("table-view-btn")
                      ?.classList.remove(
                        "text-slate-600",
                        "hover:bg-slate-100",
                      );
                    document
                      .getElementById("timeline-view-btn")
                      ?.classList.remove("bg-blue-100", "text-blue-700");
                    document
                      .getElementById("timeline-view-btn")
                      ?.classList.add("text-slate-600", "hover:bg-slate-100");
                  }}
                >
                  <svg
                    className="w-5 h-5 inline mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  Table View
                </button>
              </div>
            </div>
          </div>

          <div className="p-3">
            {/* Timeline View */}
            <div className="steps-timeline">
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 to-purple-200 rounded-full"></div>

                {/* Timeline Items */}
                {steps.map((step) => (
                  <div
                    key={step.stepOrder}
                    className="relative flex items-start mb-4 last:mb-0"
                  >
                    {/* Timeline Dot */}
                    <div
                      className={`absolute left-3 w-4 h-4 rounded-full border-2 z-10 flex items-center justify-center ${
                        step.status === "APPROVED"
                          ? "bg-emerald-100 border-emerald-500"
                          : step.status === "REJECTED"
                            ? "bg-red-100 border-red-500"
                            : "bg-slate-100 border-slate-300"
                      }`}
                    >
                      {step.status === "APPROVED" && (
                        <svg
                          className="w-1 h-1 text-emerald-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {step.status === "REJECTED" && (
                        <svg
                          className="w-1 h-1 text-red-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      {step.status === "PENDING" && (
                        <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse"></div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="ml-10 flex-1">
                      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 text-base">
                            Step {step.stepOrder}: {step.department}
                          </h4>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${badgeClass(step.status)}`}
                          >
                            {step.status === "APPROVED" && (
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
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                            {step.status === "REJECTED" && (
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            )}
                            {step.status === "PENDING" && (
                              <svg
                                className="w-4 h-4 mr-2 animate-pulse"
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
                            )}
                            {step.status}
                          </span>
                        </div>

                        {/* Timing Information */}
                        {step.reviewedAt && (
                          <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
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
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            <span>
                              {step.status === "APPROVED"
                                ? "Approved"
                                : "Rejected"}{" "}
                              on {new Date(step.reviewedAt).toLocaleString()}
                            </span>
                          </div>
                        )}

                        {/* Comment */}
                        {step.comment && (
                          <div
                            className={`rounded-xl p-4 text-sm ${
                              step.status === "REJECTED"
                                ? "bg-red-50 border border-red-200 text-red-800"
                                : "bg-slate-50 border border-slate-200 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 font-semibold text-xs mb-2 uppercase tracking-wide">
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
                                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                              </svg>
                              {step.status === "REJECTED"
                                ? "Reason for rejection"
                                : "Comment"}
                            </div>
                            <p className="leading-relaxed">{step.comment}</p>
                          </div>
                        )}

                        {/* Resubmit button for rejected steps */}
                        {step.status === "REJECTED" && (
                          <div className="mt-4">
                            <button
                              type="button"
                              className="group inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-all duration-200 shadow-md hover:shadow-lg"
                              onClick={() => {
                                // Scroll to re-check section and pre-fill with step-specific message
                                document
                                  .getElementById("recheck-msg")
                                  ?.scrollIntoView({ behavior: "smooth" });
                                setRecheckMessage(
                                  `Resubmitted for ${step.department}: I have submitted the required items/documents.`,
                                );
                              }}
                            >
                              <svg
                                className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500"
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
                              Resubmit for {step.department}
                            </button>
                          </div>
                        )}

                        {/* Pending indicator */}
                        {step.status === "PENDING" && (
                          <div className="flex items-center gap-2 text-sm text-slate-500 italic">
                            <svg
                              className="w-4 h-4 animate-pulse"
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
                            Awaiting review...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Table View (Hidden by default) */}
            <div className="steps-table hidden">
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-base font-semibold text-slate-900">
                        Department
                      </th>
                      <th className="px-6 py-4 text-left text-base font-semibold text-slate-900">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-base font-semibold text-slate-900">
                        Comment
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {steps.map((s) => (
                      <tr
                        key={s.stepOrder}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-6 py-4 text-base font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">
                              {s.stepOrder}.
                            </span>
                            {s.department}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${badgeClass(s.status)}`}
                          >
                            {s.status === "APPROVED" && (
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
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                            {s.status === "REJECTED" && (
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            )}
                            {s.status === "PENDING" && (
                              <svg
                                className="w-4 h-4 mr-2 animate-pulse"
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
                            )}
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-base text-slate-700">
                          {s.comment || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Section */}
            <div className="mt-8 bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 border border-slate-200 shadow-lg">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label
                    htmlFor="recheck-msg"
                    className="flex items-center text-lg font-semibold text-slate-700 mb-4"
                  >
                    <div className="bg-blue-100 rounded-lg p-2 mr-3">
                      <svg
                        className="w-6 h-6 text-blue-600"
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
                    </div>
                    Resubmission Message
                  </label>
                  <textarea
                    id="recheck-msg"
                    className="w-full rounded-xl border border-slate-300 px-5 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none shadow-sm hover:shadow-md bg-white"
                    rows={4}
                    value={recheckMessage}
                    onChange={(e) => setRecheckMessage(e.target.value)}
                    placeholder="Describe what you have fixed or submitted (e.g., 'I have submitted my room key to the dormitory office')..."
                    disabled={!rejectedStep}
                  />
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-4 text-base font-semibold text-white hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                      disabled={!rejectedStep || !recheckMessage.trim()}
                      onClick={onSubmitRecheck}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 7l5 5m0 0l-5 5m5-5H6"
                        />
                      </svg>
                      Submit Resubmission
                    </button>
                    {rejectedStep && (
                      <p className="text-sm text-slate-500 max-w-xs">
                        <svg
                          className="w-4 h-4 inline mr-1"
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
                        Click "Resubmit" above to auto-fill
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl p-8 border border-emerald-200">
                      <div className="bg-emerald-600 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center shadow-lg">
                        <svg
                          className="w-10 h-10 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 mb-2">
                        Download Your Certificate
                      </h4>
                      <p className="text-slate-600 mb-6">
                        Get your official clearance certificate
                      </p>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-4 rounded-xl px-10 py-5 text-xl font-semibold text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                          canCert
                            ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                            : "cursor-not-allowed bg-slate-400"
                        }`}
                        disabled={!canCert}
                        onClick={onDownloadCertificatePdf}
                      >
                        <svg
                          className="w-7 h-7"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Download Certificate (PDF)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
