import { makeRequestId, traceIdForRequest } from "@tegang/shared-utils";

export interface HttpResponse<T> {
  body: T;
  status: number;
  requestId: string;
  traceId: string;
}

export interface HttpClient {
  request<T>(path: string, init?: RequestInit): Promise<HttpResponse<T>>;
  get<T>(path: string, init?: RequestInit): Promise<HttpResponse<T>>;
  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<HttpResponse<T>>;
}

export interface HttpClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  accessToken?: () => string | null;
}

interface ErrorPayload {
  request_id?: unknown;
  trace_id?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
    retryable?: unknown;
  };
}

export class HttpClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly requestId: string,
    readonly traceId: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "HttpClientError";
  }
}

function safeJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function stringField(value: unknown, fallback: string): string {
  return typeof value === "string" && value ? value : fallback;
}

function responseCorrelation(
  response: Response,
  payload: unknown,
  requestId: string,
  traceId: string,
) {
  const body = (payload ?? {}) as ErrorPayload;
  return {
    requestId: stringField(
      response.headers.get("x-request-id") ?? body.request_id,
      requestId,
    ),
    traceId: stringField(
      response.headers.get("x-trace-id") ?? body.trace_id,
      traceId,
    ),
  };
}

export function createHttpClient({
  baseUrl,
  timeoutMs = 8_000,
  fetchImpl = (...args) => fetch(...args),
  accessToken = () => null,
}: HttpClientOptions): HttpClient {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/+$/, "");

  const request = async <T>(
    path: string,
    init: RequestInit = {},
  ): Promise<HttpResponse<T>> => {
    if (!normalizedBaseUrl) {
      throw new HttpClientError(
        "VITE_API_BASE_URL is not configured.",
        0,
        "HTTP_CLIENT_NOT_CONFIGURED",
        "",
        "",
        false,
      );
    }
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
      throw new TypeError("HTTP client paths must be same-origin absolute paths.");
    }

    const requestId = makeRequestId();
    const traceId = traceIdForRequest(requestId);
    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("X-Request-ID", requestId);
    headers.set("X-Trace-ID", traceId);
    const token = accessToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
    const abortFromCaller = () => controller.abort(init.signal?.reason);
    init.signal?.addEventListener("abort", abortFromCaller, { once: true });

    try {
      const response = await fetchImpl(`${normalizedBaseUrl}${path}`, {
        ...init,
        credentials: init.credentials ?? "include",
        headers,
        signal: controller.signal,
      });
      const payload = safeJson(await response.text());
      const correlation = responseCorrelation(
        response,
        payload,
        requestId,
        traceId,
      );

      if (!response.ok) {
        const errorPayload = (payload ?? {}) as ErrorPayload;
        throw new HttpClientError(
          stringField(errorPayload.error?.message, "请求未能完成。"),
          response.status,
          stringField(errorPayload.error?.code, "HTTP_ERROR"),
          correlation.requestId,
          correlation.traceId,
          errorPayload.error?.retryable === true,
        );
      }

      return {
        body: payload as T,
        status: response.status,
        ...correlation,
      };
    } catch (error) {
      if (error instanceof HttpClientError) throw error;
      if (controller.signal.aborted) {
        throw new HttpClientError(
          "请求超时或已取消。",
          0,
          "REQUEST_ABORTED",
          requestId,
          traceId,
          true,
        );
      }
      throw new HttpClientError(
        "无法连接后端服务。",
        0,
        "NETWORK_UNAVAILABLE",
        requestId,
        traceId,
        true,
      );
    } finally {
      clearTimeout(timeout);
      init.signal?.removeEventListener("abort", abortFromCaller);
    }
  };

  return {
    request,
    get: <T>(path: string, init?: RequestInit) =>
      request<T>(path, { ...init, method: "GET" }),
    post: <T>(path: string, body?: unknown, init?: RequestInit) =>
      request<T>(path, {
        ...init,
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
  };
}
