import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface Hospital {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  is_active: boolean;
  created_at: string;
}

// All authenticated users can read hospitals (the sign-up dropdown will use this too).
export const useHospitals = () => {
  return useQuery({
    queryKey: ['hospitals'],
    queryFn: async (): Promise<Hospital[]> => {
      const { data, error } = await supabase
        .from('hospitals')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data as any) || [];
    },
    staleTime: 60 * 1000,
  });
};

// Create a hospital. RLS only permits this for the platform owner; a non-owner
// insert is rejected by Postgres and surfaced as a toast (never silently swallowed).
export const useCreateHospital = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; city?: string; state?: string }) => {
      const name = (input.name || '').trim();
      if (!name) throw new Error('Hospital name is required');
      const { data, error } = await (supabase as any)
        .from('hospitals')
        .insert({
          name,
          city: input.city?.trim() || null,
          state: input.state?.trim() || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Hospital;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hospitals'] });
      toast.success('Hospital added');
    },
    onError: (e: any) => {
      if (e?.code === '23505' || /duplicate|unique/i.test(e?.message || '')) {
        toast.error('A hospital with that name already exists');
      } else if (/row-level security|permission/i.test(e?.message || '')) {
        toast.error('Only the platform owner can add hospitals');
      } else {
        toast.error(e?.message || 'Failed to add hospital');
      }
    },
  });
};
