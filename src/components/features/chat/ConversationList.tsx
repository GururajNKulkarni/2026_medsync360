import React from 'react';
import { motion } from 'framer-motion';
import { User, Clock, Check, CheckCheck, Shield, MessageSquare, Plus, MoreVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../../lib/utils';
import type { Conversation } from '../../../types/chat.types';
import { decrypt } from '../../../lib/encryption';

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation?: (conversation: Conversation) => void;
  isLoading: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  onDeleteConversation,
  isLoading
}) => {
  const formatTime = (timestamp: string) => {
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch {
      return '';
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
      <div className="p-2 space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="animate-pulse flex items-center space-x-3 p-2">
            <div className="w-12 h-12 bg-gray-200 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-700">No chats yet</h3>
          <p className="text-sm text-gray-500">Start a new conversation to begin messaging.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
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
                "w-full p-3 text-left transition-colors",
                isSelected ? "bg-blue-500 text-white" : "hover:bg-gray-100"
              )}
            >
            <div className="flex items-center space-x-3">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  {conversation.otherParticipant?.avatar_url ? ( 
                    <img
                      src={conversation.otherParticipant.avatar_url}
                      alt={conversation.otherParticipant.full_name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-white" />
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className={cn(
                    "text-sm font-semibold truncate",
                    isSelected ? "text-white" : "text-gray-900"
                  )}>
                    {conversation.otherParticipant?.full_name || 'Unknown User'}
                  </h4>
                  <span className={cn(
                    "text-xs",
                    isSelected ? "text-blue-200" : "text-gray-500"
                  )}>
                    {conversation.lastMessage && formatTime(conversation.lastMessage.created_at)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 flex items-center">
                    {getMessageStatusIcon(conversation.lastMessage)}
                    <p className={cn(
                      "text-sm truncate ml-1",
                      isSelected ? "text-blue-100" : "text-gray-500"
                    )}>
                      {conversation.lastMessage
                        ? (conversation.lastMessage.is_encrypted
                            ? (() => {
                                try {
                                  return decrypt(conversation.lastMessage!.content);
                                } catch {
                                  return '[Encrypted message]';
                                }
                              })()
                            : conversation.lastMessage.content)
                        : 'No messages yet'}
                    </p>
                  </div>

                  {/* Unread count */}
                  {hasUnread && (
                    <div className="ml-2 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {conversation.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
};
