import { useEffect, useState } from "react";
import { Maximize2, Pause, Play, RotateCcw, SkipForward, Square } from "lucide-react";
import { motion } from "framer-motion";
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

const labels: Record<TimerMode, string> = {
  work: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

function ModeButton({ mode }: { mode: TimerMode }) {
  const current = useProductivityStore((state) => state.timer.mode);
  const setTimerMode = useProductivityStore((state) => state.setTimerMode);
  return (
    <Button variant={current === mode ? "primary" : "secondary"} onClick={() => setTimerMode(mode)}>
      {labels[mode]}
    </Button>
  );
}

export default function PomodoroPage() {
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

  useEffect(() => {
    if (snapshot.complete && timer.status === "running") {
      stopTimer(true);
      notify("Session complete", `${labels[timer.mode]} finished.`).catch(console.error);
    }
  }, [snapshot.complete, stopTimer, timer.mode, timer.status]);

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
                <div className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{labels[timer.mode]}</div>
                <div className="mt-2 text-6xl font-semibold tabular-nums">{formatDuration(snapshot.remaining)}</div>
                <div className="mt-3 text-sm text-muted-foreground">{activeTask?.title ?? "No task selected"}</div>
              </div>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            {timer.status === "idle" && (
              <Button variant="primary" onClick={() => startTimer(activeTask?.id)}>
                <Play size={17} />
                Start
              </Button>
            )}
            {timer.status === "running" && (
              <Button variant="primary" onClick={pauseTimer}>
                <Pause size={17} />
                Pause
              </Button>
            )}
            {timer.status === "paused" && (
              <Button variant="primary" onClick={resumeTimer}>
                <Play size={17} />
                Resume
              </Button>
            )}
            <Button variant="outline" onClick={() => stopTimer(false)}>
              <Square size={16} />
              Stop
            </Button>
            <Button variant="outline" onClick={skipTimer}>
              <SkipForward size={16} />
              Skip
            </Button>
            <Button variant="ghost" onClick={() => setFocusMode((value) => !value)}>
              <Maximize2 size={16} />
              {focusMode ? "Exit focus" : "Focus mode"}
            </Button>
          </div>
        </div>
      </section>

      {!focusMode && (
        <aside className="grid gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Session plan</CardTitle>
              <Badge>Round {timer.round + 1}</Badge>
            </CardHeader>
            <CardContent className="grid gap-3">
              {[
                ["workMinutes", "Work"],
                ["shortBreakMinutes", "Short break"],
                ["longBreakMinutes", "Long break"],
              ].map(([key, label]) => (
                <label key={key} className="grid gap-1 text-sm">
                  <span className="text-muted-foreground">{label} minutes</span>
                  <Input
                    type="number"
                    min={1}
                    max={180}
                    value={pomodoro[key as keyof typeof pomodoro] as number}
                    onChange={(event) => updatePomodoro({ [key]: Number(event.target.value) })}
                  />
                </label>
              ))}
              <label className="flex items-center justify-between text-sm">
                Auto-start next session
                <Switch checked={pomodoro.autoStartNext} onClick={() => updatePomodoro({ autoStartNext: !pomodoro.autoStartNext })} />
              </label>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent sessions</CardTitle>
              <RotateCcw size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent className="grid gap-2">
              {sessions.slice(0, 6).map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                  <span>{labels[session.mode]}</span>
                  <span className="text-muted-foreground">{formatDuration(session.focusedSeconds)}</span>
                </div>
              ))}
              {sessions.length === 0 && <p className="text-sm text-muted-foreground">Completed focus history appears here.</p>}
            </CardContent>
          </Card>
        </aside>
      )}
    </motion.div>
  );
}
