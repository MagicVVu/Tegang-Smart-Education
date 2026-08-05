import { beforeEach, describe, expect, it } from "vitest";
import { assessmentQuestions, trainingTask } from "@tegang/mock-data";
import { __mobileMockControl, mobileServices } from "./mock-services";

const allCorrect = {
  [assessmentQuestions[0]!.id]: [1],
  [assessmentQuestions[1]!.id]: [0, 1, 2],
  [assessmentQuestions[2]!.id]: [1]
};

describe("mobile mock services", () => {
  beforeEach(() => {
    __mobileMockControl.reset();
  });

  it("authenticates an employee and rejects a non-employee account", async () => {
    const success = await mobileServices.auth.login({
      account: "E-0231",
      password: "123456"
    });

    expect(success.data.account_label).toBe("E-0231");
    await expect(
      mobileServices.auth.login({
        account: "A-001",
        password: "123456"
      }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN"
    });
  });

  it("requires remedial learning when the total passes but high-risk knowledge fails", async () => {
    const response = await mobileServices.assessment.submit(
      trainingTask.id,
      {
        ...allCorrect,
        [assessmentQuestions[0]!.id]: [0]
      },
      1,
    );

    expect(response.data.score_percent).toBe(80);
    expect(response.data.passed).toBe(true);
    expect(response.data.high_risk_passed).toBe(false);
    expect(response.data.next_action).toBe("remediation");
    expect(__mobileMockControl.getSnapshot().learning_status).toBe(
      "LR-NOT-MET",
    );
  });

  it("distinguishes an ordinary knowledge failure from high-risk failure", async () => {
    const response = await mobileServices.assessment.submit(
      trainingTask.id,
      {
        ...allCorrect,
        [assessmentQuestions[1]!.id]: [0]
      },
      1,
    );

    expect(response.data.score_percent).toBe(60);
    expect(response.data.passed).toBe(false);
    expect(response.data.high_risk_passed).toBe(true);
    expect(response.data.wrong_answer_reasons?.[0]?.knowledge_point_name).toBe(
      "培训过程留痕",
    );
  });

  it("completes only after all assessment rules pass", async () => {
    const response = await mobileServices.assessment.submit(
      trainingTask.id,
      allCorrect,
      1,
    );

    expect(response.data.score_percent).toBe(100);
    expect(response.data.next_action).toBe("complete");
    expect(__mobileMockControl.getSnapshot().learning_status).toBe("LR-COMPLETED");
  });

  it("replaces stale reminders after the task is completed", async () => {
    await mobileServices.assessment.submit(
      trainingTask.id,
      allCorrect,
      1,
    );

    const notifications = await mobileServices.notifications.list();

    expect(notifications.data[0]?.title).toBe("培训任务已完成");
    expect(notifications.data[0]?.description).toContain("最终测评 100 分");
    expect(notifications.data[1]?.title).toBe("完成状态已同步");
    expect(notifications.data[1]?.unread).toBe(false);
  });

  it("moves from failed assessment through remedial learning to reassessment", async () => {
    const failed = await mobileServices.assessment.submit(
      trainingTask.id,
      {
        ...allCorrect,
        [assessmentQuestions[0]!.id]: [0]
      },
      1,
    );
    expect(failed.data.next_action).toBe("remediation");

    await mobileServices.remedial.start(trainingTask.id);
    const remedial = await mobileServices.learning.completeCourse(
      trainingTask.id,
      { remedial: true },
    );
    expect(remedial.data.task.learning_status).toBe("LR-RETESTING");
    expect(remedial.data.attempt).toBe(2);

    const reassessment = await mobileServices.assessment.submit(
      trainingTask.id,
      allCorrect,
      2,
    );
    expect(reassessment.data.next_action).toBe("complete");
    expect(reassessment.data.previous_score_percent).toBe(80);
    expect(reassessment.data.score_change_percent).toBe(20);
  });

  it("blocks duplicate submissions for the same attempt", async () => {
    await mobileServices.assessment.submit(
      trainingTask.id,
      allCorrect,
      1,
    );

    await expect(
      mobileServices.assessment.submit(
        trainingTask.id,
        allCorrect,
        1,
      ),
    ).rejects.toMatchObject({
      code: "DUPLICATE_SUBMISSION"
    });
  });

  it("surfaces retryable network failures without changing task data", async () => {
    __mobileMockControl.configure({ networkOffline: true });

    await expect(
      mobileServices.training.getCurrentTask(),
    ).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      retryable: true
    });
    expect(__mobileMockControl.getSnapshot().progress_percent).toBe(36);
  });
});
