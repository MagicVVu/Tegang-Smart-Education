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
    expect(usePrototypeStore.getState().task_status).toBe("TB-ANALYZING");
    usePrototypeStore.getState().completeAnalysis();
    usePrototypeStore.getState().confirmPlan();
    expect(usePrototypeStore.getState().task_status).toBe("TB-WAIT-APPROVAL");

    usePrototypeStore.getState().login("reviewer");
    usePrototypeStore.getState().decideApproval("approved");
    expect(usePrototypeStore.getState().task_status).toBe("TB-WAIT-PUBLISH");

    usePrototypeStore.getState().login("training_admin");
    usePrototypeStore.getState().publish();
    expect(usePrototypeStore.getState().task_status).toBe("TB-IN-PROGRESS");
  });

  it("moves failed assessment into remedial learning then reassessment", () => {
    usePrototypeStore.getState().setScenario("assessment_failed");
    usePrototypeStore.getState().submitAssessment(false);
    expect(usePrototypeStore.getState().learning_status).toBe("LR-REMEDIAL");
    usePrototypeStore.getState().finishRemedial();
    expect(usePrototypeStore.getState().learning_status).toBe("LR-RETESTING");
    usePrototypeStore.getState().submitAssessment(true);
    expect(usePrototypeStore.getState().task_status).toBe("TB-COMPLETED");
  });

  it("supports retry, rollback and human takeover without infinite retry", () => {
    usePrototypeStore.getState().triggerAgentFailure();
    usePrototypeStore.getState().retryAgent();
    usePrototypeStore.getState().retryAgent();
    expect(usePrototypeStore.getState().task_status).toBe("TB-MANUAL");
    usePrototypeStore.getState().rollbackAgent();
    expect(usePrototypeStore.getState().task_status).toBe(
      "TB-WAIT-CONFIRM",
    );
  });
});
