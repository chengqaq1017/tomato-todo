import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import { useProductivityStore } from "../../stores/productivity-store";
import { todayKey } from "../../lib/utils";
import type { Habit } from "../../types/domain";

function lastDays(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - index - 1));
    return todayKey(date);
  });
}

function streak(habit: Habit) {
  let count = 0;
  const date = new Date();
  while (habit.checkIns.includes(todayKey(date))) {
    count += 1;
    date.setDate(date.getDate() - 1);
  }
  return count;
}

export default function HabitsPage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const habits = useProductivityStore((state) => state.habits);
  const addHabit = useProductivityStore((state) => state.addHabit);
  const toggleHabit = useProductivityStore((state) => state.toggleHabit);
  const updateHabit = useProductivityStore((state) => state.updateHabit);
  const deleteHabit = useProductivityStore((state) => state.deleteHabit);
  const days = useMemo(() => lastDays(21), []);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>{t("habits.daily")}</CardTitle>
          <Badge>{todayKey()}</Badge>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input placeholder={t("habits.newHabit")} value={name} onChange={(event) => setName(event.target.value)} />
            <Button
              variant="primary"
              onClick={() => {
                if (!name.trim()) return;
                addHabit(name.trim());
                setName("");
              }}
            >
              <Plus size={16} />
              {t("habits.add")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        {habits.map((habit) => (
          <Card key={habit.id}>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  className="max-w-xs border-0 bg-transparent px-0 text-base font-medium focus:ring-0"
                  value={habit.name}
                  onChange={(event) => updateHabit(habit.id, { name: event.target.value })}
                />
                <Badge>{t("habits.dayStreak", { count: streak(habit) })}</Badge>
                <Button size="icon" variant="ghost" className="ml-auto" onClick={() => deleteHabit(habit.id)}>
                  <Trash2 size={16} />
                </Button>
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(3.25rem, 1fr))" }}>
                {days.map((day) => {
                  const checked = habit.checkIns.includes(day);
                  return (
                    <button
                      key={day}
                      className={`h-10 rounded-md border text-[10px] transition ${
                        checked ? "border-primary bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                      onClick={() => toggleHabit(habit.id, day)}
                      title={day}
                    >
                      {day.slice(5)}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
        {habits.length === 0 && (
          <Card className="p-6 text-sm text-muted-foreground">{t("habits.empty")}</Card>
        )}
      </div>
    </motion.div>
  );
}
