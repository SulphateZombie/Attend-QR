from fastapi import APIRouter, HTTPException, status, Depends

import db
from security import get_current_user, require_admin
from models import (
    EnrollRequest, SelfEnrollRequest, UnenrollRequest,
    EnrolledStudentOut, EnrolledCourseOut
)

router = APIRouter()


# ── POST /api/enrollment/enroll ────────────────────────────────────────────────

@router.post("/enroll", status_code=status.HTTP_201_CREATED)
def admin_enroll(body: EnrollRequest, current_user: dict = Depends(require_admin)):
    # check course exists
    course = db.get_course_by_id(body.course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # check student exists
    student = db.get_user_by_id(body.student_id)
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student not found"
        )

    # check not already enrolled
    if db.is_enrolled(body.student_id, body.course_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student is already enrolled in this course"
        )

    result = db.enroll_student(body.student_id, body.course_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Enrollment failed"
        )

    return {"message": "Student enrolled successfully"}


# ── POST /api/enrollment/self-enroll ──────────────────────────────────────────

@router.post("/self-enroll", status_code=status.HTTP_201_CREATED)
def self_enroll(body: SelfEnrollRequest, current_user: dict = Depends(get_current_user)):
    # only students can self-enroll
    if current_user["type"] != "student":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can self-enroll"
        )

    # check course exists
    course = db.get_course_by_id(body.course_id)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    # check not already enrolled
    if db.is_enrolled(current_user["id"], body.course_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already enrolled in this course"
        )

    result = db.enroll_student(current_user["id"], body.course_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Enrollment failed"
        )

    return {"message": "Enrolled successfully"}


# ── DELETE /api/enrollment/unenroll ───────────────────────────────────────────

@router.delete("/unenroll", status_code=status.HTTP_200_OK)
def unenroll(body: UnenrollRequest, current_user: dict = Depends(get_current_user)):
    # students can only unenroll themselves, admins can unenroll anyone
    if current_user["type"] == "student":
        if current_user["id"] != body.student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only unenroll yourself"
            )
    elif current_user["type"] not in ("admin", "faculty"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )

    # check enrollment exists
    if not db.is_enrolled(body.student_id, body.course_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found"
        )

    success = db.unenroll_student(body.student_id, body.course_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unenrollment failed"
        )

    return {"message": "Unenrolled successfully"}


# ── GET /api/enrollment/students/{courseId} ────────────────────────────────────

@router.get("/students/{courseId}", response_model=list[EnrolledStudentOut])
def get_students(courseId: str, current_user: dict = Depends(get_current_user)):
    # only faculty and admin can see enrolled students
    if current_user["type"] not in ("faculty", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only faculty and admin can view enrolled students"
        )

    # check course exists
    course = db.get_course_by_id(courseId)
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found"
        )

    students = db.get_enrolled_students(courseId)
    return [dict(s) for s in students]


# ── GET /api/enrollment/courses ───────────────────────────────────────────────

@router.get("/courses", response_model=list[EnrolledCourseOut])
def get_my_courses(current_user: dict = Depends(get_current_user)):
    courses = db.get_enrolled_courses(current_user["id"])
    return [dict(c) for c in courses]