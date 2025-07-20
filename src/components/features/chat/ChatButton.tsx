import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Bell } from 'lucide-react';
import { useUnreadMessages } from '../../../hooks/useChat';
import { cn } from '../../../lib/utils';

interface ChatButtonProps {
  className?: string;
}

export const ChatButton: React.FC<ChatButtonProps> = ({ className }) => {
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const { data: unreadCount = 0 } = useUnreadMessages();

  // Play notification sound for new messages
  useEffect(() => {
    if (unreadCount > 0 && !hasNewMessage) {
      setHasNewMessage(true);
      // Play notification sound
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Fallback for browsers that require user interaction
        console.log('Notification sound blocked by browser');
      });
    } else if (unreadCount === 0) {
      setHasNewMessage(false);
    }
  }, [unreadCount, hasNewMessage]);

  return (
    <>
      <motion.button
        onClick={() => window.location.href = '/messages'}
        className={cn(
          "relative p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/30",
          className
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        <MessageSquare className="w-6 h-6" />
        
        {/* Unread count badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}

        {/* New message indicator */}
        {hasNewMessage && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
          />
        )}

        {/* Pulse animation for new messages */}
        {hasNewMessage && (
          <motion.div
            className="absolute inset-0 bg-blue-400 rounded-full"
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.7, 0, 0.7]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </motion.button>
    </>
  );
};