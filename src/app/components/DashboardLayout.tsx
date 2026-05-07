/**
 * Dashboard Layout Components for AttendQR.
 *
 * Provides responsive layouts for each user role:
 * - StudentLayout: Dashboard, Scanner, Courses, History navigation
 * - FacultyLayout: Dashboard, Courses, Reports navigation
 * - AdminLayout: Dashboard, Users, Courses, Activities navigation
 *
 * Each layout includes:
 * - Desktop sidebar (left side, always visible on md+ screens)
 * - Mobile bottom navigation bar (visible on small screens)
 * - Logout functionality that clears the JWT token
 */

import { NavLink, Outlet, useNavigate } from 'react-router';
import { LayoutDashboard, Scan, Book, LogOut, Calendar, QrCode, History, Users, Shield } from 'lucide-react';
import { clearAuth } from '../utils/api';

/**
 * Shared Sidebar + Bottom Nav component.
 * Renders a desktop sidebar and a mobile bottom navigation bar
 * with the provided navigation items.
 */
function SidebarAndNav({
  navItems,
  handleLogout,
  role,
}: {
  navItems: { to: string; icon: any; label: string }[];
  handleLogout: () => void;
  role: string;
}) {
  return (
    <>
      {/* Desktop Sidebar — hidden on mobile, visible on md+ screens */}
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 bg-card border-r border-border z-40">
        {/* App Logo */}
        <div className="flex items-center h-16 px-6 border-b border-border">
          <QrCode className="w-8 h-8 text-primary mr-3" />
          <span className="text-xl font-bold text-primary">AttendQR</span>
        </div>

        {/* Role Label */}
        <div className="px-6 py-4">
          <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold mb-4">
            {role} Portal
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-5 h-5 mr-4" />
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-4" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation — visible on small screens only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`w-6 h-6 mb-1 ${isActive ? 'text-primary' : ''}`} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

export function StudentLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const navItems = [
    { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/student/scanner', icon: Scan, label: 'Scan' },
    { to: '/student/courses', icon: Book, label: 'Courses' },
    { to: '/student/history', icon: History, label: 'History' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <SidebarAndNav navItems={navItems} handleLogout={handleLogout} role="Student" />
      <main className="flex-1 min-h-screen md:ml-64 pb-16 md:pb-0">
        <div className="w-full h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACULTY LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

export function FacultyLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  const navItems = [
    { to: '/faculty/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/faculty/courses', icon: Book, label: 'Courses' },
    { to: '/faculty/reports', icon: Calendar, label: 'Reports' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <SidebarAndNav navItems={navItems} handleLogout={handleLogout} role="Faculty" />
      <main className="flex-1 min-h-screen md:ml-64 pb-16 md:pb-0">
        <div className="w-full h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN LAYOUT
// ═══════════════════════════════════════════════════════════════════════════════

export function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate('/');
  };

  // Admin navigation: Dashboard, Users, Courses, Activities
  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/courses', icon: Book, label: 'Courses' },
    { to: '/admin/activities', icon: Calendar, label: 'Activities' },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <SidebarAndNav navItems={navItems} handleLogout={handleLogout} role="Admin" />
      <main className="flex-1 min-h-screen md:ml-64 pb-16 md:pb-0">
        <div className="w-full h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}