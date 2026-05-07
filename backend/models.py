from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import date, time


# ── Auth ───────────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone_no: str
    role: str                       # "student" | "faculty" | "admin"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    name: str
    email: str
    type: str                       # role field is called "type" in your DB
    phone_no: str

class LoginResponse(BaseModel):
    token: str
    user: UserOut


# ── Courses ────────────────────────────────────────────────────────────────────

class CourseCreate(BaseModel):
    name: str
    building_name: str
    room_id: str
    time_slot_id: str
    faculty_id: str

class CourseOut(BaseModel):
    event_id: str
    event_name: str
    time_slot_id: str
    building_name: str
    room_id: str


# ── Slots ──────────────────────────────────────────────────────────────────────

class SlotOut(BaseModel):
    time_slot_id: str
    start_time: Optional[time]
    end_time: Optional[time]
    slot_day: Optional[str]

class CourseSlotOut(BaseModel):
    event_id: str
    time_slot_id: str
    start_time: Optional[time]
    end_time: Optional[time]
    slot_day: Optional[str]

class TodaySlotOut(BaseModel):
    time_slot_id: str
    start_time: Optional[time]
    end_time: Optional[time]
    slot_day: Optional[str]
    course_id: str


# ── QR Sessions ────────────────────────────────────────────────────────────────

class QRGenerateRequest(BaseModel):
    course_id: str
    slot_id: str

class QRGenerateResponse(BaseModel):
    session_id: str
    course_id: str
    qr_payload: str                 # the string to encode into the QR image on frontend

class QRValidateRequest(BaseModel):
    qr_payload: str                 # session UUID scanned from QR

class QRValidateResponse(BaseModel):
    valid: bool
    session_id: Optional[str]
    course_id: Optional[str]
    message: str

class QRActiveSessionOut(BaseModel):
    session_id: str
    event_id: str
    is_active: bool


# ── Attendance ─────────────────────────────────────────────────────────────────

class MarkAttendanceRequest(BaseModel):
    qr_payload: str                 # session UUID from scanned QR
    course_id: str

class AttendanceStatOut(BaseModel):
    course_id: str
    course_name: Optional[str]
    total_classes: int
    attended: int
    percentage: float

class AttendanceHistoryOut(BaseModel):
    course_id: str
    course_name: Optional[str]
    date: Optional[date]
    status: Optional[int]


# ── Enrollment ─────────────────────────────────────────────────────────────────

class EnrollRequest(BaseModel):
    student_id: str
    course_id: str

class SelfEnrollRequest(BaseModel):
    course_id: str                  # student_id comes from get_current_user

class UnenrollRequest(BaseModel):
    student_id: str
    course_id: str

class EnrolledStudentOut(BaseModel):
    id: str
    name: str
    email: str
    phone_no: str

class EnrolledCourseOut(BaseModel):
    event_id: str
    event_name: str
    building_name: str
    room_id: str
    time_slot_id: str


# ── Reports ────────────────────────────────────────────────────────────────────

class CourseAnalyticsOut(BaseModel):
    course_id: str
    course_name: Optional[str]
    total_students: int
    total_sessions: int
    average_attendance_pct: float

class LowAttendanceStudentOut(BaseModel):
    student_id: str
    name: str
    email: str
    attendance_pct: float

class ReportSummaryOut(BaseModel):
    course_id: str
    course_name: Optional[str]
    total_students: int
    average_attendance_pct: float


# ── Admin ──────────────────────────────────────────────────────────────────────

class RoleUpdateRequest(BaseModel):
    role: str                       # "student" | "faculty" | "admin"

class DashboardStatsOut(BaseModel):
    total_users: int
    total_courses: int
    total_students: int
    total_faculty: int
    active_sessions: int

class AdminUserOut(BaseModel):
    id: str
    name: str
    email: str
    type: str
    phone_no: str


# ── Activities ─────────────────────────────────────────────────────────────────

class ActivityOut(BaseModel):
    event_id: str
    event_name: Optional[str]
    activity_date: Optional[date]
    start_time: Optional[time]
    end_time: Optional[time]
    commitee_name: Optional[str]