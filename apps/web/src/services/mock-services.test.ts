import { beforeEach, describe, expect, it } from "vitest";
import { services } from "./mock-services";
import { agentRun, trainingTask } from "./workspace-data";
import { usePrototypeStore } from "../stores/prototype-store";

describe("Web service adapters", () => {
  beforeEach(() => {
    usePrototypeStore.getState().resetDemo();
  });

  it("rejects invalid enterprise credentials without changing session role", async () => {
    await expect(
      services.auth.login({
        account: "unknown-account",
        password: "invalid-password"
      }),
    ).rejects.toThrow("账号或密码错误");

    expect(usePrototypeStore.getState().role).toBeNull();
  });

  it("returns the role session through the development-only adapter", async () => {
    const result = await services.auth.developmentLogin("reviewer");

    expect(result.data.user.role).toBe("reviewer");
    expect(usePrototypeStore.getState().role).toBe("reviewer");
    expect(result.request_id).toMatch(/^req_[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it("accepts a reasoned replan request and starts a new analysis run", async () => {
    const result = await services.trainingPlan.requestReplan(
      trainingTask.id,
      "员工岗位范围发生变化，需要重新核对必修知识。",
      "idem_replan_test_001",
    );

    expect(result.data).toMatchObject({
      accepted: true,
      status: "TB-ANALYZING"
    });
    expect(usePrototypeStore.getState().task_status).toBe("TB-ANALYZING");
  });

  it("queues confirmed report export and exposes auditable run events", async () => {
    const [exportResult, eventsResult] = await Promise.all([
      services.report.requestExport(trainingTask.id, "pdf"),
      services.agentRun.getEvents(agentRun.id)
    ]);

    expect(exportResult.data.accepted).toBe(true);
    expect(exportResult.data.operation_id).toMatch(/^operation_[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(eventsResult.data.some((event) => event.event_type === "approval_required"))
      .toBe(true);
  });
});
