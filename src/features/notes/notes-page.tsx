import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { Input, Textarea } from "../../components/ui/input";
import { useProductivityStore } from "../../stores/productivity-store";

export default function NotesPage() {
  const notes = useProductivityStore((state) => state.notes);
  const addNote = useProductivityStore((state) => state.addNote);
  const updateNote = useProductivityStore((state) => state.updateNote);
  const deleteNote = useProductivityStore((state) => state.deleteNote);
  const [activeId, setActiveId] = useState(notes[0]?.id ?? "");
  const active = notes.find((note) => note.id === activeId) ?? notes[0];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid min-h-[calc(100vh-7rem)] gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="min-h-0">
        <CardContent className="flex h-full flex-col gap-3">
          <Button
            variant="primary"
            onClick={() => {
              const id = addNote();
              setActiveId(id);
            }}
          >
            <Plus size={16} />
            New note
          </Button>
          <div className="scrollbar grid gap-2 overflow-auto">
            {notes.map((note) => (
              <button
                key={note.id}
                className={`rounded-md p-3 text-left text-sm transition ${
                  note.id === active?.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
                }`}
                onClick={() => setActiveId(note.id)}
              >
                <div className="truncate font-medium">{note.title}</div>
                <div className="mt-1 truncate text-xs opacity-75">{new Date(note.updatedAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {active && (
        <div className="grid min-h-0 gap-4 xl:grid-cols-2">
          <Card className="min-h-0">
            <CardContent className="flex h-full flex-col gap-3">
              <div className="flex gap-2">
                <Input value={active.title} onChange={(event) => updateNote(active.id, { title: event.target.value })} />
                <Button size="icon" variant="ghost" onClick={() => deleteNote(active.id)}>
                  <Trash2 size={16} />
                </Button>
              </div>
              <Textarea
                className="min-h-[520px] flex-1 font-mono"
                value={active.body}
                onChange={(event) => updateNote(active.id, { body: event.target.value })}
              />
            </CardContent>
          </Card>
          <Card className="min-h-0">
            <CardContent className="prose prose-sm max-w-none overflow-auto text-foreground dark:prose-invert">
              <ReactMarkdown>{active.body || "_Nothing yet._"}</ReactMarkdown>
            </CardContent>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
