import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { StudentDashboard } from './components/StudentDashboard';
import { StaffDashboard } from './components/StaffDashboard';
import { AdminPanel } from './components/AdminPanel';

type Step = {
  stepOrder: number;
  department: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment: string;
  reviewedAt: string | null;
};

type UserRole = 'STUDENT' | 'STAFF' | 'ADMIN';

type AuthState = {
  role: UserRole;
  email: string;
  displayName: string | null;
};

function badge(status: Step['status']) {
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'REJECTED') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [steps, setSteps] = useState<Step[]>([]);
  const [studentMeta, setStudentMeta] = useState<{
    name: string;
    studentId: string | null;
    department: string | null;
    year: string | null;
  } | null>(null);
  const [clearanceStatus, setClearanceStatus] = useState<string>('');
  const [referenceId, setReferenceId] = useState('');
  const [clearanceId, setClearanceId] = useState<string | null>(null);
  const [canCert, setCanCert] = useState(false);
  const [notifs, setNotifs] = useState<Array<{ id: string; title: string; body: string; createdAt: string }>>([]);

  const [pendingRows, setPendingRows] = useState<
    Array<{ requestId: string; referenceId: string; studentUserId: string; student?: Record<string, unknown>; step: Step }>
  >([]);
  const [staffComment, setStaffComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectInstruction, setRejectInstruction] = useState('');

  const [adminSummary, setAdminSummary] = useState<{
    total: number;
    fullyCleared: number;
    pausedRejected: number;
    inProgress: number;
  } | null>(null);
  const [auditLog, setAuditLog] = useState<
    Array<{ id: string; createdAt: string; action: string; entityType: string; entityId: string; actor: { email: string } | null }>
  >([]);

  const [recheckMessage, setRecheckMessage] = useState('');

  const approved = useMemo(() => steps.filter((s) => s.status === 'APPROVED').length, [steps]);
  const progress = Math.round((approved / 13) * 100);
  const rejectedStep = useMemo(() => steps.find((s) => s.status === 'REJECTED'), [steps]);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors; we still clear local session.
    }
    setAuth(null);
    setSteps([]);
    setStudentMeta(null);
    setClearanceId(null);
  };

  useEffect(() => {
    void api
      .get('/auth/me')
      .then(({ data }) => {
        setAuth({
          role: data.role as UserRole,
          email: data.email,
          displayName: data.displayName,
        });
      })
      .catch(() => setAuth(null))
      .finally(() => setSessionLoading(false));
  }, []);

  const login = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', {
        email: loginEmail.trim(),
        password: loginPassword,
      });
      setAuth({
        role: data.user.role as UserRole,
        email: data.user.email,
        displayName: data.user.displayName,
      });
      setLoginPassword('');
    } catch {
      setError('Login failed. Check email and password.');
    } finally {
      setLoading(false);
    }
  };

  const loadStudent = useCallback(async () => {
    if (!auth || auth.role !== 'STUDENT') return;
    setLoading(true);
    setError(null);
    try {
      const [dash, n] = await Promise.all([
        api.get('/student/clearances/dashboard'),
        api.get('/notifications'),
      ]);
      const s = dash.data.student;
      setStudentMeta({
        name: s.name ?? s.email,
        studentId: s.studentUniversityId,
        department: s.studentDepartment,
        year: s.studentYear,
      });
      const c = dash.data.clearance;
      if (c) {
        setSteps(c.steps);
        setClearanceStatus(c.status);
        setReferenceId(c.referenceId);
        setClearanceId(c.id);
        setCanCert(dash.data.canDownloadCertificate);
      } else {
        setSteps([]);
        setClearanceStatus('');
        setReferenceId('');
        setClearanceId(null);
        setCanCert(false);
      }
      setNotifs(n.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const loadStaff = useCallback(async () => {
    if (!auth || auth.role !== 'STAFF') return;
    setLoading(true);
    setError(null);
    try {
      const [pend, n] = await Promise.all([api.get('/staff/clearances/pending'), api.get('/notifications')]);
      setPendingRows(pend.data);
      setNotifs(n.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load staff queue');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const loadAdmin = useCallback(async () => {
    if (!auth || auth.role !== 'ADMIN') return;
    setLoading(true);
    setError(null);
    try {
      const [sum, audit] = await Promise.all([api.get('/admin/reports/summary'), api.get('/admin/audit')]);
      setAdminSummary(sum.data);
      setAuditLog(audit.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    if (auth.role === 'STUDENT') void loadStudent();
    else if (auth.role === 'STAFF') void loadStaff();
    else if (auth.role === 'ADMIN') void loadAdmin();
  }, [auth, loadStudent, loadStaff, loadAdmin]);

  const createDraft = async () => {
    setError(null);
    try {
      await api.post('/student/clearances');
      await loadStudent();
    } catch {
      setError('Could not create draft (you may already have an active clearance).');
    }
  };

  const submitClearance = async () => {
    if (!clearanceId) return;
    setError(null);
    try {
      await api.post(`/student/clearances/${clearanceId}/submit`);
      await loadStudent();
    } catch {
      setError('Submit failed (must be in DRAFT).');
    }
  };

  const downloadCertificatePdf = async () => {
    setError(null);
    try {
      if (!clearanceId) {
        setError('No clearance selected.');
        return;
      }
      const res = await api.get(`/student/clearance/${clearanceId}/certificate/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'clearance-certificate.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Certificate is only available after full clearance.');
    }
  };

  const submitRecheck = async () => {
    if (!rejectedStep || !recheckMessage.trim() || !clearanceId) return;
    setError(null);
    try {
      await api.post(`/student/clearances/${clearanceId}/recheck`, {
        stepOrder: rejectedStep.stepOrder,
        message: recheckMessage.trim(),
      });
      setRecheckMessage('');
      await loadStudent();
    } catch {
      setError('Re-check failed (rejected steps only).');
    }
  };

  const review = async (status: 'APPROVED' | 'REJECTED') => {
    const row = pendingRows[0];
    if (!row) return;
    if (!staffComment.trim() || staffComment.trim().length < 2) {
      setError('Approval/rejection requires a comment (min 2 characters).');
      return;
    }
    if (status === 'REJECTED' && (!rejectReason.trim() || !rejectInstruction.trim())) {
      setError('Rejection requires both reason and instruction.');
      return;
    }
    setError(null);
    try {
      await api.patch(`/staff/clearances/${row.requestId}/steps/${row.step.stepOrder}/review`, {
        status,
        comment: staffComment.trim(),
        reason: status === 'REJECTED' ? rejectReason.trim() : undefined,
        instruction: status === 'REJECTED' ? rejectInstruction.trim() : undefined,
      });
      setStaffComment('');
      setRejectReason('');
      setRejectInstruction('');
      await loadStaff();
    } catch {
      setError('Review failed — check step order and permissions.');
    }
  };

  if (sessionLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-slate-600">
        <p className="text-sm">Loading session…</p>
      </main>
    );
  }

  if (!auth) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">BHU Student Clearance</h1>
          <p className="mt-1 text-sm text-slate-600">Sign in with your university account.</p>
          <label className="mt-4 block text-xs font-medium text-slate-600">Email</label>
          <input
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            autoComplete="email"
          />
          <label className="mt-3 block text-xs font-medium text-slate-600">Password</label>
          <input
            type="password"
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            autoComplete="current-password"
            onKeyDown={(e) => e.key === 'Enter' && void login()}
          />
          {error && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={loading}
            onClick={() => void login()}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <p className="mt-4 text-xs text-slate-500">
            Demo: seed creates <code className="rounded bg-slate-100 px-1">student@bhu.edu.et</code>,{' '}
            <code className="rounded bg-slate-100 px-1">library@bhu.edu.et</code>,{' '}
            <code className="rounded bg-slate-100 px-1">admin@bhu.edu.et</code> (see backend seed output).
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-4 md:p-8">
      <header className="mb-6 rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">BHU Student Clearance</h1>
            <p className="mt-1 text-sm text-slate-600">
              Signed in as <strong>{auth.displayName ?? auth.email}</strong> ({auth.role})
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
            onClick={() => void logout()}
          >
            Sign out
          </button>
        </div>
        {loading && <p className="mt-3 text-sm text-slate-500">Loading…</p>}
        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        )}
      </header>

      {auth.role === 'STUDENT' && (
        <StudentDashboard
          studentMeta={studentMeta}
          clearanceId={clearanceId}
          clearanceStatus={clearanceStatus}
          referenceId={referenceId}
          approved={approved}
          progress={progress}
          steps={steps}
          notifs={notifs}
          recheckMessage={recheckMessage}
          setRecheckMessage={setRecheckMessage}
          canCert={canCert}
          rejectedStep={rejectedStep}
          onCreateDraft={() => void createDraft()}
          onSubmitClearance={() => void submitClearance()}
          onSubmitRecheck={() => void submitRecheck()}
          onDownloadCertificatePdf={() => void downloadCertificatePdf()}
          badgeClass={badge}
        />
      )}

      {auth.role === 'STAFF' && (
        <StaffDashboard
          notifs={notifs}
          pendingRows={pendingRows}
          staffComment={staffComment}
          setStaffComment={setStaffComment}
          rejectReason={rejectReason}
          setRejectReason={setRejectReason}
          rejectInstruction={rejectInstruction}
          setRejectInstruction={setRejectInstruction}
          onApprove={() => void review('APPROVED')}
          onReject={() => void review('REJECTED')}
        />
      )}

      {auth.role === 'ADMIN' && <AdminPanel adminSummary={adminSummary} auditLog={auditLog} />}
    </main>
  );
}

export default App;
