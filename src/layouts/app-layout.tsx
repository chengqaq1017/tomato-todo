import { type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, CheckSquare, Command, Flame, NotebookPen, Settings, Sprout } from "lucide-react";
import { Button } from "../components/ui/button";
import { useAppStore } from "../stores/app-store";
import { useProductivityStore } from "../stores/productivity-store";
import { formatDuration } from "../lib/utils";
import { useTimerSnapshot } from "../features/pomodoro/use-timer-snapshot";

const nav = [
  { to: "/", label: "Focus", icon: Flame },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/statistics", label: "Stats", icon: BarChart3 },
  { to: "/habits", label: "Habits", icon: Sprout },
  { to: "/notes", label: "Notes", icon: NotebookPen },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const setCommandOpen = useAppStore((state) => state.setCommandOpen);
  const timer = useProductivityStore((state) => state.timer);
  const pomodoro = useProductivityStore((state) => state.pomodoro);
  const snapshot = useTimerSnapshot(timer, pomodoro);
  const page = nav.find((item) => item.to === location.pathname)?.label ?? "Focus";

  return (
    <div className="flex h-screen bg-background">
      <aside className="hidden w-64 shrink-0 border-r bg-card/80 p-3 backdrop-blur md:flex md:flex-col">
        <div className="flex h-12 items-center gap-3 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <Flame size={19} />
          </div>
          <div>
            <div className="text-sm font-semibold">Tomato Todo</div>
            <div className="text-xs text-muted-foreground">{formatDuration(snapshot.remaining)} left</div>
          </div>
        </div>
        <nav className="mt-5 grid gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex h-10 items-center gap-3 rounded-md px-3 text-sm transition ${
                    isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <Button className="mt-auto justify-start" variant="outline" onClick={() => setCommandOpen(true)}>
          <Command size={16} />
          Command palette
        </Button>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card/70 px-4 backdrop-blur">
          <div>
            <h1 className="text-sm font-semibold">{page}</h1>
            <p className="text-xs text-muted-foreground md:hidden">{formatDuration(snapshot.remaining)} left</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={() => setCommandOpen(true)} title="Command palette">
              <Command size={17} />
            </Button>
          </div>
        </header>
        <main className="scrollbar min-h-0 flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
