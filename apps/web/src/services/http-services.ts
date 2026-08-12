import type { HttpClient } from "./http-client";
import type {
  RuntimeDatabaseStatusResponse,
  RuntimeService,
} from "./interfaces";

export function createRuntimeHttpService(client: HttpClient): RuntimeService {
  return {
    async getDatabaseStatus() {
      const response = await client.get<RuntimeDatabaseStatusResponse>(
        "/api/v1/system/database-status",
      );
      return response.body;
    },
  };
}
