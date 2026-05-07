import os
import psycopg2
import psycopg2.extras
import psycopg2.pool
import hashlib
from contextlib import contextmanager
import uuid
from dotenv import load_dotenv
from datetime import datetime

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))
DATABASE_URL = os.getenv("DATABASE_URL")

# ── Connection Pool ───────────────────────────────────────────────────────────
connection_pool = psycopg2.pool.SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    dsn=DATABASE_URL
)

@contextmanager
def get_conn():
    conn = connection_pool.getconn()
    conn.autocommit = False
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        connection_pool.putconn(conn)

# ── Password Hashing ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    sha256_hash = hashlib.sha256(plain_password.encode('utf-8')).hexdigest()
    return sha256_hash == hashed_password

# ── Users ─────────────────────────────────────────────────────────────────────

def get_user_by_email(email: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM user_table WHERE email = %s", (email,))
            return cur.fetchone()

def get_user_by_id(user_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM user_table WHERE id = %s", (user_id,))
            return cur.fetchone()

def create_user(user_id: str, name: str, email: str, phone_no: str, password: str, role: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("CALL add_user(%s, %s, %s, %s, %s, %s)",
                (user_id, name, email, role, phone_no, hash_password(password)))

def get_all_users():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT id, name, email, type, phone_no FROM user_table")
            return cur.fetchall()

def delete_user(user_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Check user exists first
            cur.execute(f"call delete_user('{user_id}')")
            

def update_user_role(user_id: str, new_role: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "UPDATE user_table SET type = %s WHERE id = %s RETURNING id, name, email, type, phone_no",
                (new_role, user_id)
            )
            return cur.fetchone()  # None if user not found, row if updated

# ── Courses ───────────────────────────────────────────────────────────────────

def get_all_courses():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # cur.execute("""
            #     SELECT c.event_id, c.time_slot_id, et.event_name, et.building_name, et.room_id
            #     FROM courses c NATURAL JOIN event_table et
            # """)
            cur.execute("""
                SELECT c.event_id, et.event_name, c.time_slot_id, et.building_name, et.room_id
                FROM courses c
                JOIN event_table et ON c.event_id = et.event_id
            """)
            return cur.fetchall()

def get_course_by_id(course_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT c.event_id, et.event_name, c.time_slot_id, et.building_name, et.room_id
                FROM courses c
                JOIN event_table et ON c.event_id = et.event_id
                WHERE c.event_id = %s
            """, (course_id,))
            return cur.fetchone()

def get_courses_by_faculty(faculty_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT c.event_id, et.event_name, c.time_slot_id, et.building_name, et.room_id
                FROM courses c
                JOIN event_table et ON c.event_id = et.event_id
                JOIN event_host eh ON c.event_id = eh.event_id
                WHERE eh.id = %s
            """, (faculty_id,))
            return cur.fetchall()

def create_course(course_id: str, name: str, building_name: str, room_id: str,
                  time_slot_id: str, faculty_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("CALL add_course(%s, %s, %s, %s, %s)",
                (course_id, name, building_name, room_id, time_slot_id))
            cur.execute("CALL assign_host(%s, %s)", (course_id, faculty_id))

def delete_course(course_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
                cur.execute("call delete_event(%s)", (course_id,))

# ── Slots ─────────────────────────────────────────────────────────────────────

def get_slots_by_course(course_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT distinct event_id, time_slot_id,
                       start_time, end_time, slot_day
                FROM students_course_view
                WHERE event_id = %s
            """, (course_id,))
            return cur.fetchall()

def get_today_slots():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT time_slot_id,start_time,end_time,slot_day,event_id as course_id
                FROM students_course_view
                WHERE TRIM(slot_day) = TRIM(to_char(
                    current_timestamp AT TIME ZONE 'Asia/Kolkata', 'Day'
                ))
            """)
            return cur.fetchall()

def get_today_slots_by_faculty(faculty_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT time_slot_id,start_time,end_time,slot_day,event_id as course_id
                FROM time_slot_id,start_time,end_time,slot_day
                WHERE TRIM(slot_day) = TRIM(to_char(
                    current_timestamp AT TIME ZONE 'Asia/Kolkata', 'Day'
                ))
                AND host_id = %s
            """, (faculty_id,))
            return cur.fetchall()

def get_all_slots():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT * FROM time_slot")
            return cur.fetchall()

def create_slot(time_slot_id: str, day: str, start_time: str, end_time: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("INSERT INTO time_slot VALUES (%s, %s, %s, %s)",
                (time_slot_id, start_time, end_time, day))

# ── QR Sessions ───────────────────────────────────────────────────────────────

def create_qr_session(session_id: uuid, course_id: str, host_id: str,
                      generated_at: str, expires_at: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # generated_time = datetime.fromisoformat(generated_at).strftime('%H:%M:%S')
            # expires_time = datetime.fromisoformat(expires_at).strftime('%H:%M:%S')
            cur.execute("call start_course_attendance_session(%s,%s,%s)",(course_id,host_id,session_id))
            return session_id

def get_active_qr_session(course_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM course_attendance_sessions
                WHERE event_id = %s AND is_active = TRUE
            """, (course_id,))
            return cur.fetchone()

# def find_qr_session_by_code(qr_code: str):
#     with get_conn() as conn:
#         with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
#             cur.execute("SELECT * FROM course_attendance_sessions WHERE qr_code = %s", (qr_code,))
#             return cur.fetchone()

def deactivate_qr_session(session_id: uuid):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("call end_course_attendance_session(%s)",(session_id,))

# ── Attendance ────────────────────────────────────────────────────────────────

# def create_attendance_record(student_id: str, session_id: int,
#                              course_id: str, status: int = 1):
#     with get_conn() as conn:
#         with conn.cursor() as cur:
#             cur.execute("""
#                 INSERT INTO course_attendance
#                 VALUES (%s, %s, current_date, current_time, %s, %s)
#             """, (student_id, course_id, status, session_id))

def give_attendance_to_person(student_id: str, session_id: int,
                             course_id: str, status: int = 1):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("call give_course_attendance(%s,%s,%s)",(student_id,course_id,session_id))

# def has_attendance_record(student_id: str, slot_id: str, course_id: str):
#     with get_conn() as conn:
#         with conn.cursor() as cur:
#             cur.execute("""
#                 SELECT 1 FROM course_attendance ac
#                 NATURAL JOIN course_attendance_sessions acs
#                 WHERE ac.id = %s AND acs.time_slot_id = %s AND ac.event_id = %s
#             """, (student_id, slot_id, course_id))
#             return cur.fetchone() is not None

# def get_attendance_by_student(student_id: str):
#     with get_conn() as conn:
#         with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
#             cur.execute("SELECT * FROM course_attendance WHERE id = %s", (student_id,))
#             return cur.fetchall()

# def get_attendance_by_course(course_id: str):
#     with get_conn() as conn:
#         with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
#             cur.execute("SELECT * FROM course_attendance WHERE event_id = %s", (course_id,))
#             return cur.fetchall()

# def get_all_attendance_records():
#     with get_conn() as conn:
#         with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
#             cur.execute("SELECT * FROM course_attendance")
#             return cur.fetchall()

# ── Enrollments ───────────────────────────────────────────────────────────────

def enroll_student(student_id: str, course_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            try:
                cur.execute("CALL register_event(%s, %s)", (course_id, student_id))
                return {"student_id": student_id, "course_id": course_id}
            except Exception as e:
                print(f'Error enrolling {student_id} in {course_id}: {e}')
                conn.rollback()
                return None

def unenroll_student(student_id: str, course_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM register WHERE id = %s AND event_id = %s",
                (student_id, course_id))
            return cur.rowcount > 0

def get_enrolled_students(course_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT u.id, u.name, u.email, u.phone_no
                FROM register r
                JOIN user_table u ON r.id = u.id
                WHERE r.event_id = %s
            """, (course_id,))
            return cur.fetchall()

def get_enrolled_courses(student_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT c.event_id, et.event_name, et.building_name, et.room_id, c.time_slot_id
                FROM register r
                JOIN courses c ON r.event_id = c.event_id
                JOIN event_table et ON c.event_id = et.event_id
                WHERE r.id = %s
            """, (student_id,))
            result = cur.fetchall()
            print(f"DEBUG get_enrolled_courses({student_id}): {result}")
            return result


# ── Activities ────────────────────────────────────────────────────────────────

def get_all_activities():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT a.event_id, et.event_name, a.activity_date,
                       a.start_time, a.end_time, c.name AS commitee_name
                FROM activities a
                JOIN event_table et ON a.event_id = et.event_id
                JOIN commitee c ON a.commitee_id = c.commitee_id
                ORDER BY a.activity_date DESC
            """)
            return cur.fetchall()

def create_activity(event_id: str, event_name: str, building_name: str,
                    room_id: str, activity_date: str, start_time: str,
                    end_time: str, commitee_id: int):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO event_table (event_id, event_type, event_name, building_name, room_id) VALUES (%s, %s, %s, %s, %s)",
                (event_id, 'activity', event_name, building_name, room_id))
            cur.execute(
                "INSERT INTO activities (event_id, activity_date, start_time, end_time, commitee_id) VALUES (%s, %s, %s, %s, %s)",
                (event_id, activity_date, start_time, end_time, commitee_id))

def get_activity_by_id(event_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT a.event_id, et.event_name, a.activity_date,
                       a.start_time, a.end_time, c.name AS commitee_name
                FROM activities a
                JOIN event_table et ON a.event_id = et.event_id
                JOIN commitee c ON a.commitee_id = c.commitee_id
                WHERE a.event_id = %s
            """, (event_id,))
            return cur.fetchone()

def delete_activity(event_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM activity_attendance WHERE event_id = %s", (event_id,))
            cur.execute("DELETE FROM activity_attendance_sessions WHERE event_id = %s", (event_id,))
            cur.execute("DELETE FROM register WHERE event_id = %s", (event_id,))
            cur.execute("DELETE FROM activities WHERE event_id = %s", (event_id,))
            cur.execute("DELETE FROM event_table WHERE event_id = %s", (event_id,))

def get_all_commitees():
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT commitee_id, name, council_under FROM commitee ORDER BY name")
            return cur.fetchall()

def get_activity_members(event_id: str):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            # Get committee members via the activity's commitee_id
            cur.execute("""
                SELECT u.id, u.name, u.email, u.phone_no, cm.designation
                FROM activities a
                JOIN commitee_members cm ON a.commitee_id = cm.commitee_id
                JOIN user_table u ON cm.id = u.id
                WHERE a.event_id = %s
            """, (event_id,))
            commitee_members = cur.fetchall()

            # Get volunteers (registered users who are not committee members)
            cur.execute("""
                SELECT u.id, u.name, u.email, u.phone_no
                FROM register r
                JOIN user_table u ON r.id = u.id
                WHERE r.event_id = %s
                  AND r.id NOT IN (
                      SELECT cm.id FROM commitee_members cm
                      JOIN activities a ON a.commitee_id = cm.commitee_id
                      WHERE a.event_id = %s
                  )
            """, (event_id, event_id))
            volunteers = cur.fetchall()

            return {
                "commitee_members": [dict(m) for m in commitee_members],
                "volunteers": [dict(v) for v in volunteers]
            }

def remove_activity_member(event_id: str, member_id: str):
    """Remove a committee member from the activity's committee."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                DELETE FROM commitee_members
                WHERE id = %s AND commitee_id = (
                    SELECT commitee_id FROM activities WHERE event_id = %s
                )
            """, (member_id, event_id))

def remove_activity_volunteer(event_id: str, volunteer_id: str):
    """Remove a volunteer (registered user) from the activity."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM register WHERE id = %s AND event_id = %s",
                        (volunteer_id, event_id))

def is_enrolled(student_id: str, course_id: str):
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM register WHERE id = %s AND event_id = %s",
                (student_id, course_id))
            return cur.fetchone() is not None