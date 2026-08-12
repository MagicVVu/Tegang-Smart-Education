import { create } from "zustand";
import { mobileServices } from "../services";
import type {
  AuthCredentials,
  EmployeeTaskFilter,
  ContractAssessmentResultView,
  ContractPrototypeUserProfile,
  ContractTrainingTaskView
} from "../services";

interface MobileState {
  authenticated: boolean;
  employee: ContractPrototypeUserProfile | null;
  currentTask: ContractTrainingTaskView | null;
  tasks: ContractTrainingTaskView[];
  taskFilter: EmployeeTaskFilter;
  assessmentAttempt: number;
  result: ContractAssessmentResultView | null;
  authLoading: boolean;
  trainingLoading: boolean;
  authError: string | null;
  trainingError: string | null;
  login: (credentials: AuthCredentials) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  loadCurrentTask: () => Promise<void>;
  loadTasks: (filter?: EmployeeTaskFilter) => Promise<void>;
  startLearning: (taskId: string) => Promise<void>;
  completeUnit: (taskId: string, unitId: string) => Promise<void>;
  completeCourse: (taskId: string, remedial?: boolean) => Promise<void>;
  recordAssessmentResult: (
    result: ContractAssessmentResultView,
  ) => Promise<void>;
  loadAssessmentResult: (taskId: string) => Promise<void>;
  startRemedial: (taskId: string) => Promise<void>;
  clearAuthError: () => void;
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "服务暂时不可用，请稍后重试。";
}

function replaceTask(
  tasks: ContractTrainingTaskView[],
  nextTask: ContractTrainingTaskView,
) {
  return tasks.some((task) => task.id === nextTask.id)
    ? tasks.map((task) => (task.id === nextTask.id ? nextTask : task))
    : [nextTask, ...tasks];
}

export const useMobileStore = create<MobileState>((set, get) => ({
  authenticated: false,
  employee: null,
  currentTask: null,
  tasks: [],
  taskFilter: "active",
  assessmentAttempt: 1,
  result: null,
  authLoading: false,
  trainingLoading: false,
  authError: null,
  trainingError: null,
  login: async (credentials) => {
    set({ authLoading: true, authError: null });
    try {
      const response = await mobileServices.auth.login(credentials);
      set({
        authenticated: true,
        employee: response.data,
        authLoading: false
      });
      await get().loadCurrentTask();
    } catch (error) {
      set({
        authenticated: false,
        employee: null,
        authLoading: false,
        authError: errorMessage(error)
      });
      throw error;
    }
  },
  logout: async () => {
    try {
      await mobileServices.auth.logout();
    } finally {
      set({
        authenticated: false,
        employee: null,
        currentTask: null,
        tasks: [],
        taskFilter: "active",
        assessmentAttempt: 1,
        result: null,
        authError: null,
        trainingError: null
      });
    }
  },
  restoreSession: async () => {
    set({ authLoading: true });
    const response = await mobileServices.auth.restoreSession();
    set({
      authenticated: response !== null,
      employee: response?.data ?? null,
      authLoading: false,
    });
  },
  loadCurrentTask: async () => {
    set({ trainingLoading: true, trainingError: null });
    try {
      const response = await mobileServices.training.getCurrentTask();
      set({
        currentTask: response.data,
        trainingLoading: false
      });
    } catch (error) {
      set({
        trainingLoading: false,
        trainingError: errorMessage(error)
      });
    }
  },
  loadTasks: async (filter = get().taskFilter) => {
    set({
      taskFilter: filter,
      trainingLoading: true,
      trainingError: null
    });
    try {
      const response = await mobileServices.training.listTasks(filter);
      set({ tasks: response.data, trainingLoading: false });
    } catch (error) {
      set({
        tasks: [],
        trainingLoading: false,
        trainingError: errorMessage(error)
      });
    }
  },
  startLearning: async (taskId) => {
    const response = await mobileServices.learning.start(taskId);
    set((state) => ({
      currentTask: response.data.task,
      tasks: replaceTask(state.tasks, response.data.task)
    }));
  },
  completeUnit: async (taskId, unitId) => {
    const response = await mobileServices.learning.completeUnit(taskId, unitId);
    set((state) => ({
      currentTask: response.data.task,
      tasks: replaceTask(state.tasks, response.data.task)
    }));
  },
  completeCourse: async (taskId, remedial = false) => {
    const response = await mobileServices.learning.completeCourse(taskId, {
      remedial
    });
    set((state) => ({
      currentTask: response.data.task,
      tasks: replaceTask(state.tasks, response.data.task),
      assessmentAttempt: response.data.attempt ?? state.assessmentAttempt
    }));
  },
  recordAssessmentResult: async (result) => {
    const taskResponse = await mobileServices.training.getTask(result.task_id);
    set((state) => ({
      result,
      currentTask: taskResponse.data,
      tasks: replaceTask(state.tasks, taskResponse.data)
    }));
  },
  loadAssessmentResult: async (taskId) => {
    const response = await mobileServices.assessment.getResult(taskId);
    set({ result: response.data });
  },
  startRemedial: async (taskId) => {
    const response = await mobileServices.remedial.start(taskId);
    set((state) => ({
      currentTask: response.data.task,
      tasks: replaceTask(state.tasks, response.data.task)
    }));
  },
  clearAuthError: () => set({ authError: null })
}));
