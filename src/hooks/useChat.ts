import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { encrypt, decrypt } from '../lib/encryption';
import toast from 'react-hot-toast';
import type { Conversation, Message, Doctor } from '../types/chat.types';

// Query keys
export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...chatKeys.conversations(), id] as const,
  messages: (conversationId: string) => [...chatKeys.conversation(conversationId), 'messages'] as const,
  doctors: () => [...chatKeys.all, 'doctors'] as const,
  unread: () => [...chatKeys.all, 'unread'] as const,
};

// Fetch conversations
export const useConversations = () => {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: async () => {
      if (!profile?.id) return [];
      
      // First, fetch all doctors to have them available for mapping
      const { data: allDoctors } = await supabase
        .from('users')
        .select('id, full_name, role, department, kmc_number, avatar_url')
        .eq('is_active', true);
      
      // Fetch conversations where user is a participant
      const { data: conversations, error } = await supabase
        .from('private_conversations')
        .select(`
          *,
          last_message:private_messages(
            id,
            sender_id,
            content,
            is_encrypted,
            message_type,
            created_at,
            delivered_at,
            read_at
          )
        `)
        .contains('participant_ids', [profile.id])
        .order('last_message_at', { ascending: false });
      
      if (error) throw error;
      
      // Fetch unread counts for each conversation
      const unreadCounts = await Promise.all(
        (conversations || []).map(async (conv) => {
          const { count } = await supabase
            .from('private_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', profile.id)
            .is('read_at', null);
          
          return { conversationId: conv.id, count: count || 0 };
        })
      );
      
      // Transform data to match component interface
      return (conversations || []).map(conv => {
        // Find the other participant
        const otherParticipantId = conv.participant_ids.find((id: string) => id !== profile.id);
        const otherParticipant = allDoctors?.find(d => d.id === otherParticipantId) || null;
        
        // Get last message
        const lastMessage = conv.last_message?.[0] || null;
        
        // Get unread count
        const unreadCount = unreadCounts.find(uc => uc.conversationId === conv.id)?.count || 0;
        
        return {
          id: conv.id,
          participantIds: conv.participant_ids,
          otherParticipant,
          lastMessage,
          lastMessageAt: conv.last_message_at,
          unreadCount,
          isTyping: false, // Will be updated by real-time subscription
          createdAt: conv.created_at
        };
      });
    },
    enabled: !!profile?.id,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
  });
};

// Fetch messages for a conversation
export const useMessages = (conversationId: string) => {
  const { profile } = useAuthStore();
  
  return useQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: async () => {
      if (!conversationId || !profile?.id) return [];
      
      const { data, error } = await supabase
        .from('private_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!conversationId && !!profile?.id,
    staleTime: 10 * 1000, // 10 seconds
  });
};

// Fetch doctors for starting new conversations
export const useDoctors = () => {
  const { profile } = useAuthStore();
  
  return useQuery({
    queryKey: chatKeys.doctors(),
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role, department, kmc_number, avatar_url')
        .neq('id', profile.id)
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      
      return data || [];
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Fetch unread message count
export const useUnreadMessages = () => {
  const { profile } = useAuthStore();
  
  return useQuery({
    queryKey: chatKeys.unread(),
    queryFn: async () => {
      if (!profile?.id) return 0;
      
      // Get all conversations where user is a participant
      const { data: conversations, error: convError } = await supabase
        .from('private_conversations')
        .select('id')
        .contains('participant_ids', [profile.id]);
      
      if (convError) throw convError;
      
      if (!conversations || conversations.length === 0) return 0;
      
      // Count unread messages across all conversations
      const { count, error: msgError } = await supabase
        .from('private_messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversations.map(c => c.id))
        .neq('sender_id', profile.id)
        .is('read_at', null);
      
      if (msgError) throw msgError;
      
      return count || 0;
    },
    enabled: !!profile?.id,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

// Create a new conversation
export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ participantIds }: { participantIds: string[] }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      
      // Sort participant IDs to ensure consistent order for comparison
      const sortedParticipantIds = [...participantIds].sort();
      
      // Check if conversation already exists
      // Use raw SQL query to properly handle array comparison
      const { data: existingConv, error: checkError } = await supabase
        .rpc('find_conversation_by_participants', {
          participant_array: sortedParticipantIds
        });
      
      // If RPC doesn't exist, fall back to manual query
      if (checkError && checkError.code === '42883') {
        // Use a different approach - get all conversations for current user and filter
        const { data: userConversations, error: fetchError } = await supabase
          .from('private_conversations')
          .select('*')
          .contains('participant_ids', [profile.id]);
        
        if (fetchError) throw fetchError;
        
        // Find conversation with exact participant match
        const existingConversation = userConversations?.find(conv => {
          const convParticipants = [...conv.participant_ids].sort();
          return convParticipants.length === sortedParticipantIds.length &&
                 convParticipants.every((id, index) => id === sortedParticipantIds[index]);
        });
        
        if (existingConversation) {
          // Find the other participant
          const otherParticipantId = existingConversation.participant_ids.find(id => id !== profile.id);
          
          // Get other participant details
          const { data: otherParticipant } = await supabase
            .from('users')
            .select('id, full_name, role, department, kmc_number, avatar_url')
            .eq('id', otherParticipantId)
            .single();
          
          return {
            id: existingConversation.id,
            participantIds: existingConversation.participant_ids,
            otherParticipant,
            lastMessage: null,
            lastMessageAt: existingConversation.last_message_at,
            unreadCount: 0,
            isTyping: false,
            createdAt: existingConversation.created_at
          };
        }
      } else if (checkError) {
        throw checkError;
      } else if (existingConv && existingConv.length > 0) {
        // Handle RPC success case
        const conversation = existingConv[0];
        const otherParticipantId = conversation.participant_ids.find(id => id !== profile.id);
        
        const { data: otherParticipant } = await supabase
          .from('users')
          .select('id, full_name, role, department, kmc_number, avatar_url')
          .eq('id', otherParticipantId)
          .single();
        
        return {
          id: conversation.id,
          participantIds: conversation.participant_ids,
          otherParticipant,
          lastMessage: null,
          lastMessageAt: conversation.last_message_at,
          unreadCount: 0,
          isTyping: false,
          createdAt: conversation.created_at
        };
      }
      
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('private_conversations')
        .insert({
          participant_ids: sortedParticipantIds
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Find the other participant
      const otherParticipantId = newConv.participant_ids.find(id => id !== profile.id);
      
      // Get other participant details
      const { data: otherParticipant } = await supabase
        .from('users')
        .select('id, full_name, role, department, kmc_number, avatar_url')
        .eq('id', otherParticipantId)
        .single();
      
      return {
        id: newConv.id,
        participantIds: newConv.participant_ids,
        otherParticipant,
        lastMessage: null,
        lastMessageAt: newConv.last_message_at,
        unreadCount: 0,
        isTyping: false,
        createdAt: newConv.created_at
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create conversation');
    }
  });
};

// Send a message
export const useSendMessage = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      conversationId, 
      senderId, 
      content, 
      isEncrypted = true,
      messageType = 'text',
      files = []
    }: {
      conversationId: string;
      senderId: string;
      content: string;
      isEncrypted?: boolean;
      messageType?: 'text' | 'file' | 'image' | 'voice';
      files?: File[];
    }) => {
      // First, upload any files
      const fileUrls: string[] = [];
      
      if (files.length > 0) {
        for (const file of files) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${senderId}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('chat_attachments')
            .upload(fileName, file);
          
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('chat_attachments')
            .getPublicUrl(fileName);
          
          fileUrls.push(publicUrl);
        }
      }
      
      // Create message with file URLs if any
      const finalContent = files.length > 0 
        ? isEncrypted ? encrypt(JSON.stringify(fileUrls)) : JSON.stringify(fileUrls)
        : content;
      
      const { data: message, error: messageError } = await supabase
        .from('private_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content: finalContent,
          is_encrypted: isEncrypted,
          message_type: files.length > 0 ? (files[0].type.startsWith('image/') ? 'image' : 'file') : messageType
        })
        .select()
        .single();
      
      if (messageError) throw messageError;
      
      // Update conversation's last_message_at
      const { error: updateError } = await supabase
        .from('private_conversations')
        .update({
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      if (updateError) throw updateError;
      
      return message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to send message');
    }
  });
};

// Mark messages as read
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ conversationId }: { conversationId: string }) => {
      if (!profile?.id) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('private_messages')
        .update({
          read_at: new Date().toISOString()
        })
        .eq('conversation_id', conversationId)
        .neq('sender_id', profile.id)
        .is('read_at', null);
      
      if (error) throw error;
      
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: chatKeys.messages(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: chatKeys.unread() });
    }
  });
};