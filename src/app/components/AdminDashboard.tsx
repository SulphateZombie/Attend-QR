/**
 * [NEW FEATURE] Admin Dashboard Component.
 *
 * System-wide overview for administrators showing:
 * - User counts by role (students, faculty, admins)
 * - Total courses and attendance records
 * - System health overview
 */

import { useEffect, useState } from 'react';
import { Shield, Users, Book, FileText, GraduationCap, UserCircle, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { apiGetAdminDashboard } from '../utils/api';
import { AdminDashboardStats } from '../types';

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGetAdminDashboard()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Admin Dashboard</h2>
            <p className="text-sm text-muted-foreground">System Overview</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* User Stats */}
        <h3 className="font-semibold text-foreground">Users</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 bg-card border-border text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats?.totalUsers || 0}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <GraduationCap className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats?.totalStudents || 0}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <UserCircle className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats?.totalFaculty || 0}</p>
            <p className="text-xs text-muted-foreground">Faculty</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <Shield className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats?.totalAdmins || 0}</p>
            <p className="text-xs text-muted-foreground">Admins</p>
          </Card>
        </div>

        {/* System Stats */}
        <h3 className="font-semibold text-foreground mt-4">System</h3>
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 bg-card border-border text-center">
            <Book className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats?.totalCourses || 0}</p>
            <p className="text-xs text-muted-foreground">Courses</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <FileText className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats?.totalAttendanceRecords || 0}</p>
            <p className="text-xs text-muted-foreground">Attendance Records</p>
          </Card>
          <Card className="p-4 bg-card border-border text-center">
            <FileText className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats?.totalSlots || 0}</p>
            <p className="text-xs text-muted-foreground">Time Slots</p>
          </Card>
        </div>

        {/* Quick Info */}
        <Card className="p-4 bg-muted border-border">
          <p className="text-xs text-muted-foreground text-center">
            <strong>Admin Panel:</strong> Use the sidebar to manage users and courses
          </p>
        </Card>
      </div>
    </div>
  );
}
