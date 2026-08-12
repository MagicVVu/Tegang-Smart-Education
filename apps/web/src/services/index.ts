import { createAuthHttpService } from "./auth-http-service";
import { createHttpClient } from "./http-client";
import { createRuntimeHttpService } from "./http-services";
import { services as mockServices } from "./mock-services";
import { getAccessToken } from "./session-token";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
const demoMode = import.meta.env.VITE_DEMO_MODE === "true";

const httpClient = createHttpClient({
  baseUrl: apiBaseUrl,
  accessToken: getAccessToken,
});

export const services = {
  ...mockServices,
  auth: apiBaseUrl ? createAuthHttpService(httpClient, demoMode) : mockServices.auth,
  runtime: createRuntimeHttpService(httpClient),
};

export { createHttpClient, HttpClientError } from "./http-client";
export { createRuntimeHttpService } from "./http-services";
export type {
  HttpClient,
  HttpClientOptions,
  HttpResponse,
} from "./http-client";
export type {
  KnowledgeService,
  RuntimeDatabaseStatusResponse,
  RuntimeService,
} from "./interfaces";
