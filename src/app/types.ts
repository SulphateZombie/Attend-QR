/**
 * TypeScript type definitions for AttendQR.
 *
 * These types mirror the data structures used by both the frontend
 * and the FastAPI backend. Keep them in sync when modifying the API.
 */

// ── User & Authentication ─────────────────────────────────────────────────────

/** Represents a registered user in the system */
export interface User {
  id: string;
  name: string;
  role: 'student' | 'faculty' | 'admin';
  type?:'student' | 'faculty'| 'admin';
  email: string;
  created_at?: string;
}

/** Response from the login/register API endpoints */
export interface AuthResponse {
  token: string;
  user: User;
}

// ── Courses ───────────────────────────────────────────────────────────────────

/** A course in the system (e.g., "CS301 - Data Structures") */
export interface Course {
  event_id: string;   // ← changed from id
  id?: string;        // ← keep as optional for compatibility
  code?: string;
  event_name: string; // ← changed from name
  name?: string;      // ← keep as optional
  faculty?: string;
  faculty_id?: string;
  building_name?: string;
  room_id?: string;
  time_slot_id?: string;
  enrolledStudents?: number;
}
// ── Time Slots ────────────────────────────────────────────────────────────────

/** A recurring weekly class session */
export interface Slot {
  id: string;
  courseId: string;
  day: string;           // Day of week (e.g., "Monday")
  startTime: string;     // e.g., "09:00"
  endTime: string;       // e.g., "10:30"
  location: string;      // e.g., "Room A-301"
  courseName?: string;   // Enriched by the backend for display
  courseCode?: string;    // Enriched by the backend for display
}

// ── QR Sessions ───────────────────────────────────────────────────────────────

/** A time-limited QR code session for marking attendance */
export interface QRSession {
  id: string;
  sessionId: string;
  courseId: string;
  qrCode: string;        // The unique QR code string
  generatedAt: string;   // ISO timestamp
  expiresAt: string;     // ISO timestamp
  isActive: boolean;
}

// ── Attendance ────────────────────────────────────────────────────────────────

/** A single attendance record for one student in one session */
export interface AttendanceRecord {
  id: string;
  studentId: string;
  slotId: string;
  courseId: string;
  timestamp: string;     // When the attendance was marked
  status: 'present' | 'absent';
  courseName?: string;   // Enriched for history display
  courseCode?: string;    // Enriched for history display
}

/** Aggregated attendance statistics for a student */
export interface AttendanceStats {
  totalClasses: number;
  attended: number;
  absent: number;
  attendancePercentage: number;
  meetsRequirement?: boolean;  // [NEW] Whether they meet the 75% threshold
  courseWiseStats: {
    courseId: string;
    courseName: string;
    total: number;
    attended: number;
    percentage: number;
  }[];
}

// ── Enrollment ────────────────────────────────────────────────────────────────
// [NEW] Types for the enrollment system

/** Links a student to a course they're registered in */
export interface EnrollmentRecord {
  id: string;
  student_id: string;
  course_id: string;
  enrolled_at: string;
}

// ── Reports ───────────────────────────────────────────────────────────────────
// [NEW] Types for faculty reports

/** Per-student attendance breakdown within a course */
export interface StudentAttendanceStat {
  studentId: string;
  studentName: string;
  studentEmail: string;
  attended: number;
  total: number;
  percentage: number;
  belowThreshold: boolean;
}

/** Course report with full analytics */
export interface CourseReport {
  course: Course;
  totalStudents: number;
  totalSlots: number;
  overallAttendanceRate: number;
  studentStats: StudentAttendanceStat[];
  dailyAttendance: { date: string; present: number; total: number }[];
}

/** Student at risk of falling below attendance threshold */
export interface LowAttendanceStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  attended: number;
  total: number;
  percentage: number;
  classesNeeded: number;  // How many more classes to reach 75%
}

// ── Admin ─────────────────────────────────────────────────────────────────────
// [NEW] Types for the admin dashboard

/** System-wide statistics for the admin dashboard */
export interface AdminDashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalFaculty: number;
  totalAdmins: number;
  totalCourses: number;
  totalAttendanceRecords: number;
  totalSlots: number;
}
