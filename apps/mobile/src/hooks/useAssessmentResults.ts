import { useCallback, useEffect, useState } from "react";
import { mobileServices, type ContractAssessmentResultView } from "../services";

export function useAssessmentResults() {
  const [results, setResults] = useState<ContractAssessmentResultView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mobileServices.assessment.listResults();
      setResults(response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "测评结果暂时无法加载。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { results, loading, error, reload: load };
}
