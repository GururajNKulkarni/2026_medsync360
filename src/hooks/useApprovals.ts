import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface PendingDoctor {
  id: string;
  full_name: string;
  department: string;
  clinical_role: string;
  kmc_number: string | null;
  hospital_name: string | null;
  created_at: string;
}

export interface SuperuserRequest {
  request_id: string;
  user_id: string;
  full_name: string;
  clinical_role: string;
  hospital_name: string | null;
  requested_at: string;
}

// Gate 1 queue — pending doctors the caller may approve (superuser: their hospital; platform: all).
export const usePendingDoctors = (enabled: boolean) =>
  useQuery({
    queryKey: ['pending-doctors'],
    queryFn: async (): Promise<PendingDoctor[]> => {
      const { data, error } = await (supabase as any).rpc('get_pending_doctors');
      if (error) throw error;
      return (data as any) || [];
    },
    enabled,
    staleTime: 0,
  });

// Gate 2 queue — pending superuser requests (platform only).
export const useSuperuserRequests = (enabled: boolean) =>
  useQuery({
    queryKey: ['superuser-requests'],
    queryFn: async (): Promise<SuperuserRequest[]> => {
      const { data, error } = await (supabase as any).rpc('get_superuser_requests');
      if (error) throw error;
      return (data as any) || [];
    },
    enabled,
    staleTime: 0,
  });

export const useApproveDoctor = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, approve }: { userId: string; approve: boolean }) => {
      const { error } = await (supabase as any).rpc('approve_doctor', {
        p_user_id: userId,
        p_approve: approve,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['pending-doctors'] });
      toast.success(vars.approve ? 'Doctor approved' : 'Registration rejected');
    },
    onError: (e: any) => toast.error(e?.message || 'Action failed'),
  });
};

export const useReviewSuperuserRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, approve }: { requestId: string; approve: boolean }) => {
      const { error } = await (supabase as any).rpc('review_superuser_request', {
        p_request_id: requestId,
        p_approve: approve,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['superuser-requests'] });
      toast.success(vars.approve ? 'Superuser approved' : 'Request rejected');
    },
    onError: (e: any) => toast.error(e?.message || 'Action failed'),
  });
};

export const useRequestSuperuser = () => {
  return useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc('request_superuser');
      if (error) throw error;
    },
    onSuccess: () => toast.success('Superuser access requested — pending platform approval'),
    onError: (e: any) => toast.error(e?.message || 'Request failed'),
  });
};
