/**
 * Application Routes for AttendQR.
 *
 * Defines all page routes organized by user role:
 * - / (Login)
 * - /student/* (Student portal with dashboard, scanner, courses, history)
 * - /faculty/* (Faculty portal with dashboard, courses, reports)
 * - /admin/*  (Admin portal with dashboard, users, courses) [NEW]
 */

import { createBrowserRouter, Navigate } from 'react-router';
import { Login } from './components/Login';
import { StudentLayout, FacultyLayout, AdminLayout } from './components/DashboardLayout';
import { StudentDashboard } from './components/StudentDashboard';
import { StudentScanner } from './components/StudentScanner';
import { StudentCourses } from './components/StudentCourses';
import { StudentHistory } from './components/StudentHistory';
import { FacultyDashboard } from './components/FacultyDashboard';
import { FacultyCourses } from './components/FacultyCourses';
import { FacultyReports } from './components/FacultyReports';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminUsers } from './components/AdminUsers';
import { AdminCourses } from './components/AdminCourses';
// Add this import at the top with the other Admin imports
import { AdminActivities } from './components/AdminActivities';

export const router = createBrowserRouter([
  // ── Login Page ────────────────────────────────────────────────────────────
  {
    path: '/',
    Component: Login,
  },

  // ── Student Portal ────────────────────────────────────────────────────────
  {
    path: '/student',
    Component: StudentLayout,
    children: [
      { index: true, element: <Navigate to="/student/dashboard" replace /> },
      { path: 'dashboard', Component: StudentDashboard },
      { path: 'scanner', Component: StudentScanner },
      { path: 'courses', Component: StudentCourses },
      { path: 'history', Component: StudentHistory },  // [NEW] Attendance History
    ],
  },

  // ── Faculty Portal ────────────────────────────────────────────────────────
  {
    path: '/faculty',
    Component: FacultyLayout,
    children: [
      { index: true, element: <Navigate to="/faculty/dashboard" replace /> },
      { path: 'dashboard', Component: FacultyDashboard },
      { path: 'courses', Component: FacultyCourses },
      { path: 'reports', Component: FacultyReports },
    ],
  },

  // ── [NEW] Admin Portal ────────────────────────────────────────────────────
  // ── [NEW] Admin Portal ────────────────────────────────────────────────────
{
  path: '/admin',
  Component: AdminLayout,
  children: [
    { index: true, element: <Navigate to="/admin/dashboard" replace /> },
    { path: 'dashboard', Component: AdminDashboard },
    { path: 'users', Component: AdminUsers },
    { path: 'courses', Component: AdminCourses },
    { path: 'activities', Component: AdminActivities },  // ← ADD THIS
  ],
  },
]);
