export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'PG' | 'Senior Resident' | 'House' | 'Consultant';
          department: string;
          kmc_number: string | null;
          aadhar_number: string | null;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean;
          date_of_birth: string | null;
          gender: string | null;
          year_of_graduation: number | null;
          graduated_from: string | null;
          currently_working_at: string | null;
          secondary_phone: string | null;
          profile_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role: 'PG' | 'Senior Resident' | 'House' | 'Consultant';
          department: string;
          kmc_number?: string | null;
          aadhar_number?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          date_of_birth?: string | null;
          gender?: string | null;
          year_of_graduation?: number | null;
          graduated_from?: string | null;
          currently_working_at?: string | null;
          secondary_phone?: string | null;
          profile_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'PG' | 'Senior Resident' | 'House' | 'Consultant';
          department?: string;
          kmc_number?: string | null;
          aadhar_number?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          date_of_birth?: string | null;
          gender?: string | null;
          year_of_graduation?: number | null;
          graduated_from?: string | null;
          currently_working_at?: string | null;
          secondary_phone?: string | null;
          profile_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      referrals: {
        Row: {
          id: string;
          title: string;
          description: string;
          urgency: 'Normal' | 'Urgent' | 'Emergency';
          status: 'Sent' | 'Received' | 'Acknowledged' | 'Cancelled';
          from_user_id: string;
          to_department: string;
          to_user_id: string | null;
          attachments: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description: string;
          urgency: 'Normal' | 'Urgent' | 'Emergency';
          status?: 'Sent' | 'Received' | 'Acknowledged' | 'Cancelled';
          from_user_id: string;
          to_department: string;
          to_user_id?: string | null;
          attachments?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          urgency?: 'Normal' | 'Urgent' | 'Emergency';
          status?: 'Sent' | 'Received' | 'Acknowledged' | 'Cancelled';
          from_user_id?: string;
          to_department?: string;
          to_user_id?: string | null;
          attachments?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      duty_roster: {
        Row: {
          id: string;
          user_id: string;
          department: string;
          shift_date: string;
          shift_type: 'Day' | 'Night' | 'On Call';
          start_time: string;
          end_time: string;
          status: 'Scheduled' | 'Completed' | 'Swapped';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          department: string;
          shift_date: string;
          shift_type: 'Day' | 'Night' | 'On Call';
          start_time: string;
          end_time: string;
          status?: 'Scheduled' | 'Completed' | 'Swapped';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          department?: string;
          shift_date?: string;
          shift_type?: 'Day' | 'Night' | 'On Call';
          start_time?: string;
          end_time?: string;
          status?: 'Scheduled' | 'Completed' | 'Swapped';
          created_at?: string;
          updated_at?: string;
        };
      };
      private_conversations: {
        Row: {
          id: string;
          participant_ids: string[];
          last_message_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_ids: string[];
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          participant_ids?: string[];
          last_message_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      private_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          is_encrypted: boolean;
          message_type: 'text' | 'file' | 'image' | 'voice';
          edited_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          is_encrypted?: boolean;
          message_type?: 'text' | 'file' | 'image' | 'voice';
          edited_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          content?: string;
          is_encrypted?: boolean;
          message_type?: 'text' | 'file' | 'image' | 'voice';
          edited_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
};

export type UserRole = 'PG' | 'Senior Resident' | 'House' | 'Consultant';
export type ReferralUrgency = 'Normal' | 'Urgent' | 'Emergency';
export type ReferralStatus = 'Sent' | 'Received' | 'Acknowledged' | 'Cancelled';
export type ShiftType = 'Day' | 'Afternoon' | 'Night';
export type MessageType = 'text' | 'file' | 'image' | 'voice';