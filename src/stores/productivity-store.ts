import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Habit,
  Note,
  PomodoroSession,
  PomodoroSettings,
  Task,
  TaskTimerMode,
  TimerMode,
  TimerStatus,
} from "../types/domain";
import { uid, todayKey } from "../lib/utils";

interface ProductivityState {
  timer: {
    mode: TimerMode;
    status: TimerStatus;
    startedAt?: number;
    pausedAt?: number;
    accumulatedSeconds: number;
    round: number;
    activeTaskId?: string;
  };
  pomodoro: PomodoroSettings;
  sessions: PomodoroSession[];
  tasks: Task[];
  habits: Habit[];
  notes: Note[];
  startTimer: (taskId?: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: (completed?: boolean) => void;
  skipTimer: () => void;
  setTimerMode: (mode: TimerMode) => void;
  updatePomodoro: (settings: Partial<PomodoroSettings>) => void;
  addTask: (title: string, targetSeconds?: number, timerMode?: TaskTimerMode) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (activeId: string, overId: string) => void;
  toggleTask: (id: string) => void;
  addHabit: (name: string) => void;
  toggleHabit: (id: string, date?: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  addNote: (titleOverride?: string) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
}

const defaultPomodoro: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartNext: false,
  soundEnabled: true,
};

const defaultNoteTitle = "快速笔记";
const defaultNoteBody = "## 记录想法\n\n用标记语法记录会议纪要、计划和灵感。";
const defaultTaskTargetSeconds = 25 * 60;

function withTaskDefaults(task: Task): Task {
  return {
    ...task,
    timerMode: task.timerMode ?? "countdown",
    targetSeconds: task.targetSeconds ?? defaultTaskTargetSeconds,
    focusedSeconds: task.focusedSeconds ?? 0,
  };
}

function durationFor(mode: TimerMode, settings: PomodoroSettings) {
  if (mode === "work") return settings.workMinutes * 60;
  if (mode === "shortBreak") return settings.shortBreakMinutes * 60;
  return settings.longBreakMinutes * 60;
}

function nextMode(mode: TimerMode, round: number, settings: PomodoroSettings): TimerMode {
  if (mode !== "work") return "work";
  return round > 0 && round % settings.longBreakEvery === 0 ? "longBreak" : "shortBreak";
}

export const useProductivityStore = create<ProductivityState>()(
  persist(
    (set, get) => ({
      timer: { mode: "work", status: "idle", accumulatedSeconds: 0, round: 0 },
      pomodoro: defaultPomodoro,
      sessions: [],
      tasks: [],
      habits: [],
      notes: [
        {
          id: uid("note"),
          title: defaultNoteTitle,
          body: defaultNoteBody,
          updatedAt: new Date().toISOString(),
        },
      ],
      startTimer: (taskId) =>
        set((state) => {
          const continuingSameTask =
            state.timer.status === "paused" &&
            state.timer.activeTaskId === taskId &&
            state.timer.accumulatedSeconds > 0;

          return {
            timer: {
              ...state.timer,
              status: "running",
              startedAt: Date.now(),
              pausedAt: undefined,
              accumulatedSeconds: continuingSameTask ? state.timer.accumulatedSeconds : 0,
              activeTaskId: taskId,
            },
          };
        }),
      pauseTimer: () =>
        set((state) => {
          if (state.timer.status !== "running" || !state.timer.startedAt) return state;
          const elapsed = Math.floor((Date.now() - state.timer.startedAt) / 1000);
          return {
            timer: {
              ...state.timer,
              status: "paused",
              pausedAt: Date.now(),
              startedAt: undefined,
              accumulatedSeconds: state.timer.accumulatedSeconds + elapsed,
              activeTaskId: state.timer.activeTaskId,
            },
          };
        }),
      resumeTimer: () =>
        set((state) =>
          state.timer.status === "paused"
            ? { timer: { ...state.timer, status: "running", startedAt: Date.now(), pausedAt: undefined } }
            : state,
        ),
      stopTimer: (completed = false) =>
        set((state) => {
          const now = new Date().toISOString();
          const runningSeconds = state.timer.startedAt
            ? Math.floor((Date.now() - state.timer.startedAt) / 1000)
            : 0;
          const focusedSeconds = state.timer.accumulatedSeconds + runningSeconds;
          const activeTask = state.timer.activeTaskId
            ? state.tasks.find((task) => task.id === state.timer.activeTaskId)
            : undefined;
          const plannedSeconds =
            state.timer.mode === "work" && activeTask
              ? Math.max(activeTask.targetSeconds ?? defaultTaskTargetSeconds, focusedSeconds)
              : durationFor(state.timer.mode, state.pomodoro);
          const shouldRecord = focusedSeconds > 0;
          const session: PomodoroSession = {
            id: uid("session"),
            mode: state.timer.mode,
            taskId: state.timer.activeTaskId,
            startedAt: new Date(Date.now() - focusedSeconds * 1000).toISOString(),
            endedAt: now,
            plannedSeconds,
            focusedSeconds,
            completed,
          };
          const round = completed && state.timer.mode === "work" ? state.timer.round + 1 : state.timer.round;
          const mode = state.timer.activeTaskId ? "work" : completed ? nextMode(state.timer.mode, round, state.pomodoro) : state.timer.mode;
          const tasks = state.tasks.map((task) => {
            if (task.id !== state.timer.activeTaskId || state.timer.mode !== "work") return task;
            return {
              ...task,
              focusedSeconds: (task.focusedSeconds ?? 0) + focusedSeconds,
              completedPomodoros: completed ? task.completedPomodoros + 1 : task.completedPomodoros,
              updatedAt: now,
            };
          });
          return {
            tasks,
            sessions: shouldRecord ? [session, ...state.sessions].slice(0, 1000) : state.sessions,
            timer: {
              mode,
              status: !state.timer.activeTaskId && state.pomodoro.autoStartNext && completed ? "running" : "idle",
              startedAt: !state.timer.activeTaskId && state.pomodoro.autoStartNext && completed ? Date.now() : undefined,
              accumulatedSeconds: 0,
              round,
              activeTaskId: undefined,
            },
          };
        }),
      skipTimer: () => get().stopTimer(true),
      setTimerMode: (mode) =>
        set((state) => ({ timer: { ...state.timer, mode, status: "idle", accumulatedSeconds: 0 } })),
      updatePomodoro: (pomodoro) => set((state) => ({ pomodoro: { ...state.pomodoro, ...pomodoro } })),
      addTask: (title, targetSeconds = defaultTaskTargetSeconds, timerMode = "countdown") =>
        set((state) => {
          const createdAt = new Date();
          const now = createdAt.toISOString();
          return {
            tasks: [
              {
                id: uid("task"),
                title,
                notes: "",
                priority: "medium",
                tags: [],
                estimatedPomodoros: 1,
                completedPomodoros: 0,
                timerMode,
                targetSeconds,
                focusedSeconds: 0,
                completed: false,
                order: 0,
                deadline: todayKey(createdAt),
                createdAt: now,
                updatedAt: now,
              },
              ...state.tasks.map((task) => ({ ...task, order: task.order + 1 })),
            ],
          };
        }),
      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task,
          ),
        })),
      deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
      reorderTasks: (activeId, overId) =>
        set((state) => {
          const sorted = [...state.tasks].sort((a, b) => a.order - b.order);
          const from = sorted.findIndex((task) => task.id === activeId);
          const to = sorted.findIndex((task) => task.id === overId);
          if (from < 0 || to < 0) return state;
          const [moved] = sorted.splice(from, 1);
          sorted.splice(to, 0, moved);
          return { tasks: sorted.map((task, order) => ({ ...task, order })) };
        }),
      toggleTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  completed: !task.completed,
                  completedAt: task.completed ? undefined : new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              : task,
          ),
        })),
      addHabit: (name) =>
        set((state) => ({
          habits: [
            ...state.habits,
            { id: uid("habit"), name, color: "hsl(164 85% 38%)", checkIns: [], createdAt: new Date().toISOString() },
          ],
        })),
      toggleHabit: (id, date = todayKey()) =>
        set((state) => ({
          habits: state.habits.map((habit) =>
            habit.id === id
              ? {
                  ...habit,
                  checkIns: habit.checkIns.includes(date)
                    ? habit.checkIns.filter((item) => item !== date)
                    : [...habit.checkIns, date],
                }
              : habit,
          ),
        })),
      updateHabit: (id, updates) =>
        set((state) => ({ habits: state.habits.map((habit) => (habit.id === id ? { ...habit, ...updates } : habit)) })),
      deleteHabit: (id) => set((state) => ({ habits: state.habits.filter((habit) => habit.id !== id) })),
      addNote: (titleOverride?: string) => {
        const id = uid("note");
        set((state) => ({
          notes: [{ id, title: titleOverride ?? "未命名笔记", body: "", updatedAt: new Date().toISOString() }, ...state.notes],
        }));
        return id;
      },
      updateNote: (id, updates) =>
        set((state) => ({
          notes: state.notes.map((note) =>
            note.id === id ? { ...note, ...updates, updatedAt: new Date().toISOString() } : note,
          ),
        })),
      deleteNote: (id) => set((state) => ({ notes: state.notes.filter((note) => note.id !== id) })),
    }),
    {
      name: "tomato-productivity",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<ProductivityState>;
        return {
          ...state,
          tasks: state.tasks?.map((task) => withTaskDefaults(task)),
          notes: state.notes?.map((note) => ({
            ...note,
            title: note.title === "Quick notes" || note.title === "Untitled note" ? defaultNoteTitle : note.title,
            body:
              note.body === "## Capture thoughts\n\nUse Markdown for meeting notes, plans, and ideas."
                ? defaultNoteBody
                : note.body,
          })),
        };
      },
    },
  ),
);
