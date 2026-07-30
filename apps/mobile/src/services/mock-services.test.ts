import { beforeEach, describe, expect, it } from "vitest";
import { __mobileMockControl, mobileServices } from "./mock-services";

const allCorrect = {
  "Q-01": [1],
  "Q-02": [0, 1, 2],
  "Q-03": [1]
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

    expect(success.data.accountLabel).toBe("E-0231");
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
      "T-20260728-01",
      {
        ...allCorrect,
        "Q-01": [0]
      },
      1,
    );

    expect(response.data.score).toBe(80);
    expect(response.data.passed).toBe(true);
    expect(response.data.highRiskPassed).toBe(false);
    expect(response.data.nextAction).toBe("remedial");
    expect(__mobileMockControl.getSnapshot().status).toBe(
      "assessment_failed",
    );
  });

  it("distinguishes an ordinary knowledge failure from high-risk failure", async () => {
    const response = await mobileServices.assessment.submit(
      "T-20260728-01",
      {
        ...allCorrect,
        "Q-02": [0]
      },
      1,
    );

    expect(response.data.score).toBe(60);
    expect(response.data.passed).toBe(false);
    expect(response.data.highRiskPassed).toBe(true);
    expect(response.data.wrongAnswerReasons[0]?.knowledgePoint).toBe(
      "培训过程留痕",
    );
  });

  it("completes only after all assessment rules pass", async () => {
    const response = await mobileServices.assessment.submit(
      "T-20260728-01",
      allCorrect,
      1,
    );

    expect(response.data.score).toBe(100);
    expect(response.data.nextAction).toBe("complete");
    expect(__mobileMockControl.getSnapshot().status).toBe("completed");
  });

  it("replaces stale reminders after the task is completed", async () => {
    await mobileServices.assessment.submit(
      "T-20260728-01",
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
      "T-20260728-01",
      {
        ...allCorrect,
        "Q-01": [0]
      },
      1,
    );
    expect(failed.data.nextAction).toBe("remedial");

    await mobileServices.remedial.start("T-20260728-01");
    const remedial = await mobileServices.learning.completeCourse(
      "T-20260728-01",
      { remedial: true },
    );
    expect(remedial.data.task.status).toBe("reassessment");
    expect(remedial.data.attempt).toBe(2);

    const reassessment = await mobileServices.assessment.submit(
      "T-20260728-01",
      allCorrect,
      2,
    );
    expect(reassessment.data.nextAction).toBe("complete");
    expect(reassessment.data.previousScore).toBe(80);
    expect(reassessment.data.scoreChange).toBe(20);
  });

  it("blocks duplicate submissions for the same attempt", async () => {
    await mobileServices.assessment.submit(
      "T-20260728-01",
      allCorrect,
      1,
    );

    await expect(
      mobileServices.assessment.submit(
        "T-20260728-01",
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
    expect(__mobileMockControl.getSnapshot().progress).toBe(36);
  });
});
