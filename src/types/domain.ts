export type TimerMode = "work" | "shortBreak" | "longBreak";
export type TimerStatus = "idle" | "running" | "paused";
export type Priority = "low" | "medium" | "high";
export type ThemeMode = "light" | "dark" | "system";

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  autoStartNext: boolean;
  soundEnabled: boolean;
}

export interface PomodoroSession {
  id: string;
  mode: TimerMode;
  taskId?: string;
  startedAt: string;
  endedAt: string;
  plannedSeconds: number;
  focusedSeconds: number;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  priority: Priority;
  tags: string[];
  deadline?: string;
  estimatedPomodoros: number;
  completedPomodoros: number;
  completed: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface Habit {
  id: string;
  name: string;
  color: string;
  checkIns: string[];
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

export interface AppSettings {
  theme: ThemeMode;
  accent: string;
  radius: number;
  blur: boolean;
  autoLaunch: boolean;
  hideToTray: boolean;
  alwaysOnTop: boolean;
  window: {
    width: number;
    height: number;
    x?: number;
    y?: number;
  };
}
