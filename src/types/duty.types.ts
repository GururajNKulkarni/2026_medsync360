import { Database } from './database.types';

export type ShiftType = 'Day' | 'Afternoon' | 'Night';
export type DutyStatus = 'Scheduled' | 'Completed' | 'Swapped';

export interface Duty {
  id: string;
  user_id: string;
  department: string;
  shift_date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  status: DutyStatus;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    role: string;
    department: string;
    kmc_number?: string;
  };
}

export interface DutySwapRequest {
  originalDutyId: string;
  targetDutyId?: string;
  targetUserId: string;
  swapType: 'direct' | 'assignment';
  reason?: string;
}

export interface DutyFormData {
  shift_date: string;
  shift_type: ShiftType;
  department: string;
  start_time: string;
  end_time: string;
}

export interface ShiftConfig {
  start: string;
  end: string;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export type DutyRosterViewMode = 'weekly' | 'monthly';

export interface DutyQueryParams {
  currentDate: Date;
  viewMode: DutyRosterViewMode;
  personalViewOnly?: string;
  departments?: string[];
}

export type UserDuty = Database['public']['Tables']['duty_roster']['Row'] & {
  user?: Database['public']['Tables']['users']['Row'];
};