import { useMemo, useState } from "react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Check, GripVertical, Play, Plus, Search, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input, Textarea } from "../../components/ui/input";
import { useProductivityStore } from "../../stores/productivity-store";
import type { Priority, Task } from "../../types/domain";

const priorityClass: Record<Priority, string> = {
  low: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  medium: "bg-blue-500/12 text-blue-700 dark:text-blue-300",
  high: "bg-red-500/12 text-red-700 dark:text-red-300",
};

function SortableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });
  const updateTask = useProductivityStore((state) => state.updateTask);
  const toggleTask = useProductivityStore((state) => state.toggleTask);
  const deleteTask = useProductivityStore((state) => state.deleteTask);
  const startTimer = useProductivityStore((state) => state.startTimer);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="panel grid gap-3 p-3"
    >
      <div className="flex items-start gap-3">
        <Button size="icon" variant="ghost" className="cursor-grab" {...attributes} {...listeners} title="Drag">
          <GripVertical size={16} />
        </Button>
        <Button size="icon" variant={task.completed ? "primary" : "outline"} onClick={() => toggleTask(task.id)} title="Complete">
          <Check size={16} />
        </Button>
        <div className="min-w-0 flex-1">
          <Input
            className="border-0 bg-transparent px-0 text-base font-medium focus:ring-0"
            value={task.title}
            onChange={(event) => updateTask(task.id, { title: event.target.value })}
          />
          <Textarea
            className="mt-1 min-h-16"
            placeholder="Notes"
            value={task.notes}
            onChange={(event) => updateTask(task.id, { notes: event.target.value })}
          />
        </div>
        <Button size="icon" variant="ghost" onClick={() => startTimer(task.id)} title="Start task timer">
          <Play size={16} />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => deleteTask(task.id)} title="Delete">
          <Trash2 size={16} />
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-[140px_1fr_150px_140px]">
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={task.priority}
          onChange={(event) => updateTask(task.id, { priority: event.target.value as Priority })}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <Input
          placeholder="tags, separated, by comma"
          value={task.tags.join(", ")}
          onChange={(event) =>
            updateTask(task.id, {
              tags: event.target.value
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            })
          }
        />
        <Input
          type="date"
          value={task.deadline ?? ""}
          onChange={(event) => updateTask(task.id, { deadline: event.target.value })}
        />
        <Input
          type="number"
          min={1}
          value={task.estimatedPomodoros}
          onChange={(event) => updateTask(task.id, { estimatedPomodoros: Number(event.target.value) })}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={priorityClass[task.priority]}>{task.priority}</Badge>
        {task.deadline && (
          <Badge>
            <CalendarDays size={13} className="mr-1" />
            {task.deadline}
          </Badge>
        )}
        <Badge>
          {task.completedPomodoros}/{task.estimatedPomodoros} pomodoros
        </Badge>
        {task.tags.map((tag) => (
          <Badge key={tag}>#{tag}</Badge>
        ))}
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"active" | "completed" | "all">("active");
  const [title, setTitle] = useState("");
  const tasks = useProductivityStore((state) => state.tasks);
  const addTask = useProductivityStore((state) => state.addTask);
  const reorderTasks = useProductivityStore((state) => state.reorderTasks);

  const visible = useMemo(() => {
    return [...tasks]
      .sort((a, b) => a.order - b.order)
      .filter((task) => filter === "all" || (filter === "completed" ? task.completed : !task.completed))
      .filter((task) => {
        const haystack = `${task.title} ${task.notes} ${task.tags.join(" ")}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      });
  }, [filter, query, tasks]);

  const onDragEnd = (event: DragEndEvent) => {
    if (event.over && event.active.id !== event.over.id) {
      reorderTasks(String(event.active.id), String(event.over.id));
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Task inbox</CardTitle>
          <Badge>{visible.length} shown</Badge>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <Input placeholder="Create a task" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Button
              variant="primary"
              onClick={() => {
                if (!title.trim()) return;
                addTask(title.trim());
                setTitle("");
              }}
            >
              <Plus size={16} />
              Add
            </Button>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-muted-foreground" size={16} />
              <Input className="pl-9" placeholder="Search tasks, notes, tags" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="flex gap-1 rounded-md bg-muted p-1">
              {(["active", "completed", "all"] as const).map((item) => (
                <Button key={item} size="sm" variant={filter === item ? "primary" : "ghost"} onClick={() => setFilter(item)}>
                  {item}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <DndContext onDragEnd={onDragEnd}>
        <SortableContext items={visible.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-3">
            {visible.map((task) => (
              <SortableTask key={task.id} task={task} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </motion.div>
  );
}
