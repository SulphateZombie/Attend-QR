import { useEffect, useState } from 'react';
import { Book, Clock, MapPin, Users, Loader2, CheckCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { apiGetCourses, apiGetCourseSlots, apiGetEnrolledStudents, apiCreateCourse, getCachedUser } from '../utils/api';

export function FacultyCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [courseSlots, setCourseSlots] = useState<Record<string, any[]>>({});
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newCourseId, setNewCourseId] = useState('');
  const [newName, setNewName] = useState('');
  const [newBuilding, setNewBuilding] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  const [newTimeSlotId, setNewTimeSlotId] = useState('');

  const loadData = async () => {
    try {
      const coursesData = await apiGetCourses();
      setCourses(coursesData);
      const slotsMap: Record<string, any[]> = {};
      const countsMap: Record<string, number> = {};
      await Promise.all(
        coursesData.map(async (course: any) => {
          const courseId = course.event_id || course.id;
          const [slots, enrollmentData] = await Promise.all([
            apiGetCourseSlots(courseId),
            apiGetEnrolledStudents(courseId),
          ]);
          slotsMap[courseId] = slots;
          countsMap[courseId] = enrollmentData.totalStudents || 0;
        })
      );
      setCourseSlots(slotsMap);
      setStudentCounts(countsMap);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async () => {
    if (!newCourseId || !newName || !newBuilding || !newRoomId || !newTimeSlotId) return;
    try {
      const user = getCachedUser();
      await apiCreateCourse(newName, newBuilding, newRoomId, newTimeSlotId, user?.id || '');
      setNewCourseId('');
      setNewName('');
      setNewBuilding('');
      setNewRoomId('');
      setNewTimeSlotId('');
      setShowAdd(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-32 bg-secondary rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="pb-20">

      {/* Success Toast */}
      {success && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Course created successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Book className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">My Courses</h2>
              <p className="text-sm text-muted-foreground">{courses.length} courses assigned</p>
            </div>
          </div>
          <Button
            onClick={() => setShowAdd(!showAdd)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {showAdd ? 'Cancel' : 'Add Course'}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* Add Course Form */}
        {showAdd && (
          <Card className="p-4 bg-card border-primary/50 border-2">
            <h3 className="font-semibold text-foreground mb-3">Create New Course</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Course ID</label>
                <Input
                  type="text"
                  value={newCourseId}
                  onChange={(e) => setNewCourseId(e.target.value)}
                  placeholder="e.g. CS301"
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Course Name</label>
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="E.g., Advanced Placement"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Building Name</label>
                <Input
                  type="text"
                  value={newBuilding}
                  onChange={(e) => setNewBuilding(e.target.value)}
                  placeholder="e.g. Block A"
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Room ID</label>
                <Input
                  type="text"
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value)}
                  placeholder="e.g. 007"
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Time Slot ID</label>
                <Input
                  type="text"
                  value={newTimeSlotId}
                  onChange={(e) => setNewTimeSlotId(e.target.value)}
                  placeholder="e.g. A"
                  className="bg-input-background"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={!newCourseId || !newName || !newBuilding || !newRoomId || !newTimeSlotId}
                className="w-full"
              >
                Create Course
              </Button>
            </div>
          </Card>
        )}

        {/* Course Cards */}
        {courses.map((course: any) => {
          const courseId = course.event_id || course.id;
          const courseName = course.event_name || course.name;
          const slots = courseSlots[courseId] || [];
          const uniqueDays = [...new Set(slots.map((s: any) => s.slot_day || s.day))];

          return (
            <Card key={courseId} className="p-4 bg-card border-border">
              <div className="mb-4">
                <Badge className="bg-primary/20 text-primary border-primary/50 border mb-2">
                  {courseId}
                </Badge>
                <h3 className="font-bold text-foreground text-lg">{courseName}</h3>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span>{studentCounts[courseId] || 0} students</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-secondary rounded-lg border border-border text-center">
                  <p className="text-2xl font-bold text-primary">{slots.length}</p>
                  <p className="text-xs text-muted-foreground">Classes/Week</p>
                </div>
                <div className="p-3 bg-secondary rounded-lg border border-border text-center">
                  <p className="text-2xl font-bold text-primary">{uniqueDays.length}</p>
                  <p className="text-xs text-muted-foreground">Days/Week</p>
                </div>
              </div>

              {/* Schedule */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Schedule</p>
                {slots.length === 0 && (
                  <p className="text-xs text-muted-foreground">No slots assigned yet.</p>
                )}
                {slots.map((slot: any, index: number) => (
                  <div
                    key={`${slot.time_slot_id || slot.id}-${index}`}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {slot.slot_day || slot.day}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {String(slot.start_time || slot.startTime)} - {String(slot.end_time || slot.endTime)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{slot.location || course.room_id || 'N/A'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}

        {/* Empty state */}
        {courses.length === 0 && (
          <Card className="p-8 bg-card border-border text-center">
            <Book className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No courses assigned yet.</p>
            <Button onClick={() => setShowAdd(true)} className="mt-4">
              Create Your First Course
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}