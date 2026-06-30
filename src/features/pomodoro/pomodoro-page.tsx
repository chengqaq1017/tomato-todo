import { useEffect, useMemo, useState } from "react";
import { Maximize2, Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { useProductivityStore } from "../../stores/productivity-store";
import { formatDuration } from "../../lib/utils";
import { notify } from "../../services/desktop";
import { useTimerSnapshot } from "./use-timer-snapshot";
import type { TimerMode } from "../../types/domain";

function ModeButton({ mode }: { mode: TimerMode }) {
  const current = useProductivityStore((state) => state.timer.mode);
  const setTimerMode = useProductivityStore((state) => state.setTimerMode);
  const { t } = useTranslation();
  const modeLabels = useMemo<Record<TimerMode, string>>(() => ({
    work: t("pomodoro.modes.work"),
    shortBreak: t("pomodoro.modes.shortBreak"),
    longBreak: t("pomodoro.modes.longBreak"),
  }), [t]);
  return (
    <Button variant={current === mode ? "primary" : "secondary"} onClick={() => setTimerMode(mode)}>
      {modeLabels[mode]}
    </Button>
  );
}

export default function PomodoroPage() {
  const { t } = useTranslation();
  const [focusMode, setFocusMode] = useState(false);
  const timer = useProductivityStore((state) => state.timer);
  const pomodoro = useProductivityStore((state) => state.pomodoro);
  const tasks = useProductivityStore((state) => state.tasks);
  const sessions = useProductivityStore((state) => state.sessions);
  const startTimer = useProductivityStore((state) => state.startTimer);
  const pauseTimer = useProductivityStore((state) => state.pauseTimer);
  const resumeTimer = useProductivityStore((state) => state.resumeTimer);
  const stopTimer = useProductivityStore((state) => state.stopTimer);
  const skipTimer = useProductivityStore((state) => state.skipTimer);
  const updatePomodoro = useProductivityStore((state) => state.updatePomodoro);
  const snapshot = useTimerSnapshot(timer, pomodoro);
  const activeTask = tasks.find((task) => task.id === timer.activeTaskId);
  const circumference = 2 * Math.PI * 142;

  const modeLabels = useMemo<Record<TimerMode, string>>(() => ({
    work: t("pomodoro.modes.work"),
    shortBreak: t("pomodoro.modes.shortBreak"),
    longBreak: t("pomodoro.modes.longBreak"),
  }), [t]);

  useEffect(() => {
    if (snapshot.complete && timer.status === "running") {
      stopTimer(true);
      notify(
        t("pomodoro.sessionComplete"),
        t("pomodoro.sessionFinished", { mode: modeLabels[timer.mode] }),
      ).catch(console.error);
    }
  }, [modeLabels, snapshot.complete, stopTimer, timer.mode, timer.status, t]);

  const pageClass = focusMode
    ? "fixed inset-0 z-40 grid place-items-center bg-background p-6"
    : "grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={pageClass}>
      <section className="grid min-h-[620px] place-items-center rounded-lg border bg-card p-5">
        <div className="w-full max-w-xl text-center">
          <div className="mb-5 flex flex-wrap justify-center gap-2">
            <ModeButton mode="work" />
            <ModeButton mode="shortBreak" />
            <ModeButton mode="longBreak" />
          </div>
          <div className="relative mx-auto h-80 w-80">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 320 320">
              <circle cx="160" cy="160" r="142" stroke="currentColor" strokeWidth="14" className="text-muted" fill="none" />
              <circle
                cx="160"
                cy="160"
                r="142"
                stroke="currentColor"
                strokeWidth="14"
                strokeLinecap="round"
                className="text-primary transition-all duration-500"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - snapshot.progress)}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div>
                <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  {modeLabels[timer.mode]}
                </div>
                <div className="mt-2 text-6xl font-semibold tabular-nums">{formatDuration(snapshot.remaining)}</div>
                <div className="mt-3 text-sm text-muted-foreground">
                  {activeTask?.title ?? t("pomodoro.noTaskSelected")}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {timer.status === "idle" && (
              <Button variant="primary" onClick={() => startTimer(activeTask?.id)}>
                <Play size={17} />
                {t("pomodoro.start")}
              </Button>
            )}
            {timer.status === "running" && (
              <Button variant="primary" onClick={pauseTimer}>
                <Pause size={17} />
                {t("pomodoro.pause")}
              </Button>
            )}
            {timer.status === "paused" && (
              <Button variant="primary" onClick={resumeTimer}>
                <Play size={17} />
                {t("pomodoro.resume")}
              </Button>
            )}
            <Button variant="outline" onClick={() => stopTimer(false)}>
              <Square size={16} />
              {t("pomodoro.stop")}
            </Button>
            <Button variant="outline" onClick={skipTimer}>
              <SkipForward size={16} />
              {t("pomodoro.skip")}
            </Button>
            <Button variant="ghost" onClick={() => setFocusMode((value) => !value)}>
              <Maximize2 size={16} />
              {focusMode ? t("pomodoro.exitFocus") : t("pomodoro.focusMode")}
            </Button>
          </div>
        </div>
      </section>

      {!focusMode && (
        <aside className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>{t("pomodoro.sessionPlan")}</CardTitle>
              <Badge>{t("pomodoro.round", { round: timer.round + 1 })}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3">
              {([ 
                ["workMinutes", t("pomodoro.workMinutes")],
                ["shortBreakMinutes", t("pomodoro.shortBreakMinutes")],
                ["longBreakMinutes", t("pomodoro.longBreakMinutes")],
              ] as const).map(([key, label]) => (
                <label key={key} className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">{label} {t("pomodoro.minutes")}</span>
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    value={pomodoro[key as keyof typeof pomodoro] as number}
                    onChange={(event) => updatePomodoro({ [key]: Number(event.target.value) })}
                  />
                </label>
              ))}
              <label className="grid gap-1 text-sm">
                <span className="text-muted-foreground">{t("pomodoro.longBreakEvery")}</span>
                <Input
                  type="number"
                  min={2}
                  max={12}
                  value={pomodoro.longBreakEvery}
                  onChange={(event) => updatePomodoro({ longBreakEvery: Number(event.target.value) })}
                />
              </label>
              <label className="flex items-center justify-between text-sm">
                {t("pomodoro.autoStartNext")}
                <Switch checked={pomodoro.autoStartNext} onClick={() => updatePomodoro({ autoStartNext: !pomodoro.autoStartNext })} />
              </label>
              <label className="flex items-center justify-between text-sm">
                {t("pomodoro.soundEnabled")}
                <Switch checked={pomodoro.soundEnabled} onClick={() => updatePomodoro({ soundEnabled: !pomodoro.soundEnabled })} />
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("pomodoro.recentSessions")}</CardTitle>
              <RotateCcw size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent className="grid gap-2">
              {sessions.slice(0, 6).map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                  <span>{modeLabels[session.mode]}</span>
                  <span className="text-muted-foreground">{formatDuration(session.focusedSeconds)}</span>
                </div>
              ))}
              {sessions.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("pomodoro.completedHistory")}</p>
              )}
            </CardContent>
          </Card>
        </aside>
      )}
    </motion.div>
  );
}
