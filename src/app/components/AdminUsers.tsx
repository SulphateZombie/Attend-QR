/**
 * Admin Users Management Component.
 *
 * Admin panel page for managing all users in the system:
 * - View all registered users with their roles
 * - Change user roles (promote/demote)
 * - Delete users from the system
 */

import { useEffect, useState } from 'react';
import { Users, Trash2, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  apiGetAllUsers,
  apiDeleteUser,
  apiChangeUserRole,
  getCachedUser,
} from '../utils/api';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  type: string;   // ← DB column is "type", not "role"
  phone_no?: string;
}

export function AdminUsers() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const currentUser = getCachedUser();
  // Safely resolve current user's id regardless of how it was cached
  const currentUserId: string | undefined =
    currentUser?.id || currentUser?.user_id;

  // ── Load all users ──────────────────────────────────────────────────────────
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiGetAllUsers();
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // ── Delete user ─────────────────────────────────────────────────────────────
  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiDeleteUser(userId);
      // Optimistic update — remove from local state immediately
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  // ── Change role ─────────────────────────────────────────────────────────────
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await apiChangeUserRole(userId, newRole);
      // Optimistic update — reflect change immediately without a full reload
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, type: newRole } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
      // Reload to get accurate state if update failed
      loadUsers();
    }
  };

  // ── Badge styling ───────────────────────────────────────────────────────────
  const getRoleBadgeClass = (type: string) => {
    switch (type) {
      case 'admin':
        return 'bg-destructive/20 text-destructive border-destructive/50';
      case 'faculty':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default:
        return 'bg-primary/20 text-primary border-primary/50';
    }
  };

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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Users className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Manage Users</h2>
            <p className="text-sm text-muted-foreground">
              {users.length} registered users
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {users.map((user) => {
          const isSelf = user.id === currentUserId;

          return (
            <Card key={user.id} className="p-4 bg-card border-border">
              <div className="flex items-center justify-between">
                {/* User info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.name}
                    </p>
                    {/* Role badge — reads user.type from DB */}
                    <Badge
                      className={`${getRoleBadgeClass(user.type)} border text-xs`}
                    >
                      {user.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>

                {/* Actions — hidden for self */}
                {!isSelf && (
                  <div className="flex items-center gap-2 ml-4">
                    {/* Role selector — value bound to user.type */}
                    <Select
                      value={user.type}
                      onValueChange={(val) => handleRoleChange(user.id, val)}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs bg-input-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="faculty">Faculty</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Delete button */}
                    <Button
                      onClick={() => handleDelete(user.id)}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* "You" badge for self */}
                {isSelf && (
                  <Badge className="bg-primary/20 text-primary border-primary/50 border text-xs ml-4">
                    You
                  </Badge>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}