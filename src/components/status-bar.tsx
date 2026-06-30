import { useTranslation } from "react-i18next";
import { useProductivityStore } from "../stores/productivity-store";
import { formatDuration, todayKey } from "../lib/utils";

export function StatusBar() {
  const { t } = useTranslation();
  const timer = useProductivityStore((state) => state.timer);
  const tasks = useProductivityStore((state) => state.tasks);
  const activeTasks = tasks.filter((task) => !task.completed).length;

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
          <span className="tabular-nums">{formatDuration(timer.accumulatedSeconds)}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span>{t("statusBar.tasks", { count: activeTasks })}</span>
        <span>{todayKey()}</span>
      </div>
    </footer>
  );
}
