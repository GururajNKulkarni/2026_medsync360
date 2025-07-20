import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Mic, FileText, CheckCircle, Wifi, Zap, Activity, Shield } from 'lucide-react';
import { AIAssistantModal } from './AIAssistantModal';
import { cn } from '../../../lib/utils';

interface AIAssistantButtonProps {
  className?: string;
}

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ className }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showStatusTooltip, setShowStatusTooltip] = useState(false);
  
  // Check if we're in dashboard context (static positioning)
  const isInDashboard = className?.includes('static');
  const isSmallVersion = className?.includes('w-10 h-10');

  // System status data (would come from actual system monitoring)
  const systemStatus = {
    aiProcessing: { status: 'active', label: 'AI Processing', uptime: '99.9%' },
    audioRecording: { status: 'active', label: 'Audio Recording', quality: 'High' },
    speechRecognition: { status: 'active', label: 'Speech Recognition', accuracy: '95%' },
    networkConnection: { status: 'active', label: 'Network', latency: '12ms' },
    systemHealth: { status: 'active', label: 'System Health', performance: 'Optimal' },
    dataEncryption: { status: 'active', label: 'HIPAA Encryption', security: 'Enabled' }
  };

  // Handle hover with proper timing - FIXED: Removed isInDashboard restriction
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isHovered) {
      // Show detailed status after 800ms of hovering
      timeoutId = setTimeout(() => {
        setShowStatusTooltip(true);
      }, 800);
    } else {
      setShowStatusTooltip(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isHovered]); // Removed isInDashboard dependency

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-3 h-3" />;
      case 'warning': return <Activity className="w-3 h-3" />;
      case 'error': return <Activity className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setShowStatusTooltip(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        className={cn(
          isInDashboard ? "relative" : "fixed bottom-6 right-6 z-40",
          className
        )}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: "spring", 
          stiffness: 260, 
          damping: 20,
          delay: isInDashboard ? 0 : 0.5 
        }}
      >
        <motion.button
          onClick={() => setIsModalOpen(true)}
          className={cn(
            "group relative bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-500/30",
            isInDashboard ? "shadow-lg" : ""
          )}
          whileTap={{ scale: 0.95 }}
        >
          {/* Main Button */}
          <div className={cn(
            "flex items-center justify-center relative overflow-hidden",
            isSmallVersion ? "w-10 h-10" : isInDashboard ? "w-12 h-12" : "w-16 h-16"
          )}>
            <Brain className={isSmallVersion ? "w-5 h-5" : isInDashboard ? "w-6 h-6" : "w-8 h-8"} />
            
            {/* Pulse Animation */}
            {!isSmallVersion && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 0, 0.7]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}

            {/* Status Indicator Dot */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            </div>
          </div>
        </motion.button>

      </motion.div>

      {/* AI Assistant Modal */}
      <AIAssistantModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};