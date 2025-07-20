import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  MessageSquare, 
  Clock, 
  FileText,
  Calendar,
  AlertTriangle,
  User,
  Building2
} from 'lucide-react';
import { useRecentActivities } from '../../../hooks/useRecentActivities';
import { cn } from '../../../lib/utils';

const activityIcons = {
  referral: FileText,
  duty: Calendar,
};

const statusColors = {
  success: 'text-success-600 bg-success-100',
  warning: 'text-warning-600 bg-warning-100',
  info: 'text-primary-600 bg-primary-100',
  error: 'text-error-600 bg-error-100'
};

const RecentActivity: React.FC = () => {
  const { data: activities = [], isLoading, error } = useRecentActivities();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="animate-pulse flex items-center space-x-3">
            <div className="w-8 h-8 bg-neutral-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
              <div className="h-3 bg-neutral-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-error-400 mx-auto mb-4" />
        <p className="text-error-600">Failed to load recent activities</p>
        <p className="text-sm text-neutral-500 mt-1">Please try refreshing the page</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
        <p className="text-neutral-600">No recent activity</p>
        <p className="text-sm text-neutral-500 mt-1">
          Your recent activities will appear here
        </p>
      </div>
    );
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => {
        const Icon = activityIcons[activity.type];
        
        return (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="flex items-start space-x-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer group"
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
              statusColors[activity.status]
            )}>
              <Icon className="w-4 h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-primary-600 transition-colors">
                  {activity.title}
                </p>
                <span className="text-xs text-neutral-500 flex-shrink-0 ml-2">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
              
              <p className="text-xs text-neutral-600 mb-2">
                {activity.description}
              </p>
              
              {activity.metadata && (
                <div className="flex items-center gap-3 text-xs text-neutral-500">
                  {activity.metadata.doctor && (
                    <div className="flex items-center">
                      <User className="w-3 h-3 mr-1" />
                      <span>{activity.metadata.doctor}</span>
                    </div>
                  )}
                  {activity.metadata.department && (
                    <div className="flex items-center">
                      <Building2 className="w-3 h-3 mr-1" />
                      <span>{activity.metadata.department}</span>
                    </div>
                  )}
                  {activity.metadata.urgency && (
                    <div className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      activity.metadata.urgency === 'Emergency' 
                        ? 'bg-error-100 text-error-700'
                        : activity.metadata.urgency === 'Urgent'
                        ? 'bg-warning-100 text-warning-700'
                        : 'bg-neutral-100 text-neutral-700'
                    )}>
                      {activity.metadata.urgency}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center pt-2"
      >
        <p className="text-xs text-neutral-500">
          Showing {activities.length} recent activit{activities.length !== 1 ? 'ies' : 'y'}
        </p>
      </motion.div>
    </div>
  );
};

export default React.memo(RecentActivity);