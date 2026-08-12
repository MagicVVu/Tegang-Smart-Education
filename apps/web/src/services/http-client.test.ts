import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpClient } from "./http-client";

afterEach(() => {
  vi.useRealTimers();
});

describe("HTTP client", () => {
  it("adds correlation headers and returns response correlation", async () => {
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      expect(headers.get("x-request-id")).toMatch(/^req_[0-9A-HJKMNP-TV-Z]{26}$/);
      expect(headers.get("x-trace-id")).toMatch(/^trc_[0-9A-HJKMNP-TV-Z]{26}$/);
      return new Response(
        JSON.stringify({ request_id: "req_body", trace_id: "trc_body", data: { status: "ok" } }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": "req_response",
            "X-Trace-ID": "trc_response",
          },
        },
      );
    });
    const client = createHttpClient({
      baseUrl: "http://127.0.0.1:8000/",
      fetchImpl,
    });

    const response = await client.get<{ data: { status: string } }>("/health/live");

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/health/live",
      expect.objectContaining({ method: "GET" }),
    );
    expect(response.requestId).toBe("req_response");
    expect(response.traceId).toBe("trc_response");
    expect(response.body.data.status).toBe("ok");
  });

  it("parses the unified backend error without exposing transport internals", async () => {
    const client = createHttpClient({
      baseUrl: "http://127.0.0.1:8000",
      fetchImpl: vi.fn(async () =>
        new Response(
          JSON.stringify({
            request_id: "req_safe",
            trace_id: "trc_safe",
            error: {
              code: "CONNECTOR_UNAVAILABLE",
              message: "Database persistence layer is not ready.",
              retryable: true,
            },
          }),
          { status: 503, headers: { "Content-Type": "application/json" } },
        ),
      ),
    });

    await expect(client.get("/api/v1/system/database-status")).rejects.toMatchObject({
      name: "HttpClientError",
      status: 503,
      code: "CONNECTOR_UNAVAILABLE",
      requestId: "req_safe",
      traceId: "trc_safe",
      retryable: true,
    });
  });

  it("aborts requests after the configured timeout", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
    );
    const client = createHttpClient({
      baseUrl: "http://127.0.0.1:8000",
      timeoutMs: 25,
      fetchImpl,
    });

    const assertion = expect(client.get("/health/live")).rejects.toMatchObject({
      name: "HttpClientError",
      code: "REQUEST_ABORTED",
      retryable: true,
    });
    await vi.advanceTimersByTimeAsync(30);

    await assertion;
  });

  it("fails locally when VITE_API_BASE_URL is absent", async () => {
    const client = createHttpClient({ baseUrl: "" });

    await expect(client.get("/health/live")).rejects.toMatchObject({
      code: "HTTP_CLIENT_NOT_CONFIGURED",
      retryable: false,
    });
  });
});
