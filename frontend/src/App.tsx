import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "./api";
import { StudentDashboard } from "./components/StudentDashboard";
import { AdminPanel } from "./components/AdminPanel";
import { DepartmentDashboardWrapper } from "./components/DepartmentDashboardWrapper";
import CertificateVerification from "./components/CertificateVerification";

type Step = {
  id: string;
  stepOrder: number;
  department: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  comment: string;
  reviewedAt?: string;
  createdAt?: string;
};

type UserRole = "STUDENT" | "STAFF" | "ADMIN";

type AuthState = {
  role: UserRole;
  email: string;
  displayName: string | null;
  staffDepartment?: string; // For STAFF role - which department they belong to
};

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

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
  const [sessionLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");

  // Check if we're on the public verification page
  const isVerificationPage = window.location.pathname === "/verify";
  const navigate = useNavigate();
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
        // Transform backend data to match frontend Step type
        const transformedSteps = c.steps.map(
          (s: Step & { reviewedAt: string | null }) => ({
            ...s,
            reviewedAt: s.reviewedAt || undefined,
          }),
        );
        setSteps(transformedSteps);
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
        stepId: rejectedStep.id,
        message: recheckMessage.trim(),
      });
      setRecheckMessage("");
      await loadStudent();
      // Show success message
      setError(
        "Re-check request sent successfully! The department will review your submission.",
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Re-check failed";
      const apiError = error as ApiError;
      const responseMessage = apiError?.response?.data?.message;
      const finalMessage = responseMessage || errorMessage;

      if (finalMessage.includes("current rejected step")) {
        setError("You can only request recheck for the current rejected step.");
      } else if (finalMessage.includes("only for rejected steps")) {
        setError("Re-check is only available for rejected steps.");
      } else {
        setError(`Re-check failed: ${finalMessage}`);
      }
    }
  };

  // Department review functionality moved to DepartmentDashboardWrapper

  // Show public verification page without authentication
  if (isVerificationPage) {
    return <CertificateVerification />;
  }

  if (sessionLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full animate-pulse"></div>
            <p className="text-slate-600 font-medium">Loading session…</p>
          </div>
        </div>
      </main>
    );
  }

  if (!auth) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-12 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4">
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
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                BHU Student Clearance
              </h1>
              <p className="text-blue-100 text-lg">
                Sign in with your university account
              </p>
            </div>

            <div className="p-8">
              {/* Development mode toggle */}
              <div className="flex items-center gap-3 mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  id="quickLogin"
                  checked={quickLogin}
                  onChange={(e) => setQuickLogin(e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                />
                <label
                  htmlFor="quickLogin"
                  className="text-sm font-medium text-amber-800"
                >
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
                  Quick Login (Development Mode)
                </label>
              </div>

              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
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
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-18 0 9 9 0 009 9zm4.5-1.5h.01"
                      />
                    </svg>
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                    placeholder={
                      quickLogin ? "Enter email to login" : "Enter your email"
                    }
                  />
                </div>

                {!quickLogin && (
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-semibold text-slate-700 mb-2"
                    >
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
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      onKeyDown={(e) => e.key === "Enter" && void login()}
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-red-600 mt-0.5"
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
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </div>
                </div>
              )}

              <div className="mt-8 space-y-3">
                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  disabled={loading || !loginEmail.trim()}
                  onClick={() => void login()}
                >
                  {loading ? (
                    <>
                      <svg
                        className="w-5 h-5 animate-spin"
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
                      Signing in…
                    </>
                  ) : (
                    <>
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
                          d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                        />
                      </svg>
                      {quickLogin ? "Quick Sign In" : "Sign In"}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-4 text-lg font-semibold text-slate-700 hover:bg-slate-50 transition-all duration-200"
                  onClick={() => navigate("/verify")}
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
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Verify Certificate
                </button>
              </div>

              <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-600 text-center">
                  {quickLogin ? (
                    <>
                      <span className="font-semibold">Demo emails:</span>
                      <div className="mt-2 space-y-1">
                        <code className="block bg-white px-2 py-1 rounded border border-slate-200 text-blue-600 font-mono">
                          student@bhu.edu.et
                        </code>
                        <code className="block bg-white px-2 py-1 rounded border border-slate-200 text-blue-600 font-mono">
                          library@bhu.edu.et
                        </code>
                        <code className="block bg-white px-2 py-1 rounded border border-slate-200 text-blue-600 font-mono">
                          admin@bhu.edu.et
                        </code>
                      </div>
                    </>
                  ) : (
                    "Use your university email and password to sign in."
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Professional Sidebar */}
      <aside className="w-80 bg-white/95 backdrop-blur-xl border-r border-slate-200/60 shadow-2xl hidden lg:block">
        <div className="h-full flex flex-col">
          {/* Logo & Brand */}
          <div className="p-8 border-b border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-blue-50/50">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-4 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:rotate-3">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  BHU Clearance
                </h1>
                <p className="text-sm text-slate-600 font-medium">
                  Management System
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-6 space-y-2">
            <div className="space-y-2">
              <div className="px-4 py-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                  Main Menu
                </p>
              </div>
              <div className="px-4 py-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/60 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl p-2.5 shadow-md hover:shadow-lg transition-all duration-300">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-blue-800">
                    {auth.role === "STUDENT" && "Student Dashboard"}
                    {auth.role === "STAFF" && "Staff Dashboard"}
                    {auth.role === "ADMIN" && "Admin Dashboard"}
                  </span>
                </div>
              </div>

              {auth.role === "STUDENT" && (
                <button
                  onClick={() => navigate("/verify")}
                  className="w-full px-4 py-4 rounded-2xl hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 transition-all duration-300 group border border-transparent hover:border-slate-200/60 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 group-hover:bg-slate-200 rounded-xl p-2 transition-all duration-300">
                      <svg
                        className="w-5 h-5 text-slate-500 group-hover:text-slate-700 transition-colors"
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
                    <span className="text-sm font-semibold text-slate-600 group-hover:text-slate-900 transition-colors">
                      Verify Certificate
                    </span>
                  </div>
                </button>
              )}
            </div>
          </nav>

          {/* User Profile */}
          <div className="p-6 border-t border-slate-200/60 bg-gradient-to-br from-slate-50/50 to-blue-50/50">
            <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50 rounded-2xl p-6 border border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02]">
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-gradient-to-br from-slate-200 to-slate-300 rounded-full p-3 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-110">
                  <svg
                    className="w-6 h-6 text-slate-600"
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {auth.displayName || auth.email}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {auth.email}
                  </p>
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-200/60 shadow-sm">
                      {auth.role}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-gradient-to-r hover:from-slate-50 hover:to-slate-100 transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-1 hover:border-slate-300/80"
                onClick={() => void logout()}
              >
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
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-slate-200/60 hover:shadow-3xl transition-all duration-300 hover:scale-105 hover:-translate-y-1 active:scale-95">
          <svg
            className="w-6 h-6 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation Bar */}
        <header className="bg-white/95 backdrop-blur-xl border-b border-slate-200/60 shadow-lg">
          <div className="px-4 sm:px-8 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                  {auth.role === "STUDENT" && "Student Dashboard"}
                  {auth.role === "STAFF" &&
                    `Staff Dashboard - ${auth.staffDepartment}`}
                  {auth.role === "ADMIN" && "Administrator Dashboard"}
                </h2>
                <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-base font-medium">
                  {new Date().toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="hidden xs:flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-600 bg-gradient-to-r from-slate-50 to-blue-50 px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-slate-200/60 shadow-md">
                  <svg
                    className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500"
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
                  <span className="font-mono font-semibold hidden sm:inline">
                    {new Date().toLocaleTimeString()}
                  </span>
                  <span className="font-mono font-semibold sm:hidden">
                    {new Date().toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <button className="relative p-2 sm:p-3 rounded-xl hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border border-transparent hover:border-slate-200/60 active:scale-95">
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
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {notifs.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-3 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-4">
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
              <DepartmentDashboardWrapper
                departmentName={auth.staffDepartment}
              />
            )}

            {auth.role === "ADMIN" && (
              <AdminPanel adminSummary={adminSummary} auditLog={auditLog} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
