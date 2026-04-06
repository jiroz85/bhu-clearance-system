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
      <section className="space-y-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Loading clearance data…</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Student dashboard
        </h2>
        {studentMeta && (
          <p className="text-sm text-slate-600">
            Name: {studentMeta.name} | ID: {studentMeta.studentId ?? "—"} |
            Department: {studentMeta.department ?? "—"} | Year:{" "}
            {studentMeta.year ?? "—"}
          </p>
        )}
        {!clearanceId && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={onCreateDraft}
            >
              Start new clearance (draft)
            </button>
          </div>
        )}
        {clearanceId && clearanceStatus === "DRAFT" && (
          <div className="mt-3">
            <p className="text-sm text-slate-600">Draft ref: {referenceId}</p>
            <button
              type="button"
              className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
              onClick={onSubmitClearance}
            >
              Submit for clearance (starts 13-step workflow)
            </button>
          </div>
        )}
        {clearanceStatus && clearanceStatus !== "DRAFT" && (
          <>
            <p className="mt-2 text-sm font-medium text-slate-700">
              Status: {clearanceStatus} | Ref: {referenceId} | Progress:{" "}
              {approved}/13 ({progress}%)
            </p>
            <div className="mt-2 h-3 w-full rounded-full bg-slate-200">
              <div
                className="h-3 rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        )}
      </div>

      {notifs.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">
            Notifications
          </h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {notifs.slice(0, 8).map((n) => (
              <li
                key={n.id}
                className="rounded-lg border border-slate-100 px-3 py-2"
              >
                <span className="font-medium text-slate-900">{n.title}</span>
                <span className="text-slate-500">
                  {" "}
                  — {new Date(n.createdAt).toLocaleString()}
                </span>
                <p className="text-slate-600">{n.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {steps.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Clearance Progress
            </h3>
            <div className="flex gap-2 text-sm">
              <button
                id="timeline-view-btn"
                className="px-3 py-1 rounded bg-blue-100 text-blue-700 font-medium"
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
                    ?.classList.remove("text-slate-600", "hover:bg-slate-100");
                  document
                    .getElementById("table-view-btn")
                    ?.classList.remove("bg-blue-100", "text-blue-700");
                  document
                    .getElementById("table-view-btn")
                    ?.classList.add("text-slate-600", "hover:bg-slate-100");
                }}
              >
                Timeline
              </button>
              <button
                id="table-view-btn"
                className="px-3 py-1 rounded text-slate-600 hover:bg-slate-100"
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
                    ?.classList.remove("text-slate-600", "hover:bg-slate-100");
                  document
                    .getElementById("timeline-view-btn")
                    ?.classList.remove("bg-blue-100", "text-blue-700");
                  document
                    .getElementById("timeline-view-btn")
                    ?.classList.add("text-slate-600", "hover:bg-slate-100");
                }}
              >
                Table View
              </button>
            </div>
          </div>

          {/* Timeline View */}
          <div className="steps-timeline">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200"></div>

              {/* Timeline Items */}
              {steps.map((step) => (
                <div
                  key={step.stepOrder}
                  className="relative flex items-start mb-6 last:mb-0"
                >
                  {/* Timeline Dot */}
                  <div
                    className={`absolute left-4 w-5 h-5 rounded-full border-2 z-10 ${
                      step.status === "APPROVED"
                        ? "bg-green-100 border-green-500"
                        : step.status === "REJECTED"
                          ? "bg-red-100 border-red-500"
                          : "bg-slate-100 border-slate-300"
                    }`}
                  >
                    {step.status === "APPROVED" && (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-2 h-2 text-green-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                    {step.status === "REJECTED" && (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-2 h-2 text-red-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="ml-12 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-slate-900">
                        {step.stepOrder}. {step.department}
                      </h4>
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${badgeClass(step.status)}`}
                      >
                        {step.status}
                      </span>
                    </div>

                    {/* Timing Information */}
                    {step.reviewedAt && (
                      <div className="text-xs text-slate-500 mb-2">
                        {step.status === "APPROVED" ? "Approved" : "Rejected"}{" "}
                        on {new Date(step.reviewedAt).toLocaleString()}
                      </div>
                    )}

                    {/* Comment */}
                    {step.comment && (
                      <div
                        className={`text-sm p-3 rounded-lg ${
                          step.status === "REJECTED"
                            ? "bg-red-50 border border-red-200 text-red-800"
                            : "bg-slate-50 border border-slate-200 text-slate-700"
                        }`}
                      >
                        <div className="font-medium text-xs mb-1">
                          {step.status === "REJECTED"
                            ? "Reason for rejection:"
                            : "Comment:"}
                        </div>
                        {step.comment}
                      </div>
                    )}

                    {/* Resubmit button for rejected steps */}
                    {step.status === "REJECTED" && (
                      <div className="mt-3">
                        <button
                          type="button"
                          className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
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
                          🔄 Resubmit for {step.department}
                        </button>
                      </div>
                    )}

                    {/* Pending indicator */}
                    {step.status === "PENDING" && (
                      <div className="text-sm text-slate-500 italic">
                        Awaiting review...
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Table View (Hidden by default) */}
          <div className="steps-table hidden">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-slate-600">
                  <th className="py-2">Department</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">Comment</th>
                </tr>
              </thead>
              <tbody>
                {steps.map((s) => (
                  <tr key={s.stepOrder} className="border-b last:border-b-0">
                    <td className="py-2">
                      {s.stepOrder}. {s.department}
                    </td>
                    <td className="py-2">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${badgeClass(s.status)}`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2 text-slate-700">{s.comment || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <div className="min-w-[200px] flex-1">
              <label
                htmlFor="recheck-msg"
                className="text-xs font-medium text-slate-600"
              >
                Resubmission Message
              </label>
              <textarea
                id="recheck-msg"
                className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
                rows={3}
                value={recheckMessage}
                onChange={(e) => setRecheckMessage(e.target.value)}
                placeholder="Describe what you have fixed or submitted (e.g., 'I have submitted my room key to the dormitory office')..."
                disabled={!rejectedStep}
              />
              <button
                type="button"
                className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!rejectedStep || !recheckMessage.trim()}
                onClick={onSubmitRecheck}
              >
                📤 Submit Resubmission
              </button>
              {rejectedStep && (
                <p className="mt-1 text-xs text-slate-500">
                  💡 Click the "🔄 Resubmit" button above any rejected step to
                  auto-fill this message
                </p>
              )}
            </div>
            <div>
              <button
                type="button"
                className={`rounded px-4 py-2 text-sm font-semibold text-white ${
                  canCert
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "cursor-not-allowed bg-slate-400"
                }`}
                disabled={!canCert}
                onClick={onDownloadCertificatePdf}
              >
                📜 Download certificate (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
