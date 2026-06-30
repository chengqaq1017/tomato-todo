import { type ReactNode, useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { BarChart3, CalendarClock, CheckSquare, Command, Headphones, NotebookPen, Settings, Sprout } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { StatusBar } from "../components/status-bar";
import { useAppStore } from "../stores/app-store";
import { getNowPlaying, type NowPlaying } from "../services/desktop";
import { formatLocalDateTime } from "../lib/utils";

export function AppLayout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const setCommandOpen = useAppStore((state) => state.setCommandOpen);
  const [clockNow, setClockNow] = useState(Date.now());
  const [nowPlaying, setNowPlaying] = useState<NowPlaying>({
    isPlaying: false,
    title: "",
    artist: "",
    source: "",
  });

  const nav = [
    { to: "/", label: t("nav.tasks"), icon: CheckSquare, file: "任务清单", desc: "管理待办、优先级、标签和任务计时。" },
    { to: "/statistics", label: t("nav.stats"), icon: BarChart3, file: "统计概览", desc: "查看专注时长、完成情况和活跃趋势。" },
    { to: "/habits", label: t("nav.habits"), icon: Sprout, file: "习惯追踪", desc: "记录每日习惯和连续打卡。" },
    { to: "/notes", label: t("nav.notes"), icon: NotebookPen, file: "笔记", desc: "写下计划、会议纪要和灵感。" },
    { to: "/settings", label: t("nav.settings"), icon: Settings, file: "偏好设置", desc: "调整外观、桌面行为和快捷键。" },
  ];

  const currentPath = location.pathname === "/tasks" ? "/" : location.pathname;
  const page = nav.find((item) => item.to === currentPath) ?? nav[0];
  const PageIcon = page.icon;
  const musicText = nowPlaying.title
    ? `${nowPlaying.isPlaying ? t("music.playing") : t("music.paused")} · ${nowPlaying.title}${
        nowPlaying.artist ? ` - ${nowPlaying.artist}` : ""
      }`
    : t("music.none");
  const clockText = formatLocalDateTime(new Date(clockNow), i18n.language);

  useEffect(() => {
    let cancelled = false;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const music = await getNowPlaying();
        if (!cancelled) {
          setNowPlaying((current) =>
            current.isPlaying === music.isPlaying &&
            current.title === music.title &&
            current.artist === music.artist &&
            current.source === music.source
              ? current
              : music,
          );
        }
      } finally {
        refreshing = false;
      }
    };
    const first = window.setTimeout(refresh, 1500);
    const id = window.setInterval(refresh, 15000);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setClockNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-screen bg-editor text-foreground">
      {/* ── Activity Bar ── */}
      <aside className="hidden w-12 shrink-0 flex-col items-center border-r border-border bg-activitybar py-2 md:flex">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = item.to === currentPath;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`group relative grid h-12 w-12 place-items-center text-muted-foreground transition hover:text-foreground ${
                active ? "text-foreground" : ""
              }`}
              title={item.label}
            >
              {active && <span className="absolute left-0 top-1 h-10 w-0.5 bg-foreground" />}
              <Icon size={22} strokeWidth={1.8} />
              <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden w-56 -translate-y-1/2 border border-border bg-card px-3 py-2 text-left text-xs text-foreground shadow-lg group-hover:block">
                <span className="block font-semibold">{item.label}</span>
                <span className="mt-1 block leading-5 text-muted-foreground">{item.desc}</span>
              </span>
            </NavLink>
          );
        })}
        <Button
          className="mt-auto text-muted-foreground"
          size="icon"
          variant="ghost"
          onClick={() => setCommandOpen(true)}
          title={t("nav.commandPalette")}
        >
          <Command size={20} />
        </Button>
      </aside>

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-9 shrink-0 items-center justify-between border-b border-border bg-titlebar">
          <div className="flex min-w-0 flex-1 items-center">
            <div className="vscode-tab">
              <PageIcon size={14} className="mr-2 text-primary" />
              <span className="truncate">{page.file}</span>
            </div>
            <div
              className="mx-auto hidden max-w-[38vw] items-center gap-2 truncate px-3 text-xs text-muted-foreground lg:flex"
              title={musicText}
            >
              <Headphones size={14} className={nowPlaying.isPlaying ? "text-primary" : "text-muted-foreground"} />
              <span className="truncate">{musicText}</span>
            </div>
            <div className="hidden shrink-0 items-center gap-2 px-3 text-xs text-muted-foreground md:flex" title={clockText}>
              <CalendarClock size={14} className="text-primary" />
              <span className="tabular-nums">{clockText}</span>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="mr-1 h-7 w-7"
            onClick={() => setCommandOpen(true)}
            title={t("nav.commandPalette")}
          >
            <Command size={16} />
          </Button>
        </header>
        <main className="scrollbar min-h-0 flex-1 overflow-auto bg-editor p-3 lg:p-4">{children}</main>
        <StatusBar />
      </div>
    </div>
  );
}
