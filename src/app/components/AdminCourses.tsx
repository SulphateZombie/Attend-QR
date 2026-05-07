/**
 * Admin Courses Management Component.
 *
 * Admin panel page for managing all courses:
 * - View all courses with enrollment counts
 * - Delete courses from the system
 * - Create new courses (with all required fields)
 */

import { useEffect, useState } from 'react';
import { Book, Trash2, Users, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { apiGetAdminCourses, apiDeleteCourse, apiCreateCourse, apiGetAllSlots } from '../utils/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimeSlot {
  time_slot_id: string;
  slot_day: string;
  start_time: string;
  end_time: string;
}

// Matches what GET /api/admin/courses actually returns from the backend
interface AdminCourse {
  event_id: string;
  event_name: string;
  building_name: string;
  room_id: string;
  time_slot_id: string;
  enrolledStudents: number;
}

// ── Default form state ────────────────────────────────────────────────────────
const emptyForm = {
  course_id: '',
  name: '',
  building_name: '',
  room_id: '',
  time_slot_id: '',
};

export function AdminCourses() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  // ── Load courses + slots in parallel ───────────────────────────────────────
  const loadCourses = async () => {
    setLoading(true);
    try {
      const data = await apiGetAdminCourses();
      setCourses(data);
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    // Load slots once for the dropdown — no need to reload on course changes
    apiGetAllSlots()
      .then(setSlots)
      .catch((err) => console.error('Failed to load slots:', err));
  }, []);

  // ── Delete course ───────────────────────────────────────────────────────────
  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This will remove all enrollments and attendance records.')) return;
    try {
      await apiDeleteCourse(courseId);
      // Optimistic update
      setCourses((prev) => prev.filter((c) => c.event_id !== courseId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete course');
    }
  };

  // ── Create course ───────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const { course_id, name, building_name, room_id, time_slot_id } = form;
    if (!course_id || !name || !building_name || !room_id || !time_slot_id) {
      alert('All fields are required');
      return;
    }
    setCreating(true);
    try {
      await apiCreateCourse(course_id, name, building_name, room_id, time_slot_id);
      setForm(emptyForm);
      setShowAdd(false);
      loadCourses();
    } catch (err: any) {
      alert(err.message || 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  const updateForm = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const formComplete = Object.values(form).every((v) => v.trim() !== '');

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Book className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Manage Courses</h2>
              <p className="text-sm text-muted-foreground">
                {courses.length} courses in system
              </p>
            </div>
          </div>
          <Button
            onClick={() => { setShowAdd(!showAdd); setForm(emptyForm); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {showAdd ? 'Cancel' : 'Add Course'}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">

        {/* Create form — all 5 required fields */}
        {showAdd && (
          <Card className="p-4 bg-card border-primary/50 border-2">
            <h3 className="font-semibold text-foreground mb-3">Create New Course</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Course ID (e.g. CS101)
                </label>
                <Input
                  value={form.course_id}
                  onChange={updateForm('course_id')}
                  placeholder="CS101"
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Course Name
                </label>
                <Input
                  value={form.name}
                  onChange={updateForm('name')}
                  placeholder="Introduction to Computer Science"
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Building Name
                </label>
                <Input
                  value={form.building_name}
                  onChange={updateForm('building_name')}
                  placeholder="Main Block"
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Room ID
                </label>
                <Input
                  value={form.room_id}
                  onChange={updateForm('room_id')}
                  placeholder="101"
                  className="bg-input-background"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  Time Slot
                </label>
                {slots.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">
                    No time slots available — create one first
                  </p>
                ) : (
                  <Select
                    value={form.time_slot_id}
                    onValueChange={(val) =>
                      setForm((prev) => ({ ...prev, time_slot_id: val }))
                    }
                  >
                    <SelectTrigger className="bg-input-background border-border text-sm">
                      <SelectValue placeholder="Select a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {slots.map((slot) => (
                        <SelectItem key={slot.time_slot_id} value={slot.time_slot_id}>
                          {slot.slot_day} &nbsp;·&nbsp; {slot.start_time} – {slot.end_time}
                          &nbsp;
                          <span className="text-muted-foreground text-xs">
                            ({slot.time_slot_id})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button
                onClick={handleCreate}
                disabled={!formComplete || creating}
                className="w-full"
              >
                {creating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                  </span>
                ) : (
                  'Create Course'
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* Course list — uses event_id, event_name, building_name, room_id */}
        {courses.map((course) => (
          <Card key={course.event_id} className="p-4 bg-card border-border">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {/* event_id as the course code badge */}
                  <Badge className="bg-primary/20 text-primary border-primary/50 border text-xs">
                    {course.event_id}
                  </Badge>
                  <p className="text-sm font-medium text-foreground truncate">
                    {course.event_name}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span>{course.building_name} — Room {course.room_id}</span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {course.enrolledStudents ?? 0} students
                  </span>
                </div>
              </div>

              {/* Delete */}
              <Button
                onClick={() => handleDelete(course.event_id)}
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 ml-4"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}

        {/* Empty state */}
        {courses.length === 0 && (
          <Card className="p-8 bg-card border-border text-center">
            <Book className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No courses in the system</p>
          </Card>
        )}
      </div>
    </div>
  );
}