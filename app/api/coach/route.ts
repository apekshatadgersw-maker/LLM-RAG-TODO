import { prisma } from "@/lib/prisma";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
const adviceSchema = z.object({
  topTaskName: z.string().describe("The exact name of the #1 priority task"),
  reason: z
    .string()
    .describe("1-2 encouraging sentences explaining why to do this today"),
  deferTaskName: z
    .string()
    .optional()
    .describe("A task name that can safely wait"),
  energyLevel: z
    .enum(["Low", "Medium", "High"])
    .describe("Estimated energy required"),
});
export async function GET() {
  // RETRIVEL
  const todos = await prisma.todo.findMany({
    where: { completed: false },
    orderBy: { createdAt: "desc" },
    include: {
      subTasks: true,
    },
  });

  /// AUGMENT.
  const todosContext = todos
    .map(
      (t, i) =>
        `${i + 1}. "${t.name}" - prority: ${t.priority}, due:  ${t.dueDate} ?? "no date"}`,
    )
    .join("\n");

  const today = new Date().toDateString();

  const prompt = `You are a friendly productivity coach. Today is ${today}
        The users current open todos are as follows : ${todosContext}
        Based on their todos, Recommend the Top 1 task they should focus on Today.
        Reference each tas by name. Be encouraging and specific.
        Keep the response under 50 words. `;

  // GENERATE

  const { object } = await generateObject({
    model: google("gemini-3.6-flash"),
    schema: adviceSchema,
    prompt,
  });
  return Response.json({ message: object, ok: true });
}
