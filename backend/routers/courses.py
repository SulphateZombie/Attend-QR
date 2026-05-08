from fastapi import APIRouter, HTTPException, status, Depends

import db
from auth import get_current_user, require_admin, require_faculty
from models import CourseCreate, CourseOut, CourseSlotOut

router = APIRouter()


# ── GET /api/courses/ ──────────────────────────────────────────────────────────

@router.get("/", response_model=list[CourseOut])
def list_courses(current_user: dict = Depends(get_current_user)):
    user_type = current_user["type"]

    if user_type == "faculty":
        courses = db.get_courses_by_faculty(current_user["id"])
    else:
        courses = db.get_all_courses()

    return [dict(c) for c in courses]


# ── GET /api/courses/all ───────────────────────────────────────────────────────

@router.get("/all", response_model=list[CourseOut])
def all_courses(current_user: dict = Depends(get_current_user)):
    courses = db.get_all_courses()
    return [dict(c) for c in courses]


# ── POST /api/courses/ ─────────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=CourseOut)
def create_course(body: CourseCreate, current_user: dict = Depends(require_admin)):
    # Check if course_id already exists
    existing = db.get_course_by_id(body.course_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Course ID already exists"
        )
    db.create_course(
        course_id=body.course_id,   # ← use from body instead of generating
        name=body.event_name,
        building_name=body.building_name,
        room_id=body.room_id,
        time_slot_id=body.time_slot_id,
        faculty_id=body.faculty_id
    )
    course = db.get_course_by_id(body.course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Course created but could not be retrieved"
        )
    return dict(course)


# ── GET /api/courses/{courseId} ────────────────────────────────────────────────

@router.get("/{courseId}", response_model=CourseOut)
def get_course(courseId: str, current_user: dict = Depends(get_current_user)):
    course = db.get_course_by_id(courseId)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )
    return dict(course)


# ── GET /api/courses/{courseId}/slots ──────────────────────────────────────────

@router.get("/{courseId}/slots", response_model=list[CourseSlotOut])
def get_course_slots(courseId: str, current_user: dict = Depends(get_current_user)):
    course = db.get_course_by_id(courseId)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    slots = db.get_slots_by_course(courseId)
    return [dict(s) for s in slots]