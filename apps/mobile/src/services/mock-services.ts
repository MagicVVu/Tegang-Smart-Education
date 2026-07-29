import {
  assessmentQuestions,
  knowledgeCitations,
  trainingTask
} from "@tegang/mock-data";
import { makeRequestId, wait } from "@tegang/shared-utils";
import type {
  AssessmentResult,
  ServiceResponse
} from "@tegang/types";
import { useMobileStore } from "../stores/mobile-store";

function response<T>(data: T): ServiceResponse<T> {
  return {
    data,
    requestId: makeRequestId("mobile-mock"),
    timestamp: new Date().toISOString()
  };
}

export const mobileServices = {
  training: {
    async getCurrentTask() {
      await wait(300);
      return response({
        ...trainingTask,
        status: useMobileStore.getState().taskStatus
      });
    }
  },
  learning: {
    async completeModule() {
      await wait(420);
      useMobileStore.getState().completeModule();
      return response({ saved: true });
    }
  },
  tutor: {
    async ask(question: string) {
      await wait(720);
      if (question.includes("预测绩效") || question.includes("没有依据")) {
        return response({
          answer:
            "现有授权知识不足以支持该结论。我不会把学习数据推断为绩效或人事结论。你可以查看正式制度或请求培训管理员协助。",
          refused: true,
          citationIds: [] as string[]
        });
      }
      return response({
        answer:
          "进入高温区域前，应确认设备联锁状态、隔离边界和监护要求。若现场状态与资料不一致，请停止操作并转人工确认。",
        refused: false,
        citationIds: knowledgeCitations.slice(0, 2).map((item) => item.id)
      });
    }
  },
  assessment: {
    async getQuestions(taskId: string) {
      await wait(300);
      if (taskId !== trainingTask.id) throw new Error("任务不存在");
      return response(assessmentQuestions);
    },
    async submit(
      taskId: string,
      answers: Record<string, number[]>,
      attempt: number,
    ) {
      await wait(850);
      if (taskId !== trainingTask.id) throw new Error("任务不存在");
      const state = useMobileStore.getState();
      const highRiskCorrect = answers["Q-01"]?.[0] === 1;
      const forcedFailure =
        state.scenario === "assessment_failed" &&
        attempt === 1;
      const passed = highRiskCorrect && !forcedFailure;
      const result: AssessmentResult = {
        id: `AR-M-${attempt}`,
        taskId: trainingTask.id,
        attempt,
        score: passed ? 88 : 62,
        passed,
        highRiskPassed: passed,
        knowledgeResults: [
          {
            knowledgePoint: "高温作业与设备联锁",
            score: passed ? 92 : 45,
            passed,
            riskLevel: "high",
            reason: passed
              ? "已正确识别联锁、隔离和监护要求。"
              : "未完整识别高风险作业前置条件。"
          },
          {
            knowledgePoint: "培训过程留痕",
            score: 84,
            passed: true,
            riskLevel: "medium",
            reason: "能够识别知识引用与审批记录。"
          }
        ],
        nextAction: passed ? "complete" : "remedial"
      };
      useMobileStore.getState().setAssessmentResult(result);
      return response(result);
    }
  }
};
