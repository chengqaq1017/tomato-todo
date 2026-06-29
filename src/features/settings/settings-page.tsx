import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Switch } from "../../components/ui/switch";
import { useAppStore } from "../../stores/app-store";
import { useProductivityStore } from "../../stores/productivity-store";
import { configureAutostart } from "../../services/desktop";
import type { ThemeMode } from "../../types/domain";

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const exportData = useAppStore((state) => state.exportData);
  const importData = useAppStore((state) => state.importData);
  const pomodoro = useProductivityStore((state) => state.pomodoro);
  const updatePomodoro = useProductivityStore((state) => state.updatePomodoro);

  const downloadBackup = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tomato-todo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5 xl:grid-cols-2">
      <Card>
        <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <label className="grid gap-1 text-sm">
            Theme
            <select className="h-9 rounded-md border bg-background px-3" value={settings.theme} onChange={(event) => updateSettings({ theme: event.target.value as ThemeMode })}>
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Accent HSL
            <Input value={settings.accent} onChange={(event) => updateSettings({ accent: event.target.value })} />
          </label>
          <label className="grid gap-1 text-sm">
            Radius
            <Input type="number" min={2} max={16} value={settings.radius} onChange={(event) => updateSettings({ radius: Number(event.target.value) })} />
          </label>
          <label className="flex items-center justify-between text-sm">
            Blur effects
            <Switch checked={settings.blur} onClick={() => updateSettings({ blur: !settings.blur })} />
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Desktop</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <label className="flex items-center justify-between text-sm">
            Launch on startup
            <Switch
              checked={settings.autoLaunch}
              onClick={() => {
                const enabled = !settings.autoLaunch;
                updateSettings({ autoLaunch: enabled });
                configureAutostart(enabled).catch(console.error);
              }}
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            Hide to tray
            <Switch checked={settings.hideToTray} onClick={() => updateSettings({ hideToTray: !settings.hideToTray })} />
          </label>
          <label className="flex items-center justify-between text-sm">
            Always on top
            <Switch checked={settings.alwaysOnTop} onClick={() => updateSettings({ alwaysOnTop: !settings.alwaysOnTop })} />
          </label>
          <label className="flex items-center justify-between text-sm">
            Sound reminders
            <Switch checked={pomodoro.soundEnabled} onClick={() => updatePomodoro({ soundEnabled: !pomodoro.soundEnabled })} />
          </label>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Backup and restore</CardTitle></CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={downloadBackup}>
              <Download size={16} />
              Export settings
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload size={16} />
              Import settings
            </Button>
          </div>
          <input
            ref={fileRef}
            hidden
            type="file"
            accept="application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (file) importData(await file.text());
            }}
          />
          <p className="text-sm text-muted-foreground">Backups include local tasks, sessions, notes, habits, timer preferences, and UI settings.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Keyboard</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm text-muted-foreground">
          <div className="flex justify-between"><span>Command palette</span><kbd>Ctrl K</kbd></div>
          <div className="flex justify-between"><span>Start or pause timer</span><kbd>Ctrl Alt Space</kbd></div>
          <div className="flex justify-between"><span>Show application</span><kbd>Ctrl Alt T</kbd></div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
