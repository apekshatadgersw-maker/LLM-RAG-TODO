import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const todoList = await req.json();

  // All tasks saved together, or none if any fails
  const savedTodos = await prisma.$transaction(
    todoList.map((task: any) =>
      prisma.todo.create({
        data: {
          name: task.name,
          type: task.type,
          completed: task.completed ?? false,
          createdAt: task.createdAt ? new Date(task.createdAt) : new Date(),
          dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
          priority: task.priority,
          subTasks: {
            create: (task.subTasks ?? []).map((sub: any) => ({
              name: sub.name,
              type: sub.type,
              completed: sub.completed ?? false,
            })),
          },
        },
        include: { subTasks: true },
      }),
    ),
  );

  return Response.json({ data: savedTodos, ok: true, message: "data saved successfully" });
}


export async function PUT(req: Request) {
  const tasks: {
    id: number;
    completed: boolean;
    subTasks: { id: number; completed: boolean }[];
  }[] = await req.json();

  await prisma.$transaction(
    tasks.map((task) => {
      return prisma.todo.update({
        where: { id: task.id },
        data: {
          completed: task.completed,
          subTasks: {
            update: task.subTasks.map((sub) => ({
              where: { id: sub.id },
              data: { completed: sub.completed },
            })),
          },
        },
      });
    }),
  );
  return Response.json({ ok: true, message: "Data updated" });
}

export async function GET() {
  const res = await prisma.todo.findMany({
    include: {
      subTasks: true,
    },
  });
  return Response.json({ res: res, ok: true, message: "Data updated" });
}
