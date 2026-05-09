import { useEffect, useState } from 'react';
import { History, Filter, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { apiGetAttendanceHistory, apiGetEnrolledCourses } from '../utils/api';

interface AttendanceRecord {
  course_id: string;
  course_name: string;
  date: string;
  status: number | string;
}

interface EnrolledCourse {
  event_id: string;
  event_name: string;
}

export function StudentHistory() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [loading, setLoading] = useState(true);

  // Use enrolled courses for the filter — these are the only ones
  // a student could possibly have attendance records for
  useEffect(() => {
    apiGetEnrolledCourses().then(setCourses).catch(console.error);
  }, []);

  // Fetch all records once; filter client-side since backend has no query param
  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const data: AttendanceRecord[] = await apiGetAttendanceHistory();
        setRecords(data);
      } catch (err) {
        console.error('Failed to load history:', err);
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    // Fallback for plain date strings like "2025-01-15" that have no time component
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isPresent = (status: number | string) =>
    status === 1 || status === 'present' || status === '1';

  // Client-side filter
  const filtered = selectedCourse === 'all'
    ? records
    : records.filter(r => r.course_id === selectedCourse);

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
            <p className="text-sm text-muted-foreground">{filtered.length} records found</p>
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
                <SelectItem key={course.event_id} value={course.event_id}>
                  {course.event_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-8 bg-card border-border text-center">
            <History className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No attendance records yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((record, index) => (
              <Card key={`${record.course_id}-${record.date}-${index}`} className="p-4 bg-card border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{record.course_name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(record.date)}
                    </p>
                  </div>
                  <Badge className={`${
                    isPresent(record.status)
                      ? 'bg-primary/20 text-primary border-primary/50'
                      : 'bg-destructive/20 text-destructive border-destructive/50'
                  } border`}>
                    {isPresent(record.status) ? 'Present' : 'Absent'}
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