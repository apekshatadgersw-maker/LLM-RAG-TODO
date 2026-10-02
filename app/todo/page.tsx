"use client";
import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { addItem } from "../features/list/listSlice";
// import { useAppDispatch, useAppSelector } from "../hook";
import { Checkbox, CircularProgress, Backdrop } from "@mui/material";
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
  subTasks: subTask[];
}
export default function Todo() {
  // Read Store
  //  const items = useAppSelector((state)=> state.list.items)
  //  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [coachAdvice, setCoachAdvice] = useState<advice>();

  const [checkedTask, setCheckedTasks] = useState<taskDb[]>([]);
  const [todo, setTodo] = useState("");
  //   const handleAdd = () =>{
  //     dispatch(addItem(todo))
  //     setTodo("")
  // }

  // Load all tasks (with DB ids) from the database
  const fetchTasks = async (): Promise<taskDb[]> => {
    const res = await fetch("/api/todos", { method: "GET" });
    const tasks = await res.json();
    return tasks.res;
  };

  // Single step: LLM creates tasks -> save to DB -> reload list from DB
  const createTask = async () => {
    setLoading(true);
    try {
      const llmRes = await fetch("/api/llm", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(todo),
      });
      if (!llmRes.ok) throw new Error("Failed to create task with AI");
      const tasks = await llmRes.json();

      const saveRes = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify(tasks),
      });
      if (!saveRes.ok) throw new Error("Failed to save tasks");

      setCheckedTasks(await fetchTasks());
      setTodo("");
    } catch (err) {
      console.error(err);
      alert("Could not create task. Please try again.");
    } finally {
      setLoading(false);
    }

    //temp
    // const temp: task[] = [{
    //       "id": 1,
    //       "type": "main",
    //       "name": "Create presentation",
    //       "createdAt": "2026-09-24",
    //       "dueDate": "2026-09-25",
    //       "priority": "HIGH",
    //       "completed": false,
    //       "subTasks": [
    //         {
    //           "id": 1,
    //           "name": "Gather topic information and research",
    //           "type": "subTask",
    //           "completed": false
    //         },
    //         {
    //           "id": 2,
    //           "name": "Create outline",
    //           "type": "subTask",
    //           "completed": false
    //         },
    //         {
    //           "id": 3,
    //           "name": "Draft slide content",
    //           "type": "subTask",
    //           "completed": false
    //         },
    //         {
    //           "id": 4,
    //           "name": "Design slides and visual elements",
    //           "type": "subTask",
    //           "completed": false
    //         },
    //         {
    //           "id": 5,
    //           "name": "Review and practice presentation",
    //           "type": "subTask",
    //           "completed": false
    //         }
    //       ],
    //   }
    // ]
    // setCheckedTasks(prev => [...prev, ...temp]);
  };

  const handleChange = (id: number, type: string, checked: boolean) => {
    setCheckedTasks((prevTasks) => {
      // Calculate the new state
      const nextTasks = prevTasks.map((task) => {
        if (type === "main" && task.id === id) {
          return {
            ...task,
            completed: checked,
            subTasks: task.subTasks?.map((sub) => ({
              ...sub,
              completed: checked,
            })),
          };
        }

        if (type === "subTask" && task.subTasks?.some((sub) => sub.id === id)) {
          const updatedSubTasks = task.subTasks.map((sub) =>
            sub.id === id ? { ...sub, completed: checked } : sub,
          );
          return {
            ...task,
            completed: updatedSubTasks.every((sub) => sub.completed),
            subTasks: updatedSubTasks,
          };
        }

        return task;
      });

      // 2. Clear pending timer
      if (debounceRef.current) clearTimeout(debounceRef.current);

      // 3. Start 1s timer to trigger PUT with fresh state
      debounceRef.current = setTimeout(() => {
        fetch("/api/todos", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextTasks),
        });
      }, 1000);

      return nextTasks;
    });
  };
  useEffect(() => {
    fetchTasks().then(setCheckedTasks);
  }, []);

  const handleAskCoach = async () => {
    setLoading(true)
    const response = await fetch("/api/coach", {
      method: "GET",
    });
    const data = await response.json();
    setCoachAdvice(data.message);
     setLoading(false)
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      {/* ===== Header + overall progress ===== */}
      <div className="mx-auto mb-6 max-w-6xl">
        <h1 className="text-2xl font-semibold sm:text-3xl">Today</h1>
        <p className="mt-1 text-sm text-slate-500">
          {checkedTask.filter((t) => t.completed).length} of{" "}
          {checkedTask.length} tasks done
        </p>
        {/* Progress bar: plain Tailwind divs */}
        <div className="mt-3 h-1.5 max-w-xs rounded-full bg-slate-200">
          <div
            className="h-1.5 rounded-full bg-teal-700"
            style={{
              width: `${checkedTask.length ? (checkedTask.filter((t) => t.completed).length / checkedTask.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Blocks the page while the AI creates and saves tasks */}
      <Backdrop
        sx={(theme) => ({ color: "#fff", zIndex: theme.zIndex.drawer + 1 })}
        open={loading}
      >
      <CircularProgress color="inherit" />
      </Backdrop>

      {/* ===== Grid: 1 column on mobile, 2 on desktop ===== */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ----- Left (2/3 width): Tasks ----- */}
        <div className="space-y-4 lg:col-span-2">
          {/* Create task */}
          <div className="rounded-2xl border bg-white p-5">
            <p className="mb-2 text-sm font-medium">
              What do you need to get done?
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="e.g. Prepare client presentation"
                value={todo}
                onChange={(e) => setTodo(e.target.value)}
                className="h-11 text-base"
              />
              <Button
                onClick={createTask}
                disabled={loading || !todo}
                className="h-11 bg-teal-700 text-white hover:bg-teal-800 cursor-pointer"
              >
                  Create with AI
              </Button>
            </div>
          </div>

          {/* Task list */}
          <div className="rounded-2xl border bg-white">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="font-medium">Your tasks</h2>
            </div>

            {checkedTask.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-500">
                No tasks yet. Add one above.
              </p>
            )}

            {checkedTask.map((item) => {
              const done = item.subTasks.filter((s) => s.completed).length;
              return (
                <div key={item.id} className="border-b px-4 py-4 last:border-0">
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
                            : "font-medium"
                        }
                      >
                        {item.name}
                      </p>
                      {/* Priority dot + due date */}
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`h-2 w-2 rounded-full ${item.priority === "HIGH" ? "bg-rose-500" : item.priority === "MEDIUM" ? "bg-amber-400" : "bg-slate-400"}`}
                          />
                          {item.priority}
                        </span>
                        <span>
                          Due {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-rose-600"
                    >
                      Delete
                    </Button>
                  </div>

                  {/* Subtasks */}
                  {item.subTasks.length > 0 && (
                    <div className="ml-12 mt-2">
                      {/* Subtask progress bar */}
                      <div className="mb-1 flex items-center gap-3">
                        <div className="h-1.5 flex-1 rounded-full bg-slate-200">
                          <div
                            className="h-1.5 rounded-full bg-teal-700"
                            style={{
                              width: `${(done / item.subTasks.length) * 100}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-500">
                          {done}/{item.subTasks.length}
                        </span>
                      </div>

                      {item.subTasks.map((sub) => (
                        <label
                          key={sub.id}
                          className="flex cursor-pointer items-center rounded-md hover:bg-slate-50"
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
        <div className="h-fit rounded-2xl bg-teal-900 p-5 text-white">
          <h2 className="font-semibold">Your coach</h2>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              onClick={handleAskCoach}
              className="h-11 bg-white text-teal-900 hover:bg-white/90 cursor-pointer"
            >                
              Ask Coach 
            </Button>
          </div>

          {/* Coach answer */}
          {coachAdvice ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-white/60">Do this first</p>
              <p className="text-xl font-semibold">{coachAdvice.topTaskName}</p>
              <p className="text-sm text-white/85">{coachAdvice.reason}</p>
              {coachAdvice?.deferTaskName && (
                <p className="border-t border-white/15 pt-3 text-sm text-white/60">
                  Can wait: {coachAdvice.deferTaskName}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-white/60">
              Ask the coach which task to start with Today.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
