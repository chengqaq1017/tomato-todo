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
  Search,
  Square,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input, Textarea } from "../../components/ui/input";
import { formatDuration } from "../../lib/utils";
import { setAppFullscreen } from "../../services/desktop";
import { useProductivityStore } from "../../stores/productivity-store";
import type { Priority, Task, TaskTimerMode, TimerStatus } from "../../types/domain";

type NoiseKind = "off" | "white" | "rain" | "brown";

const priorityClass: Record<Priority, string> = {
  low: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  medium: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  high: "bg-red-500/12 text-red-700 dark:text-red-300",
};

const priorityKey = (p: Priority) => `tasks.priority.${p}` as const;

function useTicker(active: boolean) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

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
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const updateTask = useProductivityStore((state) => state.updateTask);
  const toggleTask = useProductivityStore((state) => state.toggleTask);
  const deleteTask = useProductivityStore((state) => state.deleteTask);
  const clock = taskClock(task, isActive ? currentSessionSeconds : 0);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`panel grid gap-3 p-3 ${isActive ? "border-primary/70" : ""}`}
    >
      <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr_auto]">
        <div className="flex items-start gap-2">
          <Button size="icon" variant="ghost" className="cursor-grab" {...attributes} {...listeners} title={t("tasks.drag")}>
            <GripVertical size={16} />
          </Button>
          <Button size="icon" variant={task.completed ? "primary" : "outline"} onClick={() => toggleTask(task.id)} title={t("tasks.complete")}>
            <Check size={16} />
          </Button>
        </div>

        <div className="grid min-w-[116px] place-items-center gap-1 rounded-sm border bg-background px-3 py-2">
          <div className="font-mono text-2xl font-semibold tabular-nums">{formatDuration(clock.labelSeconds)}</div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${clock.progress}%` }} />
          </div>
          <span className="text-[11px] text-muted-foreground">
            {isActive ? t("tasks.currentSession") : t("tasks.readyToFocus")}
          </span>
        </div>

        <div className="min-w-0">
          <Input
            className="border-0 bg-transparent px-0 text-base font-medium focus:ring-0"
            value={task.title}
            onChange={(event) => updateTask(task.id, { title: event.target.value })}
          />
          <Textarea
            className="mt-1 min-h-16"
            placeholder={t("tasks.notesPlaceholder")}
            value={task.notes}
            onChange={(event) => updateTask(task.id, { notes: event.target.value })}
          />
        </div>

        <div className="grid min-w-[132px] content-start gap-2">
          {isActive && timerStatus === "running" ? (
            <Button variant="primary" onClick={onPause}>
              <Pause size={15} />
              {t("pomodoro.pause")}
            </Button>
          ) : isActive && timerStatus === "paused" ? (
            <Button variant="primary" onClick={onResume}>
              <Play size={15} />
              {t("pomodoro.resume")}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => onStart(task)}>
              <Play size={15} />
              {t("tasks.startTimer")}
            </Button>
          )}
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
          <Button variant="ghost" onClick={() => deleteTask(task.id)}>
            <Trash2 size={15} />
            {t("tasks.delete")}
          </Button>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-[140px_140px_150px_1fr_150px]">
        <select
          className="h-9 rounded-sm border bg-input px-3 text-sm"
          value={task.priority}
          onChange={(event) => updateTask(task.id, { priority: event.target.value as Priority })}
        >
          <option value="low">{t("tasks.priority.low")}</option>
          <option value="medium">{t("tasks.priority.medium")}</option>
          <option value="high">{t("tasks.priority.high")}</option>
        </select>
        <select
          className="h-9 rounded-sm border bg-input px-3 text-sm"
          value={task.timerMode}
          onChange={(event) => updateTask(task.id, { timerMode: event.target.value as TaskTimerMode })}
        >
          <option value="countup">{t("tasks.countup")}</option>
          <option value="countdown">{t("tasks.countdown")}</option>
        </select>
        <Input
          type="number"
          min={1}
          value={Math.max(1, Math.round((task.targetSeconds || 1500) / 60))}
          onChange={(event) => updateTask(task.id, { targetSeconds: Math.max(1, Number(event.target.value) || 1) * 60 })}
          title={t("tasks.targetMinutes")}
        />
        <Input
          placeholder={t("tasks.tagsPlaceholder")}
          value={task.tags.join(", ")}
          onChange={(event) =>
            updateTask(task.id, {
              tags: event.target.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
        />
        <Input
          type="date"
          value={task.deadline ?? ""}
          onChange={(event) => updateTask(task.id, { deadline: event.target.value })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className={priorityClass[task.priority]}>{t(priorityKey(task.priority))}</Badge>
        <Badge>
          <Clock3 size={13} className="mr-1" />
          {t("tasks.focusedTotal", { time: formatDuration(task.focusedSeconds ?? 0) })}
        </Badge>
        <Badge>{t("tasks.targetMinutesBadge", { minutes: Math.round((task.targetSeconds || 1500) / 60) })}</Badge>
        {task.deadline && (
          <Badge>
            <CalendarDays size={13} className="mr-1" />
            {task.deadline}
          </Badge>
        )}
        {task.tags.map((tag) => (
          <Badge key={tag}>#{tag}</Badge>
        ))}
      </div>
    </div>
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");
  const [title, setTitle] = useState("");
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
  const now = useTicker(timer.status === "running");
  const currentSessionSeconds = elapsedSeconds(timer, now);
  const activeTask = tasks.find((task) => task.id === timer.activeTaskId);
  const immersiveTask = tasks.find((task) => task.id === immersiveTaskId);

  useWhiteNoise(noise);

  const filterLabels: Record<string, string> = {
    active: t("tasks.filterActive"),
    completed: t("tasks.filterCompleted"),
    all: t("tasks.filterAll"),
  };

  const visible = useMemo(() => {
    return [...tasks]
      .sort((a, b) => a.order - b.order)
      .filter((task) => filter === "all" || (filter === "completed" ? task.completed : !task.completed))
      .filter((task) => {
        const haystack = `${task.title} ${task.notes} ${task.tags.join(" ")}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      });
  }, [filter, query, tasks]);

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

  const onDragEnd = (event: DragEndEvent) => {
    if (event.over && event.active.id !== event.over.id) {
      reorderTasks(String(event.active.id), String(event.over.id));
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("tasks.inbox")}</CardTitle>
            <Badge>{t("tasks.shown", { count: visible.length })}</Badge>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <Input placeholder={t("tasks.createTask")} value={title} onChange={(event) => setTitle(event.target.value)} />
              <Button
                variant="primary"
                onClick={() => {
                  if (!title.trim()) return;
                  addTask(title.trim());
                  setTitle("");
                }}
              >
                <Plus size={16} />
                {t("tasks.add")}
              </Button>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
                <Input className="pl-9" placeholder={t("tasks.searchPlaceholder")} value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <div className="flex gap-1 rounded-sm bg-muted p-1">
                {(["active", "completed", "all"] as const).map((item) => (
                  <Button key={item} size="sm" variant={filter === item ? "primary" : "ghost"} onClick={() => setFilter(item)}>
                    {filterLabels[item]}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <DndContext onDragEnd={onDragEnd}>
          <SortableContext items={visible.map((task) => task.id)} strategy={verticalListSortingStrategy}>
            <div className="grid gap-3">
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
            </div>
          </SortableContext>
        </DndContext>
      </motion.div>

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
