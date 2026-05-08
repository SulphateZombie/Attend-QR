import { useEffect, useState } from 'react';
import { Book, Clock, MapPin, Calendar, Loader2, CheckCircle } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { apiGetEnrolledCourses, apiGetCourseSlots, apiGetAllCourses, apiSelfEnroll } from '../utils/api';
export function StudentCourses() {
  const [courses, setCourses] = useState<any[]>([]);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [courseSlots, setCourseSlots] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showAvailable, setShowAvailable] = useState(false);
  const [enrollSuccess, setEnrollSuccess] = useState('');

  const loadData = async () => {
    try {
      const [coursesData, allData] = await Promise.all([
        apiGetEnrolledCourses(),
        apiGetAllCourses(),
      ]);
      setCourses(coursesData);
      setAllCourses(allData);

      const slotsMap: Record<string, any[]> = {};
      await Promise.all(
        coursesData.map(async (course: any) => {
          const courseId = course.event_id || course.id;
          const slots = await apiGetCourseSlots(courseId);
          slotsMap[courseId] = slots;
        })
      );
      setCourseSlots(slotsMap);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEnroll = async (courseId: string, courseName: string) => {
    try {
      await apiSelfEnroll(courseId);
      setEnrollSuccess(`Successfully enrolled in ${courseName}!`);
      setTimeout(() => setEnrollSuccess(''), 3000);
      setShowAvailable(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const enrolledIds = courses.map((c: any) => c.event_id || c.id);
  const availableCourses = allCourses.filter(
    (c: any) => !enrolledIds.includes(c.event_id || c.id)
  );

  return (
    <div className="pb-20">

      {/* Success Toast */}
      {enrollSuccess && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{enrollSuccess}</span>
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
              <h2 className="text-xl font-bold text-foreground">
                {showAvailable ? 'Available Courses' : 'My Courses'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {showAvailable ? 'Browse and enroll' : `${courses.length} enrolled courses`}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAvailable(!showAvailable)}
            variant="outline"
            className="bg-primary/20 text-primary border-primary/50"
          >
            {showAvailable ? 'View My Courses' : 'Find Courses'}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {showAvailable ? (
          <>
            {availableCourses.map((course: any) => {
              const courseId = course.event_id || course.id;
              const courseName = course.event_name || course.name;
              return (
                <Card key={courseId} className="p-4 bg-card border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <Badge className="bg-primary/20 text-primary border-primary/50 border mb-2">
                        {courseId}
                      </Badge>
                      <h3 className="font-semibold text-foreground">{courseName}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {course.building_name} {course.room_id ? `- Room ${course.room_id}` : ''}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleEnroll(courseId, courseName)}
                      size="sm"
                    >
                      Enroll
                    </Button>
                  </div>
                </Card>
              );
            })}
            {availableCourses.length === 0 && (
              <Card className="p-8 bg-card border-border text-center">
                <Book className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  You are enrolled in all available courses.
                </p>
              </Card>
            )}
          </>
        ) : (
          <>
            {courses.map((course: any) => {
              const courseId = course.event_id || course.id;
              const courseName = course.event_name || course.name;
              const slots = courseSlots[courseId] || [];
              return (
                <Card key={courseId} className="p-4 bg-card border-border">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge className="bg-primary/20 text-primary border-primary/50 border mb-2">
                        {courseId}
                      </Badge>
                      <h3 className="font-semibold text-foreground">{courseName}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {course.building_name} {course.room_id ? `- Room ${course.room_id}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Class Schedule
                    </p>
                    {slots.length === 0 && (
                      <p className="text-xs text-muted-foreground">No slots assigned.</p>
                    )}
                    {slots.map((slot: any, index: number) => (
                      <div
                        key={`${slot.time_slot_id || slot.id}-${index}`}
                        className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-primary" />
                            <span className="text-sm font-medium text-foreground">
                              {slot.slot_day || slot.day}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {String(slot.start_time || slot.startTime)} - {String(slot.end_time || slot.endTime)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {slot.location || course.room_id || 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
            {courses.length === 0 && (
              <Card className="p-8 bg-card border-border text-center">
                <Book className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  You are not enrolled in any courses yet.
                </p>
                <Button onClick={() => setShowAvailable(true)} className="mt-4">
                  Find Courses to Enroll
                </Button>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}