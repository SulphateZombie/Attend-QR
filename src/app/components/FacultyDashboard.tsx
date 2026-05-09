import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { UserCircle, Clock, QrCode as QrCodeIcon, X, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  getCachedUser,
  apiGetCourses,
  apiGetCourseSlots,
  apiGenerateQR,
  apiGetTodaySlots,
  apiRotateQR
} from '../utils/api';
import { QRSession } from '../types';

export function FacultyDashboard() {
  const user = getCachedUser();
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [selectedCourseSlots, setSelectedCourseSlots] = useState<any[]>([]);
  const [activeSession, setActiveSession] = useState<QRSession | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [todaySlots, setTodaySlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrPayload,setQrPayload]=useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [coursesData, todayData] = await Promise.all([
          apiGetCourses(),
          apiGetTodaySlots(),
        ]);
        setCourses(coursesData);
        setTodaySlots(todayData);
      } catch (err) {
        console.error('Failed to load faculty data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      apiGetCourseSlots(selectedCourse).then(setSelectedCourseSlots);
    } else {
      setSelectedCourseSlots([]);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (activeSession) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiresAt = new Date(activeSession.expiresAt).getTime();
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(diff);
        if (diff === 0) {
          setActiveSession(null);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeSession]);

  const handleGenerateQR = async () => {
  if (!selectedCourse || !selectedSlot) return;
  try {
    const session = await apiGenerateQR(selectedCourse); // ✅ only course_id needed
    setActiveSession(session);
    setQrPayload(session.qr_payload);
  } catch (err: any) {
    console.error('Failed to generate QR:', err);
  }
};

useEffect(() => {
  if (!activeSession) return;

  const rotateInterval = setInterval(async () => {
    try {
      const rotated = await apiRotateQR(activeSession.sessionId);
      setQrPayload(rotated.qr_payload);   // update QR with new token
    } catch (err) {
      console.error('Token rotation failed:', err);
    }
  }, 30000);  // every 30 seconds

  return () => clearInterval(rotateInterval);
}, [activeSession]);

  const handleCloseSession = () => {
    setActiveSession(null);
    setTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
            <UserCircle className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">Faculty Dashboard</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {activeSession ? (
          <Card className="p-6 bg-card border-2 border-primary">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg mb-1">Active QR Code</h3>
                <p className="text-sm text-muted-foreground">Students can scan now</p>
              </div>
              <Button
                onClick={handleCloseSession}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="bg-white p-6 rounded-xl mb-4 aspect-square max-w-[250px] mx-auto flex items-center justify-center">
              <QRCodeSVG value={qrPayload} size={200} className="w-full h-full max-w-full" />
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/30 mb-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-2xl font-bold text-primary">{formatTime(timeLeft)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Time remaining</p>
            </div>

            <div className="mt-4 p-3 bg-secondary rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">QR Code</p>
              <code className="text-xs text-primary font-mono">{activeSession.qrCode}</code>
            </div>
          </Card>
        ) : (
          <>
            {/* Generate QR Card */}
            <Card className="p-4 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-4">Generate QR Code</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Select Course</label>
                  <Select
                    value={selectedCourse}
                    onValueChange={(val) => { setSelectedCourse(val); setSelectedSlot(''); }}
                  >
                    <SelectTrigger className="bg-input-background border-border text-foreground">
                      <SelectValue placeholder="Choose a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course: any) => (
                        <SelectItem
                          key={course.event_id || course.id}
                          value={course.event_id || course.id}
                        >
                          {course.event_id || course.id} - {course.event_name || course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCourse && (
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">Select Time Slot</label>
                    <Select value={selectedSlot} onValueChange={setSelectedSlot}>
                      <SelectTrigger className="bg-input-background border-border text-foreground">
                        <SelectValue placeholder="Choose a slot" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedCourseSlots.map((slot: any, index: number) => (
                          <SelectItem
                            key={`${slot.time_slot_id}-${slot.slot_day}-${index}`}
                            value={`${slot.time_slot_id}-${slot.slot_day}`}
                          >
                            {slot.slot_day || slot.day} • {slot.start_time || slot.startTime} - {slot.end_time || slot.endTime}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  onClick={handleGenerateQR}
                  disabled={!selectedCourse || !selectedSlot}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11"
                >
                  <QrCodeIcon className="w-4 h-4 mr-2" />
                  Generate QR Code (5 min validity)
                </Button>
              </div>
            </Card>

            {/* Today's Classes Card */}
            <Card className="p-4 bg-card border-border">
              <h3 className="font-semibold text-foreground mb-3">Today's Classes</h3>
              {todaySlots.length > 0 ? (
                <div className="space-y-2">
                  {todaySlots.map((slot: any, index: number) => {
                    // Look up course name from already-loaded courses list
                    const course = courses.find(
                      (c: any) => (c.event_id || c.id) === slot.course_id
                    );
                    const courseName = course?.event_name || course?.name || slot.course_id || 'Unknown Course';
                    const courseCode = slot.course_id || 'N/A';

                    return (
                      <div
                        key={`${slot.time_slot_id}-${index}`}
                        className="p-3 bg-secondary rounded-lg border border-border"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-foreground text-sm">
                              {courseName}
                            </p>
                            <Badge className="bg-primary/20 text-primary border-primary/50 border text-xs mt-1">
                              {courseCode}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {String(slot.start_time || slot.startTime)} - {String(slot.end_time || slot.endTime)}
                            </span>
                          </div>
                          {slot.slot_day && (
                            <span className="text-muted-foreground">{slot.slot_day}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No classes scheduled for today
                </p>
              )}
            </Card>
          </>
        )}

        {/* How it Works */}
        <Card className="p-4 bg-card border-border">
          <h3 className="font-semibold text-foreground mb-3">How it Works</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2"><span className="text-primary">1.</span><span>Select the course and time slot for your current class</span></li>
            <li className="flex gap-2"><span className="text-primary">2.</span><span>Generate a unique QR code valid for 5 minutes</span></li>
            <li className="flex gap-2"><span className="text-primary">3.</span><span>Display the QR code for students to scan</span></li>
            <li className="flex gap-2"><span className="text-primary">4.</span><span>Attendance is automatically recorded in the system</span></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}