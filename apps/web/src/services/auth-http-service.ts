import type {
  ContractAuthMeResponse,
  ContractAuthPrincipal,
  ContractAuthSessionResponse,
  ContractDemoProfilesResponse,
  ContractPrototypeUserProfile,
  ContractUserRole,
} from "@tegang/types";
import { usePrototypeStore } from "../stores/prototype-store";
import type { AuthService, ServiceResponse } from "./interfaces";
import type { HttpClient } from "./http-client";
import { clearAccessToken, setAccessToken } from "./session-token";

function csrfToken(): string {
  if (typeof document === "undefined") return "";
  const entry = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("tegang_csrf="));
  return entry ? decodeURIComponent(entry.slice("tegang_csrf=".length)) : "";
}

function profile(principal: ContractAuthPrincipal, account = principal.user_id): ContractPrototypeUserProfile {
  return {
    user_id: principal.user_id,
    employee_profile_id: principal.employee_profile_id ?? undefined,
    account_label: account,
    display_name: principal.display_name,
    department_name: "已授权部门",
    job_title: "已认证身份",
    role: principal.primary_role,
  };
}

function applySession(response: ContractAuthSessionResponse, account?: string): ServiceResponse<{
  user: ContractPrototypeUserProfile;
  authenticated_at: string;
  expires_at: string;
}> {
  setAccessToken(response.data.access_token);
  usePrototypeStore.getState().setPrincipal(response.data.principal);
  return {
    ...response,
    data: {
      user: profile(response.data.principal, account),
      authenticated_at: response.occurred_at,
      expires_at: response.data.expires_at,
    },
  };
}

export function createAuthHttpService(client: HttpClient, demoMode: boolean): AuthService {
  return {
    async login(credentials) {
      const response = await client.post<ContractAuthSessionResponse>(
        "/api/v1/auth/login",
        credentials,
      );
      return applySession(response.body, credentials.account);
    },
    async developmentLogin(role: ContractUserRole) {
      if (!demoMode) throw new Error("演示身份模式未启用。");
      const profiles = await client.get<ContractDemoProfilesResponse>(
        "/api/v1/auth/demo-profiles",
      );
      const selected = profiles.body.data.find((item) => item.primary_role === role);
      if (!selected) throw new Error("当前演示身份不可用。");
      const response = await client.post<ContractAuthSessionResponse>(
        "/api/v1/auth/demo-login",
        { account: selected.account },
      );
      return applySession(response.body, selected.account);
    },
    async listDevelopmentProfiles() {
      if (!demoMode) return [];
      const response = await client.get<ContractDemoProfilesResponse>(
        "/api/v1/auth/demo-profiles",
      );
      return response.body.data.map((item) => profile({
        user_id: item.user_id,
        session_id: "sid_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        display_name: item.display_name,
        roles: [item.primary_role],
        primary_role: item.primary_role,
        department_ids: item.department_ids,
        permission_scopes: [],
        authorized_data_scopes: [],
        capabilities: [],
        request_id: response.body.request_id,
        trace_id: response.body.trace_id,
      }, item.account));
    },
    async restoreSession(): Promise<ContractAuthPrincipal | null> {
      try {
        const refreshed = await client.post<ContractAuthSessionResponse>(
          "/api/v1/auth/refresh",
          {},
          { headers: { "X-CSRF-Token": csrfToken() } },
        );
        setAccessToken(refreshed.body.data.access_token);
        const me = await client.get<ContractAuthMeResponse>("/api/v1/auth/me");
        usePrototypeStore.getState().setPrincipal(me.body.data);
        return me.body.data;
      } catch {
        clearAccessToken();
        usePrototypeStore.getState().logout();
        return null;
      }
    },
    async logout() {
      try {
        await client.post(
          "/api/v1/auth/logout",
          {},
          { headers: { "X-CSRF-Token": csrfToken() } },
        );
      } finally {
        clearAccessToken();
        usePrototypeStore.getState().logout();
      }
    },
  };
}
