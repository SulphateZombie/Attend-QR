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
  course_id: string,
  name: string,
  building_name: string,
  room_id: string,
  time_slot_id: string
) {
  return apiFetch('/api/courses/', {
    method: 'POST',
    body: JSON.stringify({ course_id, name, building_name, room_id, time_slot_id }),
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

export async function apiGenerateQR(slotId: string, courseId: string, duration: number = 5) {
  return apiFetch('/api/qr/generate', {
    method: 'POST',
    body: JSON.stringify({ slotId, courseId, duration }),
  });
}

export async function apiGetActiveQR(courseId: string) {
  return apiFetch(`/api/qr/active/${courseId}`);
}

export async function apiValidateQR(qrCode: string) {
  return apiFetch('/api/qr/validate', {
    method: 'POST',
    body: JSON.stringify({ qrCode }),
  });
}


// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE API
// ═══════════════════════════════════════════════════════════════════════════════

export async function apiMarkAttendance(qrCode: string) {
  return apiFetch('/api/attendance/mark', {
    method: 'POST',
    body: JSON.stringify({ qrCode }),
  });
}

export async function apiGetAttendanceStats() {
  return apiFetch('/api/attendance/stats');
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
  return apiFetch('/api/admin/dashboard');
}

export async function apiGetAllUsers() {
  return apiFetch('/api/admin/users');
}

export async function apiDeleteUser(userId: string) {
  return apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
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
  event_id: string,
  name: string,
  building_name: string,
  room_id: string,
  activity_date: string,
  start_time: string,
  end_time: string,
  committee_id: string,
) {
  return apiFetch('/api/activities/', {
    method: 'POST',
    body: JSON.stringify({
      event_id, name, building_name, room_id,
      activity_date, start_time, end_time, committee_id,
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

export async function apiGetAllCommittees() {
  return apiFetch('/api/activities/committees');
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