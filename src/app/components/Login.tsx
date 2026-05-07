/**
 * Login Component for AttendQR.
 *
 * Provides email + password authentication with role selection.
 * Supports both login and registration modes.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router';
import { QrCode, GraduationCap, UserCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { apiLogin, apiRegister } from '../utils/api';

export function Login() {
  const navigate = useNavigate();

  // ── Form State ────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');                  // ← ADDED
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'student' | 'faculty'>('student');

  // ── UI State ──────────────────────────────────────────────────────────────
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!email || !password || (isRegister && (!name || !phone))) return;

    setLoading(true);
    setError('');

    try {
      let data;

      if (isRegister) {
        data = await apiRegister(name, email, password, phone, selectedRole); // ← FIXED
      } else {
        data = await apiLogin(email, password);
      }

      const role = data.user.type;
      if (role === 'admin') {
        navigate('/admin/dashboard');
      } else if (role === 'faculty') {
        navigate('/faculty/dashboard');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo & Title */}
        <div className="text-center">
          <div className="inline-flex p-4 bg-primary rounded-2xl mb-4">
            <QrCode className="w-16 h-16 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">AttendQR</h1>
          <p className="text-muted-foreground">Automated Attendance System</p>
        </div>

        {/* Role Selection — Only show during registration */}
        {isRegister && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedRole('student')}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedRole === 'student'
                  ? 'bg-primary border-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              <GraduationCap
                className={`w-12 h-12 mx-auto mb-2 ${
                  selectedRole === 'student' ? 'text-primary-foreground' : 'text-primary'
                }`}
              />
              <p className={`font-semibold ${selectedRole === 'student' ? 'text-primary-foreground' : 'text-foreground'}`}>
                Student
              </p>
            </button>

            <button
              onClick={() => setSelectedRole('faculty')}
              className={`p-6 rounded-xl border-2 transition-all ${
                selectedRole === 'faculty'
                  ? 'bg-primary border-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              <UserCircle
                className={`w-12 h-12 mx-auto mb-2 ${
                  selectedRole === 'faculty' ? 'text-primary-foreground' : 'text-primary'
                }`}
              />
              <p className={`font-semibold ${selectedRole === 'faculty' ? 'text-primary-foreground' : 'text-foreground'}`}>
                Faculty
              </p>
            </button>
          </div>
        )}

        {/* Login / Register Form */}
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            {/* Name field — only shown during registration */}
            {isRegister && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Full Name</label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-input-background border-border text-foreground"
                />
              </div>
            )}

            {/* Email field */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-input-background border-border text-foreground"
              />
            </div>

            {/* Password field with show/hide toggle */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  className="bg-input-background border-border text-foreground pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Phone number field — only shown during registration */}
            {isRegister && (
              <div>
                <label className="text-sm text-muted-foreground mb-2 block">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="bg-input-background border-border text-foreground"
                />
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              onClick={handleSubmit}
              disabled={!email || !password || (isRegister && (!name || !phone)) || loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 h-12"
            >
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Login'}
            </Button>
          </div>
        </Card>

        {/* Toggle between Login and Register */}
        <div className="text-center space-y-2">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError('');
            }}
            className="text-sm text-primary hover:underline"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </div>

        {/* Test credentials hint */}
        <Card className="p-4 bg-muted border-border">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold mb-1">Test Accounts:</p>
              <p>Admin: admin@attendqr.com / admin123</p>
              <p>Faculty: sarah@attendqr.com / faculty123</p>
              <p>Student: alice@attendqr.com / student123</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}