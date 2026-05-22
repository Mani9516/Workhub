from fastapi import APIRouter, Depends

from app.departments import DEPARTMENTS
from app.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/departments")
def list_departments(_: User = Depends(get_current_user)):
    return {"departments": DEPARTMENTS}
