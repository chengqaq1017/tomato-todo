import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { useProductivityStore } from "../../stores/productivity-store";
import { formatDuration, todayKey } from "../../lib/utils";

type RangeKey = "week" | "month" | "year";

function days(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - index - 1));
    return todayKey(date);
  });
}

function months(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (count - index - 1), 1);
    return date.toISOString().slice(0, 7);
  });
}

function startFor(range: RangeKey) {
  const date = new Date();
  if (range === "week") date.setDate(date.getDate() - 6);
  if (range === "month") date.setDate(date.getDate() - 29);
  if (range === "year") date.setFullYear(date.getFullYear() - 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function StatisticsPage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<RangeKey>("week");
  const sessions = useProductivityStore((state) => state.sessions);
  const tasks = useProductivityStore((state) => state.tasks);
  const habits = useProductivityStore((state) => state.habits);
  const rangeStart = useMemo(() => startFor(range), [range]);
  const filteredSessions = useMemo(
    () => sessions.filter((session) => session.mode === "work" && new Date(session.endedAt) >= rangeStart),
    [rangeStart, sessions],
  );
  const chartData = useMemo(() => {
    if (range === "year") {
      return months(12).map((month) => ({
        label: month.slice(5),
        minutes: Math.round(
          filteredSessions
            .filter((session) => session.endedAt.startsWith(month))
            .reduce((sum, session) => sum + session.focusedSeconds, 0) / 60,
        ),
      }));
    }

    const count = range === "week" ? 7 : 30;
    return days(count).map((day) => ({
      label: range === "week" ? day.slice(5) : day.slice(8),
      minutes: Math.round(
        filteredSessions
          .filter((session) => session.endedAt.startsWith(day))
          .reduce((sum, session) => sum + session.focusedSeconds, 0) / 60,
      ),
    }));
  }, [filteredSessions, range]);
  const focusSeconds = filteredSessions.reduce((sum, session) => sum + session.focusedSeconds, 0);
  const completedTasks = tasks.filter((task) => task.completedAt && new Date(task.completedAt) >= rangeStart).length;
  const average = filteredSessions.length ? Math.round(focusSeconds / filteredSessions.length) : 0;
  const longestStreak = Math.max(0, ...habits.map((habit) => habit.checkIns.length));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-sm bg-muted p-1">
          {(["week", "month", "year"] as const).map((item) => (
            <Button key={item} size="sm" variant={range === item ? "primary" : "ghost"} onClick={() => setRange(item)}>
              {t(`statistics.range.${item}`)}
            </Button>
          ))}
        </div>
        <Badge>{t(`statistics.rangeDescription.${range}`)}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent><div className="text-sm text-muted-foreground">{t("statistics.focusHours")}</div><div className="mt-2 text-2xl font-semibold">{(focusSeconds / 3600).toFixed(1)}</div></CardContent></Card>
        <Card><CardContent><div className="text-sm text-muted-foreground">{t("statistics.completedTasks")}</div><div className="mt-2 text-2xl font-semibold">{completedTasks}</div></CardContent></Card>
        <Card><CardContent><div className="text-sm text-muted-foreground">{t("statistics.averageSession")}</div><div className="mt-2 text-2xl font-semibold">{formatDuration(average)}</div></CardContent></Card>
        <Card><CardContent><div className="text-sm text-muted-foreground">{t("statistics.longestStreak")}</div><div className="mt-2 text-2xl font-semibold">{longestStreak}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("statistics.focusMinutes")}</CardTitle>
          <Badge>{t(`statistics.range.${range}`)}</Badge>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("statistics.heatmap")}</CardTitle>
          <Badge>{t("statistics.monthlyActivity")}</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(2rem, 1fr))" }}>
            {chartData.map((item) => {
              const opacity = Math.min(1, 0.15 + item.minutes / 120);
              return <div key={item.label} title={item.label} className="h-8 rounded-sm border" style={{ background: `hsl(var(--primary) / ${opacity})` }} />;
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
