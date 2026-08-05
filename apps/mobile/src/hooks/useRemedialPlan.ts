import { useCallback, useEffect, useState } from "react";
import { mobileServices, type ContractRemedialPlanView } from "../services";

export function useRemedialPlan(taskId: string) {
  const [plan, setPlan] = useState<ContractRemedialPlanView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mobileServices.remedial.getPlan(taskId);
      setPlan(response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "补训安排暂时无法加载。",
      );
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { plan, loading, error, reload: load };
}
