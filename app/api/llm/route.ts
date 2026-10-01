import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

const subTaskSchema = z.object({
  name: z.string().describe("The description or name of the subtask"),
  type: z.literal("subTask").default("subTask"),
  completed: z.boolean().default(false),
});

export const todoSchema = z.array(
  z.object({
    name: z.string().describe("Title of the main task"),
    type: z.literal("main").default("main"),
    createdAt: z.string().describe("ISO date string for creation date"),
    dueDate: z.string().describe("ISO date string for due date"),
    priority: z.enum(["LOW", "MEDIUM", "HIGH"]),
    completed: z.boolean().default(false),
    subTasks: z.array(subTaskSchema).describe("List of subtask objects"),
  }),
);

export async function POST(req: Request) {
  const todo = await req.json();
  console.log("user inpit is ", todo);
  const today = new Date().toDateString();
  const response = await generateObject({
    model: google("gemini-3.6-flash"),
    schema: todoSchema,
    prompt: `Today is ${today}. Parse the user input into one or more subtasks in structured way 
        Rules are :
         - Extract clear title for each task, 
         - Detect due date 
         - Break complex task in furtuer subtask
         - return dueDate as ISO string YYYY-MM-DD
         - return createdAt as ISO string YYYY-MM-DD
         User input : ${todo}`,
  });
  return Response.json(response.object);
}
