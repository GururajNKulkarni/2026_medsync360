import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Calendar,
  Plus,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { AIAssistantButton } from '../ai-assistant';
import { useState } from 'react';
import DutyRosterModal from '../roster/DutyRosterModal';

const quickActions = [
  {
    id: 'new-referral',
    title: 'Create New Referral',
    description: 'Send patient to specialist',
    icon: FileText,
    color: 'primary',
    href: '/referrals',
    action: 'create'
  },
  {
    id: 'duty-schedule',
    title: 'View Duty Schedule',
    description: 'View your roster', 
    icon: Calendar,
    color: 'medical'
  }
];

const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const [showRosterModal, setShowRosterModal] = useState(false);

  const handleActionClick = useCallback((action: typeof quickActions[0]) => {
    // Add performance tracking
    const startTime = performance.now();
    
    if (action.id === 'duty-schedule') {
      setShowRosterModal(true);
      // Track click for analytics
      console.log('Duty schedule clicked from dashboard');
    } else {
      navigate(action.href, { 
        state: { action: action.action },
        replace: false 
      });
    }
    
    // Log performance metrics
    const endTime = performance.now();
    console.log(`Navigation to ${action.href} took ${endTime - startTime} milliseconds`);
  }, [navigate]);

  return (
    <div className="space-y-3">
      {quickActions.map((action, index) => {
        const Icon = action.icon;
        
        return (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            onClick={() => handleActionClick(action)}
            className={cn(
              "w-full p-3 text-left rounded-lg transition-all duration-200 group",
              "min-h-[44px] hover:shadow-md",
              `bg-${action.color}-50 hover:bg-${action.color}-100 border border-${action.color}-200`
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center">
              <div className={cn(
                "p-2 rounded-lg mr-3 transition-colors",
                `bg-${action.color}-100 group-hover:bg-${action.color}-200`
              )}>
                <Icon className={cn(
                  "w-5 h-5",
                  `text-${action.color}-600`
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "font-medium block",
                  `text-${action.color}-900`
                )}>
                  {action.title}
                </span>
                <span className={cn(
                  "text-sm block truncate",
                  `text-${action.color}-600`
                )}>
                  {action.description}
                </span>
              </div>
              <Plus className={cn(
                "w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity",
                `text-${action.color}-600`
              )} />
            </div>
          </motion.button>
        );
      })}
      
      {/* AI Medical Assistant - positioned below Secure Messages */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="mt-4 pt-4 border-t border-neutral-200"
      >
        <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 hover:from-purple-100 hover:to-blue-100 transition-all duration-200">
          <div className="flex items-center">
            <div className="mr-3">
              <AIAssistantButton className="relative static w-10 h-10" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium block text-purple-900">
                AI Medical Assistant
              </span>
              <span className="text-sm block truncate text-purple-600">
                Record and process conversations
              </span>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Duty Roster Modal */}
      <DutyRosterModal 
        isOpen={showRosterModal} 
        onClose={() => setShowRosterModal(false)} 
      /> 
    </div>
  );
};

export default React.memo(QuickActions);