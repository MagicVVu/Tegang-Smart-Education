import { beforeEach, describe, expect, it, vi } from "vitest";
import * as SecureStore from "expo-secure-store";
import { createMobileAuthHttpService } from "./auth-http-service";

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(),
  setItemAsync: vi.fn(),
  deleteItemAsync: vi.fn(),
}));

const envelope = {
  schema_version: "2.2.0",
  request_id: "req_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  trace_id: "trc_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  occurred_at: "2026-08-10T00:00:00Z",
};

const principal = {
  user_id: "usr_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  session_id: "sid_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  display_name: "模拟员工 E-0231",
  roles: ["employee"],
  primary_role: "employee",
  department_ids: ["dept_01ARZ3NDEKTSV4RRFFQ69G5FAV"],
  employee_profile_id: "emp_01ARZ3NDEKTSV4RRFFQ69G5FAV",
  permission_scopes: ["training.self.read"],
  authorized_data_scopes: ["employee:self"],
  capabilities: ["training.self.read"],
  request_id: envelope.request_id,
  trace_id: envelope.trace_id,
};

describe("Android formal authentication adapter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("keeps access in memory and persists only refresh through SecureStore", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...envelope,
      data: {
        access_token: "access-token-with-sufficient-example-length",
        expires_at: "2026-08-10T00:15:00Z",
        principal,
        refresh_token: "refresh-token-with-sufficient-example-length",
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } })));
    const service = createMobileAuthHttpService("https://api.example.test");

    const result = await service.login({ account: "E-0231", password: "not-recorded" });

    expect(result.data.role).toBe("employee");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "tegang.auth.refresh-token",
      "refresh-token-with-sufficient-example-length",
    );
    expect(JSON.stringify(result)).not.toContain("refresh-token");
  });

  it("surfaces the backend rejection for a non-employee identity", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      ...envelope,
      error: {
        code: "FORBIDDEN_SCOPE",
        message: "The Android client is restricted to employee identities.",
        retryable: false,
      },
    }), { status: 403, headers: { "Content-Type": "application/json" } })));
    const service = createMobileAuthHttpService("https://api.example.test");

    await expect(
      service.login({ account: "A-001", password: "not-recorded" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN_SCOPE" });
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
