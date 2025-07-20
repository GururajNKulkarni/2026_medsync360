import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as LucideIcons from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../../store/authStore';
import { useMessages, useSendMessage, useMarkAsRead } from '../../../hooks/useChat';
import { encrypt, decrypt } from '../../../lib/encryption';
import { cn } from '../../../lib/utils';
import type { Conversation, Message } from '../../../types/chat.types';

interface MessageThreadProps {
  conversation: Conversation;
  onBack?: () => void;
}

export const MessageThread: React.FC<MessageThreadProps> = ({ conversation, onBack }) => {
  const { ArrowLeft, Send, Paperclip, Smile, MoreVertical, Check, CheckCheck, 
          Shield, Clock, Image, File, X, Mic, Loader, Zap, Sparkles } = LucideIcons;
  const { profile } = useAuthStore();
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: messages = [], isLoading } = useMessages(conversation.id);
  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkAsRead();

  // Mark messages as read when conversation is opened
  useEffect(() => {
    if (conversation.id && conversation.unreadCount > 0) {
      markAsReadMutation.mutate({ conversationId: conversation.id });
    }
  }, [conversation.id, conversation.unreadCount, markAsReadMutation]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    let typingTimeout: NodeJS.Timeout;
    
    if (messageText) {
      setIsTyping(true);
      // TODO: Send typing indicator to other user
      
      typingTimeout = setTimeout(() => {
        setIsTyping(false);
        // TODO: Send stopped typing indicator
      }, 2000);
    } else {
      setIsTyping(false);
      // TODO: Send stopped typing indicator
    }
    
    return () => {
      clearTimeout(typingTimeout);
    };
  }, [messageText]);

  const handleSendMessage = async () => {
    if ((!messageText.trim() && attachments.length === 0) || !profile?.id) return;
    
    try {
      // Encrypt message content
      const encryptedContent = encrypt(messageText);
      
      // Prepare message data
      const messageData = {
        conversationId: conversation.id,
        senderId: profile.id,
        content: encryptedContent,
        isEncrypted: true,
        messageType: attachments.length > 0 ? 'file' : 'text',
        files: attachments
      };
      
      // Send message
      await sendMessageMutation.mutateAsync(messageData);
      
      // Clear input
      setMessageText('');
      setAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Validate file size (max 5MB)
    const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);
    
    if (validFiles.length !== files.length) {
      // TODO: Show error toast for files that are too large
    }
    
    setAttachments(prev => [...prev, ...validFiles]);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const getMessageStatusIcon = (message: Message) => {
    if (message.sender_id !== profile?.id) return null;
    
    if (message.read_at) {
      return <CheckCheck className="w-4 h-4 text-blue-500" />;
    } else if (message.delivered_at) {
      return <CheckCheck className="w-4 h-4 text-gray-400" />;
    } else {
      return <Check className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 mr-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <div className="flex items-center flex-1 min-w-0">
            <div className="relative mr-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
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
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {conversation.otherParticipant?.full_name || 'Unknown User'}
              </h3>
              <div className="flex items-center text-xs text-gray-500">
                <span className="truncate">
                  {conversation.otherParticipant?.role} • {conversation.otherParticipant?.department}
                </span> 
                <div className="flex items-center ml-2 bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />
                  <span className="text-[10px] font-medium">Online</span>
                </div>
              </div>
            </div>
          </div>
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-300"
          <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="relative">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-600 border-t-transparent"></div>
              <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-blue-600" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full p-4">
            <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-lg border border-gray-100 transform transition-all duration-500 hover:scale-105">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <MessageSquare className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Start Chatting</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Begin a secure, encrypted conversation with <span className="font-medium text-blue-600">{conversation.otherParticipant?.full_name}</span>. All messages are private and HIPAA compliant.
              </p>
              <div className="flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center text-blue-600">
                  <Zap className="w-3 h-3 mr-1" />
                  <span>Encrypted</span>
                </div>
                <div className="flex items-center text-green-600">
                  <Shield className="w-3 h-3 mr-1" />
                  <span>HIPAA Compliant</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isCurrentUser = message.sender_id === profile?.id;
              const showAvatar = index === 0 || messages[index - 1]?.sender_id !== message.sender_id;
              
              // Decrypt message content
              let content = message.content;
              if (message.is_encrypted) {
                try {
                  content = decrypt(message.content);
                } catch (error) {
                  console.error('Failed to decrypt message:', error);
                  content = '[Encrypted message]';
                }
              }
              
              return (
                <div key={message.id} className={cn(
                  "flex",
                  isCurrentUser ? "justify-end" : "justify-start"
                )}>
                  <div className={cn(
                    "flex items-end max-w-[75%]",
                    isCurrentUser ? "flex-row-reverse" : "flex-row"
                  )}>
                    {/* Avatar */}
                    {!isCurrentUser && showAvatar && (
                      <div className="flex-shrink-0 mr-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                          {conversation.otherParticipant?.avatar_url ? (
                            <img
                              src={conversation.otherParticipant.avatar_url}
                              alt={conversation.otherParticipant.full_name}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-white font-semibold text-xs">
                              {conversation.otherParticipant?.full_name?.charAt(0) || 'U'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div className={cn(
                      "rounded-lg p-3 max-w-full",
                      isCurrentUser 
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-none shadow-md" 
                        : "bg-white text-gray-900 border border-gray-200 rounded-bl-none shadow-sm"
                    )}>
                      {/* Message content */}
                      {message.message_type === 'text' && (
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {content}
                        </p>
                      )}
                      
                      {message.message_type === 'file' && (
                        <div className="flex items-center space-x-2">
                          <File className="w-5 h-5" />
                          <span className="text-sm">File attachment</span>
                        </div>
                      )}
                      
                      {message.message_type === 'image' && (
                        <div className="rounded overflow-hidden">
                          <img 
                            src={content} 
                            alt="Image" 
                            className="max-w-full h-auto"
                          />
                        </div>
                      )}
                      
                      {/* Message metadata */}
                      <div className={cn(
                        "flex items-center mt-1 space-x-1 text-xs",
                        isCurrentUser ? "text-blue-100 justify-end" : "text-gray-500"
                      )}>
                        <span>{formatMessageTime(message.created_at)}</span>
                        {message.is_encrypted && <Shield className="w-3 h-3" />}
                        {getMessageStatusIcon(message)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Typing indicator */}
            {conversation.isTyping && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 border border-gray-200 rounded-lg rounded-bl-none p-3 shadow-sm">
                  <div className="flex space-x-1.5">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Attachments Preview */}
      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gray-50 border-t border-gray-200 p-2 overflow-hidden"
          >
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <div key={index} className="relative bg-white border border-gray-200 rounded-lg p-2 flex items-center">
                  {file.type.startsWith('image/') ? (
                    <Image className="w-4 h-4 mr-2 text-blue-600" />
                  ) : (
                    <File className="w-4 h-4 mr-2 text-blue-600" />
                  )}
                  <span className="text-xs truncate max-w-[100px]">{file.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="ml-2 text-gray-500 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="flex items-end space-x-2">
          <div className="flex-1 relative">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type a message..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm shadow-sm transition-all duration-300 bg-white"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
            
            <div className="absolute right-2 bottom-2 flex items-center space-x-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-all duration-300"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <button className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors">
                <Smile className="w-5 h-5" /> 
              </button>
            </div>
          </div>
          
          <button
            onClick={handleSendMessage}
            disabled={(!messageText.trim() && attachments.length === 0) || sendMessageMutation.isPending}
            className={cn(
              "p-3 rounded-full flex items-center justify-center transition-all duration-300 shadow-md",
              (!messageText.trim() && attachments.length === 0) || sendMessageMutation.isPending
                ? "bg-gray-200 text-gray-500"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
            )}
          >
            {sendMessageMutation.isPending ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center text-xs text-blue-600">
            <Zap className="w-3 h-3 mr-1" />
            <span>Encrypted messaging</span>
          </div>
          
          <div className="text-xs text-gray-600">
            {attachments.length > 0 && (
              <span>{attachments.length} file(s) attached</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};