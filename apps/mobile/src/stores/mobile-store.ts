import { create } from "zustand";
import type {
  AssessmentResult,
  DemoScenario,
  TrainingStatus
} from "@tegang/types";
import { assessmentNextStatus } from "@tegang/business-rules";

interface MobileState {
  authenticated: boolean;
  scenario: DemoScenario;
  taskStatus: TrainingStatus;
  progress: number;
  currentModuleIndex: number;
  assessmentAttempt: number;
  result: AssessmentResult | null;
  login: () => void;
  logout: () => void;
  setScenario: (scenario: DemoScenario) => void;
  startLearning: () => void;
  completeModule: () => void;
  finishLearning: () => void;
  setAssessmentResult: (result: AssessmentResult) => void;
  startRemedial: () => void;
  finishRemedial: () => void;
  completeTraining: () => void;
  reset: () => void;
}

const initialState = {
  authenticated: false,
  scenario: "assessment_failed" as DemoScenario,
  taskStatus: "executing" as TrainingStatus,
  progress: 0,
  currentModuleIndex: 0,
  assessmentAttempt: 1,
  result: null
};

export const useMobileStore = create<MobileState>((set, get) => ({
  ...initialState,
  login: () => set({ authenticated: true }),
  logout: () => set({ authenticated: false }),
  setScenario: (scenario) => {
    const status: Partial<Record<DemoScenario, TrainingStatus>> = {
      normal: "executing",
      high_risk: "executing",
      information_missing: "paused",
      assessment_failed: "executing",
      knowledge_conflict: "paused",
      agent_failure: "execution_failed"
    };
    set({
      ...initialState,
      authenticated: true,
      scenario,
      taskStatus: status[scenario] ?? "executing"
    });
  },
  startLearning: () =>
    set({ taskStatus: "learning", progress: Math.max(get().progress, 12) }),
  completeModule: () =>
    set((state) => ({
      currentModuleIndex: Math.min(state.currentModuleIndex + 1, 2),
      progress: Math.min(state.progress + 32, 100)
    })),
  finishLearning: () => set({ taskStatus: "awaiting_assessment", progress: 100 }),
  setAssessmentResult: (result) =>
    set((state) => ({
      result,
      taskStatus: assessmentNextStatus(
        result.passed,
        result.highRiskPassed,
        state.assessmentAttempt - 1,
      )
    })),
  startRemedial: () => set({ taskStatus: "remedial_learning", progress: 0 }),
  finishRemedial: () =>
    set((state) => ({
      taskStatus: "reassessment",
      assessmentAttempt: state.assessmentAttempt + 1,
      progress: 100
    })),
  completeTraining: () => set({ taskStatus: "completed" }),
  reset: () => set(initialState)
}));
