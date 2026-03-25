type Step = {
  stepOrder: number;
  department: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment: string;
};

type NotificationItem = { id: string; title: string; body: string; createdAt: string };

export function StudentDashboard(props: {
  studentMeta: { name: string; studentId: string | null; department: string | null; year: string | null } | null;
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
  badgeClass: (s: Step['status']) => string;
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

  return (
    <section className="space-y-4">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Student dashboard</h2>
        {studentMeta && (
          <p className="text-sm text-slate-600">
            Name: {studentMeta.name} | ID: {studentMeta.studentId ?? '—'} | Department: {studentMeta.department ?? '—'} |
            Year: {studentMeta.year ?? '—'}
          </p>
        )}
        {!clearanceId && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white" onClick={onCreateDraft}>
              Start new clearance (draft)
            </button>
          </div>
        )}
        {clearanceId && clearanceStatus === 'DRAFT' && (
          <div className="mt-3">
            <p className="text-sm text-slate-600">Draft ref: {referenceId}</p>
            <button type="button" className="mt-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={onSubmitClearance}>
              Submit for clearance (starts 13-step workflow)
            </button>
          </div>
        )}
        {clearanceStatus && clearanceStatus !== 'DRAFT' && (
          <>
            <p className="mt-2 text-sm font-medium text-slate-700">
              Status: {clearanceStatus} | Ref: {referenceId} | Progress: {approved}/13 ({progress}%)
            </p>
            <div className="mt-2 h-3 w-full rounded-full bg-slate-200">
              <div className="h-3 rounded-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </>
        )}
      </div>

      {notifs.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
          <ul className="mt-2 space-y-2 text-sm text-slate-700">
            {notifs.slice(0, 8).map((n) => (
              <li key={n.id} className="rounded-lg border border-slate-100 px-3 py-2">
                <span className="font-medium text-slate-900">{n.title}</span>
                <span className="text-slate-500"> — {new Date(n.createdAt).toLocaleString()}</span>
                <p className="text-slate-600">{n.body}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {steps.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
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
                  <td className="py-2">{s.stepOrder}. {s.department}</td>
                  <td className="py-2">
                    <span className={`rounded px-2 py-1 text-xs font-semibold ${badgeClass(s.status)}`}>{s.status}</span>
                  </td>
                  <td className="py-2 text-slate-700">{s.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="recheck-msg" className="text-xs font-medium text-slate-600">Request re-check (rejected steps)</label>
              <textarea
                id="recheck-msg"
                className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
                rows={2}
                value={recheckMessage}
                onChange={(e) => setRecheckMessage(e.target.value)}
                placeholder="Describe what you fixed…"
                disabled={!rejectedStep}
              />
              <button
                type="button"
                className="mt-2 rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!rejectedStep || !recheckMessage.trim()}
                onClick={onSubmitRecheck}
              >
                Request re-check
              </button>
            </div>
            <div>
              <button
                type="button"
                className={`rounded px-4 py-2 text-sm font-semibold text-white ${
                  canCert ? 'bg-emerald-600' : 'cursor-not-allowed bg-slate-400'
                }`}
                disabled={!canCert}
                onClick={onDownloadCertificatePdf}
              >
                Download certificate (PDF)
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

