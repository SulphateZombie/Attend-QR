/**
 * Attendance utility functions for AttendQR.
 *
 * This module was originally the primary data layer using localStorage.
 * It has been REWRITTEN to act as a thin wrapper around the API service (api.ts).
 *
 * The function signatures are kept compatible with the components that use them,
 * but all data now flows through the FastAPI backend.
 */

import {
  getCachedUser,
  clearAuth,
  apiGetCourses,
  apiGetCourseSlots,
  apiGetTodaySlots,
  apiGetAttendanceStats,
} from './api';
import { User, Course, Slot, AttendanceStats } from '../types';


// ═══════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// These functions now read from the cached user data stored after login.
// ═══════════════════════════════════════════════════════════════════════════════

/** Get the currently logged-in user from local cache */
export const getCurrentUser = (): User | null => {
  return getCachedUser();
};

/** Clear user session (called on logout) */
export const logoutUser = () => {
  clearAuth();
};


// ═══════════════════════════════════════════════════════════════════════════════
// COURSE HELPERS
// These are async wrappers that call the backend API.
// ═══════════════════════════════════════════════════════════════════════════════

/** Fetch all courses from the backend (filtered by user role) */
export const fetchCourses = async (): Promise<Course[]> => {
  try {
    return await apiGetCourses();
  } catch {
    return [];
  }
};

/** Fetch time slots for a specific course */
export const fetchCourseSlots = async (courseId: string): Promise<Slot[]> => {
  try {
    return await apiGetCourseSlots(courseId);
  } catch {
    return [];
  }
};

/** Fetch today's time slots */
export const fetchTodaySlots = async (): Promise<Slot[]> => {
  try {
    return await apiGetTodaySlots();
  } catch {
    return [];
  }
};


// ═══════════════════════════════════════════════════════════════════════════════
// ATTENDANCE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/** Fetch attendance stats for the current student */
export const fetchAttendanceStats = async (): Promise<AttendanceStats> => {
  try {
    return await apiGetAttendanceStats();
  } catch {
    // Return empty stats on error so the UI doesn't crash
    return {
      totalClasses: 0,
      attended: 0,
      absent: 0,
      attendancePercentage: 0,
      courseWiseStats: [],
    };
  }
};
