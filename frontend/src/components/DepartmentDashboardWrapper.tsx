import { useDepartmentDashboard } from '../hooks/useDepartmentDashboard';
import { DepartmentDashboard } from './DepartmentDashboard';

interface DepartmentDashboardWrapperProps {
  departmentName: string;
}

export function DepartmentDashboardWrapper({ departmentName }: DepartmentDashboardWrapperProps) {
  const {
    config,
    pendingRows,
    metrics,
    notifications,
    loading,
    error,
    approveStep,
    rejectStep,
    refresh,
  } = useDepartmentDashboard(departmentName);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-sm text-slate-600">Loading department dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Dashboard</h3>
            <p className="text-sm text-slate-600 mb-4">{error}</p>
            <button
              onClick={refresh}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Department Not Found</h3>
            <p className="text-sm text-slate-600 mb-4">
              The department "{departmentName}" is not configured in the system.
            </p>
            <button
              onClick={() => window.history.back()}
              className="rounded bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DepartmentDashboard
      departmentConfig={config}
      pendingRows={pendingRows}
      metrics={metrics!}
      notifs={notifications}
      onApprove={approveStep}
      onReject={rejectStep}
      onRefresh={refresh}
    />
  );
}
