import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Users, MessageSquare, Shield, Zap, Sparkles } from 'lucide-react';
import { ResponsiveModal } from '../../ui/ResponsiveModal';
import { ConversationList } from './ConversationList';
import { MessageThread } from './MessageThread';
import { DoctorSearch } from './DoctorSearch';
import { useResponsive } from '../../../hooks/useResponsive';
import { useConversations, useCreateConversation } from '../../../hooks/useChat';
import { useAuthStore } from '../../../store/authStore';
import { cn } from '../../../lib/utils';
import type { Conversation, Doctor } from '../../../types/chat.types';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose }) => {
  const { isMobile } = useResponsive();
  const { profile } = useAuthStore();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showDoctorSearch, setShowDoctorSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: conversations = [], isLoading } = useConversations();
  const createConversationMutation = useCreateConversation();

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv =>
    conv.otherParticipant?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.otherParticipant?.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedConversation(null);
      setShowDoctorSearch(false);
      setSearchQuery('');
    }
  }, [isOpen]);

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onClose}
      title="Private Chat"
      size="xl" 
      showCloseButton={true}
    >
      <div className="flex h-[600px] max-h-[80vh] relative overflow-hidden">
        {/* Left Panel - Conversations List */}
        <div className={cn(
          "border-r border-gray-200 bg-gradient-to-b from-gray-50 to-gray-100",
          isMobile && selectedConversation ? "hidden" : "flex flex-col",
          isMobile ? "w-full" : "w-80"
        )}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                </div>
                Private Chat
                <div className="flex items-center ml-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <Shield className="w-3 h-3 mr-1" />
                    Secure
                  </span>
                </div>
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDoctorSearch(true)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-300 transform hover:scale-105"
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
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white shadow-sm transition-all duration-300"
              />
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <ConversationList
              conversations={filteredConversations}
              selectedConversation={selectedConversation}
              onSelectConversation={setSelectedConversation}
              isLoading={isLoading}
            />
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center text-blue-600">
                <Zap className="w-3 h-3 mr-1" />
                <span>End-to-end encrypted</span>
              </span>
              <div className="flex items-center text-green-600">
                <Shield className="w-3 h-3 mr-1" />
                <span>HIPAA Compliant</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Message Thread */}
        <div className={cn(
          "flex-1 flex flex-col bg-gradient-to-b from-white to-gray-50",
          isMobile && !selectedConversation && "hidden"
        )}>
          {selectedConversation ? (
            <MessageThread
              conversation={selectedConversation}
              onBack={isMobile ? () => setSelectedConversation(null) : undefined}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100">
              <div className="text-center max-w-md p-8 rounded-2xl bg-white shadow-lg border border-gray-200 transform transition-all duration-500 hover:scale-105">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageSquare className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Your Conversations
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Select an existing conversation from the list or start a new one to begin secure messaging with your colleagues.
                </p>
                <button
                  onClick={() => setShowDoctorSearch(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Start New Conversation
                </button>
                
                <div className="mt-6 flex items-center justify-center text-xs text-gray-500 gap-4">
                  <div className="flex items-center">
                    <Zap className="w-3 h-3 mr-1 text-blue-500" />
                    <span>Encrypted</span>
                  </div>
                  <div className="flex items-center">
                    <Shield className="w-3 h-3 mr-1 text-green-500" />
                    <span>HIPAA Compliant</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Futuristic animated background elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 left-10 w-20 h-20 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
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
    </ResponsiveModal>
  );
};