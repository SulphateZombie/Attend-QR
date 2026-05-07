import csv
import io
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import StreamingResponse
import psycopg2.extras

import db
from db import get_conn
from auth import get_current_user, require_admin, require_faculty
from models import CourseAnalyticsOut, LowAttendanceStudentOut, ReportSummaryOut

router = APIRouter()


# ── helper: fetch course attendance data ───────────────────────────────────────

def _get_course_attendance_data(course_id: str):
    """
    Returns per-student attendance stats for a given course.
    Used by multiple endpoints below.
    """
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    u.id                                        AS student_id,
                    u.name                                      AS name,
                    u.email                                     AS email,
                    COUNT(DISTINCT cas.session_id)              AS total_classes,
                    COUNT(ca.session_id)                        AS attended,
                    ROUND(
                        COUNT(ca.session_id)::numeric /
                        NULLIF(COUNT(DISTINCT cas.session_id), 0) * 100,
                    2)                                          AS attendance_pct
                FROM register r
                JOIN user_table u
                    ON r.id = u.id
                JOIN course_attendance_sessions cas
                    ON cas.event_id = r.event_id
                LEFT JOIN course_attendance ca
                    ON ca.event_id = r.event_id
                    AND ca.id = r.id
                    AND ca.session_id = cas.session_id
                WHERE r.event_id = %s
                GROUP BY u.id, u.name, u.email
                ORDER BY attendance_pct ASC
            """, (course_id,))
            return cur.fetchall()


# ── GET /api/reports/course/{courseId} ─────────────────────────────────────────

@router.get("/course/{courseId}", response_model=CourseAnalyticsOut)
def course_analytics(courseId: str, current_user: dict = Depends(get_current_user)):
    if current_user["type"] not in ("faculty", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty and admin can view course reports"
        )

    course = db.get_course_by_id(courseId)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    rows = _get_course_attendance_data(courseId)

    total_students = len(rows)
    total_sessions = rows[0]["total_classes"] if rows else 0
    avg_pct = (
        round(sum(float(r["attendance_pct"] or 0) for r in rows) / total_students, 2)
        if total_students > 0 else 0.0
    )

    return CourseAnalyticsOut(
        course_id=courseId,
        course_name=course["event_name"],
        total_students=total_students,
        total_sessions=total_sessions,
        average_attendance_pct=avg_pct
    )


# ── GET /api/reports/export/{courseId} ─────────────────────────────────────────

@router.get("/export/{courseId}")
def export_csv(courseId: str, current_user: dict = Depends(get_current_user)):
    if current_user["type"] not in ("faculty", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty and admin can export reports"
        )

    course = db.get_course_by_id(courseId)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    rows = _get_course_attendance_data(courseId)

    # build CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # header row
    writer.writerow([
        "Student ID", "Name", "Email",
        "Total Classes", "Attended", "Attendance %"
    ])

    # data rows
    for row in rows:
        writer.writerow([
            row["student_id"],
            row["name"],
            row["email"],
            row["total_classes"],
            row["attended"],
            row["attendance_pct"]
        ])

    output.seek(0)

    filename = f"attendance_{course['event_name'].replace(' ', '_')}_{courseId}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ── GET /api/reports/low-attendance/{courseId} ─────────────────────────────────

@router.get("/low-attendance/{courseId}", response_model=list[LowAttendanceStudentOut])
def low_attendance(
    courseId: str,
    threshold: float = 75.0,            # default cutoff is 75%
    current_user: dict = Depends(get_current_user)
):
    if current_user["type"] not in ("faculty", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty and admin can view low attendance reports"
        )

    course = db.get_course_by_id(courseId)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    rows = _get_course_attendance_data(courseId)

    at_risk = [
        LowAttendanceStudentOut(
            student_id=row["student_id"],
            name=row["name"],
            email=row["email"],
            attendance_pct=float(row["attendance_pct"] or 0.0)
        )
        for row in rows
        if float(row["attendance_pct"] or 0.0) < threshold
    ]

    return at_risk


# ── GET /api/reports/summary ───────────────────────────────────────────────────

@router.get("/summary", response_model=list[ReportSummaryOut])
def reports_summary(current_user: dict = Depends(get_current_user)):
    if current_user["type"] not in ("faculty", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty and admin can view reports summary"
        )

    # get all courses
    if current_user["type"] == "faculty":
        courses = db.get_courses_by_faculty(current_user["id"])
    else:
        courses = db.get_all_courses()

    summary = []
    for course in courses:
        course_id = course["event_id"]
        rows = _get_course_attendance_data(course_id)

        total_students = len(rows)
        avg_pct = (
            round(sum(float(r["attendance_pct"] or 0) for r in rows) / total_students, 2)
            if total_students > 0 else 0.0
        )

        summary.append(ReportSummaryOut(
            course_id=course_id,
            course_name=course["event_name"],
            total_students=total_students,
            average_attendance_pct=avg_pct
        ))

    return summary