import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import type { DepartmentConfig } from "../components/DepartmentDashboard";

type PendingRow = {
  id: string;
  referenceId: string;
  student: {
    id: string;
    displayName: string;
    studentUniversityId: string;
    studentDepartment: string;
    studentYear: string;
  };
  step: {
    id: string;
    stepOrder: number;
    department: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    comment: string;
    reviewedAt?: string;
    createdAt: string;
  };
  submittedAt?: string;
  createdAt: string;
};

type DepartmentMetrics = {
  timeframe: string;
  summary: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    approvalRate: number;
    rejectionRate: number;
  };
  departmentMetrics: number[];
};

type Notification = {
  id: string;
  title: string;
  body: string;
};

interface UseDepartmentDashboardReturn {
  config: DepartmentConfig | null;
  pendingRows: PendingRow[];
  metrics: DepartmentMetrics | null;
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  approveStep: (
    stepId: string,
    departmentData?: Record<string, any>,
  ) => Promise<boolean>;
  rejectStep: (
    stepId: string,
    reason: string,
    instruction?: string,
  ) => Promise<boolean>;
  refresh: () => void;
}

export function useDepartmentDashboard(
  departmentName: string,
): UseDepartmentDashboardReturn {
  const [config, setConfig] = useState<DepartmentConfig | null>(null);
  const [pendingRows, setPendingRows] = useState<PendingRow[]>([]);
  const [metrics, setMetrics] = useState<DepartmentMetrics | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!departmentName) return;

    try {
      setLoading(true);
      setError(null);

      const [configRes, queueRes, metricsRes, notifsRes] = await Promise.all([
        api.get(`/departments/${departmentName}/config`).catch(() => null),
        api.get(`/departments/${departmentName}/queue`).catch(() => null),
        api
          .get(`/departments/${departmentName}/metrics?timeframe=all`)
          .catch(() => null),
        api.get("/notifications").catch(() => null),
      ]);

      // Handle wrapped responses: { data: { ... } } or direct { ... }
      const configData = configRes?.data?.data || configRes?.data;
      const queueData = queueRes?.data?.data || queueRes?.data;
      const metricsData = metricsRes?.data?.data || metricsRes?.data;
      const notifsData = notifsRes?.data?.data || notifsRes?.data;

      // Debug: Log what we received
      console.log("DEBUG: Raw metrics response:", metricsRes);
      console.log("DEBUG: Parsed metrics data:", metricsData);

      if (configData) setConfig(configData);
      if (queueData) setPendingRows(Array.isArray(queueData) ? queueData : []);
      if (metricsData) setMetrics(metricsData);
      if (notifsData)
        setNotifications(Array.isArray(notifsData) ? notifsData : []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load department data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [departmentName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const approveStep = async (
    stepId: string,
    departmentData?: Record<string, any>,
  ): Promise<boolean> => {
    try {
      await api.post(`/departments/${departmentName}/steps/${stepId}/approve`, {
        departmentData,
      });
      await fetchData();
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to approve step";

      // 409 Conflict means step was already approved - treat as success
      if (message.includes("already reviewed") || message.includes("409")) {
        await fetchData();
        return true;
      }

      setError(message);
      return false;
    }
  };

  const rejectStep = async (
    stepId: string,
    reason: string,
    instruction?: string,
  ): Promise<boolean> => {
    try {
      await api.post(`/departments/${departmentName}/steps/${stepId}/reject`, {
        reason,
        instruction,
      });
      await fetchData();
      return true;
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reject step";

      // 409 Conflict means step was already reviewed - treat as success
      if (message.includes("already reviewed") || message.includes("409")) {
        await fetchData();
        return true;
      }

      setError(message);
      return false;
    }
  };

  return {
    config,
    pendingRows,
    metrics,
    notifications,
    loading,
    error,
    approveStep,
    rejectStep,
    refresh: fetchData,
  };
}
