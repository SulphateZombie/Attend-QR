from fastapi import APIRouter, HTTPException, status, Depends
import psycopg2.extras

import db
from db import get_conn
from auth import require_admin
from models import (
    DashboardStatsOut, AdminUserOut,
    CourseOut, RoleUpdateRequest
)

router = APIRouter()


# ── GET /api/admin/dashboard ───────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardStatsOut)
def dashboard(current_user: dict = Depends(require_admin)):
    users = db.get_all_users()
    courses = db.get_all_courses()

    total_users    = len(users)
    total_courses  = len(courses)
    total_students = sum(1 for u in users if u["type"] == "student")
    total_faculty  = sum(1 for u in users if u["type"] == "faculty")

    # count active QR sessions across all courses
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT COUNT(*) AS active_count
                FROM course_attendance_sessions
                WHERE is_active = TRUE
            """)
            row = cur.fetchone()
            active_sessions = row["active_count"] if row else 0

    return DashboardStatsOut(
        total_users=total_users,
        total_courses=total_courses,
        total_students=total_students,
        total_faculty=total_faculty,
        active_sessions=active_sessions
    )


# ── GET /api/admin/users ───────────────────────────────────────────────────────

@router.get("/users", response_model=list[AdminUserOut])
def get_users(current_user: dict = Depends(require_admin)):
    users = db.get_all_users()
    return [dict(u) for u in users]


# ── DELETE /api/admin/users ────────────────────────────────────────────────────

@router.delete("/users", status_code=status.HTTP_200_OK)
def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    # prevent admin from deleting themselves
    if user_id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )

    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    db.delete_user(user_id)
    return {"message": f"User {user_id} deleted successfully"}


# ── PUT /api/admin/users/{userId}/role ─────────────────────────────────────────

@router.put("/users/{userId}/role", response_model=AdminUserOut)
def update_role(
    userId: str,
    body: RoleUpdateRequest,
    current_user: dict = Depends(require_admin)
):
    # validate role value
    valid_roles = ("student", "faculty", "admin")
    if body.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )

    # prevent admin from changing their own role
    if userId == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role"
        )

    updated = db.update_user_role(userId, body.role)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return dict(updated)


# ── GET /api/admin/courses ─────────────────────────────────────────────────────

@router.get("/courses", response_model=list[CourseOut])
def get_courses(current_user: dict = Depends(require_admin)):
    courses = db.get_all_courses()
    return [dict(c) for c in courses]


# ── DELETE /api/admin/courses/{course_id} ─────────────────────────────────────

@router.delete("/courses/{course_id}", status_code=status.HTTP_200_OK)
def delete_course(course_id: str, current_user: dict = Depends(require_admin)):
    course = db.get_course_by_id(course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    db.delete_course(course_id)
    return {"message": f"Course {course_id} deleted successfully"}