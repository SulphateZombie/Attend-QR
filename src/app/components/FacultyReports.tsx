/**
 * Faculty Reports Component.
 * Shows attendance analytics, export options, and low-attendance alerts.
 * [NEW] Added CSV export and low-attendance student identification.
 */

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Calendar, TrendingUp, Users, FileText, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { apiGetCourses, apiGetCourseReport, apiGetReportsSummary, apiExportCSV, apiGetLowAttendance } from '../utils/api';
import { Course } from '../types';

export function FacultyReports() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [lowAttendance, setLowAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  // Load courses and summary on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesData, summaryData] = await Promise.all([
          apiGetCourses(),
          apiGetReportsSummary(),
        ]);
        setCourses(coursesData);
        setSummary(summaryData);
      } catch (err) {
        console.error('Failed to load report data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Load course report when selection changes
  useEffect(() => {
    if (!selectedCourse) { setReportData(null); setLowAttendance(null); return; }
    const loadReport = async () => {
      setReportLoading(true);
      try {
        const [report, lowAtt] = await Promise.all([
          apiGetCourseReport(selectedCourse),
          apiGetLowAttendance(selectedCourse),
        ]);
        setReportData(report);
        setLowAttendance(lowAtt);
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setReportLoading(false);
      }
    };
    loadReport();
  }, [selectedCourse]);

  /** [NEW] Trigger CSV download for the selected course */
  const handleExport = async () => {
    if (!selectedCourse) return;
    try { await apiExportCSV(selectedCourse); } catch (err) { console.error('Export failed:', err); }
  };

  if (loading) {
    return (<div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>);
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
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 bg-card border-border text-center">
            <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{summary?.totalCourses || 0}</p>
            <p className="text-xs text-muted-foreground">Courses</p>
          </Card>
          <Card className="p-3 bg-card border-border text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{summary?.totalStudents || 0}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </Card>
          <Card className="p-3 bg-card border-border text-center">
            <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{summary?.totalRecords || 0}</p>
            <p className="text-xs text-muted-foreground">Records</p>
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
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>{course.code} - {course.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Card>

        {reportLoading && (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
        )}

        {selectedCourse && reportData && !reportLoading && (
          <>
            {/* Course Info + Export Button */}
            <Card className="p-4 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <Badge className="bg-primary/20 text-primary border-primary/50 border mb-2">{reportData.course?.code}</Badge>
                  <h3 className="font-bold text-foreground">{reportData.course?.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reportData.totalStudents} students • {reportData.overallAttendanceRate}% avg attendance
                  </p>
                </div>
                {/* [NEW] CSV Export Button */}
                <Button onClick={handleExport} variant="outline" size="sm" className="border-primary/50 text-primary hover:bg-primary/10">
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
            </Card>

            {/* Attendance Chart */}
            {reportData.dailyAttendance?.length > 0 && (
              <Card className="p-4 bg-card border-border">
                <h3 className="font-semibold text-foreground mb-4">Recent Attendance</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={reportData.dailyAttendance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="date" stroke="#888888" tick={{ fill: '#888888', fontSize: 12 }} />
                    <YAxis stroke="#888888" tick={{ fill: '#888888', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid rgba(255, 215, 0, 0.2)', borderRadius: '8px', color: '#ffffff' }} />
                    <Bar dataKey="present" fill="#ffd700" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* [NEW] Low Attendance Alert Section */}
            {lowAttendance && lowAttendance.totalAtRisk > 0 && (
              <Card className="p-4 bg-destructive/5 border-destructive/30 border">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <h3 className="font-semibold text-foreground">Low Attendance Alert</h3>
                  <Badge className="bg-destructive/20 text-destructive border-destructive/50 border text-xs ml-auto">
                    {lowAttendance.totalAtRisk} at risk
                  </Badge>
                </div>
                <div className="space-y-2">
                  {lowAttendance.studentsAtRisk.map((student: any) => (
                    <div key={student.studentId} className="flex items-center justify-between p-2 bg-background rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-foreground">{student.studentName}</p>
                        <p className="text-xs text-muted-foreground">{student.studentEmail}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-destructive">{student.percentage}%</p>
                        <p className="text-xs text-muted-foreground">Needs {student.classesNeeded} more</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Student-wise Breakdown */}
            <Card className="p-4 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-3">Student Attendance</h3>
              <div className="space-y-3">
                {reportData.studentStats?.map((student: any) => (
                  <div key={student.studentId} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm text-foreground">{student.studentName}</span>
                      <p className="text-xs text-muted-foreground">{student.attended}/{student.total} classes</p>
                    </div>
                    <Badge className={`${student.percentage >= 75 ? 'bg-primary/20 text-primary border-primary/50' : 'bg-destructive/20 text-destructive border-destructive/50'} border text-xs`}>
                      {student.percentage}%
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
