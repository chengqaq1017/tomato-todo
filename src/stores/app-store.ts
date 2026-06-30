import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AppSettings } from "../types/domain";

interface AppState {
  commandOpen: boolean;
  settings: AppSettings;
  setCommandOpen: (open: boolean) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  exportData: () => string;
  importData: (raw: string) => void;
}

const defaultSettings: AppSettings = {
  theme: "dark",
  language: "zh-CN",
  accent: "211 100% 40%",
  radius: 4,
  blur: true,
  autoLaunch: false,
  hideToTray: true,
  alwaysOnTop: false,
  window: { width: 1180, height: 760 },
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      commandOpen: false,
      settings: defaultSettings,
      setCommandOpen: (commandOpen) => set({ commandOpen }),
      updateSettings: (settings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...settings,
            window: { ...state.settings.window, ...settings.window },
          },
        })),
      exportData: () => {
        const data = Object.keys(localStorage).reduce<Record<string, string>>((acc, key) => {
          if (key.startsWith("tomato-")) {
            acc[key] = localStorage.getItem(key) ?? "";
          }
          return acc;
        }, {});
        return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
      },
      importData: (raw) => {
        const parsed = JSON.parse(raw) as { data: Record<string, string> };
        Object.entries(parsed.data).forEach(([key, value]) => localStorage.setItem(key, value));
        get().setCommandOpen(false);
        window.location.reload();
      },
    }),
    {
      name: "tomato-app",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as Partial<AppState>;
        return {
          ...state,
          settings: {
            ...defaultSettings,
            ...state.settings,
            theme: "dark",
            language: "zh-CN",
            window: { ...defaultSettings.window, ...state.settings?.window },
          },
        };
      },
    },
  ),
);
