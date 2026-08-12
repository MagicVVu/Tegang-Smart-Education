import { describe, expect, it, vi } from "vitest";
import type { HttpClient } from "./http-client";
import { createRuntimeHttpService } from "./http-services";

describe("Runtime HTTP service", () => {
  it("adapts the read-only database status endpoint", async () => {
    const body = {
      request_id: "req_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      trace_id: "trc_01ARZ3NDEKTSV4RRFFQ69G5FAV",
      occurred_at: "2026-08-10T12:00:00Z",
      data: {
        status: "ok" as const,
        storage: "postgresql" as const,
        schema_version: "2.1.0",
        migration_revision: "20260810_0001",
      },
    };
    const get = vi.fn(async () => ({
      body,
      status: 200,
      requestId: body.request_id,
      traceId: body.trace_id,
    }));
    const client = { get } as unknown as HttpClient;

    const result = await createRuntimeHttpService(client).getDatabaseStatus();

    expect(get).toHaveBeenCalledWith("/api/v1/system/database-status");
    expect(result).toEqual(body);
  });
});
