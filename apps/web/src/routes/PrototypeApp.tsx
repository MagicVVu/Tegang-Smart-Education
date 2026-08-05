import { lazy, Suspense } from "react";
import type { PropsWithChildren } from "react";
import { Spin } from "antd";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ContractUserRole } from "@tegang/types";
import { AppShell } from "../layouts/AppShell";
import { usePrototypeStore } from "../stores/prototype-store";

const AdminDashboardPage = lazy(() =>
  import("../pages/AdminDashboardPage").then((module) => ({
    default: module.AdminDashboardPage
  })),
);
const AgentRunPage = lazy(() =>
  import("../pages/AgentRunPage").then((module) => ({
    default: module.AgentRunPage
  })),
);
const ApprovalsPage = lazy(() =>
  import("../pages/ApprovalsPage").then((module) => ({
    default: module.ApprovalsPage
  })),
);
const ForbiddenPage = lazy(() =>
  import("../pages/ForbiddenPage").then((module) => ({
    default: module.ForbiddenPage
  })),
);
const LoginPage = lazy(() =>
  import("../pages/LoginPage").then((module) => ({
    default: module.LoginPage
  })),
);
const MobileHandoffPage = lazy(() =>
  import("../pages/MobileHandoffPage").then((module) => ({
    default: module.MobileHandoffPage
  })),
);
const NotFoundPage = lazy(() =>
  import("../pages/NotFoundPage").then((module) => ({
    default: module.NotFoundPage
  })),
);
const PlanPage = lazy(() =>
  import("../pages/PlanPage").then((module) => ({
    default: module.PlanPage
  })),
);
const ReportPage = lazy(() =>
  import("../pages/ReportPage").then((module) => ({
    default: module.ReportPage
  })),
);
const SystemConfigPage = lazy(() =>
  import("../pages/SystemConfigPage").then((module) => ({
    default: module.SystemConfigPage
  })),
);
const TrainingCreatePage = lazy(() =>
  import("../pages/TrainingCreatePage").then((module) => ({
    default: module.TrainingCreatePage
  })),
);

function RoleGuard({
  allowed,
  children
}: PropsWithChildren<{ allowed: ContractUserRole[] }>) {
  const role = usePrototypeStore((state) => state.role);
  const location = useLocation();

  if (!role) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (!allowed.includes(role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <>{children}</>;
}

function ShellRoute({
  allowed,
  children
}: PropsWithChildren<{ allowed: ContractUserRole[] }>) {
  return (
    <RoleGuard allowed={allowed}>
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}

export function PrototypeApp() {
  return (
    <Suspense
      fallback={
        <div className="route-loading">
          <Spin size="large" />
          <span>正在加载页面…</span>
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route
        path="/mobile-handoff"
        element={
          <RoleGuard allowed={["employee"]}>
            <MobileHandoffPage />
          </RoleGuard>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ShellRoute allowed={["training_admin"]}>
            <AdminDashboardPage />
          </ShellRoute>
        }
      />
      <Route
        path="/admin/training/create"
        element={
          <ShellRoute allowed={["training_admin"]}>
            <TrainingCreatePage />
          </ShellRoute>
        }
      />
      <Route
        path="/admin/plans/:taskId"
        element={
          <ShellRoute allowed={["training_admin"]}>
            <PlanPage />
          </ShellRoute>
        }
      />
      <Route
        path="/admin/reports/:taskId"
        element={
          <ShellRoute allowed={["training_admin", "reviewer"]}>
            <ReportPage />
          </ShellRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ShellRoute allowed={["reviewer", "training_admin"]}>
            <ApprovalsPage />
          </ShellRoute>
        }
      />
      <Route
        path="/approvals/:taskId"
        element={
          <ShellRoute allowed={["reviewer", "training_admin"]}>
            <ApprovalsPage />
          </ShellRoute>
        }
      />
      <Route
        path="/agent-runs/:taskId"
        element={
          <ShellRoute
            allowed={["training_admin", "reviewer", "system_admin"]}
          >
            <AgentRunPage />
          </ShellRoute>
        }
      />
      <Route
        path="/system/knowledge"
        element={
          <ShellRoute allowed={["system_admin"]}>
            <SystemConfigPage />
          </ShellRoute>
        }
      />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
