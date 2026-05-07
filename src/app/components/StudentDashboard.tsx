/**
 * Student Dashboard Component.
 *
 * Shows the student's attendance overview:
 * - Overall attendance percentage with progress bar
 * - Quick stat cards (total, present, absent)
 * - Pie chart showing attendance distribution
 * - Per-course attendance breakdown
 * - Status indicator (good standing vs. low attendance warning)
 *
 * All data is fetched from the backend API on mount.
 */

import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { GraduationCap, TrendingUp, Calendar, Book, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Progress } from './ui/progress';
import { getCachedUser } from '../utils/api';
import { apiGetAttendanceStats } from '../utils/api';
import { AttendanceStats } from '../types';

export function StudentDashboard() {
  // ── State ──────────────────────────────────────────────────────────────────
  const user = getCachedUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AttendanceStats>({
    totalClasses: 0,
    attended: 0,
    absent: 0,
    attendancePercentage: 0,
    courseWiseStats: [],
  });

  // ── Fetch attendance data from backend ─────────────────────────────────────
  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await apiGetAttendanceStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load attendance stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();

    // Listen for attendance-update events (fired after scanning QR)
    const handleUpdate = () => loadStats();
    window.addEventListener('attendance-update', handleUpdate);
    return () => window.removeEventListener('attendance-update', handleUpdate);
  }, []);

  // ── Pie chart data for attendance distribution ─────────────────────────────
  const pieData = [
    { name: 'Present', value: stats.attended, color: '#ffd700' },
    { name: 'Absent', value: stats.absent, color: '#444444' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header with user info and overall stats */}
      <div className="bg-gradient-to-br from-card to-secondary p-6 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-primary rounded-lg">
            <GraduationCap className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Overall Attendance Card */}
        <Card className="p-4 bg-background/50 border-border backdrop-blur-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Overall Attendance</span>
            <span className="text-2xl font-bold text-primary">
              {stats.attendancePercentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={stats.attendancePercentage} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{stats.attended} Present</span>
            <span>{stats.absent} Absent</span>
            <span>{stats.totalClasses} Total</span>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Quick Stats — 3 cards in a row */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-card border-border text-center">
            <Calendar className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{stats.totalClasses}</p>
            <p className="text-xs text-muted-foreground">Classes</p>
          </Card>
          <Card className="p-3 bg-card border-border text-center">
            <TrendingUp className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{stats.attended}</p>
            <p className="text-xs text-muted-foreground">Present</p>
          </Card>
          <Card className="p-3 bg-card border-border text-center">
            <Book className="w-6 h-6 text-destructive mx-auto mb-1" />
            <p className="text-xl font-bold text-foreground">{stats.absent}</p>
            <p className="text-xs text-muted-foreground">Absent</p>
          </Card>
        </div>

        {/* Pie Chart — Attendance Distribution */}
        <Card className="p-4 bg-card border-border">
          <h3 className="font-semibold text-foreground mb-3">Attendance Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Course-wise Attendance Breakdown */}
        <Card className="p-4 bg-card border-border">
          <h3 className="font-semibold text-foreground mb-3">Course-wise Attendance</h3>
          <div className="space-y-3">
            {stats.courseWiseStats.map((course) => (
              <div key={course.courseId}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-foreground font-medium">{course.courseName}</span>
                  <span className="text-sm font-bold text-primary">
                    {course.percentage.toFixed(0)}%
                  </span>
                </div>
                <Progress value={course.percentage} className="h-1.5" />
                <p className="text-xs text-muted-foreground mt-1">
                  {course.attended}/{course.total} classes attended
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Attendance Status — Good Standing or Warning */}
        <Card className="p-4 bg-card border-border">
          <h3 className="font-semibold text-foreground mb-3">Status</h3>
          {stats.attendancePercentage >= 75 ? (
            <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
              <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Excellent Attendance!</p>
                <p className="text-xs text-muted-foreground">
                  You meet the minimum attendance requirement (75%)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <Book className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Low Attendance</p>
                <p className="text-xs text-muted-foreground">
                  Attend more classes to meet the 75% requirement
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
