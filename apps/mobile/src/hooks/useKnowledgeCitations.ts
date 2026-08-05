import { useCallback, useEffect, useState } from "react";
import type { ContractKnowledgeCitation } from "@tegang/types";
import { mobileServices } from "../services";

export function useKnowledgeCitations(
  visible: boolean,
  citationIds?: readonly string[],
) {
  const [citations, setCitations] = useState<ContractKnowledgeCitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mobileServices.citations.listByIds(citationIds);
      setCitations(response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "知识来源暂时无法加载。",
      );
    } finally {
      setLoading(false);
    }
  }, [citationIds]);

  useEffect(() => {
    if (!visible) return undefined;
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load, visible]);

  return { citations, loading, error, reload: load };
}
