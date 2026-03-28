import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { StudentDashboard } from "./components/StudentDashboard";
import { AdminPanel } from "./components/AdminPanel";
import { DepartmentDashboardWrapper } from "./components/DepartmentDashboardWrapper";

type Step = {
  stepOrder: number;
  department: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comment: string;
  reviewedAt: string | null;
};

type UserRole = "STUDENT" | "STAFF" | "ADMIN";

type AuthState = {
  role: UserRole;
  email: string;
  displayName: string | null;
  staffDepartment?: string; // For STAFF role - which department they belong to
};

function badge(status: Step["status"]) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-700";
  if (status === "REJECTED") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

// ============================================================================
// DEPARTMENT DASHBOARD ROUTER - Renders the appropriate department dashboard
// ============================================================================

// Note: This is now replaced by DepartmentDashboardWrapper which uses the new
// department-specific dashboard architecture

function App() {
  const [auth, setAuth] = useState<AuthState | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickLogin, setQuickLogin] = useState(true); // Development quick login mode

  const [steps, setSteps] = useState<Step[]>([]);
  const [studentMeta, setStudentMeta] = useState<{
    name: string;
    studentId: string | null;
    department: string | null;
    year: string | null;
  } | null>(null);
  const [clearanceStatus, setClearanceStatus] = useState<string>("");
  const [referenceId, setReferenceId] = useState("");
  const [clearanceId, setClearanceId] = useState<string | null>(null);
  const [canCert, setCanCert] = useState(false);
  const [notifs, setNotifs] = useState<
    Array<{ id: string; title: string; body: string; createdAt: string }>
  >([]);

  const [adminSummary, setAdminSummary] = useState<{
    total: number;
    fullyCleared: number;
    pausedRejected: number;
    inProgress: number;
  } | null>(null);
  const [auditLog, setAuditLog] = useState<
    Array<{
      id: string;
      createdAt: string;
      action: string;
      entityType: string;
      entityId: string;
      actor: { email: string } | null;
    }>
  >([]);

  const [recheckMessage, setRecheckMessage] = useState("");

  const approved = useMemo(
    () => steps.filter((s) => s.status === "APPROVED").length,
    [steps],
  );
  const progress = Math.round((approved / 13) * 100);
  const rejectedStep = useMemo(
    () => steps.find((s) => s.status === "REJECTED"),
    [steps],
  );

  // Load auth state from sessionStorage on app start
  useEffect(() => {
    const savedAuth = sessionStorage.getItem("authState");
    if (savedAuth) {
      try {
        const parsedAuth = JSON.parse(savedAuth);
        setAuth(parsedAuth);
      } catch {
        sessionStorage.removeItem("authState");
      }
    }
  }, []);

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout errors; we still clear local session.
    }
    setAuth(null);
    sessionStorage.removeItem("authState");
    setSteps([]);
    setStudentMeta(null);
    setClearanceId(null);
  };

  const login = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = quickLogin ? "/auth/quick-login" : "/auth/login";
      const payload = quickLogin
        ? { email: loginEmail.trim() }
        : { email: loginEmail.trim(), password: loginPassword };

      const { data } = await api.post(endpoint, payload);
      console.log("Login response:", data); // Debug: see actual response structure

      // API returns wrapped response: { success, data: { access_token, user } }
      const responseData = data.data || data;

      if (!responseData.user) {
        console.error(
          "Invalid response structure - missing user:",
          responseData,
        );
        throw new Error("Invalid server response: user data missing");
      }

      setAuth({
        role: responseData.user.role as UserRole,
        email: responseData.user.email,
        displayName: responseData.user.displayName,
        staffDepartment: responseData.user.staffDepartment,
      });
      // Save auth state to sessionStorage
      sessionStorage.setItem(
        "authState",
        JSON.stringify({
          role: responseData.user.role as UserRole,
          email: responseData.user.email,
          displayName: responseData.user.displayName,
          staffDepartment: responseData.user.staffDepartment,
        }),
      );
      setLoginPassword("");
    } catch (e: unknown) {
      const axiosError = e as {
        userMessage?: string;
        response?: { data?: { message?: string } };
        message?: string;
      };
      const errorMsg =
        axiosError.userMessage ||
        axiosError.response?.data?.message ||
        axiosError.message ||
        "Unknown error";
      console.error("Login error:", errorMsg, e);
      setError(`Login failed: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const loadStudent = useCallback(async () => {
    if (!auth || auth.role !== "STUDENT") return;
    setLoading(true);
    setError(null);
    try {
      const [dash, n] = await Promise.all([
        api.get("/student/clearances/dashboard"),
        api.get("/notifications"),
      ]);
      // Handle wrapped responses: { data: { ... } } or direct { ... }
      const dashData = dash.data.data || dash.data;
      const s = dashData.student;
      setStudentMeta({
        name: s.name ?? s.email,
        studentId: s.studentUniversityId,
        department: s.studentDepartment,
        year: s.studentYear,
      });
      const c = dashData.clearance;
      if (c) {
        setSteps(c.steps);
        setClearanceStatus(c.status);
        setReferenceId(c.referenceId);
        setClearanceId(c.id);
        setCanCert(dashData.canDownloadCertificate);
      } else {
        setSteps([]);
        setClearanceStatus("");
        setReferenceId("");
        setClearanceId(null);
        setCanCert(false);
      }
      // Handle wrapped notifications response
      const notifsData = n.data.data || n.data;
      setNotifs(Array.isArray(notifsData) ? notifsData : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load student data");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const loadStaff = useCallback(async () => {
    if (!auth || auth.role !== "STAFF") return;
    // Staff data is now loaded by DepartmentDashboardWrapper
    setNotifs([]);
  }, [auth]);

  const loadAdmin = useCallback(async () => {
    if (!auth || auth.role !== "ADMIN") return;
    setLoading(true);
    setError(null);
    try {
      const [sum, audit] = await Promise.all([
        api.get("/admin/reports/summary"),
        api.get("/admin/audit"),
      ]);
      // Handle wrapped responses: { data: { ... } } or direct { ... }
      const summaryData = sum.data.data || sum.data;
      const auditData = audit.data.data || audit.data;
      setAdminSummary(summaryData);
      setAuditLog(Array.isArray(auditData) ? auditData : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    if (auth.role === "STUDENT") void loadStudent();
    else if (auth.role === "STAFF") void loadStaff();
    else if (auth.role === "ADMIN") void loadAdmin();
  }, [auth, loadStudent, loadStaff, loadAdmin]);

  const createDraft = async () => {
    setError(null);
    try {
      await api.post("/student/clearances");
      await loadStudent();
    } catch {
      setError(
        "Could not create draft (you may already have an active clearance).",
      );
    }
  };

  const submitClearance = async () => {
    if (!clearanceId) return;
    setError(null);
    try {
      await api.post(`/student/clearances/${clearanceId}/submit`);
      await loadStudent();
    } catch {
      setError("Submit failed (must be in DRAFT).");
    }
  };

  const downloadCertificatePdf = async () => {
    setError(null);
    try {
      if (!clearanceId) {
        setError("No clearance selected.");
        return;
      }
      const res = await api.get(
        `/student/clearance/${clearanceId}/certificate/pdf`,
        {
          responseType: "blob",
        },
      );
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "clearance-certificate.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Certificate is only available after full clearance.");
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
      setRecheckMessage("");
      await loadStudent();
    } catch {
      setError("Re-check failed (rejected steps only).");
    }
  };

  const handleDepartmentReview = async () => {
    // This function is now handled by DepartmentDashboardWrapper
    // Department review functionality moved to specialized dashboard
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
          <h1 className="text-xl font-bold text-slate-900">
            BHU Student Clearance
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in with your university account.
          </p>

          {/* Development mode toggle */}
          <div className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="quickLogin"
              checked={quickLogin}
              onChange={(e) => setQuickLogin(e.target.checked)}
              className="rounded border-slate-200"
            />
            <label htmlFor="quickLogin" className="text-xs text-slate-600">
              Quick Login (No Password - Development Only)
            </label>
          </div>

          <label className="mt-4 block text-xs font-medium text-slate-600">
            Email
          </label>
          <input
            className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            autoComplete="email"
            placeholder={
              quickLogin ? "Enter email to login" : "Enter your email"
            }
          />

          {!quickLogin && (
            <>
              <label className="mt-3 block text-xs font-medium text-slate-600">
                Password
              </label>
              <input
                type="password"
                className="mt-1 w-full rounded border border-slate-200 p-2 text-sm"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                autoComplete="current-password"
                onKeyDown={(e) => e.key === "Enter" && void login()}
              />
            </>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={loading || !loginEmail.trim()}
            onClick={() => void login()}
          >
            {loading ? "Signing in…" : quickLogin ? "Quick Sign In" : "Sign In"}
          </button>

          <p className="mt-4 text-xs text-slate-500">
            {quickLogin ? (
              <>
                Demo emails:{" "}
                <code className="rounded bg-slate-100 px-1">
                  student@bhu.edu.et
                </code>
                ,{" "}
                <code className="rounded bg-slate-100 px-1">
                  library@bhu.edu.et
                </code>
                ,{" "}
                <code className="rounded bg-slate-100 px-1">
                  admin@bhu.edu.et
                </code>
              </>
            ) : (
              <>Use your university email and password to sign in.</>
            )}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-4 md:p-8">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">
            BHU Student Clearance
          </h1>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700"
            onClick={() => void logout()}
          >
            Sign out
          </button>
        </div>
      </div>
      {auth.role === "STUDENT" && (
        <StudentDashboard
          loading={loading}
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

      {auth.role === "STAFF" && auth.staffDepartment && (
        <DepartmentDashboardWrapper departmentName={auth.staffDepartment} />
      )}

      {auth.role === "ADMIN" && (
        <AdminPanel adminSummary={adminSummary} auditLog={auditLog} />
      )}
    </main>
  );
}

export default App;
