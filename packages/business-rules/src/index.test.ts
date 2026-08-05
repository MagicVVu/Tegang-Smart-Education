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
    expect(canAccessPath("employee", "/approvals/approval_01ARZ3NDEKTSV4RRFFQ69G5FAV")).toBe(false);
    expect(can("employee", "view_developer_trace")).toBe(false);
  });

  it("requires approval before high-risk publishing", () => {
    expect(nextStatusAfterRisk("high")).toBe("TB-WAIT-APPROVAL");
    expect(
      mayPublish(
        "training_admin",
        "TB-WAIT-PUBLISH",
        "high",
        false,
      ),
    ).toBe(false);
    expect(
      mayPublish(
        "training_admin",
        "TB-WAIT-PUBLISH",
        "high",
        true,
      ),
    ).toBe(true);
  });

  it("prevents unbounded retries", () => {
    expect(mayRetry("AR-FAILED", 0)).toBe(true);
    expect(mayRetry("AR-FAILED", 2)).toBe(false);
  });

  it("routes failed high-risk assessment to remedial then human takeover", () => {
    expect(assessmentNextStatus(false, false, 0)).toBe(
      "LR-REMEDIAL",
    );
    expect(assessmentNextStatus(false, false, 2)).toBe("LR-PAUSED");
  });
});
