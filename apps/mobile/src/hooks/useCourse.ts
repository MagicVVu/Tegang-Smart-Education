import { useCallback, useEffect, useState } from "react";
import { mobileServices, type CourseDetail } from "../services";
import { useMobileStore } from "../stores/mobile-store";

export function useCourse(taskId: string, remedial: boolean) {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const completeUnit = useMobileStore((state) => state.completeUnit);
  const completeCourse = useMobileStore((state) => state.completeCourse);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await mobileServices.learning.getCourse(taskId, {
        remedial
      });
      setCourse(response.data);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "课程内容暂时无法加载。",
      );
    } finally {
      setLoading(false);
    }
  }, [remedial, taskId]);

  useEffect(() => {
    const timeout = setTimeout(() => void load(), 0);
    return () => clearTimeout(timeout);
  }, [load]);

  const completeCurrentUnit = async () => {
    if (!course) return;
    const unit = course.units[course.currentUnitIndex];
    if (!unit) return;
    setSaving(true);
    setError(null);
    try {
      await completeUnit(taskId, unit.id);
      setCourse((current) => {
        if (!current) return current;
        const nextIndex = Math.min(
          current.currentUnitIndex + 1,
          current.units.length - 1,
        );
        return {
          ...current,
          currentUnitIndex: nextIndex,
          units: current.units.map((item, index) =>
            index <= current.currentUnitIndex
              ? { ...item, completed: true }
              : item,
          )
        };
      });
      setSavedMessage("学习进度已保存");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "进度保存失败，请重试。",
      );
    } finally {
      setSaving(false);
    }
  };

  const finish = async () => {
    setSaving(true);
    setError(null);
    try {
      await completeCourse(taskId, remedial);
      return true;
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "进度保存失败，请重试。",
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    course,
    loading,
    saving,
    error,
    savedMessage,
    reload: load,
    completeCurrentUnit,
    finish,
    clearSavedMessage: () => setSavedMessage("")
  };
}
