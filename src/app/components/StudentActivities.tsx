import { useEffect, useState } from 'react';
import { Calendar, MapPin, Clock, Users, Loader2, CheckCircle, Shield } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { apiGetAllActivities } from '../utils/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Activity {
  event_id: string;
  event_name: string;
  building_name: string;
  room_id: string;
  activity_date: string;
  start_time: string;
  end_time: string;
  commitee_id: string;
  volunteerCount?: number;
}

// ── API helpers (add these to your api.ts) ────────────────────────────────────
// GET  /api/activities/enrolled        → activities the current student is enrolled in
// POST /api/activities/enroll          → body: { event_id }
// These mirror the course enrollment pattern.

async function apiFetchLocal(url: string, options: RequestInit = {}): Promise<any> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

async function apiGetEnrolledActivities(): Promise<Activity[]> {
  return apiFetchLocal('/api/activities/enrolled');
}

async function apiSelfEnrollActivity(eventId: string): Promise<any> {
  return apiFetchLocal('/api/activities/enroll', {
    method: 'POST',
    body: JSON.stringify({ event_id: eventId }),
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StudentActivities() {
  const [enrolled, setEnrolled] = useState<Activity[]>([]);
  const [all, setAll] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAvailable, setShowAvailable] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [enrolledData, allData] = await Promise.all([
        apiGetEnrolledActivities(),
        apiGetAllActivities(),
      ]);
      setEnrolled(enrolledData);
      setAll(allData);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleEnroll = async (activity: Activity) => {
    setEnrollingId(activity.event_id);
    try {
      await apiSelfEnrollActivity(activity.event_id);
      setSuccessMsg(`Enrolled in ${activity.event_name}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      setShowAvailable(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to enroll');
    } finally {
      setEnrollingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const enrolledIds = enrolled.map((a) => a.event_id);
  const available = all.filter((a) => !enrolledIds.includes(a.event_id));

  const formatTime = (t: string) => {
    // Handles "HH:MM:SS" or "HH:MM" → "HH:MM AM/PM"
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${mStr} ${suffix}`;
  };

  const formatDate = (d: string) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const ActivityCard = ({ activity, showEnroll = false }: { activity: Activity; showEnroll?: boolean }) => (
    <Card className="bg-card border-border overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* ID + Name */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className="bg-primary/20 text-primary border-primary/50 border text-xs shrink-0">
                {activity.event_id}
              </Badge>
              <p className="text-sm font-semibold text-foreground truncate">
                {activity.event_name}
              </p>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {activity.building_name} — {activity.room_id}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(activity.activity_date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(activity.start_time)} – {formatTime(activity.end_time)}
              </span>
              {(activity.volunteerCount ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {activity.volunteerCount} volunteers
                </span>
              )}
            </div>

            {/* Committee badge */}
            {activity.commitee_id && (
              <div className="mt-2 flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-blue-400">{activity.commitee_id}</span>
              </div>
            )}
          </div>

          {/* Enroll button */}
          {showEnroll && (
            <Button
              onClick={() => handleEnroll(activity)}
              disabled={enrollingId === activity.event_id}
              size="sm"
              className="shrink-0"
            >
              {enrollingId === activity.event_id
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : 'Enroll'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="pb-20">

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Calendar className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                {showAvailable ? 'Available Activities' : 'My Activities'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {showAvailable
                  ? 'Browse and enroll'
                  : `${enrolled.length} enrolled ${enrolled.length === 1 ? 'activity' : 'activities'}`}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowAvailable(!showAvailable)}
            variant="outline"
            className="bg-primary/20 text-primary border-primary/50"
          >
            {showAvailable ? 'My Activities' : 'Find Activities'}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {showAvailable ? (
          <>
            {available.map((activity) => (
              <ActivityCard key={activity.event_id} activity={activity} showEnroll />
            ))}
            {available.length === 0 && (
              <Card className="p-8 bg-card border-border text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  You're enrolled in all available activities.
                </p>
              </Card>
            )}
          </>
        ) : (
          <>
            {enrolled.map((activity) => (
              <ActivityCard key={activity.event_id} activity={activity} />
            ))}
            {enrolled.length === 0 && (
              <Card className="p-8 bg-card border-border text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  You haven't enrolled in any activities yet.
                </p>
                <Button onClick={() => setShowAvailable(true)} className="mt-4">
                  Find Activities
                </Button>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}