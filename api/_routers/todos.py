from api._database import supabase
from datetime import date
from typing import List, Literal
from fastapi import FastAPI, HTTPException, APIRouter,Request
from pydantic import BaseModel, Field
from google import genai
from google.genai import types
import os
from datetime import date
from enum import Enum
from dotenv import load_dotenv

router = APIRouter(prefix="/api/todos", tags=["todos_GET"])

client = genai.Client()

load_dotenv()

@router.get("")
def getTodos():
    response = supabase.table("Todo").select("*, SubTasks(*)").order("createdAt",desc=True).execute()
    if response:
        return {"ok": True, "status_code": 200, "data": response.data}
    return { "ok": False, "status_code": 500, "detail": "Error in Data Fetching"}

@router.post("")
@router.put("")
async def sync_todos(request: Request):
    """
    Handles both bulk Creation (POST) and batch Updating (PUT) efficiently.
    If a task has an 'id', Supabase updates it. If not, it inserts it.
    """
    todo_list = await request.json()    
    saved_todos = []
    
    try:
        # Loop is kept only to correctly map dynamic generated IDs to nested subtasks
        for task in todo_list:
            todo_data = {
                "name": task.get("name"),
                "type": task.get("type"),
                "completed": bool(task.get("completed")),
                "createdAt": task.get("createdAt"),
                "dueDate": task.get("dueDate"),
                "priority": task.get("priority")
            }
            
            # If the frontend sent an ID, include it so Supabase updates instead of creating new
            if task.get("id"):
                todo_data["id"] = task.get("id")

            # .upsert() acts as an INSERT or an UPDATE based on the primary key ('id')
            todo_response = supabase.table("Todo").upsert(todo_data).execute()
            
            if not todo_response.data:
                continue
                
            inserted_todo = todo_response.data[0]
            todo_id = inserted_todo["id"]
            
            # Handle SubTasks
            sub_tasks_payload = task.get("SubTasks") or task.get("subTasks") or []
            inserted_sub_tasks = []
            
            if sub_tasks_payload:
                formatted_sub_tasks = []
                for sub in sub_tasks_payload:
                    sub_data = {
                        "todoId": todo_id,
                        "name": sub.get("name"),
                        "type": sub.get("type"),
                        "completed": bool(sub.get("completed"))
                    }
                    if sub.get("id"):
                        sub_data["id"] = sub.get("id")
                    formatted_sub_tasks.append(sub_data)
                
                # Bulk upsert all subtasks in a single database call per parent task
                sub_response = supabase.table("SubTasks").upsert(formatted_sub_tasks).execute()
                inserted_sub_tasks = sub_response.data
            
            inserted_todo["subTasks"] = inserted_sub_tasks
            saved_todos.append(inserted_todo)
            
        return {
            "data": saved_todos, 
            "ok": True, 
            "message": "Data synchronized successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database execution failed: {str(e)}")

@router.delete("/{id}")
def deleteTodo(id: int):
    print("delete", id)
    response = supabase.table("Todo").delete().eq("id", id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Todo Item not present")
    return None


# 1. Define independent dependencies first
class Priority(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

# 2. Define nested models next
class SubTask(BaseModel):
    name: str = Field(description="Title of the subtask")
    type: Literal["subTask"] = Field(default="subTask")
    completed: bool = Field(default=False)

# 3. Define parent models that use the dependencies above
class MainTask(BaseModel):
    name: str = Field(description="Title of the main task")
    type: Literal["main"] = Field(default="main")
    createdAt: str = Field(description="ISO date string for creation date")
    dueDate: str = Field(description="ISO date string for due date")
    priority: Priority
    completed: bool = Field(default=False)
    SubTasks: List[SubTask] = Field(description="List of subtask objects", default=[])

# 4. Define root container model last
class TodoListResponse(BaseModel):
    tasks: List[MainTask]

class TodoRequest(BaseModel):
    todo: str

@router.post("/llm")
async def askLLM(req: Request):
   
    today = date.today().isoformat()

    todo = await req.json()
    print(f"User input is:", todo)
    try:
        # 3. Call Gemini with Structured Outputs enabled
        response = client.models.generate_content(
            model="gemini-3.6-flash",  # Update to your target model version
            contents=(
                f"Today is {today}. Parse the user input into one or more subtasks in a structured way.\n"
                f"Rules:\n"
                f"- Extract clear title for each task\n"
                f"- Detect due date\n"
                f"- Break complex tasks into further subtasks\n"
                f"- return dueDate as ISO string YYYY-MM-DD\n"
                f"- return createdAt as ISO string YYYY-MM-DD\n\n"
                f"User input : {todo}"
            ),
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TodoListResponse,
            ),
        )
        
        # response.parsed automatically returns the validated Pydantic object
        return response.parsed.tasks

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
