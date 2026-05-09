import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Users, FileText, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { apiGetCourses, apiGetCourseReport, apiGetReportsSummary, apiExportCSV, apiGetLowAttendance } from '../utils/api';

export function FacultyReports() {
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [summary, setSummary] = useState<any[]>([]);
  const [lowAttendance, setLowAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesData, summaryData] = await Promise.all([
          apiGetCourses(),
          apiGetReportsSummary(),
        ]);
        setCourses(coursesData);
        setSummary(summaryData); // array of ReportSummaryOut
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedCourse) { setReportData(null); setLowAttendance([]); return; }
    const loadReport = async () => {
      setReportLoading(true);
      try {
        const [report, lowAtt] = await Promise.all([
          apiGetCourseReport(selectedCourse),
          apiGetLowAttendance(selectedCourse),
        ]);
        setReportData(report);       // CourseAnalyticsOut
        setLowAttendance(lowAtt);    // list[LowAttendanceStudentOut]
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setReportLoading(false);
      }
    };
    loadReport();
  }, [selectedCourse]);

  const handleExport = async () => {
    if (!selectedCourse) return;
    try { await apiExportCSV(selectedCourse); } catch (err) { console.error('Export failed:', err); }
  };

  // Aggregate summary stats from the summary array
  const totalCourses = summary.length;
  const totalStudents = summary.reduce((s, c) => s + (c.total_students ?? 0), 0);
  const totalRecords = summary.reduce((s, c) => s + (c.total_students ?? 0), 0); // no record count in backend

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg"><FileText className="w-6 h-6 text-primary-foreground" /></div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Attendance Reports</h2>
            <p className="text-sm text-muted-foreground">View and analyze attendance data</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Summary Stats — derived from summary array */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-card border-border text-center">
            <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{totalCourses}</p>
            <p className="text-xs text-muted-foreground">Courses</p>
          </Card>
          <Card className="p-3 bg-card border-border text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </Card>
          <Card className="p-3 bg-card border-border text-center">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">
              {totalCourses > 0
                ? (summary.reduce((s, c) => s + (c.average_attendance_pct ?? 0), 0) / totalCourses).toFixed(0)
                : 0}%
            </p>
            <p className="text-xs text-muted-foreground">Avg Attendance</p>
          </Card>
        </div>

        {/* Course Selection */}
        <Card className="p-4 bg-card border-border">
          <label className="text-sm font-semibold text-foreground mb-2 block">Select Course</label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="bg-input-background border-border text-foreground">
              <SelectValue placeholder="Choose a course to view reports" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course: any) => (
                <SelectItem key={course.event_id} value={course.event_id}>
                  {course.event_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {reportLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        )}

        {selectedCourse && reportData && !reportLoading && (
          <>
            {/* Course Info + Export */}
            {/* Backend: course_id, course_name, total_students, total_sessions, average_attendance_pct */}
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-foreground">{reportData.course_name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reportData.total_students} students • {reportData.total_sessions} sessions • {reportData.average_attendance_pct}% avg
                  </p>
                </div>
                <Button onClick={handleExport} variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10">
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
            </Card>

            {/* Low Attendance Alert */}
            {/* Backend: list of { student_id, name, email, attendance_pct } */}
            {lowAttendance.length > 0 && (
              <Card className="p-4 bg-destructive/5 border-destructive/30 border">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <h3 className="font-semibold text-foreground">Low Attendance Alert</h3>
                  <Badge className="bg-destructive/20 text-destructive border-destructive/50 border text-xs ml-auto">
                    {lowAttendance.length} at risk
                  </Badge>
                </div>
                <div className="space-y-2">
                  {lowAttendance.map((student: any) => (
                    <div key={student.student_id} className="flex items-center justify-between p-2 bg-background rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                      <p className="text-sm font-bold text-destructive">{student.attendance_pct}%</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Summary per-course breakdown as student list */}
            {/* Backend has no per-session daily data, so show per-student breakdown from summary */}
            <Card className="p-4 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-3">Course Summary</h3>
              <div className="space-y-3">
                {summary.map((course: any) => (
                  <div key={course.course_id} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-foreground">{course.course_name}</span>
                      <p className="text-xs text-muted-foreground">{course.total_students} students</p>
                    </div>
                    <Badge className={`${
                      course.average_attendance_pct >= 75
                        ? 'bg-primary/20 text-primary border-primary/50'
                        : 'bg-destructive/20 text-destructive border-destructive/50'
                    } border text-xs`}>
                      {course.average_attendance_pct}%
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {!selectedCourse && (
          <Card className="p-8 bg-card border-border text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Select a course to view detailed attendance reports</p>
          </Card>
        )}
      </div>
    </div>
  );
}