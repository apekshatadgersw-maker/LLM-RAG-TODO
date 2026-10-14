from fastapi import APIRouter,Request, HTTPException
router = APIRouter(prefix="/api/coach", tags=["todos_GET"])
from database import supabase


@router.get("")
def askCoach():
    