import React, { useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, 
  MessageSquare, 
  Calendar, 
  Clock,
  RefreshCw
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { useResponsive } from '../../../hooks/useResponsive';
import { useDashboardStats } from '../../../hooks/useDashboardData';
import { cn } from '../../../lib/utils';

export const DashboardStats: React.FC = () => {
  const { isMobile, isTablet } = useResponsive();
  const { data: stats, isLoading, refetch, isRefetching } = useDashboardStats();

  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const statsData = [
    {
      name: 'Active Referrals',
      value: stats?.activeReferrals?.toString() || '0',
      change: 'Real-time data',
      changeType: 'neutral',
      icon: FileText,
      color: 'primary',
    },
    {
      name: 'Unread Messages',
      value: '0', // Placeholder - will be connected to real data later
      change: 'Coming soon',
      changeType: 'neutral',
      icon: MessageSquare,
      color: 'medical',
    },
    {
      name: 'Upcoming Duties',
      value: stats?.upcomingDuties?.toString() || '0',
      change: 'Scheduled shifts',
      changeType: 'neutral',
      icon: Calendar,
      color: 'success',
    },
    {
      name: 'Response Time',
      value: '12m', // Placeholder - will be connected to real data later
      change: 'Average response',
      changeType: 'neutral',
      icon: Clock,
      color: 'warning',
    },
  ];

  if (isLoading) {
    return (
      <div className={cn(
        "grid gap-4",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      )}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="h-24 bg-neutral-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-4",
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
    )}>
      {/* Refresh Button */}
      <div className="col-span-full flex justify-end mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefetching}
          className="text-neutral-600 hover:text-neutral-900"
        >
          <RefreshCw size={16} className={cn("mr-2", isRefetching && "animate-spin")} />
          {isRefetching ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
      
      {statsData.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <Card variant="elevated" padding="md" hoverable className="relative overflow-hidden">
              {/* Live indicator for real data */}
              {(stat.name === 'Active Referrals' || stat.name === 'Upcoming Duties') && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              )}
              {/* Placeholder indicator for mock data */}
              {(stat.name === 'Unread Messages' || stat.name === 'Response Time') && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full"></div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    "font-medium text-neutral-600 truncate",
                    "text-xs md:text-sm"
                  )}>
                    {stat.name}
                  </p>
                  <p className={cn(
                    "font-bold text-neutral-900 mt-1",
                    "text-lg md:text-xl lg:text-2xl"
                  )}>
                    {stat.value}
                  </p>
                  <p className={cn(
                    "mt-1 truncate text-neutral-500",
                    "text-xs"
                  )}>
                    {stat.change}
                  </p>
                </div>
                <div className={cn(
                  "rounded-full flex-shrink-0",
                  "p-2 md:p-3",
                  `bg-${stat.color}-100`
                )}>
                  <Icon className={cn(
                    `text-${stat.color}-600`,
                    "h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6"
                  )} />
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
};

export default React.memo(DashboardStats);