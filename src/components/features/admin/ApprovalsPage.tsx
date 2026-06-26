import React from 'react';
import { ShieldCheck, ShieldAlert, Check, X, UserCheck, Lock } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useAuthStore } from '../../../store/authStore';
import {
  usePendingDoctors,
  useSuperuserRequests,
  useApproveDoctor,
  useReviewSuperuserRequest,
} from '../../../hooks/useApprovals';

// Role-aware approvals screen:
//  • Superuser  → Gate 1: approve/reject pending doctors in their hospital.
//  • Platform   → Gate 2: approve/reject superuser requests (+ sees Gate 1 across all hospitals).
export const ApprovalsPage: React.FC = () => {
  const { profile } = useAuthStore();
  const appRole = (profile as any)?.app_role as string | undefined;
  const isPlatform = appRole === 'platform';
  const isSuperuser = appRole === 'superuser';

  const { data: pendingDoctors = [], isLoading: loadingDoctors } = usePendingDoctors(isPlatform || isSuperuser);
  const { data: suRequests = [], isLoading: loadingSU } = useSuperuserRequests(isPlatform);
  const approveDoctor = useApproveDoctor();
  const reviewSU = useReviewSuperuserRequest();

  if (!isPlatform && !isSuperuser) {
    return (
      <div className="max-w-xl mx-auto text-center py-16">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Not available</h2>
        <p className="text-gray-600">This area is for superusers and the platform owner.</p>
      </div>
    );
  }

  const initials = (name: string) =>
    name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary-600" /> Approvals
        </h1>
        <p className="text-sm text-gray-500">
          {isPlatform ? 'Platform owner — superuser requests and doctor registrations.' : 'Superuser — new doctor registrations for your hospital.'}
        </p>
      </div>

      {/* Gate 2 — superuser requests (platform only) */}
      {isPlatform && (
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Superuser requests
            <span className="text-xs font-normal text-gray-400">· {suRequests.length} pending</span>
          </h2>
          {loadingSU ? (
            <Spinner />
          ) : suRequests.length === 0 ? (
            <Empty text="No superuser requests." />
          ) : (
            <div className="space-y-2">
              {suRequests.map((r) => (
                <Row
                  key={r.request_id}
                  initials={initials(r.full_name)}
                  title={r.full_name}
                  subtitle={`${r.clinical_role} · ${r.hospital_name || 'No hospital'} · wants superuser`}
                  onApprove={() => reviewSU.mutate({ requestId: r.request_id, approve: true })}
                  onReject={() => reviewSU.mutate({ requestId: r.request_id, approve: false })}
                  busy={reviewSU.isPending}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Gate 1 — doctor registrations */}
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <UserCheck className="w-4 h-4" /> Doctor approvals
          {isSuperuser && (
            <span className="text-xs font-normal text-gray-400 flex items-center gap-1">
              <Lock className="w-3 h-3" /> your hospital
            </span>
          )}
          <span className="text-xs font-normal text-gray-400">· {pendingDoctors.length} pending</span>
        </h2>
        {loadingDoctors ? (
          <Spinner />
        ) : pendingDoctors.length === 0 ? (
          <Empty text="No pending doctor registrations." />
        ) : (
          <div className="space-y-2">
            {pendingDoctors.map((d) => (
              <Row
                key={d.id}
                initials={initials(d.full_name)}
                title={d.full_name}
                subtitle={`${d.clinical_role} · ${d.department}${isPlatform ? ` · ${d.hospital_name || 'No hospital'}` : ''}`}
                onApprove={() => approveDoctor.mutate({ userId: d.id, approve: true })}
                onReject={() => approveDoctor.mutate({ userId: d.id, approve: false })}
                busy={approveDoctor.isPending}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const Spinner = () => (
  <div className="flex justify-center py-8">
    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" />
  </div>
);

const Empty: React.FC<{ text: string }> = ({ text }) => (
  <div className="text-center text-gray-500 border border-dashed border-gray-300 rounded-lg py-8 text-sm">
    {text}
  </div>
);

const Row: React.FC<{
  initials: string;
  title: string;
  subtitle: string;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}> = ({ initials, title, subtitle, onApprove, onReject, busy }) => (
  <div className="flex items-center gap-3 border border-gray-200 rounded-lg px-4 py-3">
    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
      {initials}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
      <p className="text-xs text-gray-500 truncate">{subtitle}</p>
    </div>
    <Button variant="outline" size="sm" disabled={busy} onClick={onApprove} className="text-green-600 border-green-200 hover:bg-green-50">
      <Check size={14} className="mr-1" /> Approve
    </Button>
    <Button variant="outline" size="sm" disabled={busy} onClick={onReject} className="text-red-600 border-red-200 hover:bg-red-50">
      <X size={14} className="mr-1" /> Reject
    </Button>
  </div>
);

export default ApprovalsPage;
