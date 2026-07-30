import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useEffect, useRef } from "react";
import { Screen } from "../components/Screen";
import { StatePanel } from "../components/StatePanel";
import type { MainTabParamList } from "../navigation/types";
import { useMobileStore } from "../stores/mobile-store";
import { TutorConversation } from "./TutorScreen";

type Props = BottomTabScreenProps<MainTabParamList, "TutorHub">;

export function TutorHubScreen({ navigation }: Props) {
  const currentTask = useMobileStore((state) => state.currentTask);
  const loading = useMobileStore((state) => state.trainingLoading);
  const error = useMobileStore((state) => state.trainingError);
  const loadCurrentTask = useMobileStore((state) => state.loadCurrentTask);
  const requestedCurrentTask = useRef(false);

  useEffect(() => {
    if (!currentTask && !loading && !requestedCurrentTask.current) {
      requestedCurrentTask.current = true;
      void loadCurrentTask();
    }
  }, [currentTask, loadCurrentTask, loading]);

  if (!currentTask) {
    return (
      <Screen safeTop>
        <StatePanel
          loading={loading}
          tone={error ? "error" : "neutral"}
          icon={error ? "cloud-alert-outline" : "message-processing-outline"}
          title={
            loading
              ? "正在准备智能问答"
              : error
                ? "暂时无法载入培训资料"
                : "暂无可提问的培训任务"
          }
          description={
            error ??
            "智能问答会基于当前培训任务中已授权的资料组织回答。"
          }
          actionLabel={loading ? undefined : "重新加载"}
          onAction={loading ? undefined : () => void loadCurrentTask()}
        />
      </Screen>
    );
  }

  return (
    <TutorConversation
      taskId={currentTask.id}
      safeTop
      onExit={() => navigation.navigate("TrainingHome")}
      exitLabel="查看培训"
    />
  );
}
