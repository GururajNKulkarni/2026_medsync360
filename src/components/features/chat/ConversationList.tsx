import React from 'react';
import { motion } from 'framer-motion';
import { User, Clock, Check, CheckCheck, Shield, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../../lib/utils';
import type { Conversation } from '../../../types/chat.types';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  isLoading: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  isLoading
}) => {
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const getMessageStatusIcon = (message: any) => {
    if (!message) return null;
    
    if (message.read_at) {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    } else if (message.delivered_at) {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    } else {
      return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="animate-pulse p-4 border border-gray-200 rounded-lg mb-3">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-blue-200 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-blue-100 rounded-full w-3/4" />
                <div className="h-3 bg-gray-100 rounded-full w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-b from-white to-gray-50">
        <div className="text-center p-6 bg-white rounded-xl shadow-md border border-gray-100 max-w-xs">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h3>
          <p className="text-sm text-gray-600 mb-4">Start a new conversation with a colleague to begin secure messaging</p>
          <div className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs">
            <Plus className="w-3 h-3 mr-1" />
            Start new conversation
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100 bg-white">
      {conversations.map((conversation, index) => {
        const isSelected = selectedConversation?.id === conversation.id;
        const hasUnread = conversation.unreadCount > 0;
        
        return (
          <motion.button
            key={conversation.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectConversation(conversation)}
            className={cn( 
              "w-full p-4 text-left hover:bg-gray-100 transition-colors relative",
              isSelected && "bg-blue-50 border-r-2 border-blue-500",
              hasUnread && "bg-blue-25"
            )}
          >
            <div className="flex items-start space-x-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  {conversation.otherParticipant?.avatar_url ? ( 
                    <img
                      src={conversation.otherParticipant.avatar_url}
                      alt={conversation.otherParticipant.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-semibold text-sm">
                      {conversation.otherParticipant?.full_name?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                
                {/* Online status indicator */}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={cn(
                    "text-sm font-medium truncate",
                    hasUnread ? "text-gray-900" : "text-gray-700"
                  )}>
                    {conversation.otherParticipant?.full_name || 'Unknown User'}
                  </h4>
                  <div className="flex items-center space-x-1">
                    {conversation.lastMessage && getMessageStatusIcon(conversation.lastMessage)}
                    <span className="text-xs text-gray-500">
                      {conversation.lastMessage && formatTime(conversation.lastMessage.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm truncate",
                      hasUnread ? "font-medium text-gray-900" : "text-gray-600"
                    )}>
                      {conversation.lastMessage?.content || 'No messages yet'}
                    </p>
                    <div className="flex items-center mt-1 space-x-2">
                      <span className="text-xs text-gray-500">
                        {conversation.otherParticipant?.role}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 truncate">
                        {conversation.otherParticipant?.department}
                      </span>
                    </div>
                  </div>

                  {/* Unread count */}
                  {hasUnread && (
                    <div className="ml-2 bg-blue-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Encryption indicator */}
            {conversation.lastMessage?.is_encrypted && (
              <div className="absolute top-2 right-2">
                <Shield className="w-3 h-3 text-green-600" />
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
};