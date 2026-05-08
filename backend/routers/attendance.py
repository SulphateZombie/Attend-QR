from fastapi import APIRouter, HTTPException, status, Depends
import psycopg2.extras

import db
from db import get_conn
from security import get_current_user
from models import MarkAttendanceRequest, AttendanceStatOut, AttendanceHistoryOut
from token_util import verify_token
import uuid

router = APIRouter()


# ── POST /api/attendance/mark ──────────────────────────────────────────────────

@router.post("/mark", status_code=status.HTTP_201_CREATED)
def mark_attendance(body: MarkAttendanceRequest, current_user: dict = Depends(get_current_user)):
    if current_user["type"] != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Only students can mark attendance")

    session_id = None
    token = None
    try:
        parts = body.qr_payload.split(":", 1)
        if len(parts) != 2:
            raise ValueError()
        session_id = str(uuid.UUID(parts[0]))
        token = parts[1]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid QR code format")

    session = db.get_active_qr_session_by_id(session_id)

    if not session or not verify_token(session_id, token):
        raise HTTPException(status_code=400, detail="Invalid or expired QR code")

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM course_attendance_sessions
                WHERE session_id = %s AND is_active = TRUE
            """, (str(session_id),))
            session = cur.fetchone()

    if not session:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Invalid or expired QR code")

    if str(session["event_id"]) != body.course_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="QR code does not match the requested course")

    if not db.is_enrolled(current_user["id"], body.course_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="You are not enrolled in this course")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 1 FROM course_attendance
                WHERE id = %s AND session_id = %s
            """, (current_user["id"], str(session_id)))
            already_marked = cur.fetchone()

    if already_marked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Attendance already marked for this session")

    db.give_attendance_to_person(
        student_id=current_user["id"],
        session_id=str(session_id),
        course_id=body.course_id
    )

    return {"message": "Attendance marked successfully"}


# ── GET /api/attendance/stats ──────────────────────────────────────────────────

@router.get("/stats", response_model=list[AttendanceStatOut])
def get_stats(current_user: dict = Depends(get_current_user)):
    student_id = current_user["id"]

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    r.event_id                                          AS course_id,
                    et.event_name                                       AS course_name,
                    COUNT(DISTINCT cas.session_id)                      AS total_classes,
                    sum(ca.status)                      AS attended,
                    ROUND(
                        sum(ca.status)::numeric /
                        NULLIF(COUNT(DISTINCT cas.session_id), 0) * 100
                    , 2)                                                AS percentage
                FROM register r
                JOIN event_table et
                    ON r.event_id = et.event_id
                LEFT JOIN course_attendance_sessions cas
                    ON cas.event_id = r.event_id
                LEFT JOIN course_attendance ca
                    ON ca.event_id = r.event_id
                    AND ca.id = %s
                    AND ca.session_id = cas.session_id
                WHERE r.id = %s
                GROUP BY r.event_id, et.event_name
            """, (student_id, student_id))
            rows = cur.fetchall()

    return [
        AttendanceStatOut(
            course_id=str(row["course_id"]),
            course_name=row["course_name"],
            total_classes=row["total_classes"] or 0,
            attended=row["attended"] or 0,
            percentage=float(row["percentage"] or 0.0)
        )
        for row in rows
    ]


# ── GET /api/attendance/history ────────────────────────────────────────────────

@router.get("/history", response_model=list[AttendanceHistoryOut])
def get_history(current_user: dict = Depends(get_current_user)):
    student_id = current_user["id"]

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    ca.event_id         AS course_id,
                    et.event_name       AS course_name,
                    ca.attendance_date  AS date,
                    ca.status           AS status
                FROM course_attendance ca
                JOIN event_table et ON ca.event_id = et.event_id
                WHERE ca.id = %s
                ORDER BY ca.attendance_date DESC
            """, (student_id,))
            rows = cur.fetchall()

    return [
        AttendanceHistoryOut(
            course_id=str(row["course_id"]),
            course_name=row["course_name"],
            date=row["date"],
            status=row["status"]
        )
        for row in rows
    ]