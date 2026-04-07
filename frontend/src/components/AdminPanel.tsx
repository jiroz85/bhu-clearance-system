import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";

type ReportsData = {
  totalClearances: number;
  fullyCleared: number;
  inProgress: number;
  pausedRejected: number;
  draft: number;
  cancelled: number;
  completionRate: number;
  averageProcessingTimeDays: number;
  rejectionRateByDepartment: Array<{
    department: string;
    total: number;
    rejected: number;
    rejectionRate: number;
  }>;
  bottleneckDepartments: Array<{
    department: string;
    averageTimeDays: number;
    pendingCount: number;
    totalProcessed: number;
  }>;
  monthlyTrends: Array<{
    month: string;
    started: number;
    completed: number;
    averageTimeDays: number;
  }>;
  _meta?: {
    generatedAt: string;
    processingTimeMs: number;
    cacheExpiry: string;
  };
};

type User = {
  id: string;
  email: string;
  role: "STUDENT" | "STAFF" | "ADMIN";
  displayName: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  staffDepartment: string | null;
  studentUniversityId: string | null;
  studentDepartment: string | null;
  studentYear: string | null;
  createdAt: string;
  updatedAt: string;
};

type UsersResponse = {
  success: boolean;
  statusCode: number;
  message: string;
  data: {
    users: User[];
    total: number;
    skip: number;
    take: number;
  };
  timestamp: string;
  path: string;
};

type CreateUserDto = {
  email: string;
  password: string;
  displayName: string;
  role: "STUDENT" | "STAFF";
  staffDepartment?: string;
  studentUniversityId?: string;
  studentDepartment?: string;
  studentYear?: string;
};

type UpdateUserDto = Partial<CreateUserDto> & {
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
};

type BulkImportUserDto = {
  email: string;
  displayName: string;
  role: "STUDENT" | "STAFF";
  staffDepartment?: string;
  studentUniversityId?: string;
  studentDepartment?: string;
  studentYear?: string;
};

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
  const [searchParams, setSearchParams] = useSearchParams();

  // User Management State
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "reports">(
    "overview",
  );

  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl === "users" || tabFromUrl === "reports") {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab: "overview" | "users" | "reports") => {
    setActiveTab(tab);
    if (tab === "overview") {
      searchParams.delete("tab");
    } else {
      searchParams.set("tab", tab);
    }
    setSearchParams(searchParams);
  };
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);

  // Pagination and filters
  const [skip, setSkip] = useState(0);
  const [take] = useState(20);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "ALL" | "STUDENT" | "STAFF" | "ADMIN"
  >("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "INACTIVE" | "SUSPENDED"
  >("ALL");

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  const [bulkImportResult, setBulkImportResult] = useState<{
    created: number;
    failed: number;
    errors: string[];
  } | null>(null);

  // Reports state
  const [reportsData, setReportsData] = useState<ReportsData | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [lastReportsFetch, setLastReportsFetch] = useState<number>(0);
  const [formData, setFormData] = useState<CreateUserDto>({
    email: "",
    password: "",
    displayName: "",
    role: "STUDENT",
    staffDepartment: "",
    studentUniversityId: "",
    studentDepartment: "",
    studentYear: "",
  });

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const startTime = Date.now();
      const params = new URLSearchParams({
        skip: skip.toString(),
        take: take.toString(),
      });

      if (search) params.append("search", search);
      if (roleFilter !== "ALL") params.append("role", roleFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const { data } = await api.get<UsersResponse>(`/admin/users?${params}`);
      setUsers(data.data?.users || []);
      setUsersTotal(data.data?.total || 0);
      const endTime = Date.now();
      console.log(`Users loaded in ${endTime - startTime}ms`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load users";
      setUsersError(errorMessage);
    } finally {
      setUsersLoading(false);
    }
  }, [skip, take, search, roleFilter, statusFilter]);

  const loadReports = useCallback(async () => {
    // Cache for 2 minutes to reduce server load while keeping data fresh
    const now = Date.now();
    if (reportsData && now - lastReportsFetch < 120000) {
      console.log("Using cached reports data");
      return;
    }

    setReportsLoading(true);
    setReportsError(null);
    try {
      const startTime = Date.now();

      // Add progress simulation for better UX
      const progressTimeout = setTimeout(() => {
        setReportsError(
          "Loading comprehensive analytics... This may take a moment for large datasets.",
        );
      }, 3000);

      const { data } = await api.get("/admin/reports/summary");
      clearTimeout(progressTimeout);

      const endTime = Date.now();
      console.log(`Reports loaded in ${endTime - startTime}ms`);

      // Handle wrapped response: { data: { ... } }
      const reportsResponse = data.data || data;
      setReportsData(reportsResponse);
      setLastReportsFetch(now);

      // Clear any progress message
      setReportsError(null);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load reports";
      setReportsError(errorMessage);
      console.error("Reports loading error:", error);
    } finally {
      setReportsLoading(false);
    }
  }, [reportsData, lastReportsFetch]);

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    } else if (activeTab === "reports") {
      loadReports();
    }
  }, [activeTab, loadUsers, loadReports]);

  const handleCreateUser = async () => {
    try {
      await api.post("/admin/users", formData);
      setShowCreateForm(false);
      setFormData({
        email: "",
        password: "",
        displayName: "",
        role: "STUDENT",
        staffDepartment: "",
        studentUniversityId: "",
        studentDepartment: "",
        studentYear: "",
      });
      loadUsers();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create user";
      setUsersError(errorMessage);
    }
  };

  const handleUpdateUser = async (userId: string, updates: UpdateUserDto) => {
    try {
      await api.patch(`/admin/users/${userId}`, updates);
      setEditingUser(null);
      loadUsers();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update user";
      setUsersError(errorMessage);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      await api.delete(`/admin/users/${userId}`);
      loadUsers();
    } catch (error: unknown) {
      // Use enhanced error message from API interceptor
      const axiosError = error as { userMessage?: string; message?: string };
      const errorMessage =
        axiosError.userMessage || axiosError.message || "Failed to delete user";
      setUsersError(errorMessage);
    }
  };

  const parseCSVFile = (file: File): Promise<BulkImportUserDto[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split("\n").filter((line) => line.trim());
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().toLowerCase());

          const users: BulkImportUserDto[] = [];

          for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(",").map((v) => v.trim());
            const user: Record<string, string> = {};

            headers.forEach((header, index) => {
              const value = values[index] || "";
              switch (header) {
                case "email":
                  user.email = value;
                  break;
                case "displayname":
                case "display_name":
                case "name":
                  user.displayName = value;
                  break;
                case "role":
                  user.role = value.toUpperCase();
                  break;
                case "staffdepartment":
                case "staff_department":
                  user.staffDepartment = value;
                  break;
                case "studentuniversityid":
                case "student_university_id":
                  user.studentUniversityId = value;
                  break;
                case "studentdepartment":
                case "student_department":
                  user.studentDepartment = value;
                  break;
                case "studentyear":
                case "student_year":
                  user.studentYear = value;
                  break;
              }
            });

            if (user.email && user.displayName && user.role) {
              users.push(user);
            }
          }

          resolve(users);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile) return;

    setBulkImportLoading(true);
    setBulkImportResult(null);

    try {
      const users = await parseCSVFile(bulkImportFile);
      const { data } = await api.post<{
        created: number;
        failed: number;
        errors: string[];
      }>("/api/admin/users/bulk-import", {
        users: users as BulkImportUserDto[], // Explicit type cast
      });
      setBulkImportResult(data);
      setShowBulkImport(false);
      setBulkImportFile(null);
      loadUsers();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to import users";
      setUsersError(errorMessage);
    } finally {
      setBulkImportLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-700";
      case "INACTIVE":
        return "bg-slate-100 text-slate-700";
      case "SUSPENDED":
        return "bg-red-100 text-red-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-100 text-purple-700";
      case "STAFF":
        return "bg-blue-100 text-blue-700";
      case "STUDENT":
        return "bg-green-100 text-green-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <section className="space-y-4">
      {/* Tab Navigation */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex space-x-4 border-b border-slate-200">
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === "overview"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => handleTabChange("overview")}
          >
            Overview
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === "users"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => handleTabChange("users")}
          >
            User Management
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === "reports"
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-600 hover:text-slate-900"
            }`}
            onClick={() => handleTabChange("reports")}
          >
            Reports & Analytics
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-5 shadow-sm md:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Admin overview
            </h2>
            {adminSummary && (
              <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-4">
                <li className="rounded-lg bg-slate-50 px-3 py-2">
                  Total: <strong>{adminSummary.total}</strong>
                </li>
                <li className="rounded-lg bg-emerald-50 px-3 py-2">
                  Cleared: <strong>{adminSummary.fullyCleared}</strong>
                </li>
                <li className="rounded-lg bg-amber-50 px-3 py-2">
                  Active pipeline: <strong>{adminSummary.inProgress}</strong>
                </li>
                <li className="rounded-lg bg-red-50 px-3 py-2">
                  Paused (rejected):{" "}
                  <strong>{adminSummary.pausedRejected}</strong>
                </li>
              </ul>
            )}
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm md:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Audit log (recent)
            </h2>
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
                    <tr
                      key={a.id}
                      className="border-t border-slate-100 text-slate-800"
                    >
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5">{a.actor?.email ?? "—"}</td>
                      <td className="px-2 py-1.5">{a.action}</td>
                      <td className="px-2 py-1.5 font-mono text-[10px]">
                        {a.entityType}:{a.entityId.slice(0, 8)}…
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditLog.length === 0 && (
                <p className="p-4 text-sm text-slate-500">
                  No audit entries yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Users Header */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                User Management
              </h2>
              <div className="flex gap-2">
                <button
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => loadUsers()}
                  disabled={usersLoading}
                >
                  🔄 Refresh
                </button>
                <button
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setShowBulkImport(true)}
                >
                  Bulk Import
                </button>
                <button
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  onClick={() => setShowCreateForm(true)}
                >
                  Create User
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                placeholder="Search users..."
                className="rounded border border-slate-200 px-3 py-2 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                className="rounded border border-slate-200 px-3 py-2 text-sm"
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(
                    e.target.value as "ALL" | "STUDENT" | "STAFF" | "ADMIN",
                  )
                }
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Student</option>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
              <select
                className="rounded border border-slate-200 px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | "ALL"
                      | "ACTIVE"
                      | "INACTIVE"
                      | "SUSPENDED",
                  )
                }
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            {/* Users Count */}
            <div className="mt-2 text-sm text-slate-600">
              Showing {users?.length || 0} of {usersTotal} users
            </div>
          </div>

          {/* Users List */}
          <div className="rounded-xl bg-white p-5 shadow-sm">
            {usersLoading && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-3 text-sm text-slate-600">Loading users...</p>
              </div>
            )}
            {usersError && <p className="text-sm text-red-700">{usersError}</p>}

            {!usersLoading && !usersError && (
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200">
                    <tr className="text-left text-slate-600">
                      <th className="pb-2 font-medium">User</th>
                      <th className="pb-2 font-medium">Role</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Department</th>
                      <th className="pb-2 font-medium">Student ID</th>
                      <th className="pb-2 font-medium">Created</th>
                      <th className="pb-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(users || []).map((user) => (
                      <tr key={user.id} className="border-b border-slate-100">
                        <td className="py-3">
                          <div>
                            <div className="font-medium text-slate-900">
                              {user.displayName || user.email}
                            </div>
                            <div className="text-xs text-slate-500">
                              {user.email}
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${roleBadge(user.role)}`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge(user.status)}`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-700">
                          {user.staffDepartment ||
                            user.studentDepartment ||
                            "—"}
                        </td>
                        <td className="py-3 text-slate-700">
                          {user.studentUniversityId || "—"}
                        </td>
                        <td className="py-3 text-slate-700">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              className="text-xs text-blue-600 hover:text-blue-800"
                              onClick={() => setEditingUser(user)}
                            >
                              Edit
                            </button>
                            {user.role !== "ADMIN" && (
                              <button
                                className="text-xs text-red-600 hover:text-red-800"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(users?.length || 0) === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No users found
                  </p>
                )}
              </div>
            )}

            {/* Pagination */}
            {usersTotal > take && (
              <div className="mt-4 flex items-center justify-between">
                <button
                  className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setSkip(Math.max(0, skip - take))}
                  disabled={skip === 0}
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {Math.floor(skip / take) + 1} of{" "}
                  {Math.ceil(usersTotal / take)}
                </span>
                <button
                  className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50"
                  onClick={() => setSkip(skip + take)}
                  disabled={skip + take >= usersTotal}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">
              Create User
            </h3>
            <div className="mt-4 space-y-3">
              <input
                type="email"
                placeholder="Email"
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Display Name"
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={formData.displayName}
                onChange={(e) =>
                  setFormData({ ...formData, displayName: e.target.value })
                }
              />
              <select
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                value={formData.role}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    role: e.target.value as "STUDENT" | "STAFF",
                  })
                }
              >
                <option value="STUDENT">Student</option>
                <option value="STAFF">Staff</option>
              </select>
              {formData.role === "STAFF" && (
                <input
                  type="text"
                  placeholder="Staff Department"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  value={formData.staffDepartment}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      staffDepartment: e.target.value,
                    })
                  }
                />
              )}
              {formData.role === "STUDENT" && (
                <>
                  <input
                    type="text"
                    placeholder="Student University ID"
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                    value={formData.studentUniversityId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        studentUniversityId: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Student Department"
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                    value={formData.studentDepartment}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        studentDepartment: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Student Year"
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                    value={formData.studentYear}
                    onChange={(e) =>
                      setFormData({ ...formData, studentYear: e.target.value })
                    }
                  />
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={handleCreateUser}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">Edit User</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600">
                  Email
                </label>
                <div className="mt-1 rounded border border-slate-200 px-3 py-2 text-sm bg-slate-50">
                  {editingUser.email}
                </div>
              </div>
              <input
                type="text"
                placeholder="Display Name"
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                defaultValue={editingUser.displayName || ""}
                onChange={(e) =>
                  setEditingUser({
                    ...editingUser,
                    displayName: e.target.value,
                  })
                }
              />
              <select
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                defaultValue={editingUser.status}
                onChange={(e) =>
                  setEditingUser({
                    ...editingUser,
                    status: e.target.value as
                      | "ACTIVE"
                      | "INACTIVE"
                      | "SUSPENDED",
                  })
                }
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              {editingUser.role === "STAFF" && (
                <input
                  type="text"
                  placeholder="Staff Department"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  defaultValue={editingUser.staffDepartment || ""}
                  onChange={(e) =>
                    setEditingUser({
                      ...editingUser,
                      staffDepartment: e.target.value,
                    })
                  }
                />
              )}
              {editingUser.role === "STUDENT" && (
                <>
                  <input
                    type="text"
                    placeholder="Student University ID"
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                    defaultValue={editingUser.studentUniversityId || ""}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        studentUniversityId: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Student Department"
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                    defaultValue={editingUser.studentDepartment || ""}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        studentDepartment: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder="Student Year"
                    className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                    defaultValue={editingUser.studentYear || ""}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        studentYear: e.target.value,
                      })
                    }
                  />
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                onClick={() => {
                  const updates: UpdateUserDto = {
                    displayName: editingUser.displayName || undefined,
                    status: editingUser.status,
                    staffDepartment: editingUser.staffDepartment || undefined,
                    studentUniversityId:
                      editingUser.studentUniversityId || undefined,
                    studentDepartment:
                      editingUser.studentDepartment || undefined,
                    studentYear: editingUser.studentYear || undefined,
                  };
                  handleUpdateUser(editingUser.id, updates);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Reports & Analytics
              </h2>
              <div className="flex gap-2">
                <button
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    setLastReportsFetch(0); // Force refresh
                    loadReports();
                  }}
                  disabled={reportsLoading}
                >
                  🔄 Refresh
                </button>
                <button
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (search) params.append("startDate", search);
                    window.open(
                      `/api/reports/export/excel?${params}`,
                      "_blank",
                    );
                  }}
                >
                  📊 Export Excel
                </button>
                <button
                  className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => {
                    const params = new URLSearchParams();
                    if (search) params.append("startDate", search);
                    window.open(`/api/reports/export/pdf?${params}`, "_blank");
                  }}
                >
                  📄 Export PDF
                </button>
              </div>
            </div>
            {reportsLoading && (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-3 text-sm text-slate-600">
                  Loading comprehensive analytics...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {reportsError?.includes("Loading")
                    ? "Processing large dataset..."
                    : "This may take a few seconds"}
                </p>

                {/* Skeleton loading indicators */}
                <div className="mt-6 w-full max-w-2xl space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="rounded-lg bg-slate-100 p-4 animate-pulse"
                      >
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-slate-200 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg bg-slate-100 p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-1/4 mb-3"></div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-3 bg-slate-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {reportsError && (
              <p className="text-sm text-red-700">{reportsError}</p>
            )}
            {reportsData && !reportsLoading && (
              <div className="mt-2 text-xs text-slate-500">
                Last updated:{" "}
                {lastReportsFetch > 0
                  ? new Date(lastReportsFetch).toLocaleTimeString()
                  : "Never"}
                {reportsData?._meta && (
                  <span className="ml-2">
                    • Generated in {reportsData._meta.processingTimeMs}ms
                    {reportsData._meta.cacheExpiry && (
                      <span>
                        • Cache expires:{" "}
                        {new Date(
                          reportsData._meta.cacheExpiry,
                        ).toLocaleTimeString()}
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}

            {reportsData && !reportsLoading && (
              <div className="mt-6 space-y-6">
                {/* Key Metrics */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <h3 className="text-sm font-medium text-slate-600">
                      Total Clearances
                    </h3>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {reportsData?.totalClearances ?? 0}
                    </p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 p-4">
                    <h3 className="text-sm font-medium text-emerald-600">
                      Fully Cleared
                    </h3>
                    <p className="mt-2 text-2xl font-bold text-emerald-700">
                      {reportsData?.fullyCleared ?? 0}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">
                      {reportsData?.completionRate?.toFixed?.(1) ?? 0}%
                      completion rate
                    </p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4">
                    <h3 className="text-sm font-medium text-blue-600">
                      Avg Processing Time
                    </h3>
                    <p className="mt-2 text-2xl font-bold text-blue-700">
                      {reportsData?.averageProcessingTimeDays?.toFixed?.(1) ??
                        0}{" "}
                      days
                    </p>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div>
                  <h3 className="text-md font-medium text-slate-900 mb-3">
                    Clearance Status Breakdown
                  </h3>
                  <div className="grid gap-3 md:grid-cols-5">
                    <div className="rounded-lg bg-white border border-slate-200 p-3">
                      <div className="text-xs text-slate-600">In Progress</div>
                      <div className="text-lg font-bold text-blue-600">
                        {reportsData?.inProgress ?? 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-3">
                      <div className="text-xs text-slate-600">
                        Paused/Rejected
                      </div>
                      <div className="text-lg font-bold text-red-600">
                        {reportsData?.pausedRejected ?? 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-3">
                      <div className="text-xs text-slate-600">Draft</div>
                      <div className="text-lg font-bold text-slate-600">
                        {reportsData?.draft ?? 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-3">
                      <div className="text-xs text-slate-600">Cancelled</div>
                      <div className="text-lg font-bold text-slate-600">
                        {reportsData?.cancelled ?? 0}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white border border-slate-200 p-3">
                      <div className="text-xs text-slate-600">Total</div>
                      <div className="text-lg font-bold text-slate-900">
                        {reportsData?.totalClearances ?? 0}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Department Rejection Rates */}
                <div>
                  <h3 className="text-md font-medium text-slate-900 mb-3">
                    Department Rejection Rates
                  </h3>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-200">
                        <tr className="text-left text-slate-600">
                          <th className="pb-2 font-medium">Department</th>
                          <th className="pb-2 font-medium">Total</th>
                          <th className="pb-2 font-medium">Rejected</th>
                          <th className="pb-2 font-medium">Rejection Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsData?.rejectionRateByDepartment
                          ?.slice(0, 10)
                          ?.map(
                            (
                              dept: {
                                department: string;
                                total: number;
                                rejected: number;
                                rejectionRate: number;
                              },
                              index: number,
                            ) => (
                              <tr
                                key={index}
                                className="border-b border-slate-100"
                              >
                                <td className="py-2 font-medium">
                                  {dept.department ?? "Unknown"}
                                </td>
                                <td className="py-2">{dept.total ?? 0}</td>
                                <td className="py-2 text-red-600">
                                  {dept.rejected ?? 0}
                                </td>
                                <td className="py-2">
                                  <span
                                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                                      (dept.rejectionRate ?? 0) > 20
                                        ? "bg-red-100 text-red-700"
                                        : (dept.rejectionRate ?? 0) > 10
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    {dept.rejectionRate?.toFixed?.(1) ?? 0}%
                                  </span>
                                </td>
                              </tr>
                            ),
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Monthly Trends */}
                <div>
                  <h3 className="text-md font-medium text-slate-900 mb-3">
                    Monthly Trends
                  </h3>
                  <div className="overflow-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-200">
                        <tr className="text-left text-slate-600">
                          <th className="pb-2 font-medium">Month</th>
                          <th className="pb-2 font-medium">Started</th>
                          <th className="pb-2 font-medium">Completed</th>
                          <th className="pb-2 font-medium">Avg Time (Days)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsData?.monthlyTrends
                          ?.slice(-12)
                          ?.reverse()
                          ?.map(
                            (
                              trend: {
                                month: string;
                                started: number;
                                completed: number;
                                averageTimeDays: number;
                              },
                              index: number,
                            ) => (
                              <tr
                                key={index}
                                className="border-b border-slate-100"
                              >
                                <td className="py-2 font-medium">
                                  {new Date(
                                    trend.month + "-01",
                                  ).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                  })}
                                </td>
                                <td className="py-2">{trend.started ?? 0}</td>
                                <td className="py-2 text-green-600">
                                  {trend.completed ?? 0}
                                </td>
                                <td className="py-2">
                                  {trend.averageTimeDays?.toFixed?.(1) ?? 0}
                                </td>
                              </tr>
                            ),
                          )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Department Performance */}
                <div>
                  <h3 className="text-md font-medium text-slate-900 mb-3">
                    Department Performance Overview
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {reportsData?.bottleneckDepartments?.slice(0, 6)?.map(
                      (
                        dept: {
                          department: string;
                          averageTimeDays: number;
                          pendingCount: number;
                          totalProcessed: number;
                        },
                        index: number,
                      ) => (
                        <div
                          key={index}
                          className="rounded-lg border border-slate-200 p-3"
                        >
                          <div className="font-medium text-slate-900 text-sm">
                            {dept.department ?? "Unknown"}
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-600">Avg Time:</span>
                              <span className="font-medium">
                                {dept.averageTimeDays?.toFixed?.(1) ?? 0} days
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-600">Pending:</span>
                              <span className="font-medium text-amber-600">
                                {dept.pendingCount ?? 0}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-600">Processed:</span>
                              <span className="font-medium text-green-600">
                                {dept.totalProcessed ?? 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-slate-900">
              Bulk Import Users
            </h3>
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-slate-50 p-4">
                <h4 className="font-medium text-slate-900">CSV Format:</h4>
                <p className="mt-2 text-xs text-slate-600">
                  Upload a CSV file with the following columns:
                </p>
                <div className="mt-2 text-xs font-mono text-slate-700">
                  email,displayName,role,staffDepartment,studentUniversityId,studentDepartment,studentYear
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  <strong>Required:</strong> email, displayName, role
                  <br />
                  <strong>Optional:</strong> staffDepartment (for STAFF),
                  studentUniversityId, studentDepartment, studentYear (for
                  STUDENTS)
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv"
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm"
                  onChange={(e) =>
                    setBulkImportFile(e.target.files?.[0] || null)
                  }
                />
              </div>

              {bulkImportResult && (
                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="font-medium text-blue-900">Import Results:</h4>
                  <div className="mt-2 text-sm text-blue-800">
                    <p>
                      ✅ {bulkImportResult.created} users created successfully
                    </p>
                    {bulkImportResult.failed > 0 && (
                      <p>❌ {bulkImportResult.failed} users failed</p>
                    )}
                  </div>
                  {bulkImportResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-blue-900">
                        Errors:
                      </p>
                      <div className="mt-1 max-h-20 overflow-auto text-xs text-blue-700">
                        {bulkImportResult.errors.map((error, index) => (
                          <p key={index}>{error}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setShowBulkImport(false);
                  setBulkImportFile(null);
                  setBulkImportResult(null);
                }}
              >
                Cancel
              </button>
              <button
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                onClick={handleBulkImport}
                disabled={!bulkImportFile || bulkImportLoading}
              >
                {bulkImportLoading ? "Importing..." : "Import Users"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
