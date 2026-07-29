import { beforeEach, describe, expect, it } from "vitest";
import { usePrototypeStore } from "./prototype-store";

describe("prototype flagship flow", () => {
  beforeEach(() => {
    usePrototypeStore.getState().resetDemo();
  });

  it("routes a high-risk plan through approval before publish", () => {
    const store = usePrototypeStore.getState();
    store.login("training_admin");
    store.submitTraining();
    expect(usePrototypeStore.getState().taskStatus).toBe("agent_analyzing");
    usePrototypeStore.getState().completeAnalysis();
    usePrototypeStore.getState().confirmPlan();
    expect(usePrototypeStore.getState().taskStatus).toBe("awaiting_approval");

    usePrototypeStore.getState().login("reviewer");
    usePrototypeStore.getState().decideApproval("approved");
    expect(usePrototypeStore.getState().taskStatus).toBe("awaiting_publish");

    usePrototypeStore.getState().login("training_admin");
    usePrototypeStore.getState().publish();
    expect(usePrototypeStore.getState().taskStatus).toBe("executing");
  });

  it("moves failed assessment into remedial learning then reassessment", () => {
    usePrototypeStore.getState().setScenario("assessment_failed");
    usePrototypeStore.getState().submitAssessment(false);
    expect(usePrototypeStore.getState().taskStatus).toBe("remedial_learning");
    usePrototypeStore.getState().finishRemedial();
    expect(usePrototypeStore.getState().taskStatus).toBe("reassessment");
    usePrototypeStore.getState().submitAssessment(true);
    expect(usePrototypeStore.getState().taskStatus).toBe("completed");
  });

  it("supports retry, rollback and human takeover without infinite retry", () => {
    usePrototypeStore.getState().triggerAgentFailure();
    usePrototypeStore.getState().retryAgent();
    usePrototypeStore.getState().retryAgent();
    expect(usePrototypeStore.getState().taskStatus).toBe("human_takeover");
    usePrototypeStore.getState().rollbackAgent();
    expect(usePrototypeStore.getState().taskStatus).toBe(
      "awaiting_admin_confirmation",
    );
  });
});
