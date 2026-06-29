import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Habit, Note, PomodoroSession, PomodoroSettings, Task, TimerMode, TimerStatus } from "../types/domain";
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
  addTask: (title: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (activeId: string, overId: string) => void;
  toggleTask: (id: string) => void;
  addHabit: (name: string) => void;
  toggleHabit: (id: string, date?: string) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  addNote: () => string;
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
          title: "Quick notes",
          body: "## Capture thoughts\n\nUse Markdown for meeting notes, plans, and ideas.",
          updatedAt: new Date().toISOString(),
        },
      ],
      startTimer: (taskId) =>
        set((state) => ({
          timer: {
            ...state.timer,
            status: "running",
            startedAt: Date.now(),
            accumulatedSeconds: 0,
            activeTaskId: taskId,
          },
        })),
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
            },
          };
        }),
      resumeTimer: () =>
        set((state) => ({
          timer: { ...state.timer, status: "running", startedAt: Date.now(), pausedAt: undefined },
        })),
      stopTimer: (completed = false) =>
        set((state) => {
          const now = new Date().toISOString();
          const runningSeconds = state.timer.startedAt
            ? Math.floor((Date.now() - state.timer.startedAt) / 1000)
            : 0;
          const focusedSeconds = state.timer.accumulatedSeconds + runningSeconds;
          const plannedSeconds = durationFor(state.timer.mode, state.pomodoro);
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
          const mode = completed ? nextMode(state.timer.mode, round, state.pomodoro) : state.timer.mode;
          const tasks =
            completed && state.timer.mode === "work" && state.timer.activeTaskId
              ? state.tasks.map((task) =>
                  task.id === state.timer.activeTaskId
                    ? { ...task, completedPomodoros: task.completedPomodoros + 1, updatedAt: now }
                    : task,
                )
              : state.tasks;
          return {
            tasks,
            sessions: shouldRecord ? [session, ...state.sessions].slice(0, 1000) : state.sessions,
            timer: {
              mode,
              status: state.pomodoro.autoStartNext && completed ? "running" : "idle",
              startedAt: state.pomodoro.autoStartNext && completed ? Date.now() : undefined,
              accumulatedSeconds: 0,
              round,
              activeTaskId: state.timer.activeTaskId,
            },
          };
        }),
      skipTimer: () => get().stopTimer(true),
      setTimerMode: (mode) =>
        set((state) => ({ timer: { ...state.timer, mode, status: "idle", accumulatedSeconds: 0 } })),
      updatePomodoro: (pomodoro) => set((state) => ({ pomodoro: { ...state.pomodoro, ...pomodoro } })),
      addTask: (title) =>
        set((state) => {
          const now = new Date().toISOString();
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
                completed: false,
                order: 0,
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
      addNote: () => {
        const id = uid("note");
        set((state) => ({
          notes: [{ id, title: "Untitled note", body: "", updatedAt: new Date().toISOString() }, ...state.notes],
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
    { name: "tomato-productivity" },
  ),
);
