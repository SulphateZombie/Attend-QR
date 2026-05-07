# AttendQR Backend Implementation Guide

## Overview

The AttendQR backend is a FastAPI application that provides a complete RESTful API for an attendance management system with QR code scanning capabilities. The system supports three user roles: students, faculty, and administrators.

## Architecture

```
backend/
├── main.py           # FastAPI application and all endpoints
├── models.py         # Pydantic request/response schemas
├── auth.py           # JWT authentication utilities
├── db.py             # Database operations (already implemented)
├── requirements.txt  # Python dependencies
├── .env              # Environment configuration (create from .env.example)
├── .env.example      # Template for environment variables
├── README.md         # Quick setup guide
├── setup.sh          # Automated setup script
└── this_file         # Implementation guide
```

## Key Features

### 1. Authentication System
- **JWT-based authentication** with 24-hour token expiration
- **Password hashing** using SHA256
- **Role-based access control** (RBAC) for students, faculty, and admins
- Secure token storage in localStorage on the frontend

### 2. Core Functionality

#### For Students
- Register and login
- Self-enroll in courses
- Scan QR codes to mark attendance
- View personal attendance statistics
- View attendance history per course
- Track low attendance warnings

#### For Faculty
- Manage their courses
- Generate QR codes for attendance sessions
- View student attendance reports
- Export attendance data as CSV
- Identify students with low attendance
- Monitor class statistics

#### For Administrators
- Manage all users (create, read, update, delete)
- Change user roles
- Manage all courses
- View system-wide statistics
- View activity logs
- Monitor overall attendance patterns

### 3. Data Management
- PostgreSQL database integration with connection pooling
- Structured data models for all entities
- Transactional operations for data consistency
- Parameterized queries to prevent SQL injection

## API Endpoints (25 Total)

### Authentication (3 endpoints)
```
POST   /api/auth/register      - Register new user
POST   /api/auth/login         - Login with credentials
GET    /api/auth/me            - Get current user info
```

### Courses (5 endpoints)
```
GET    /api/courses/           - Get user's courses
GET    /api/courses/all        - Get all courses (admin/faculty)
GET    /api/courses/{id}       - Get specific course
GET    /api/courses/{id}/slots - Get course time slots
POST   /api/courses/           - Create new course
```

### Time Slots (2 endpoints)
```
GET    /api/slots/today        - Get today's scheduled slots
GET    /api/slots/             - Get all available slots
```

### QR Sessions (3 endpoints)
```
POST   /api/qr/generate        - Generate QR code for attendance
GET    /api/qr/active/{id}     - Get active QR session
POST   /api/qr/validate        - Validate QR code format
```

### Attendance (3 endpoints)
```
POST   /api/attendance/mark    - Mark attendance via QR code
GET    /api/attendance/stats   - Get attendance statistics
GET    /api/attendance/history - Get attendance records
```

### Enrollment (5 endpoints)
```
POST   /api/enrollment/enroll         - Enroll student (admin)
POST   /api/enrollment/self-enroll    - Student self-enrollment
DELETE /api/enrollment/unenroll       - Remove enrollment
GET    /api/enrollment/students/{id}  - Get enrolled students
GET    /api/enrollment/courses        - Get student's courses
```

### Reports (4 endpoints)
```
GET    /api/reports/course/{id}              - Course attendance report
GET    /api/reports/export/{id}              - Export report as CSV
GET    /api/reports/low-attendance/{id}      - Students with low attendance
GET    /api/reports/summary                  - Summary of all reports
```

### Admin (6 endpoints)
```
GET    /api/admin/dashboard           - Dashboard statistics
GET    /api/admin/users               - List all users
DELETE /api/admin/users/{id}          - Delete user
PUT    /api/admin/users/{id}/role     - Change user role
GET    /api/admin/courses             - List all courses
DELETE /api/admin/courses/{id}        - Delete course
```

### Activities (1 endpoint)
```
GET    /api/activities/               - Get activity logs
```

### Health Check (1 endpoint)
```
GET    /health                        - API health status
```

## Data Models

### User
```python
{
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": "student|faculty|admin",
    "phone_no": "string",
    "created_at": "datetime"
}
```

### Course
```python
{
    "event_id": "string",
    "event_name": "string",
    "faculty_id": "string",
    "building_name": "string",
    "room_id": "string",
    "time_slot_id": "string"
}
```

### QRSession
```python
{
    "id": "uuid",
    "courseId": "string",
    "slotId": "string",
    "qrCode": "string",
    "generatedAt": "datetime",
    "expiresAt": "datetime",
    "isActive": true
}
```

### AttendanceRecord
```python
{
    "id": "uuid",
    "studentId": "string",
    "courseId": "string",
    "timestamp": "datetime",
    "status": "present|absent"
}
```

## Configuration

### Environment Variables (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/attendqr
SECRET_KEY=your-secret-key-change-in-production
HOST=0.0.0.0
PORT=8000
```

### Database Requirements
- PostgreSQL 12+
- Following tables (provided in db.py):
  - `user_table` - User accounts
  - `courses` - Course definitions
  - `event_table` - Event details
  - `time_slot` - Time slot definitions
  - `register` - Student enrollments
  - `course_attendance_sessions` - QR sessions
  - `course_attendance` - Attendance records

## Security Features

1. **Authentication**
   - JWT tokens with expiration
   - Bearer token in Authorization header
   - Secure password hashing

2. **Authorization**
   - Role-based access control
   - Endpoint-level permission checks
   - User ownership validation

3. **Data Protection**
   - Parameterized SQL queries (SQL injection prevention)
   - CORS configuration
   - HTTPSecurity headers ready

4. **Error Handling**
   - Graceful error responses
   - Detailed error messages for debugging
   - Proper HTTP status codes

## Running the Backend

### Option 1: Using setup script
```bash
bash setup.sh
python main.py
```

### Option 2: Manual setup
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your configuration
python main.py
```

### Option 3: Using uvicorn directly
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Documentation

Once the server is running, access interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Testing

### Health Check
```bash
curl http://localhost:8000/health
```

### Register User
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "securepassword",
    "phone_no": "1234567890",
    "role": "student"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "securepassword"
  }'
```

### Authenticated Request (using token)
```bash
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Implementation Status

### ✅ Complete
- All 25 API endpoints implemented
- JWT authentication system
- Role-based access control
- Pydantic models and validation
- Database integration
- CORS configuration
- Error handling

### 🔄 Partial Implementation
- Attendance statistics (needs calculation logic)
- Course reports (needs aggregation logic)
- CSV export (needs generation logic)
- Activity logging (needs recording mechanism)

### 📋 TODO
- Unit tests
- Integration tests
- API documentation generation
- Rate limiting
- Request logging
- Performance monitoring
- Caching layer

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database credentials

### Import Errors
- Install all requirements: `pip install -r requirements.txt`
- Ensure Python version is 3.8+

### Token Expiration
- Tokens expire after 24 hours
- Frontend should refresh tokens or prompt re-login

### CORS Issues
- Update allowed_origins in main.py if needed
- Currently allows all origins (*)

## Performance Considerations

1. **Database Connection Pooling**
   - Configured with min=1, max=10 connections
   - Suitable for small to medium deployments

2. **Query Optimization**
   - Indexes on frequently queried fields recommended
   - Consider pagination for large result sets

3. **Caching**
   - Redis integration recommended for frequently accessed data
   - Token caching for permission lookups

## Future Enhancements

1. **Real QR Code Generation**
   - Integrate qrcode library for actual QR generation
   - Store generated codes in database

2. **Email Notifications**
   - Send attendance alerts
   - Course enrollment confirmations

3. **Advanced Reporting**
   - Statistical analysis
   - Trend identification
   - Predictive analytics

4. **Mobile App Backend**
   - Push notifications
   - Offline sync capability

5. **Integration**
   - Calendar system integration
   - Email system integration
   - SMS alerts

## Support & Maintenance

- Review logs regularly for errors
- Monitor database performance
- Update dependencies for security patches
- Test new features thoroughly before deployment
