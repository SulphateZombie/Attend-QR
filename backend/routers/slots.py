from fastapi import APIRouter, Depends

import db
from auth import get_current_user, require_faculty
from models import SlotOut, TodaySlotOut

router = APIRouter()


# ── GET /api/slots/ ────────────────────────────────────────────────────────────

@router.get("/", response_model=list[SlotOut])
def get_all_slots(current_user: dict = Depends(get_current_user)):
    slots = db.get_all_slots()
    return [dict(s) for s in slots]


# ── GET /api/slots/today ───────────────────────────────────────────────────────

@router.get("/today", response_model=list[TodaySlotOut])
def get_today_slots(current_user: dict = Depends(get_current_user)):
    user_type = current_user["type"]

    if user_type == "faculty":
        slots = db.get_today_slots_by_faculty(current_user["id"])
    else:
        slots = db.get_today_slots()

    return [dict(s) for s in slots]