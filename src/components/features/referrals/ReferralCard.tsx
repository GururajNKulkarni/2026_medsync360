import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Calendar, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Archive,
  ChevronRight,
  FileText,
  Building2,
  Stethoscope,
  MoreVertical
} from 'lucide-react';
import { useResponsive } from '../../../hooks/useResponsive';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { cn } from '../../../lib/utils';
import type { Referral, ReferralStatus, UrgencyLevel } from '../../../types/referral.types';
import { mapStatusForDisplay, mapStatusForDatabase } from '../../../types/referral.types';

interface ReferralCardProps {
  referral: Referral;
  onStatusChange: (id: string, status: ReferralStatus) => void;
  onClick: () => void;
}

const urgencyConfig = {
  Emergency: {
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    icon: AlertTriangle
  },
  Urgent: {
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
    icon: Clock
  },
  Normal: {
    color: 'bg-neutral-500',
    bgColor: 'bg-neutral-50',
    textColor: 'text-neutral-700',
    borderColor: 'border-neutral-200',
    icon: FileText
  }
};

const statusConfig = {
  Received: {
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    icon: FileText
  },
  Acknowledged: {
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    icon: CheckCircle
  },
  Accepted: { // Alias for Acknowledged for UI consistency
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    icon: CheckCircle
  },
  Sent: {
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    icon: FileText
  },
  Cancelled: {
    color: 'bg-red-500',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    icon: XCircle
  },
  Closed: {
    color: 'bg-gray-500',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    icon: Archive
  }
};

const ReferralCard: React.FC<ReferralCardProps> = ({ 
  referral, 
  onStatusChange, 
  onClick 
}) => {
  const { isMobile } = useResponsive();
  const [showActions, setShowActions] = useState(false);
  
  const urgency = urgencyConfig[referral.urgency];
  // Map status for display and get the correct config
  const displayStatus = mapStatusForDisplay(referral.status);
  const status = statusConfig[displayStatus as keyof typeof statusConfig];
  const UrgencyIcon = urgency.icon;
  const StatusIcon = status.icon;

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }, []);

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const quickActions = useMemo(() => {
    switch (referral.status) {
      case 'Received':
        console.log(`Generating quick actions for Received referral ${referral.id}`);
        return [
          {
            label: 'Accept',
            action: () => onStatusChange(referral.id, 'Accepted'),
            icon: CheckCircle,
            variant: 'primary' as const
          },
          {
            label: 'Decline',
            action: () => onStatusChange(referral.id, 'Cancelled'),
            icon: XCircle,
            variant: 'outline' as const
          }
        ];
      case 'Acknowledged': // Support for database status
        console.log(`Generating quick actions for Acknowledged referral ${referral.id}`);
        return [
          {
            label: 'Complete',
            action: () => onStatusChange(referral.id, 'Closed'),
            icon: Archive,
            variant: 'primary' as const
          }
        ];
      case 'Accepted':
        console.log(`Generating quick actions for Accepted referral ${referral.id}`);
        return [
          {
            label: 'Complete',
            action: () => onStatusChange(referral.id, 'Closed'),
            icon: Archive,
            variant: 'primary' as const
          }
        ];
      case 'Closed':
        console.log(`Generating quick actions for Closed referral ${referral.id}`);
        return [];
      case 'Cancelled':
        console.log(`Generating quick actions for Cancelled referral ${referral.id}`);
        return [];
      case 'Sent':
        console.log(`Generating quick actions for Sent referral ${referral.id}`);
        return [
          {
            label: 'Cancel',
            action: () => onStatusChange(referral.id, 'Cancelled'),
            icon: XCircle,
            variant: 'primary' as const
          }
        ];
      default:
        return [];
    }
  }, [referral.status, onStatusChange, referral.id]);

  // Mobile swipe gesture handling
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Log referral details for debugging
  useEffect(() => {
    console.log(`Rendering ReferralCard for ${referral.id}:`, {
      status: referral.status,
      displayStatus,
      fromDoctor: referral.fromDoctor,
      toDoctor: referral.doctor,
      quickActions: quickActions.length
    });
  }, [referral.id, referral.status, displayStatus, referral.fromDoctor, referral.doctor, quickActions.length]);

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    const threshold = 100;
    
    if (info.offset.x > threshold && quickActions.length > 0) {
      // Swipe right - trigger first action
      quickActions[0].action();
    } else if (info.offset.x < -threshold && quickActions.length > 1) {
      // Swipe left - trigger second action
      quickActions[1].action();
    }
    
    setDragX(0);
  };

  return (
    <motion.div
      className="relative"
      drag={isMobile && quickActions.length > 0 ? "x" : false}
      dragConstraints={{ left: -150, right: 150 }}
      dragElastic={0.2}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onDrag={(event, info) => setDragX(info.offset.x)}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Swipe Actions Background (Mobile) */}
      {isMobile && quickActions.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-between px-4 rounded-lg overflow-hidden">
          {/* Left action */}
          {quickActions[0] && (
            (() => {
              const ActionIcon = quickActions[0].icon;
              return (
            <motion.div
              className={cn(
                "flex items-center justify-center w-16 h-16 rounded-full",
                quickActions[0].variant === 'primary' ? 'bg-green-500' : 'bg-red-500'
              )}
              initial={{ scale: 0 }}
              animate={{ scale: dragX > 50 ? 1 : 0 }}
            >
                 <ActionIcon size={20} className="text-white" />
            </motion.div>
              );
            })()
          )}
          
          {/* Right action */}
          {quickActions[1] && (
            (() => {
              const ActionIcon = quickActions[1].icon;
              return (
            <motion.div
              className="flex items-center justify-center w-16 h-16 bg-red-500 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: dragX < -50 ? 1 : 0 }}
            >
                 <ActionIcon size={20} className="text-white" />
            </motion.div>
              );
            })()
          )}
        </div>
      )}

      {/* Main Card */}
      <Card
        variant="outlined"
        padding="none"
        className={cn(
          "transition-all duration-200 cursor-pointer",
          isDragging && "shadow-lg",
          urgency.borderColor
        )}
        style={{ transform: `translateX(${dragX}px)` }}
      >
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-neutral-900 truncate">
                  {referral.patientName}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Urgency Badge */}
                  <div className={cn(
                    "flex items-center px-2 py-1 rounded-full text-xs font-medium",
                    urgency.bgColor,
                    urgency.textColor
                  )}>
                    <UrgencyIcon size={12} className="mr-1" />
                    {referral.urgency}
                  </div>
                  
                  {/* Status Badge */}
                  <div className={cn(
                    "flex items-center px-2 py-1 rounded-full text-xs font-medium",
                    status.bgColor,
                    status.textColor
                  )}>
                    <StatusIcon size={12} className="mr-1" />
                    {displayStatus}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center text-sm text-neutral-600 gap-4">
                <span className="flex items-center">
                  <User size={14} className="mr-1" />
                  {referral.age}y, {referral.sex}
                </span>
                <span className="flex items-center">
                  <Calendar size={14} className="mr-1" />
                  {formatDate(referral.admissionDate)}
                </span>
              </div>
            </div>
            
            {/* Desktop Actions */}
            {!isMobile && (
              <div className="flex items-center gap-2">
                {quickActions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      action.action();
                    }}
                    className="hidden sm:flex"
                  >
                    <action.icon size={14} className="mr-1" />
                    {action.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(!showActions);
                  }}
                  className="sm:hidden"
                >
                  <MoreVertical size={16} />
                </Button>
              </div>
            )}
          </div>

          {/* Chief Complaint */}
          <div className="mb-4">
            <p className="text-sm text-neutral-700 line-clamp-2">
              {referral.chiefComplaint}
            </p>
          </div>

          {/* Referral Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center text-sm text-neutral-600">
              <Building2 size={14} className="mr-2 text-neutral-400" />
              <div>
                <p className="font-medium">{referral.department}</p>
                <p className="text-xs">{referral.doctor}</p>
              </div>
            </div>
            
            <div className="flex items-center text-sm text-neutral-600">
              <Stethoscope size={14} className="mr-2 text-neutral-400" />
              <div>
                <p className="font-medium">From: {referral.fromDoctor}</p>
                <p className="text-xs">{referral.fromDepartment}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-neutral-100">
            <div className="flex items-center text-xs text-neutral-500">
              <Clock size={12} className="mr-1" />
              {formatDate(referral.createdAt)} at {formatTime(referral.createdAt)}
            </div>
            
            <div className="flex items-center gap-3">
              {referral.attachments.length > 0 && (
                <div className="flex items-center text-xs text-neutral-500">
                  <FileText size={12} className="mr-1" />
                  {referral.attachments.length} file{referral.attachments.length !== 1 ? 's' : ''}
                </div>
              )}
              
              <button
                onClick={onClick}
                className="flex items-center text-xs text-primary-600 hover:text-primary-700 transition-colors"
              >
                View Details
                <ChevronRight size={12} className="ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Action Menu */}
        {isMobile && showActions && quickActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-neutral-200 p-4 bg-neutral-50"
          >
            <div className="flex gap-2">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    action.action();
                    setShowActions(false);
                  }}
                  className="flex-1"
                >
                  <action.icon size={14} className="mr-1" />
                  {action.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </Card>

      {/* Swipe Hint (Mobile) */}
      {isMobile && quickActions.length > 0 && !isDragging && (
        <div className="absolute -bottom-6 left-0 right-0 text-center">
          <p className="text-xs text-neutral-400">
            Swipe for quick actions
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default React.memo(ReferralCard);
export { ReferralCard };