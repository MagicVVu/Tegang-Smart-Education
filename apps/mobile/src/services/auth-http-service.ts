import * as SecureStore from "expo-secure-store";
import type {
  ContractAuthMeResponse,
  ContractAuthPrincipal,
  ContractAuthSessionResponse,
  ContractLogoutResponse,
  ContractPrototypeUserProfile,
} from "@tegang/types";
import {
  MobileServiceError,
  type AuthService,
  type ServiceResponse,
} from "./contracts";

const REFRESH_KEY = "tegang.auth.refresh-token";
let accessToken: string | null = null;

interface ErrorBody {
  error?: { code?: string; message?: string; retryable?: boolean };
}

function employeeProfile(principal: ContractAuthPrincipal): ContractPrototypeUserProfile {
  return {
    user_id: principal.user_id,
    employee_profile_id: principal.employee_profile_id,
    display_name: principal.display_name,
    role: principal.primary_role,
    department_name: "本人授权部门",
    job_title: "员工",
    account_label: principal.user_id,
  };
}

async function request<T>(baseUrl: string, path: string, init: RequestInit): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  headers.set("X-Client-Kind", "android");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  } catch {
    throw new MobileServiceError("CONNECTOR_UNAVAILABLE", "无法连接认证服务，请检查网络后重试。", true);
  }
  const body = await response.json() as T & ErrorBody;
  if (!response.ok) {
    throw new MobileServiceError(
      (body.error?.code ?? "UNAUTHORIZED") as never,
      body.error?.message ?? "认证请求未能完成。",
      body.error?.retryable === true,
    );
  }
  return body;
}

function profileResponse(
  response: ContractAuthSessionResponse | ContractAuthMeResponse,
): ServiceResponse<ContractPrototypeUserProfile> {
  const principal = "access_token" in response.data
    ? response.data.principal
    : response.data;
  return { ...response, data: employeeProfile(principal) };
}

export function createMobileAuthHttpService(baseUrl: string): AuthService {
  const normalized = baseUrl.trim().replace(/\/+$/, "");
  return {
    async login(credentials) {
      const response = await request<ContractAuthSessionResponse>(
        normalized,
        "/api/v1/auth/login",
        { method: "POST", body: JSON.stringify(credentials) },
      );
      if (response.data.principal.primary_role !== "employee" || !response.data.refresh_token) {
        throw new MobileServiceError("FORBIDDEN_SCOPE", "当前身份不能访问员工移动端。");
      }
      accessToken = response.data.access_token;
      await SecureStore.setItemAsync(REFRESH_KEY, response.data.refresh_token);
      return profileResponse(response);
    },
    async restoreSession() {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      if (!refreshToken) return null;
      try {
        const refreshed = await request<ContractAuthSessionResponse>(
          normalized,
          "/api/v1/auth/refresh",
          { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
        );
        if (!refreshed.data.refresh_token || refreshed.data.principal.primary_role !== "employee") {
          throw new MobileServiceError("FORBIDDEN_SCOPE", "当前身份不能访问员工移动端。");
        }
        accessToken = refreshed.data.access_token;
        await SecureStore.setItemAsync(REFRESH_KEY, refreshed.data.refresh_token);
        const me = await request<ContractAuthMeResponse>(
          normalized,
          "/api/v1/auth/me",
          { method: "GET" },
        );
        return profileResponse(me);
      } catch {
        accessToken = null;
        await SecureStore.deleteItemAsync(REFRESH_KEY);
        return null;
      }
    },
    async logout() {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
      let response: ContractLogoutResponse | null = null;
      try {
        if (refreshToken) {
          response = await request<ContractLogoutResponse>(
            normalized,
            "/api/v1/auth/logout",
            { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) },
          );
        }
      } finally {
        accessToken = null;
        await SecureStore.deleteItemAsync(REFRESH_KEY);
      }
      return {
        schema_version: response?.schema_version ?? "2.2.0",
        request_id: response?.request_id ?? "req_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        trace_id: response?.trace_id ?? "trc_01ARZ3NDEKTSV4RRFFQ69G5FAV",
        occurred_at: response?.occurred_at ?? new Date().toISOString(),
        data: { success: true },
      };
    },
  };
}
