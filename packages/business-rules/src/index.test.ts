import { describe, expect, it } from "vitest";
import {
  assessmentNextStatus,
  can,
  canAccessPath,
  mayPublish,
  mayRetry,
  nextStatusAfterRisk
} from "./index";

describe("permission and deterministic business rules", () => {
  it("does not let an employee reach approval or developer trace routes", () => {
    expect(canAccessPath("employee", "/approvals/AP-01")).toBe(false);
    expect(can("employee", "view_developer_trace")).toBe(false);
  });

  it("requires approval before high-risk publishing", () => {
    expect(nextStatusAfterRisk("high")).toBe("awaiting_approval");
    expect(
      mayPublish(
        "training_admin",
        "awaiting_publish",
        "high",
        false,
      ),
    ).toBe(false);
    expect(
      mayPublish(
        "training_admin",
        "awaiting_publish",
        "high",
        true,
      ),
    ).toBe(true);
  });

  it("prevents unbounded retries", () => {
    expect(mayRetry("execution_failed", 0)).toBe(true);
    expect(mayRetry("execution_failed", 2)).toBe(false);
  });

  it("routes failed high-risk assessment to remedial then human takeover", () => {
    expect(assessmentNextStatus(false, false, 0)).toBe(
      "remedial_learning",
    );
    expect(assessmentNextStatus(false, false, 2)).toBe("human_takeover");
  });
});
