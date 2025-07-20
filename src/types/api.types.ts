export interface ApiResponse<T = any> {
  data: T;
  message: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    department: string;
  };
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export interface ReferralRequest {
  title: string;
  description: string;
  urgency: 'Normal' | 'Urgent' | 'Emergency';
  to_department: string;
  to_user_id?: string;
  attachments?: File[];
}

export interface MessageRequest {
  conversation_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image' | 'voice';
  attachment?: File;
}

export interface DutySwapRequest {
  original_duty_id: string;
  target_duty_id: string;
  reason: string;
  requested_by: string;
  requested_to: string;
}