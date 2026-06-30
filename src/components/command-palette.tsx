import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckSquare, NotebookPen, Search, Settings, Sprout, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAppStore } from "../stores/app-store";
import { useProductivityStore } from "../stores/productivity-store";

export function CommandPalette() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const open = useAppStore((state) => state.commandOpen);
  const setOpen = useAppStore((state) => state.setCommandOpen);
  const addTask = useProductivityStore((state) => state.addTask);

  const commands = useMemo(() => [
    { label: t("commandPalette.openTasks"), path: "/", icon: CheckSquare },
    { label: t("commandPalette.openStatistics"), path: "/statistics", icon: BarChart3 },
    { label: t("commandPalette.openHabits"), path: "/habits", icon: Sprout },
    { label: t("commandPalette.openNotes"), path: "/notes", icon: NotebookPen },
    { label: t("commandPalette.openSettings"), path: "/settings", icon: Settings },
  ], [t]);

  const filtered = useMemo(
    () => commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase())),
    [commands, query],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/35 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
      <div
        className="panel mx-auto mt-20 w-full max-w-xl overflow-hidden"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search size={17} className="text-muted-foreground" />
          <Input
            autoFocus
            className="border-0 bg-transparent focus:ring-0"
            placeholder={t("commandPalette.placeholder")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && query.trim()) {
                addTask(query.trim());
                setOpen(false);
                navigate("/tasks");
              }
              if (event.key === "Escape") setOpen(false);
            }}
          />
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {filtered.map((command) => {
            const Icon = command.icon;
            return (
              <Button
                key={command.path}
                className="w-full justify-start"
                variant="ghost"
                onClick={() => {
                  navigate(command.path);
                  setOpen(false);
                }}
              >
                <Icon size={16} />
                {command.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
