import { useCallback, useEffect, useState } from "react";
import { mobileServices, type ContractTrainingRecordView } from "../services";

export function useTrainingRecords() {
  const [records, setRecords] = useState<ContractTrainingRecordView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mobileServices.profile.listTrainingRecords();
      setRecords(response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "培训记录暂时无法加载。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  return { records, loading, error, reload: load };
}
