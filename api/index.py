import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api._routers import todos

app = FastAPI()

# CORS setting
origins = ["http://localhost:3000","http://127.0.0.1:3000", os.getenv("FRONTEND_URL", "")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    )

app.include_router(todos.router)