import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  CheckCircle, 
  Send, 
  XCircle, 
  Archive 
} from 'lucide-react';
import { useResponsive } from '../../../hooks/useResponsive';
import { cn } from '../../../lib/utils';
import type { ReferralStatus } from '../../../types/referral.types';

interface ReferralTabsProps { 
  activeTab: ReferralStatus | 'Archive';
  onTabChange: (tab: ReferralStatus | 'Archive') => void;
  counts: Record<ReferralStatus | 'Archive', number>;
}

const tabs = [
  {
    id: 'Received' as const,
    label: 'Received',
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'Accepted' as const,
    label: 'Accepted',
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'Sent' as const,
    label: 'Sent',
    icon: Send,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  {
    id: 'Cancelled' as const,
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  },
  {
    id: 'Closed' as const,
    label: 'Closed',
    icon: Archive,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  {
    id: 'Archive' as const,
    label: 'Archive',
    icon: Archive,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  }
];

const ReferralTabs: React.FC<ReferralTabsProps> = ({ 
  activeTab, 
  onTabChange, 
  counts 
}) => {
  const { isMobile } = useResponsive();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active tab on mobile
  useEffect(() => {
    if (isMobile && scrollContainerRef.current) {
      const activeTabElement = scrollContainerRef.current.querySelector(
        `[data-tab="${activeTab}"]`
      ) as HTMLElement;
      
      if (activeTabElement) {
        activeTabElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [activeTab, isMobile]);

  return (
    <div className="relative">
      {/* Mobile: Horizontal scrollable tabs */}
      {isMobile ? (
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto scrollbar-hide gap-2 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = counts[tab.id];
            
            return (
              <motion.button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-all min-w-fit",
                  isActive
                    ? `${tab.bgColor} ${tab.color} ${tab.borderColor} border-2`
                    : 'bg-white text-neutral-600 border-2 border-neutral-200 hover:border-neutral-300'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon size={16} className="mr-2" />
                <span>{tab.label}</span>
                {count > 0 && (
                  <span className={cn(
                    "ml-2 px-2 py-0.5 rounded-full text-xs font-semibold",
                    isActive 
                      ? 'bg-white text-neutral-700'
                      : 'bg-neutral-100 text-neutral-600'
                  )}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      ) : (
        /* Desktop: Grid layout */
        <div className="grid grid-cols-5 gap-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count = counts[tab.id];
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center p-4 rounded-lg font-medium text-sm transition-all border-2",
                  isActive
                    ? `${tab.bgColor} ${tab.color} ${tab.borderColor}`
                    : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center mb-2">
                  <Icon size={20} />
                  {count > 0 && (
                    <span className={cn(
                      "ml-2 px-2 py-0.5 rounded-full text-xs font-semibold",
                      isActive 
                        ? 'bg-white text-neutral-700'
                        : 'bg-neutral-100 text-neutral-600'
                    )}>
                      {count}
                    </span>
                  )}
                </div>
                <span>{tab.label}</span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Active tab indicator for mobile */}
      {isMobile && (
        <div className="flex justify-center mt-2">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  activeTab === tab.id ? 'bg-primary-600' : 'bg-neutral-300'
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ReferralTabs);
export { ReferralTabs };