import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Users, MessageSquare, Shield, Zap, Sparkles, Filter, MoreVertical, Trash2, CheckCircle2 } from 'lucide-react';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { DoctorSearch } from './DoctorSearch';
import { DeleteConversationModal } from './DeleteConversationModal';
import { ChatErrorBoundary, ChatSectionFallback } from './ChatErrorBoundary';
import { useResponsive } from '../../../hooks/useResponsive';
import { useConversations, useCreateConversation, useDeleteConversation } from '../../../hooks/useChat';
import { useAuthStore } from '../../../store/authStore';
import { cn } from '../../../lib/utils';
import type { Conversation, Doctor } from '../../../types/chat.types';

export const PrivateChat: React.FC = () => {
  const { isMobile } = useResponsive();
  const { profile } = useAuthStore();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showDoctorSearch, setShowDoctorSearch] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);

  const { data: conversations = [], isLoading } = useConversations();
  const createConversationMutation = useCreateConversation();
  const deleteConversationMutation = useDeleteConversation();

  // Filter conversations based on search
  const filteredConversations = conversations
    .filter(conv =>
      conv.otherParticipant?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.otherParticipant?.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(conv => (showOnlyUnread ? (conv.unreadCount ?? 0) > 0 : true));

  // Handle creating new conversation
  const handleStartConversation = async (doctor: Doctor) => {
    if (!profile?.id) return;

    try {
      const newConversation = await createConversationMutation.mutateAsync({
        participantIds: [profile.id, doctor.id]
      });
      
      setSelectedConversation(newConversation);
      setShowDoctorSearch(false);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // Handle delete conversation
  const handleDeleteConversation = (conversation: Conversation) => {
    setConversationToDelete(conversation);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!conversationToDelete) return;
    
    try {
      await deleteConversationMutation.mutateAsync({ conversationId: conversationToDelete.id });
      
      // If the deleted conversation was selected, clear the selection
      if (selectedConversation?.id === conversationToDelete.id) {
        setSelectedConversation(null);
      }
      
      setShowDeleteModal(false);
      setConversationToDelete(null);
    } catch (error) {
      // Error is handled by the mutation
      console.error('Failed to delete conversation:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Left Panel - Conversations List */}
      <div className={cn(
        "border-r border-gray-200 bg-white",
        isMobile && selectedConversation ? "hidden" : "flex flex-col",
        isMobile ? "w-full" : "w-80"
      )}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Chats
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDoctorSearch(true)}
                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                title="New conversation"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search or start a new chat"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={filteredConversations}
            selectedConversation={selectedConversation}
            onSelectConversation={setSelectedConversation}
            onDeleteConversation={handleDeleteConversation}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Right Panel - Message Thread */}
      <div className={cn(
        "flex-1 flex flex-col",
        isMobile && !selectedConversation && "hidden"
      )}>
        {selectedConversation ? (
          <MessageThread
            conversation={selectedConversation}
            onBack={isMobile ? () => setSelectedConversation(null) : undefined}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900">
                Select a chat to start messaging
              </h3>
            </div>
          </div>
        )}
      </div>

      {/* Doctor Search Modal */}
      <AnimatePresence>
        {showDoctorSearch && (
          <DoctorSearch
            isOpen={showDoctorSearch}
            onClose={() => setShowDoctorSearch(false)}
            onSelectDoctor={handleStartConversation}
          />
        )}
      </AnimatePresence>

      {/* Delete Conversation Modal */}
      <DeleteConversationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setConversationToDelete(null);
        }}
        conversation={conversationToDelete}
        onConfirm={handleConfirmDelete}
        isLoading={deleteConversationMutation.isPending}
      />
    </div>
  );
};
