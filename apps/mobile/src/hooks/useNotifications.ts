import { useCallback, useEffect, useState } from "react";
import { mobileServices, type ContractNotificationItemView } from "../services";

export function useNotifications() {
  const [items, setItems] = useState<ContractNotificationItemView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mobileServices.notifications.list();
      setItems(response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "消息暂时无法加载。",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const markRead = async (id: string) => {
    await mobileServices.notifications.markRead(id);
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, unread: false } : item,
      ),
    );
  };

  return { items, loading, error, reload: load, markRead };
}
