export interface Doctor {
  id: string;
  full_name: string;
  role: string;
  department: string;
  kmc_number?: string;
  avatar_url?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_encrypted: boolean;
  message_type: 'text' | 'file' | 'image' | 'voice';
  edited_at: string | null;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  otherParticipant: Doctor | null;
  lastMessage: Message | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isTyping: boolean;
  createdAt: string;
}