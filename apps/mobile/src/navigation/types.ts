import type { NavigatorScreenParams } from "@react-navigation/native";

export type MainTabParamList = {
  Home: undefined;
  Training: undefined;
  Tutor: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  TrainingDetail: { taskId: string };
  Learning: { taskId: string; remedial?: boolean };
  Assessment: { taskId: string; reassessment?: boolean };
  AssessmentResult: { taskId: string };
  Remedial: { taskId: string };
  Completion: { taskId: string };
  Forbidden: undefined;
};
