import { useEffect, useMemo, useState } from "react";
import type { PomodoroSettings, TimerMode } from "../../types/domain";
import { clamp } from "../../lib/utils";

interface TimerState {
  mode: TimerMode;
  status: "idle" | "running" | "paused";
  startedAt?: number;
  accumulatedSeconds: number;
}

function modeSeconds(mode: TimerMode, settings: PomodoroSettings) {
  if (mode === "work") return settings.workMinutes * 60;
  if (mode === "shortBreak") return settings.shortBreakMinutes * 60;
  return settings.longBreakMinutes * 60;
}

export function useTimerSnapshot(timer: TimerState, settings: PomodoroSettings) {
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    if (timer.status !== "running") return;
    const id = window.setInterval(() => setTick(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [timer.status]);

  return useMemo(() => {
    const total = modeSeconds(timer.mode, settings);
    const running = timer.status === "running" && timer.startedAt ? Math.floor((tick - timer.startedAt) / 1000) : 0;
    const elapsed = clamp(timer.accumulatedSeconds + running, 0, total);
    return {
      total,
      elapsed,
      remaining: Math.max(0, total - elapsed),
      progress: total === 0 ? 0 : elapsed / total,
      complete: elapsed >= total,
    };
  }, [settings, tick, timer]);
}
