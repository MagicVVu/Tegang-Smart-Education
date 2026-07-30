import type { NavigatorScreenParams } from "@react-navigation/native";

export type MainTabParamList = {
  TrainingHome: undefined;
  AssessmentHub: undefined;
  TutorHub: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  TrainingList: undefined;
  TrainingDetail: { taskId: string };
  Learning: { taskId: string; remedial?: boolean };
  Tutor: { taskId: string };
  Assessment: { taskId: string; reassessment?: boolean };
  AssessmentResult: { taskId: string };
  Remedial: { taskId: string };
  Completion: { taskId: string };
  Forbidden: undefined;
};
