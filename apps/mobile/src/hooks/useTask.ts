import { useCallback, useEffect, useState } from "react";
import { mobileServices, type ContractTrainingTaskView } from "../services";

export function useTask(taskId: string) {
  const [task, setTask] = useState<ContractTrainingTaskView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mobileServices.training.getTask(taskId);
      setTask(response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "培训任务暂时无法加载。",
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { task, loading, error, reload: load };
}
