import { lazy, Suspense, useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import i18next from "i18next";
import { AppLayout } from "../layouts/app-layout";
import { CommandPalette } from "../components/command-palette";
import { Skeleton } from "../components/ui/skeleton";
import { useAppStore } from "../stores/app-store";
import { useProductivityStore } from "../stores/productivity-store";
import { registerGlobalShortcuts } from "../services/desktop";

const TasksPage = lazy(() => import("../features/tasks/tasks-page"));
const HabitsPage = lazy(() => import("../features/habits/habits-page"));
const NotesPage = lazy(() => import("../features/notes/notes-page"));
const StatisticsPage = lazy(() => import("../features/statistics/statistics-page"));
const SettingsPage = lazy(() => import("../features/settings/settings-page"));

function Loading() {
  return (
    <div className="grid gap-4">
      <Skeleton className="h-28" />
      <Skeleton className="h-72" />
    </div>
  );
}

export function App() {
  const settings = useAppStore((state) => state.settings);
  const setCommandOpen = useAppStore((state) => state.setCommandOpen);
  const timer = useProductivityStore((state) => state.timer);
  const pauseTimer = useProductivityStore((state) => state.pauseTimer);
  const resumeTimer = useProductivityStore((state) => state.resumeTimer);

  // ── Theme + accent + radius ──
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", settings.accent);
    root.style.setProperty("--ring", settings.accent);
    root.style.setProperty("--radius", `${settings.radius}px`);
    const dark =
      settings.theme === "dark" ||
      (settings.theme === "system" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("light", !dark);
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    root.lang = settings.language;
  }, [settings]);

  // ── Sync language ──
  useEffect(() => {
    void i18next.changeLanguage(settings.language);
  }, [settings.language]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen]);

  useEffect(() => {
    registerGlobalShortcuts({
      toggleTimer: () =>
        timer.status === "running" ? pauseTimer() : resumeTimer(),
      toggleWindow: () => setCommandOpen(true),
    }).catch(console.error);
  }, [pauseTimer, resumeTimer, setCommandOpen, timer.status]);

  return (
    <HashRouter>
      <AppLayout>
        <Suspense fallback={<Loading />}>
          <AnimatePresence mode="wait">
            <Routes>
              <Route path="/" element={<TasksPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/habits" element={<HabitsPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </AppLayout>
      <CommandPalette />
    </HashRouter>
  );
}
