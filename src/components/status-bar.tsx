import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useProductivityStore } from "../stores/productivity-store";
import { formatDuration, formatLocalDateTime } from "../lib/utils";

function timerSeconds(timer: { status: string; startedAt?: number; accumulatedSeconds: number }, now: number) {
  if (timer.status !== "running" || !timer.startedAt) return timer.accumulatedSeconds;
  return timer.accumulatedSeconds + Math.max(0, Math.floor((now - timer.startedAt) / 1000));
}

export function StatusBar() {
  const { t, i18n } = useTranslation();
  const [now, setNow] = useState(Date.now());
  const timer = useProductivityStore((state) => state.timer);
  const tasks = useProductivityStore((state) => state.tasks);
  const activeTasks = tasks.filter((task) => !task.completed).length;
  const elapsed = timerSeconds(timer, now);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const statusText =
    timer.status === "running"
      ? t("statusBar.running")
      : timer.status === "paused"
        ? t("statusBar.paused")
        : t("statusBar.idle");

  return (
    <footer className="flex h-6 shrink-0 items-center justify-between bg-statusbar px-3 text-[11px] text-white select-none">
      <div className="flex items-center gap-3">
        <span>{statusText}</span>
        {timer.status !== "idle" && (
          <span className="tabular-nums">{formatDuration(elapsed)}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span>{t("statusBar.tasks", { count: activeTasks })}</span>
        <span className="tabular-nums">{formatLocalDateTime(new Date(now), i18n.language)}</span>
      </div>
    </footer>
  );
}
