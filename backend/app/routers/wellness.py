from fastapi import APIRouter

router = APIRouter(prefix="/api/wellness", tags=["wellness"])


@router.get("/tips")
def wellness_tips():
    return {
        "microbreaks": "Try a 5-minute walk between deep-work blocks.",
        "ergonomics": "Screen top at eye level; shoulders relaxed.",
        "focus": "Use calendar blocks for uninterrupted work.",
    }
