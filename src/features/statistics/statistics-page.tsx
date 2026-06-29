import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { useProductivityStore } from "../../stores/productivity-store";
import { formatDuration, todayKey } from "../../lib/utils";

function days(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - index - 1));
    return todayKey(date);
  });
}

export default function StatisticsPage() {
  const sessions = useProductivityStore((state) => state.sessions);
  const tasks = useProductivityStore((state) => state.tasks);
  const habits = useProductivityStore((state) => state.habits);
  const chartData = useMemo(
    () =>
      days(14).map((day) => ({
        day: day.slice(5),
        minutes: Math.round(
          sessions
            .filter((session) => session.mode === "work" && session.endedAt.startsWith(day))
            .reduce((sum, session) => sum + session.focusedSeconds, 0) / 60,
        ),
      })),
    [sessions],
  );
  const focusSeconds = sessions.filter((session) => session.mode === "work").reduce((sum, session) => sum + session.focusedSeconds, 0);
  const completedTasks = tasks.filter((task) => task.completed).length;
  const average = sessions.length ? Math.round(sessions.reduce((sum, session) => sum + session.focusedSeconds, 0) / sessions.length) : 0;
  const longestStreak = Math.max(0, ...habits.map((habit) => habit.checkIns.length));

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent><div className="text-sm text-muted-foreground">Focus hours</div><div className="mt-2 text-2xl font-semibold">{(focusSeconds / 3600).toFixed(1)}</div></CardContent></Card>
        <Card><CardContent><div className="text-sm text-muted-foreground">Completed tasks</div><div className="mt-2 text-2xl font-semibold">{completedTasks}</div></CardContent></Card>
        <Card><CardContent><div className="text-sm text-muted-foreground">Average session</div><div className="mt-2 text-2xl font-semibold">{formatDuration(average)}</div></CardContent></Card>
        <Card><CardContent><div className="text-sm text-muted-foreground">Longest streak</div><div className="mt-2 text-2xl font-semibold">{longestStreak}</div></CardContent></Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Focus minutes</CardTitle>
          <Badge>Last 14 days</Badge>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="minutes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Heatmap</CardTitle>
          <Badge>Monthly activity</Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(2rem, 1fr))" }}>
            {days(42).map((day) => {
              const minutes = chartData.find((item) => item.day === day.slice(5))?.minutes ?? 0;
              const opacity = Math.min(1, 0.15 + minutes / 120);
              return <div key={day} title={day} className="h-8 rounded-md border" style={{ background: `hsl(var(--primary) / ${opacity})` }} />;
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
