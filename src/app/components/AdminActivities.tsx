/**
 * Admin Activities Management Component.
 *
 * Mirrors AdminCourses exactly but for activities:
 * - View all activities with volunteer counts
 * - Click to expand: see committee members (organisers) + volunteers
 * - Remove a committee member or volunteer from an activity
 * - Delete an activity entirely
 * - Create new activities (with committee dropdown)
 */

import { useEffect, useState } from 'react';
import {
  Calendar, Trash2, Users, Loader2, ChevronDown, ChevronUp,
  UserCircle, UserMinus, Shield,
} from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from './ui/select';
import {
  apiGetAllActivities,
  apiCreateActivity,
  apiDeleteActivity,
  apiGetActivityMembers,
  apiRemoveActivityMember,
  apiRemoveActivityVolunteer,
  apiGetAllCommittees,
} from '../utils/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminActivity {
  event_id: string;
  event_name: string;
  building_name: string;
  room_id: string;
  activity_date: string;
  start_time: string;
  end_time: string;
  committee_id: string;
  volunteerCount: number;
}

interface Committee {
  commitee_id: string;
  name: string;
  council_under: string;
}

interface ActivityMember {
  id: string;
  name: string;
  email: string;
  phone_no?: string;
  designation?: string;  // only for committee members
}

interface ActivityMembers {
  committee_members: ActivityMember[];
  volunteers: ActivityMember[];
}

// ── Default form state ────────────────────────────────────────────────────────

const emptyForm = {
  event_id: '',
  name: '',
  building_name: '',
  room_id: '',
  activity_date: '',
  start_time: '',
  end_time: '',
  committee_id: '',
};

// ── Main Component ────────────────────────────────────────────────────────────

export function AdminActivities() {
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [committees, setCommittees] = useState<Committee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  // Expand/detail state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [members, setMembers] = useState<Record<string, ActivityMembers>>({});
  const [membersLoading, setMembersLoading] = useState<string | null>(null);

  // ── Load activities + committees ──────────────────────────────────────────
  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await apiGetAllActivities();
      setActivities(data);
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
    apiGetAllCommittees()
      .then(setCommittees)
      .catch((err) => console.error('Failed to load committees:', err));
  }, []);

  // ── Expand / collapse ─────────────────────────────────────────────────────
  const handleToggleExpand = async (activityId: string) => {
    if (expandedId === activityId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(activityId);
    if (!members[activityId]) {
      setMembersLoading(activityId);
      try {
        const data = await apiGetActivityMembers(activityId);
        setMembers((prev) => ({ ...prev, [activityId]: data }));
      } catch (err) {
        console.error('Failed to load activity members:', err);
      } finally {
        setMembersLoading(null);
      }
    }
  };

  // ── Remove committee member ───────────────────────────────────────────────
  const handleRemoveMember = async (activityId: string, memberId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this activity's committee?`)) return;
    try {
      await apiRemoveActivityMember(activityId, memberId);
      setMembers((prev) => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          committee_members: prev[activityId].committee_members.filter((m) => m.id !== memberId),
        },
      }));
    } catch (err: any) {
      alert(err.message || 'Failed to remove committee member');
    }
  };

  // ── Remove volunteer ──────────────────────────────────────────────────────
  const handleRemoveVolunteer = async (activityId: string, volunteerId: string, volunteerName: string) => {
    if (!confirm(`Remove ${volunteerName} as a volunteer from this activity?`)) return;
    try {
      await apiRemoveActivityVolunteer(activityId, volunteerId);
      setMembers((prev) => ({
        ...prev,
        [activityId]: {
          ...prev[activityId],
          volunteers: prev[activityId].volunteers.filter((v) => v.id !== volunteerId),
        },
      }));
      setActivities((prev) =>
        prev.map((a) =>
          a.event_id === activityId
            ? { ...a, volunteerCount: Math.max(0, a.volunteerCount - 1) }
            : a
        )
      );
    } catch (err: any) {
      alert(err.message || 'Failed to remove volunteer');
    }
  };

  // ── Delete activity ───────────────────────────────────────────────────────
  const handleDelete = async (activityId: string) => {
    if (!confirm('Delete this activity? This will remove all attendance records and volunteer assignments.')) return;
    try {
      await apiDeleteActivity(activityId);
      setActivities((prev) => prev.filter((a) => a.event_id !== activityId));
      if (expandedId === activityId) setExpandedId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete activity');
    }
  };

  // ── Create activity ───────────────────────────────────────────────────────
  const handleCreate = async () => {
    const { event_id, name, building_name, room_id, activity_date, start_time, end_time, committee_id } = form;
    if (!event_id || !name || !building_name || !room_id || !activity_date || !start_time || !end_time || !committee_id) {
      alert('All fields are required');
      return;
    }
    setCreating(true);
    try {
      await apiCreateActivity(event_id, name, building_name, room_id, activity_date, start_time, end_time, committee_id);
      setForm(emptyForm);
      setShowAdd(false);
      loadActivities();
    } catch (err: any) {
      alert(err.message || 'Failed to create activity');
    } finally {
      setCreating(false);
    }
  };

  const updateForm = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const formComplete = Object.values(form).every((v) => String(v ?? '').trim() !== '');

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-card to-secondary p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-lg">
              <Calendar className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Manage Activities</h2>
              <p className="text-sm text-muted-foreground">
                {activities.length} activities in system
              </p>
            </div>
          </div>
          <Button
            onClick={() => { setShowAdd(!showAdd); setForm(emptyForm); }}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {showAdd ? 'Cancel' : 'Add Activity'}
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">

        {/* Create form */}
        {showAdd && (
          <Card className="p-4 bg-card border-primary/50 border-2">
            <h3 className="font-semibold text-foreground mb-3">Create New Activity</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Activity ID (e.g. ACT001)</label>
                <Input value={form.event_id} onChange={updateForm('event_id')} placeholder="ACT001" className="bg-input-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Activity Name</label>
                <Input value={form.name} onChange={updateForm('name')} placeholder="Annual Tech Fest" className="bg-input-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Building Name</label>
                <Input value={form.building_name} onChange={updateForm('building_name')} placeholder="Main Block" className="bg-input-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Room ID</label>
                <Input value={form.room_id} onChange={updateForm('room_id')} placeholder="Auditorium" className="bg-input-background" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Date</label>
                <Input
                  type="date"
                  value={form.activity_date}
                  onChange={updateForm('activity_date')}
                  className="bg-input-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Start Time</label>
                  <Input
                    type="time"
                    value={form.start_time}
                    onChange={updateForm('start_time')}
                    className="bg-input-background"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">End Time</label>
                  <Input
                    type="time"
                    value={form.end_time}
                    onChange={updateForm('end_time')}
                    className="bg-input-background"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Committee</label>
                {committees.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No committees available</p>
                ) : (
                  <Select
                    value={form.committee_id}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, committee_id: val }))}
                  >
                    <SelectTrigger className="bg-input-background border-border text-sm">
                      <SelectValue placeholder="Select a committee" />
                    </SelectTrigger>
                    <SelectContent>
                      {committees.map((c) => (
                        <SelectItem key={c.commitee_id} value={String(c.commitee_id)}>
                          {c.council_under ? `${c.name} — ${c.council_under}` : c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <Button onClick={handleCreate} disabled={!formComplete || creating} className="w-full">
                {creating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Creating...
                  </span>
                ) : 'Create Activity'}
              </Button>
            </div>
          </Card>
        )}

        {/* Activity list */}
        {activities.map((activity) => {
          const isExpanded = expandedId === activity.event_id;
          const activityMembers = members[activity.event_id];
          const isLoadingMembers = membersLoading === activity.event_id;

          return (
            <Card key={activity.event_id} className="bg-card border-border overflow-hidden">
              {/* Activity row — click to expand */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => handleToggleExpand(activity.event_id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-primary/20 text-primary border-primary/50 border text-xs">
                      {activity.event_id}
                    </Badge>
                    <p className="text-sm font-medium text-foreground truncate">
                      {activity.event_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{activity.building_name} — {activity.room_id}</span>
                    <span>{activity.activity_date}</span>
                    <span>{activity.start_time} – {activity.end_time}</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {activity.volunteerCount ?? 0} volunteers
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 ml-4">
                  {isExpanded
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  }
                  <Button
                    onClick={(e) => { e.stopPropagation(); handleDelete(activity.event_id); }}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div className="border-t border-border bg-secondary/10 p-4 space-y-4">
                  {isLoadingMembers ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Committee members (organisers) */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-4 h-4 text-blue-400" />
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                            Committee Members ({activityMembers?.committee_members.length ?? 0})
                          </p>
                        </div>
                        {activityMembers?.committee_members.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic pl-6">No committee members assigned</p>
                        ) : (
                          <div className="space-y-2">
                            {activityMembers?.committee_members.map((m) => (
                              <div
                                key={m.id}
                                className="flex items-center justify-between bg-card rounded-lg px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                                    {m.designation && (
                                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 border text-xs">
                                        {m.designation}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                                </div>
                                <Button
                                  onClick={() => handleRemoveMember(activity.event_id, m.id, m.name)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10 ml-2 shrink-0"
                                  title="Remove from committee"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Volunteers */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <UserCircle className="w-4 h-4 text-primary" />
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">
                            Volunteers ({activityMembers?.volunteers.length ?? 0})
                          </p>
                        </div>
                        {activityMembers?.volunteers.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic pl-6">No volunteers assigned</p>
                        ) : (
                          <div className="space-y-2">
                            {activityMembers?.volunteers.map((v) => (
                              <div
                                key={v.id}
                                className="flex items-center justify-between bg-card rounded-lg px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{v.name}</p>
                                  <p className="text-xs text-muted-foreground truncate">{v.email}</p>
                                </div>
                                <Button
                                  onClick={() => handleRemoveVolunteer(activity.event_id, v.id, v.name)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10 ml-2 shrink-0"
                                  title="Remove volunteer"
                                >
                                  <UserMinus className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </Card>
          );
        })}

        {/* Empty state */}
        {activities.length === 0 && (
          <Card className="p-8 bg-card border-border text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No activities in the system</p>
          </Card>
        )}
      </div>
    </div>
  );
}