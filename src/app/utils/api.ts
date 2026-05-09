/**
 * API Service Layer for AttendQR Frontend.
 */

// ── Token Management ──────────────────────────────────────────────────────────

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'current_user';

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function cacheUser(user: any) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getCachedUser(): any | null {
  try {
    const data = localStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}


// ── Core Fetch Wrapper ────────────────────────────────────────────────────────

async function apiFetch(url: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Request failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return response;
}


// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATION API
// ═══════════════════════════════════════════════════════════════════════════════

/** Register a new user account */
export async function apiRegister(
  name: string,
  email: string,
  password: string,
  phone_no: string,   // ← ADDED
  role: string
) {
  const data = await apiFetch('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, phone_no, role }), // ← ADDED phone_no
  });
  setToken(data.token);
  cacheUser(data.user);
  return data;
}

/** Login with email and password */
export async function apiLogin(email: string, password: string) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  cacheUser(data.user);
  return data;
}

/** Get the currently authenticated user from the server */
export async function apiGetMe() {
  return apiFetch('/api/auth/me');
}


// ═══════════════════════════════════════════════════════════════════════════════
// COURSES API
// ═══════════════════════════════════════════════════════════════════════════════

export async function apiGetCourses() {
  return apiFetch('/api/courses/');
}

export async function apiGetAllCourses() {
  return apiFetch('/api/courses/all');
}

export async function apiGetCourse(courseId: string) {
  return apiFetch(`/api/courses/${courseId}`);
}

export async function apiGetCourseSlots(courseId: string) {
  return apiFetch(`/api/courses/${courseId}/slots`);
}

export async function apiCreateCourse(
  course_id: string,  // ← ADD
  event_name: string,
  building_name: string,
  room_id: string,
  time_slot_id: string,
  faculty_id: string
) {
  return apiFetch('/api/courses/', {
    method: 'POST',
    body: JSON.stringify({ course_id, event_name, building_name, room_id, time_slot_id, faculty_id }),
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// SLOTS API
// ═══════════════════════════════════════════════════════════════════════════════

export async function apiGetTodaySlots() {
  return apiFetch('/api/slots/today');
}

export async function apiGetAllSlots() {
  return apiFetch('/api/slots/');
}


// ═══════════════════════════════════════════════════════════════════════════════
// QR SESSIONS API
// ═══════════════════════════════════════════════════════════════════════════════

export async function apiGenerateQR(courseId: string) {
  return apiFetch('/api/qr/generate', {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId }),
  });
}

export async function apiRotateQR(sessionId: string) {
  return apiFetch(`/api/qr/rotate/${sessionId}`, { method: 'POST' }); // ✅ template literal
}

export async function apiGetActiveQR(courseId: string) {
  return apiFetch(`/api/qr/active/${courseId}`);
}

export async function apiValidateQR(qrCode: string) {
  return apiFetch('/api/qr/validate', {
    method: 'POST',
    body: JSON.stringify({ qr_payload:qrCode }),
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE API
// ═══════════════════════════════════════════════════════════════════════════════

export async function apiMarkAttendance(qrCode: string,courseId:string) {
  return apiFetch('/api/attendance/mark', {
    method: 'POST',
    body: JSON.stringify({ qr_payload:qrCode,course_id:courseId }),
  });
}

export async function apiGetAttendanceStats() {
  const rows: any[] = await apiFetch('/api/attendance/stats');

  // The backend returns a per-course list; aggregate into the shape the UI expects
  const courseWiseStats = rows.map((r: any) => ({
    courseId: r.course_id,
    courseName: r.course_name ?? '',
    total: r.total_classes ?? 0,
    attended: r.attended ?? 0,
    percentage: r.percentage != null ? Number(r.percentage) : 0,
  }));

  const totalClasses = courseWiseStats.reduce((s, c) => s + c.total, 0);
  const attended = courseWiseStats.reduce((s, c) => s + c.attended, 0);
  const absent = totalClasses - attended;
  const attendancePercentage = totalClasses > 0 ? (attended / totalClasses) * 100 : 0;

  return {
    totalClasses,
    attended,
    absent,
    attendancePercentage,
    courseWiseStats,
  };
}

export async function apiGetAttendanceHistory(courseId?: string) {
  const query = courseId ? `?course_id=${courseId}` : '';
  return apiFetch(`/api/attendance/history${query}`);
}


// ═══════════════════════════════════════════════════════════════════════════════
// REPORTS API (Faculty/Admin)
// ═══════════════════════════════════════════════════════════════════════════════

export async function apiGetCourseReport(courseId: string) {
  return apiFetch(`/api/reports/course/${courseId}`);
}

export async function apiExportCSV(courseId: string) {
  const token = getToken();
  const response = await fetch(`/api/reports/export/${courseId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Export failed');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance_${courseId}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function apiGetLowAttendance(courseId: string) {
  return apiFetch(`/api/reports/low-attendance/${courseId}`);
}

export async function apiGetReportsSummary() {
  return apiFetch('/api/reports/summary');
}


// ═══════════════════════════════════════════════════════════════════════════════
// ENROLLMENT API
// ═══════════════════════════════════════════════════════════════════════════════

export async function apiEnrollStudent(studentId: string, courseId: string) {
  return apiFetch('/api/enrollment/enroll', {
    method: 'POST',
    body: JSON.stringify({ student_id: studentId, course_id: courseId }),
  });
}

export async function apiSelfEnroll(courseId: string) {
  return apiFetch('/api/enrollment/self-enroll', {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId }),
  });
}

export async function apiUnenrollStudent(studentId: string, courseId: string) {
  return apiFetch('/api/enrollment/unenroll', {
    method: 'DELETE',
    body: JSON.stringify({ student_id: studentId, course_id: courseId }),
  });
}

export async function apiGetEnrolledStudents(courseId: string) {
  return apiFetch(`/api/enrollment/students/${courseId}`);
}

export async function apiGetEnrolledCourses() {
  return apiFetch('/api/enrollment/courses');
}


// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN API
// ═══════════════════════════════════════════════════════════════════════════════

export async function apiGetAdminDashboard() {
  const data: any = await apiFetch('/api/admin/dashboard');
  return {
    totalUsers: data.total_users ?? 0,
    totalStudents: data.total_students ?? 0,
    totalFaculty: data.total_faculty ?? 0,
    totalAdmins: (data.total_users ?? 0) - (data.total_students ?? 0) - (data.total_faculty ?? 0),
    totalCourses: data.total_courses ?? 0,
    totalAttendanceRecords: data.active_sessions ?? 0,
    totalSlots: 0,
  };
}

export async function apiGetAllUsers() {
  return apiFetch('/api/admin/users');
}

export async function apiDeleteUser(userId: string) {
  return apiFetch(`/api/admin/users?user_id=${userId}`, { method: 'DELETE' });
}

export async function apiChangeUserRole(userId: string, role: string) {
  return apiFetch(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function apiGetAdminCourses() {
  return apiFetch('/api/admin/courses');
}

export async function apiDeleteCourse(courseId: string) {
  return apiFetch(`/api/admin/courses/${courseId}`, { method: 'DELETE' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVITIES API  — add these to the bottom of api.ts
// ═══════════════════════════════════════════════════════════════════════════════

export async function apiGetAllActivities() {
  return apiFetch('/api/activities/');
}

export async function apiCreateActivity(
  event_id: string,        // ← ADD
  event_name: string,
  building_name: string,
  room_id: string,
  activity_date: string,
  start_time: string,
  end_time: string,
  commitee_id: string,
) {
  return apiFetch('/api/activities/', {
    method: 'POST',
    body: JSON.stringify({
      event_id,             // ← ADD
      event_name, building_name, room_id,
      activity_date, start_time, end_time,
      commitee_id: parseInt(commitee_id),
    }),
  });
}

export async function apiDeleteActivity(activityId: string) {
  return apiFetch(`/api/activities/${activityId}`, { method: 'DELETE' });
}

export async function apiGetActivityMembers(activityId: string) {
  return apiFetch(`/api/activities/${activityId}/members`);
}

export async function apiRemoveActivityMember(activityId: string, memberId: string) {
  return apiFetch(`/api/activities/${activityId}/members/${memberId}`, { method: 'DELETE' });
}

export async function apiRemoveActivityVolunteer(activityId: string, volunteerId: string) {
  return apiFetch(`/api/activities/${activityId}/volunteers/${volunteerId}`, { method: 'DELETE' });
}

export async function apiGetAllCommitees() {
  return apiFetch('/api/activities/commitees');
}

// ── Also add these 3 that AdminCourses.tsx needs (if not already in api.ts) ───

export async function apiGetCourseMembers(courseId: string) {
  return apiFetch(`/api/admin/courses/${courseId}/members`);
}

export async function apiRemoveCourseFaculty(courseId: string, facultyId: string) {
  return apiFetch(`/api/admin/courses/${courseId}/faculty/${facultyId}`, { method: 'DELETE' });
}

export async function apiDropCourseStudent(courseId: string, studentId: string) {
  return apiFetch(`/api/admin/courses/${courseId}/students/${studentId}`, { method: 'DELETE' });
}