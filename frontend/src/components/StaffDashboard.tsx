type Step = {
  stepOrder: number;
  department: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment: string;
};

type PendingRow = {
  requestId: string;
  referenceId: string;
  studentUserId: string;
  student?: Record<string, unknown>;
  step: Step;
};

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

  return (
    <section className="space-y-4 rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Department staff queue</h2>
      <p className="text-sm text-slate-600">
        You only see students whose <strong>active</strong> pending step matches your assigned office (strict 1→13 order).
      </p>
      {notifs.length > 0 && (
        <ul className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-700">
          {notifs.slice(0, 5).map((n) => (
            <li key={n.id}>
              <span className="font-medium">{n.title}</span> — {n.body}
            </li>
          ))}
        </ul>
      )}
      {pendingRows.length === 0 ? (
        <p className="text-sm text-slate-600">No pending students at your desk.</p>
      ) : (
        pendingRows.map((row) => (
          <div key={row.referenceId} className="rounded border border-slate-200 p-4">
            <p className="font-semibold text-slate-800">
              Student: {String(row.student?.name ?? row.studentUserId)} ({String(row.student?.studentId ?? '—')})
            </p>
            <p className="text-sm text-slate-600">
              Step {row.step.stepOrder}: {row.step.department} · Ref {row.referenceId}
            </p>
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
                <input className="mt-1 w-full rounded border border-slate-200 p-2 text-sm" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Instruction for student
                <input className="mt-1 w-full rounded border border-slate-200 p-2 text-sm" value={rejectInstruction} onChange={(e) => setRejectInstruction(e.target.value)} />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white" onClick={onApprove}>
                Approve
              </button>
              <button type="button" className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white" onClick={onReject}>
                Reject
              </button>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

