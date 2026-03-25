export function AdminPanel(props: {
  adminSummary: {
    total: number;
    fullyCleared: number;
    pausedRejected: number;
    inProgress: number;
  } | null;
  auditLog: Array<{
    id: string;
    createdAt: string;
    action: string;
    entityType: string;
    entityId: string;
    actor: { email: string } | null;
  }>;
}) {
  const { adminSummary, auditLog } = props;
  return (
    <section className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl bg-white p-5 shadow-sm md:col-span-2">
        <h2 className="text-lg font-semibold text-slate-900">Admin overview</h2>
        {adminSummary && (
          <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-4">
            <li className="rounded-lg bg-slate-50 px-3 py-2">Total: <strong>{adminSummary.total}</strong></li>
            <li className="rounded-lg bg-emerald-50 px-3 py-2">Cleared: <strong>{adminSummary.fullyCleared}</strong></li>
            <li className="rounded-lg bg-amber-50 px-3 py-2">Active pipeline: <strong>{adminSummary.inProgress}</strong></li>
            <li className="rounded-lg bg-red-50 px-3 py-2">Paused (rejected): <strong>{adminSummary.pausedRejected}</strong></li>
          </ul>
        )}
      </div>
      <div className="rounded-xl bg-white p-5 shadow-sm md:col-span-2">
        <h2 className="text-lg font-semibold text-slate-900">Audit log (recent)</h2>
        <div className="mt-3 max-h-80 overflow-auto rounded border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50">
              <tr className="text-slate-600">
                <th className="px-2 py-2">When</th>
                <th className="px-2 py-2">Actor</th>
                <th className="px-2 py-2">Action</th>
                <th className="px-2 py-2">Entity</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 text-slate-800">
                  <td className="px-2 py-1.5 whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</td>
                  <td className="px-2 py-1.5">{a.actor?.email ?? '—'}</td>
                  <td className="px-2 py-1.5">{a.action}</td>
                  <td className="px-2 py-1.5 font-mono text-[10px]">{a.entityType}:{a.entityId.slice(0, 8)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
          {auditLog.length === 0 && <p className="p-4 text-sm text-slate-500">No audit entries yet.</p>}
        </div>
      </div>
    </section>
  );
}

