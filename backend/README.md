# AttendQR Backend Setup

## Prerequisites
- Python 3.8+
- PostgreSQL 12+
- pip

## Installation

### 1. Create virtual environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your database credentials and secret key
```

### 4. Run migrations (if any)
```bash
# Setup your PostgreSQL database first
# Update DATABASE_URL in .env with your connection string
```

### 5. Start the server
```bash
python main.py
```

The API will be available at `http://localhost:8000`
API documentation: `http://localhost:8000/docs`

## Project Structure

- `main.py` - FastAPI application and all endpoints
- `models.py` - Pydantic request/response schemas
- `auth.py` - JWT token handling and authentication
- `db.py` - Database queries and operations
- `requirements.txt` - Python dependencies
- `.env` - Environment configuration (not in version control)

## API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Courses
- `GET /api/courses/` - Get user's courses
- `GET /api/courses/all` - Get all courses
- `GET /api/courses/{courseId}` - Get specific course
- `GET /api/courses/{courseId}/slots` - Get course slots
- `POST /api/courses/` - Create course

### QR & Attendance
- `POST /api/qr/generate` - Generate QR code
- `GET /api/qr/active/{courseId}` - Get active QR session
- `POST /api/qr/validate` - Validate QR code
- `POST /api/attendance/mark` - Mark attendance
- `GET /api/attendance/stats` - Get attendance stats
- `GET /api/attendance/history` - Get attendance history

### Enrollment
- `POST /api/enrollment/enroll` - Enroll student (admin)
- `POST /api/enrollment/self-enroll` - Student self-enroll
- `DELETE /api/enrollment/unenroll` - Unenroll student
- `GET /api/enrollment/students/{courseId}` - Get enrolled students
- `GET /api/enrollment/courses` - Get student's courses

### Reports
- `GET /api/reports/course/{courseId}` - Get course report
- `GET /api/reports/export/{courseId}` - Export CSV
- `GET /api/reports/low-attendance/{courseId}` - Low attendance students
- `GET /api/reports/summary` - Reports summary

### Admin
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - Get all users
- `DELETE /api/admin/users/{userId}` - Delete user
- `PUT /api/admin/users/{userId}/role` - Change user role
- `GET /api/admin/courses` - Get all courses
- `DELETE /api/admin/courses/{courseId}` - Delete course

### Activities
- `GET /api/activities/` - Get all activities

## Database Schema

The backend expects these tables in your PostgreSQL database:

- `user_table` - Users with id, name, email, type (role), phone_no, password
- `courses` - Courses with event_id, time_slot_id
- `event_table` - Event details with event_id, event_name, building_name, room_id
- `time_slot` - Time slots with id, start_time, end_time, slot_day
- `register` - Student course enrollment with id (student_id), event_id (course_id)
- `course_attendance_sessions` - QR sessions
- `course_attendance` - Attendance records

## Development Notes

1. The backend uses PostgreSQL with connection pooling
2. Passwords are hashed using SHA256 (consider using bcrypt in production)
3. JWT tokens are valid for 24 hours
4. All endpoints require authentication except `/api/qr/validate`
5. Role-based access control is implemented (student, faculty, admin)

## Troubleshooting

### Database connection issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists and user has proper permissions

### Import errors
- Make sure all requirements are installed: `pip install -r requirements.txt`
- Ensure .env file exists in the backend directory

### Token errors
- Make sure SECRET_KEY is set in .env
- Token expires after 24 hours
