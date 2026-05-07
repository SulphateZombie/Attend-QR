/**
 * [NEW FEATURE] Student Attendance History Component.
 *
 * Shows a chronological log of all attendance records for the student.
 * Can be filtered by course. This was missing from the original frontend
 * which only showed aggregate stats but no individual session records.
 */

import { useEffect, useState } from 'react';
import { History, Filter, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { apiGetAttendanceHistory, apiGetCourses } from '../utils/api';
import { Course, AttendanceRecord } from '../types';

export function StudentHistory() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [loading, setLoading] = useState(true);

  // Load courses for the filter dropdown
  useEffect(() => {
    apiGetCourses().then(setCourses).catch(console.error);
  }, []);

  // Load history, re-fetch when filter changes
  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const courseFilter = selectedCourse === 'all' ? undefined : selectedCourse;
        const data = await apiGetAttendanceHistory(courseFilter);
        setRecords(data);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, [selectedCourse]);

  /** Format an ISO timestamp into a readable date + time string */
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <History className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Attendance History</h2>
            <p className="text-sm text-muted-foreground">{records.length} records found</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Course Filter */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="w-4 h-4 text-primary" />
            <label className="text-sm font-semibold text-foreground">Filter by Course</label>
          </div>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="bg-input-background border-border text-foreground">
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <Card className="p-8 bg-card border-border text-center">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No attendance records yet</p>
          </Card>
        ) : (
          /* Attendance Record List */
          <div className="space-y-2">
            {records.map((record) => (
              <Card key={record.id} className="p-4 bg-card border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{record.courseName}</p>
                    <Badge className="bg-primary/20 text-primary border-primary/50 border text-xs mt-1">
                      {record.courseCode}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDate(record.timestamp)} at {formatTime(record.timestamp)}
                    </p>
                  </div>
                  <Badge className={`${
                    record.status === 'present'
                      ? 'bg-primary/20 text-primary border-primary/50'
                      : 'bg-destructive/20 text-destructive border-destructive/50'
                  } border`}>
                    {record.status === 'present' ? 'Present' : 'Absent'}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
