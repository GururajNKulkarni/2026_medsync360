import React, { useState } from 'react';
import { Settings as SettingsIcon, ShieldCheck, Building2, BadgeCheck, Lock, Phone, Mail, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../ui/Button';
import { useAuthStore } from '../../../store/authStore';
import { useRequestSuperuser } from '../../../hooks/useApprovals';
import { supabase } from '../../../lib/supabase';

const ROLE_LABEL: Record<string, string> = {
  platform: 'Platform Owner',
  superuser: 'Superuser',
  doctor: 'Doctor',
};

export const SettingsPage: React.FC = () => {
  const { profile, updateProfile } = useAuthStore();
  const appRole = ((profile as any)?.app_role as string) || 'doctor';
  const requestSuperuser = useRequestSuperuser();

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
        <SettingsIcon className="w-6 h-6 text-primary-600" /> Settings
      </h1>
      <p className="text-sm text-gray-500 mb-6">Your account and access level.</p>

      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
        <Field label="Name" value={profile?.full_name || '—'} />
        <Field label="Clinical role" value={(profile as any)?.role || '—'} />
        <Field
          label="Access level"
          value={
            <span className="inline-flex items-center gap-1.5 text-gray-900">
              <BadgeCheck className="w-4 h-4 text-primary-600" />
              {ROLE_LABEL[appRole] || appRole}
            </span>
          }
        />
        <Field
          label="Hospital"
          value={
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-gray-400" />
              {(profile as any)?.currently_working_at || '—'}
            </span>
          }
        />
      </div>

      <AccountSecuritySection profile={profile} updateProfile={updateProfile} />

      {/* Request superuser — only for plain doctors */}
      {appRole === 'doctor' && (
        <div className="mt-6 border border-blue-200 bg-blue-50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">Manage your hospital?</p>
              <p className="text-xs text-blue-700 mb-3">
                Request superuser access to approve doctors, manage the roster, and handle referrals for your hospital. The platform owner reviews every request.
              </p>
              <Button
                size="sm"
                disabled={requestSuperuser.isPending || requestSuperuser.isSuccess}
                onClick={() => requestSuperuser.mutate()}
              >
                {requestSuperuser.isSuccess ? 'Request sent' : requestSuperuser.isPending ? 'Sending…' : 'Request superuser access'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-4 py-3">
    <span className="text-sm text-gray-500">{label}</span>
    <span className="text-sm font-medium text-gray-900">{value}</span>
  </div>
);

const AccountSecuritySection: React.FC<{
  profile: ReturnType<typeof useAuthStore.getState>['profile'];
  updateProfile: ReturnType<typeof useAuthStore.getState>['updateProfile'];
}> = ({ profile, updateProfile }) => {
  return (
    <div className="mt-6 border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Account security</h2>
      <p className="text-xs text-gray-500 mb-4">
        Update your password, mobile number, or email. All other account details are managed by your hospital admin.
      </p>
      <div className="divide-y divide-gray-100">
        <PasswordRow lastChangedAt={(profile as any)?.password_changed_at || null} updateProfile={updateProfile} />
        <PhoneRow currentPhone={(profile as any)?.phone || ''} updateProfile={updateProfile} />
        <EmailRow currentEmail={profile?.email || ''} />
      </div>
    </div>
  );
};

const formatLastChanged = (iso: string | null) => {
  if (!iso) return 'Never changed';
  return `Last changed ${new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
};

const PasswordRow: React.FC<{ lastChangedAt: string | null; updateProfile: ReturnType<typeof useAuthStore.getState>['updateProfile'] }> = ({ lastChangedAt, updateProfile }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changedAt, setChangedAt] = useState(lastChangedAt);

  const handleSave = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Please enter and confirm your new password.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      const now = new Date().toISOString();
      try {
        await updateProfile({ password_changed_at: now } as any);
      } catch {
        // Password change itself succeeded; the "last changed" timestamp is
        // informational only, so a failure here must not look like an error.
      }
      setChangedAt(now);

      toast.success('Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-4 first:pt-0">
      <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <input
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-gray-400">{formatLastChanged(changedAt)}</span>
        <Button size="sm" disabled={saving} onClick={handleSave}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
        </Button>
      </div>
    </div>
  );
};

const PhoneRow: React.FC<{ currentPhone: string; updateProfile: ReturnType<typeof useAuthStore.getState>['updateProfile'] }> = ({ currentPhone, updateProfile }) => {
  const [phone, setPhone] = useState(currentPhone);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 10) {
      toast.error('Please enter a valid mobile number.');
      return;
    }
    if (trimmed === currentPhone) return;

    setSaving(true);
    try {
      await updateProfile({ phone: trimmed } as any);
      toast.success('Mobile number updated.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update mobile number.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">Mobile number</label>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="9876543210"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <Button size="sm" disabled={saving || phone.trim() === currentPhone} onClick={handleSave}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
        </Button>
      </div>
    </div>
  );
};

const EmailRow: React.FC<{ currentEmail: string }> = ({ currentEmail }) => {
  const [email, setEmail] = useState(currentEmail);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      toast.error('Please enter a valid email address.');
      return;
    }
    if (trimmed === currentEmail) return;

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: trimmed });
      if (error) throw error;
      toast.success(`Confirmation link sent to ${trimmed}. Your email updates once you confirm it.`, { duration: 6000 });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update email.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="py-4 last:pb-0">
      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@hospital.com"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <Button size="sm" disabled={saving || email.trim() === currentEmail} onClick={handleSave}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
        </Button>
      </div>
    </div>
  );
};

export default SettingsPage;
