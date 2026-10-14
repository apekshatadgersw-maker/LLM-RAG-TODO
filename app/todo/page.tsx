"use client";
import { useEffect, useState, useRef, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { addItem } from "../features/list/listSlice";
// import { useAppDispatch, useAppSelector } from "../hook";
import { Checkbox, CircularProgress, Backdrop, Snackbar } from "@mui/material";
import Alert from "@mui/material/Alert";
import {
  Bot,
  CalendarDays,
  CircleCheckBig,
  Flame,
  ListTodo,
  PartyPopper,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";

interface advice {
  topTaskName: string;
  reason: string;
  deferTaskName: string;
  energyLevel: string;
}

interface subTask {
  id: number;
  name: string;
  type: string;
  completed: boolean;
}
interface taskDb {
  id: number;
  name: string;
  type: string;
  completed: boolean;
  createdAt: string;
  dueDate: string;
  priority: string;
  SubTasks: subTask[];
}

const API = process.env.NEXT_PUBLIC_API_URL;

const exampleTasks = [
  "Prepare client presentation",
  "Plan a weekend trip",
  "Clean up my inbox",
];

const priorityStyle: Record<string, string> = {
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
};

// Greeting depends on the viewer's clock, so it is read on the client only
// (the server render uses "Hello" to avoid a hydration mismatch).
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
const noopSubscribe = () => () => {};

export default function Todo() {
  // Read Store
  //  const items = useAppSelector((state)=> state.list.items)
  //  const dispatch = useAppDispatch();
  const greeting = useSyncExternalStore(noopSubscribe, getGreeting, () => "Hello");
  const [loading, setLoading] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [coachAdvice, setCoachAdvice] = useState<advice>();

  const [checkedTask, setCheckedTasks] = useState<taskDb[]>([]);
  const [todo, setTodo] = useState("");
  // Empty string = no error, so nothing shows on first load.
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // Load all tasks (with DB ids) from the database
  const fetchTasks = async (): Promise<taskDb[]> => {
    try {
      const res = await fetch(`${API}/api/todos`, { method: "GET" });
      const tasks = await res.json();
      if (tasks.ok) {
        setError("");
        return tasks.data;
      }
      setError(tasks.detail || "Could not load your tasks.");
    } catch {
      setError("Could not reach the server. Please check your connection.");
    }
    return [];
  };

  // Single step: LLM creates tasks -> save to DB -> reload list from DB
  const createTask = async () => {
    setLoading(true);
    try {
      const llmRes = await fetch(`${API}/api/todos/llm`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(todo),
      });
      if (!llmRes.ok) throw new Error("AI could not create the task.");
      const tasks = await llmRes.json();

      const saveRes = await fetch(`${API}/api/todos`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(tasks),
      });
      if (!saveRes.ok) throw new Error("Could not save the task.");

      setCheckedTasks(await fetchTasks());
      setTodo("");
      setToast("Task created ✨");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Could not create task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (id: number, type: string, checked: boolean) => {
    setCheckedTasks((prevTasks) => {
      // Calculate the new state
      const nextTasks = prevTasks.map((task) => {
        if (type === "main" && task.id === id) {
          return {
            ...task,
            completed: checked,
            SubTasks: task.SubTasks?.map((sub) => ({
              ...sub,
              completed: checked,
            })),
          };
        }

        if (type === "subTask" && task.SubTasks?.some((sub) => sub.id === id)) {
          const updatedSubTasks = task.SubTasks.map((sub) =>
            sub.id === id ? { ...sub, completed: checked } : sub,
          );
          return {
            ...task,
            completed: updatedSubTasks.every((sub) => sub.completed),
            SubTasks: updatedSubTasks,
          };
        }

        return task;
      });

      // 2. Clear pending timer
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // 3. Start 1s timer to trigger PUT with fresh state
      debounceRef.current = setTimeout(() => {
        fetch(`${API}/api/todos`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextTasks),
        }).catch(() => setError("Could not save your changes."));
      }, 1000);

      return nextTasks;
    });
  };

  useEffect(() => {
    let ignore = false;
    (async () => {
      const tasks = await fetchTasks();
      if (!ignore) setCheckedTasks(tasks);
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const handleAskCoach = async () => {
    setCoachLoading(true);
    try {
      const response = await fetch("/api/coach", { method: "GET" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      setCoachAdvice(data.message);
    } catch {
      setError("The coach is unavailable right now. Please try again.");
    } finally {
      setCoachLoading(false);
    }
  };

  const deleteTask = async (id: number) => {
    const response = await fetch(`${API}/api/todos/${id}`, { method: "DELETE" });
    if (response.ok) {
      setCheckedTasks((tasks) => tasks.filter((task) => task.id !== id));
      setToast("Task deleted");
    } else {
      setError("Could not delete the task.");
    }
  };

  const doneCount = checkedTask.filter((task) => task.completed).length;
  const highCount = checkedTask.filter((task) => task.priority === "HIGH" && !task.completed).length;
  const percent = checkedTask.length ? Math.round((doneCount / checkedTask.length) * 100) : 0;
  const allDone = checkedTask.length > 0 && doneCount === checkedTask.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      {/* ===== Hero: greeting + progress ring ===== */}
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 via-teal-700 to-emerald-800 p-6 text-white shadow-xl shadow-teal-900/10 sm:p-8">
        {/* soft decorative glows */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-100">{greeting} 👋</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              What&apos;s your focus today?
            </h1>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <ListTodo className="h-4 w-4" /> {checkedTask.length} tasks
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1">
                <CircleCheckBig className="h-4 w-4" /> {doneCount} done
              </span>
              {highCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full bg-rose-400/30 px-3 py-1">
                  <Flame className="h-4 w-4" /> {highCount} urgent
                </span>
              )}
            </div>
          </div>

          {/* Progress ring */}
          <div className="relative grid h-28 w-28 shrink-0 place-items-center self-center">
            <CircularProgress
              variant="determinate"
              value={100}
              size={112}
              thickness={4}
              sx={{ position: "absolute", color: "rgba(255,255,255,0.15)" }}
            />
            <CircularProgress
              variant="determinate"
              value={percent}
              size={112}
              thickness={4}
              sx={{ position: "absolute", color: "#fff", "& circle": { strokeLinecap: "round" } }}
            />
            <div className="text-center">
              <p className="text-2xl font-bold">{percent}%</p>
              <p className="text-xs text-teal-100">complete</p>
            </div>
          </div>
        </div>
      </div>

      {/* Blocks the page while the AI creates and saves tasks */}
      <Backdrop
        sx={(theme) => ({ color: "#fff", zIndex: theme.zIndex.drawer + 1 })}
        open={loading}
      >
        <div className="flex flex-col items-center gap-3">
          <CircularProgress color="inherit" />
          <span className="text-sm">AI is breaking down your task...</span>
        </div>
      </Backdrop>

      {error && (
        <Alert severity="error" onClose={() => setError("")} className="mb-6">
          {error}
        </Alert>
      )}

      {/* All done celebration */}
      {allDone && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 animate-in fade-in zoom-in-95">
          <PartyPopper className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold">All done for today! 🎉</p>
            <p className="text-sm text-emerald-700">Great work. Take a break — you earned it.</p>
          </div>
        </div>
      )}

      {/* ===== Grid: 1 column on mobile, 2/3 + 1/3 on desktop ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Create task */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="mb-3 text-sm font-medium text-slate-700">
              What do you need to get done?
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="e.g. Prepare client presentation"
                value={todo}
                onChange={(e) => setTodo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && todo && !loading && createTask()}
                className="h-11 rounded-xl text-base"
              />
              <Button
                onClick={createTask}
                disabled={loading || !todo}
                className="h-11 cursor-pointer rounded-xl bg-teal-700 px-5 text-white hover:bg-teal-800"
              >
                <Sparkles className="h-4 w-4" />
                Create with AI
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              AI splits your task into small, doable steps.
            </p>
          </div>

          {/* Task list */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Your tasks</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {checkedTask.length}
              </span>
            </div>

            {/* Empty state: one click fills the input with an example */}
            {checkedTask.length === 0 && (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700">
                  <ListTodo className="h-7 w-7" />
                </span>
                <p className="mt-4 font-medium text-slate-800">Your list is empty</p>
                <p className="mt-1 text-sm text-slate-500">Try one of these to see the AI in action:</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {exampleTasks.map((example) => (
                    <button
                      key={example}
                      onClick={() => setTodo(example)}
                      className="cursor-pointer rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {checkedTask.map((item) => {
              const done = item.SubTasks.filter((s) => s.completed).length;
              return (
                <div
                  key={item.id}
                  className="border-b border-slate-100 px-4 py-4 transition-colors last:border-0 hover:bg-slate-50/60 animate-in fade-in slide-in-from-bottom-1"
                >
                  {/* Main task row */}
                  <div className="flex items-start gap-2">
                    <Checkbox
                      color="success"
                      checked={item.completed}
                      onChange={(e) =>
                        handleChange(item.id, item.type, e.target.checked)
                      }
                    />
                    <div className="flex-1 pt-2">
                      <p
                        className={
                          item.completed
                            ? "font-medium text-slate-400 line-through"
                            : "font-medium text-slate-900"
                        }
                      >
                        {item.name}
                      </p>
                      {/* Priority badge + due date */}
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span
                          className={`rounded-full px-2 py-0.5 font-medium ring-1 ring-inset ${priorityStyle[item.priority] ?? "bg-slate-50 text-slate-600 ring-slate-200"}`}
                        >
                          {item.priority}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete task"
                      className="cursor-pointer text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      onClick={() => deleteTask(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* SubTasks */}
                  {item.SubTasks.length > 0 && (
                    <div className="ml-11 mt-3 border-l-2 border-slate-100 pl-3">
                      <div className="mb-1 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-teal-500 transition-all duration-500"
                            style={{
                              width: `${(done / item.SubTasks.length) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {done}/{item.SubTasks.length}
                        </span>
                      </div>

                      {item.SubTasks.map((sub) => (
                        <label
                          key={sub.id}
                          className="flex cursor-pointer items-center rounded-lg hover:bg-slate-100/70"
                        >
                          <Checkbox
                            size="small"
                            color="success"
                            checked={sub.completed}
                            onChange={(e) =>
                              handleChange(sub.id, sub.type, e.target.checked)
                            }
                          />
                          <span
                            className={
                              sub.completed
                                ? "text-sm text-slate-400 line-through"
                                : "text-sm text-slate-700"
                            }
                          >
                            {sub.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ----- Right (1/3 width): Coach ----- */}
        <div className="h-fit rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-6 text-white shadow-lg lg:sticky lg:top-24">
          <div className="flex items-center gap-3">
            <span className="relative grid h-10 w-10 place-items-center rounded-xl bg-teal-500/20 text-teal-300">
              <Bot className="h-5 w-5" />
              {/* "online" dot */}
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-800" />
            </span>
            <div>
              <h2 className="font-semibold">Your coach</h2>
              <p className="text-xs text-white/50">Not sure where to start? Ask me.</p>
            </div>
          </div>

          <Button
            onClick={handleAskCoach}
            disabled={coachLoading || checkedTask.length === 0}
            className="mt-5 h-11 w-full cursor-pointer rounded-xl bg-teal-400 font-medium text-slate-900 hover:bg-teal-300"
          >
            {coachLoading ? <CircularProgress size={16} color="inherit" /> : <Sparkles className="h-4 w-4" />}
            {coachLoading ? "Thinking..." : coachAdvice ? "Ask again" : "What should I do first?"}
          </Button>

          {/* Coach answer */}
          {coachAdvice ? (
            <div className="mt-6 space-y-3 rounded-xl bg-white/5 p-4 ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-teal-300">
                  Do this first
                </p>
                {coachAdvice.energyLevel && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs text-amber-300">
                    <Zap className="h-3 w-3" /> {coachAdvice.energyLevel} energy
                  </span>
                )}
              </div>
              <p className="text-lg font-semibold">{coachAdvice.topTaskName}</p>
              <p className="text-sm leading-relaxed text-white/75">{coachAdvice.reason}</p>
              {coachAdvice.deferTaskName && (
                <p className="border-t border-white/10 pt-3 text-sm text-white/50">
                  Can wait: {coachAdvice.deferTaskName}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-white/50">
              {checkedTask.length === 0
                ? "Add a task first, then I'll tell you where to start."
                : "I'll look at your open tasks and pick the one to start with."}
            </p>
          )}
        </div>
      </div>

      {/* Small toast instead of browser alert() */}
      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast("")}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setToast("")}>
          {toast}
        </Alert>
      </Snackbar>
    </div>
  );
}
