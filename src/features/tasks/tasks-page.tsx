import { useEffect, useMemo, useRef, useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarDays,
  Check,
  Clock3,
  GripVertical,
  Maximize2,
  Pause,
  Play,
  Plus,
  Square,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { formatDuration, formatLocalTime, todayKey } from "../../lib/utils";
import { setAppFullscreen } from "../../services/desktop";
import { useProductivityStore } from "../../stores/productivity-store";
import type { Task, TaskTimerMode, TimerStatus } from "../../types/domain";

type NoiseKind = "off" | "white" | "rain" | "brown";

function useClock(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

function elapsedSeconds(
  timer: { status: TimerStatus; startedAt?: number; accumulatedSeconds: number },
  now: number,
) {
  if (timer.status !== "running" || !timer.startedAt) return timer.accumulatedSeconds;
  return timer.accumulatedSeconds + Math.max(0, Math.floor((now - timer.startedAt) / 1000));
}

function useWhiteNoise(kind: NoiseKind) {
  const cleanupRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    cleanupRef.current?.();
    cleanupRef.current = undefined;
    if (kind === "off") return;

    const AudioContextClass =
      window.AudioContext ??
      (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const seconds = 2;
    const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;

    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      if (kind === "brown") {
        last = (last + 0.02 * white) / 1.02;
        data[index] = last * 3.5;
      } else {
        data[index] = white;
      }
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = kind === "rain" ? 0.035 : 0.06;

    if (kind === "rain") {
      const highpass = context.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 900;
      source.connect(highpass).connect(gain).connect(context.destination);
    } else {
      const lowpass = context.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = kind === "brown" ? 520 : 3200;
      source.connect(lowpass).connect(gain).connect(context.destination);
    }

    source.start();
    const cleanup = () => {
      try {
        source.stop();
      } catch {
        // The source may already be stopped during quick noise changes.
      }
      void context.close();
    };
    cleanupRef.current = cleanup;

    return () => {
      cleanup();
      if (cleanupRef.current === cleanup) cleanupRef.current = undefined;
    };
  }, [kind]);
}

function taskClock(task: Task, currentSessionSeconds: number) {
  const target = task.targetSeconds || 25 * 60;
  if (task.timerMode === "countdown") {
    return {
      labelSeconds: Math.max(0, target - currentSessionSeconds),
      progress: Math.min(100, (currentSessionSeconds / target) * 100),
    };
  }
  return {
    labelSeconds: currentSessionSeconds,
    progress: target ? Math.min(100, (currentSessionSeconds / target) * 100) : 0,
  };
}

interface TaskItemProps {
  task: Task;
  isActive: boolean;
  timerStatus: TimerStatus;
  currentSessionSeconds: number;
  onStart: (task: Task) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: (completed?: boolean) => void;
  onImmerse: (task: Task) => void;
}

function SortableTask({
  task,
  isActive,
  timerStatus,
  currentSessionSeconds,
  onStart,
  onPause,
  onResume,
  onStop,
  onImmerse,
}: TaskItemProps) {
  const { t, i18n } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const toggleTask = useProductivityStore((state) => state.toggleTask);
  const deleteTask = useProductivityStore((state) => state.deleteTask);
  const clock = taskClock(task, isActive ? currentSessionSeconds : 0);
  const createdAt = new Date(task.createdAt);
  const taskDay = task.deadline ?? todayKey(createdAt);
  const createdTime = formatLocalTime(createdAt, i18n.language);
  const action = isActive && timerStatus === "running" ? onPause : isActive && timerStatus === "paused" ? onResume : () => onStart(task);
  const ActionIcon = isActive && timerStatus === "running" ? Pause : Play;
  const actionText =
    isActive && timerStatus === "running"
      ? t("pomodoro.pause")
      : isActive && timerStatus === "paused"
        ? t("pomodoro.resume")
        : t("tasks.startTimer");

  return (
    <motion.div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      layout
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      whileHover={{ y: -1 }}
      className={`panel grid gap-3 p-3 transition-colors ${isActive ? "border-primary/70 bg-primary/5" : "hover:border-primary/35"}`}
    >
      <div className="grid gap-3 md:grid-cols-[auto_112px_minmax(0,1fr)_auto]">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="cursor-grab" {...attributes} {...listeners} title={t("tasks.drag")}>
            <GripVertical size={16} />
          </Button>
          <Button size="icon" variant={task.completed ? "primary" : "outline"} onClick={() => toggleTask(task.id)} title={t("tasks.complete")}>
            <Check size={16} />
          </Button>
        </div>

        <div className="grid place-items-center gap-1 rounded-sm border bg-background px-3 py-2">
          <motion.div
            key={`${task.id}-${clock.labelSeconds}`}
            initial={{ opacity: 0.65, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-xl font-semibold tabular-nums"
          >
            {formatDuration(clock.labelSeconds)}
          </motion.div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full bg-primary" animate={{ width: `${clock.progress}%` }} transition={{ duration: 0.35 }} />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {isActive ? t("tasks.currentSession") : t("tasks.readyToFocus")}
          </span>
        </div>

        <div className="min-w-0 content-center">
          <div className={`truncate text-base font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`}>{task.title}</div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge>
              <Clock3 size={13} className="mr-1" />
              {t("tasks.focusedTotal", { time: formatDuration(task.focusedSeconds ?? 0) })}
            </Badge>
            <Badge>{task.timerMode === "countdown" ? t("tasks.countdown") : t("tasks.countup")}</Badge>
            <Badge>{t("tasks.targetMinutesBadge", { minutes: Math.round((task.targetSeconds || 1500) / 60) })}</Badge>
            <Badge>
              <CalendarDays size={13} className="mr-1" />
              {taskDay}
            </Badge>
            <Badge>{t("tasks.createdAt", { time: createdTime })}</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
          <Button variant="primary" onClick={action}>
            <ActionIcon size={15} />
            {actionText}
          </Button>
          {isActive ? (
            <Button variant="outline" onClick={() => onStop(false)}>
              <Square size={15} />
              {t("pomodoro.stop")}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onImmerse(task)}>
              <Maximize2 size={15} />
              {t("tasks.enterImmersive")}
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={() => deleteTask(task.id)} title={t("tasks.delete")}>
            <Trash2 size={15} />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

interface CreateTaskDialogProps {
  open: boolean;
  title: string;
  minutes: number;
  mode: TaskTimerMode;
  setTitle: (value: string) => void;
  setMinutes: (value: number) => void;
  setMode: (value: TaskTimerMode) => void;
  onClose: () => void;
  onSubmit: () => void;
}

function CreateTaskDialog({ open, title, minutes, mode, setTitle, setMinutes, setMode, onClose, onSubmit }: CreateTaskDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) onSubmit();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, onSubmit, open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 grid place-items-center bg-black/45 px-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.div
            className="panel w-full max-w-md p-4 shadow-2xl"
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b pb-3">
              <div>
                <h2 className="text-sm font-semibold">{t("tasks.createDialogTitle")}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{t("tasks.createDialogHint")}</p>
              </div>
              <Button size="icon" variant="ghost" onClick={onClose} title={t("tasks.cancel")}>
                <X size={16} />
              </Button>
            </div>

            <div className="grid gap-3 py-4">
              <label className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">{t("tasks.taskName")}</span>
                <Input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("tasks.createTask")} />
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">{t("tasks.taskMinutes")}</span>
                <Input
                  type="number"
                  min={1}
                  max={600}
                  value={minutes}
                  onChange={(event) => setMinutes(Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
              <div className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">{t("tasks.taskMode")}</span>
                <div className="grid grid-cols-2 gap-1 rounded-sm bg-muted p-1">
                  {(["countdown", "countup"] as const).map((item) => (
                    <Button key={item} variant={mode === item ? "primary" : "ghost"} onClick={() => setMode(item)}>
                      {t(`tasks.${item}`)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose}>
                {t("tasks.cancel")}
              </Button>
              <Button variant="primary" onClick={onSubmit}>
                <Plus size={16} />
                {t("tasks.create")}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ImmersiveFocusProps {
  task: Task;
  timerStatus: TimerStatus;
  currentSessionSeconds: number;
  noise: NoiseKind;
  setNoise: (kind: NoiseKind) => void;
  onStart: (task: Task) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: (completed?: boolean) => void;
  onClose: () => void;
}

function ImmersiveFocus({
  task,
  timerStatus,
  currentSessionSeconds,
  noise,
  setNoise,
  onStart,
  onPause,
  onResume,
  onStop,
  onClose,
}: ImmersiveFocusProps) {
  const { t } = useTranslation();
  const clock = taskClock(task, currentSessionSeconds);

  return (
    <div className="fixed inset-0 z-50 grid bg-editor text-foreground">
      <div className="flex h-10 items-center justify-between border-b bg-titlebar px-3">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <Maximize2 size={15} className="text-primary" />
          <span className="truncate">{t("tasks.immersiveMode")}</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} title={t("tasks.exitImmersive")}>
          <X size={16} />
        </Button>
      </div>

      <div className="mx-auto grid w-full max-w-5xl content-center gap-8 px-6 py-10">
        <div className="grid gap-3 text-center">
          <div className="text-sm text-muted-foreground">{task.timerMode === "countdown" ? t("tasks.countdown") : t("tasks.countup")}</div>
          <h1 className="break-words text-3xl font-semibold md:text-5xl">{task.title}</h1>
        </div>

        <div className="grid justify-items-center gap-4">
          <div className="font-mono text-7xl font-semibold tabular-nums md:text-9xl">{formatDuration(clock.labelSeconds)}</div>
          <div className="h-2 w-full max-w-2xl overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${clock.progress}%` }} />
          </div>
          <div className="text-sm text-muted-foreground">
            {t("tasks.focusedTotal", { time: formatDuration(task.focusedSeconds ?? 0) })}
          </div>
        </div>

        <div className="mx-auto flex flex-wrap items-center justify-center gap-2">
          {timerStatus === "running" ? (
            <Button variant="primary" onClick={onPause}>
              <Pause size={16} />
              {t("pomodoro.pause")}
            </Button>
          ) : timerStatus === "paused" ? (
            <Button variant="primary" onClick={onResume}>
              <Play size={16} />
              {t("pomodoro.resume")}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => onStart(task)}>
              <Play size={16} />
              {t("tasks.startTimer")}
            </Button>
          )}
          <Button variant="outline" onClick={() => onStop(false)}>
            <Square size={16} />
            {t("pomodoro.stop")}
          </Button>
          <Button variant="outline" onClick={() => onStop(true)}>
            <Check size={16} />
            {t("tasks.finishSession")}
          </Button>
          <label className="inline-flex h-8 items-center gap-2 rounded-sm border bg-input px-2.5 text-xs">
            <Volume2 size={15} className="text-muted-foreground" />
            <select className="bg-transparent outline-none" value={noise} onChange={(event) => setNoise(event.target.value as NoiseKind)}>
              <option value="off">{t("tasks.noiseOff")}</option>
              <option value="white">{t("tasks.noiseWhite")}</option>
              <option value="rain">{t("tasks.noiseRain")}</option>
              <option value="brown">{t("tasks.noiseBrown")}</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [taskMinutes, setTaskMinutes] = useState(25);
  const [taskMode, setTaskMode] = useState<TaskTimerMode>("countdown");
  const [createOpen, setCreateOpen] = useState(false);
  const [immersiveTaskId, setImmersiveTaskId] = useState<string>();
  const [noise, setNoise] = useState<NoiseKind>("off");
  const tasks = useProductivityStore((state) => state.tasks);
  const timer = useProductivityStore((state) => state.timer);
  const addTask = useProductivityStore((state) => state.addTask);
  const reorderTasks = useProductivityStore((state) => state.reorderTasks);
  const startTimer = useProductivityStore((state) => state.startTimer);
  const pauseTimer = useProductivityStore((state) => state.pauseTimer);
  const resumeTimer = useProductivityStore((state) => state.resumeTimer);
  const stopTimer = useProductivityStore((state) => state.stopTimer);
  const now = useClock();
  const currentSessionSeconds = elapsedSeconds(timer, now);
  const activeTask = tasks.find((task) => task.id === timer.activeTaskId);
  const immersiveTask = tasks.find((task) => task.id === immersiveTaskId);
  const today = todayKey(new Date(now));
  const taskCount = tasks.length;

  useWhiteNoise(noise);

  const visible = useMemo(() => {
    return [...tasks].sort((a, b) => a.order - b.order);
  }, [tasks]);

  useEffect(() => {
    if (!activeTask || timer.status !== "running" || activeTask.timerMode !== "countdown") return;
    if (currentSessionSeconds >= activeTask.targetSeconds) {
      stopTimer(true);
    }
  }, [activeTask, currentSessionSeconds, stopTimer, timer.status]);

  useEffect(() => {
    return () => {
      void setAppFullscreen(false).catch(console.error);
    };
  }, []);

  const beginTask = (task: Task) => {
    if (timer.status !== "idle" && timer.activeTaskId && timer.activeTaskId !== task.id) {
      stopTimer(false);
    }
    startTimer(task.id);
    setImmersiveTaskId(task.id);
    void setAppFullscreen(true).catch(console.error);
  };

  const openImmersive = (task: Task) => {
    setImmersiveTaskId(task.id);
    void setAppFullscreen(true).catch(console.error);
  };

  const closeImmersive = () => {
    setImmersiveTaskId(undefined);
    setNoise("off");
    void setAppFullscreen(false).catch(console.error);
  };

  const finishTimer = (completed = false) => {
    stopTimer(completed);
    if (completed) setNoise("off");
  };

  const submitTask = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    addTask(trimmed, Math.max(1, taskMinutes) * 60, taskMode);
    setTitle("");
    setTaskMinutes(25);
    setTaskMode("countdown");
    setCreateOpen(false);
  };

  const onDragEnd = (event: DragEndEvent) => {
    if (event.over && event.active.id !== event.over.id) {
      reorderTasks(String(event.active.id), String(event.over.id));
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5">
        <Card>
          <CardHeader className="h-auto min-h-12 py-2">
            <div className="min-w-0">
              <CardTitle>{t("tasks.inbox")}</CardTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge>{t("tasks.shown", { count: taskCount })}</Badge>
                <Badge>
                  <CalendarDays size={13} className="mr-1" />
                  {t("tasks.autoToday", { day: today })}
                </Badge>
              </div>
            </div>
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              {t("tasks.add")}
            </Button>
          </CardHeader>
          <CardContent className="grid gap-3">
            {visible.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid min-h-44 place-items-center border border-dashed bg-background/40 text-center"
              >
                <div className="grid gap-3">
                  <div className="text-sm text-muted-foreground">{t("tasks.emptyTasks")}</div>
                  <Button variant="primary" onClick={() => setCreateOpen(true)}>
                    <Plus size={16} />
                    {t("tasks.add")}
                  </Button>
                </div>
              </motion.div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {activeTask && <Badge>{t("tasks.activeTask", { title: activeTask.title })}</Badge>}
            </div>
            <DndContext onDragEnd={onDragEnd}>
              <SortableContext items={visible.map((task) => task.id)} strategy={verticalListSortingStrategy}>
                <div className="grid gap-3">
                  <AnimatePresence initial={false}>
                    {visible.map((task) => (
                      <SortableTask
                        key={task.id}
                        task={task}
                        isActive={task.id === timer.activeTaskId}
                        timerStatus={timer.status}
                        currentSessionSeconds={currentSessionSeconds}
                        onStart={beginTask}
                        onPause={pauseTimer}
                        onResume={resumeTimer}
                        onStop={finishTimer}
                        onImmerse={openImmersive}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      </motion.div>

      <CreateTaskDialog
        open={createOpen}
        title={title}
        minutes={taskMinutes}
        mode={taskMode}
        setTitle={setTitle}
        setMinutes={setTaskMinutes}
        setMode={setTaskMode}
        onClose={() => setCreateOpen(false)}
        onSubmit={submitTask}
      />

      {immersiveTask && (
        <ImmersiveFocus
          task={immersiveTask}
          timerStatus={immersiveTask.id === timer.activeTaskId ? timer.status : "idle"}
          currentSessionSeconds={immersiveTask.id === timer.activeTaskId ? currentSessionSeconds : 0}
          noise={noise}
          setNoise={setNoise}
          onStart={beginTask}
          onPause={pauseTimer}
          onResume={resumeTimer}
          onStop={finishTimer}
          onClose={closeImmersive}
        />
      )}
    </>
  );
}
