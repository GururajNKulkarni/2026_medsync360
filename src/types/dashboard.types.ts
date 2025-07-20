export interface DashboardPerformanceMetrics {
  loadTime: number;
  renderTime: number;
  cacheHitRate: number;
  apiResponseTime: number;
}

export interface ActivityItem {
  id: string;
  type: 'referral' | 'duty' | 'system';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'info' | 'error';
  metadata?: {
    department?: string;
    doctor?: string;
    urgency?: string;
  };
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  href: string;
  action?: string;
}

export interface DashboardStats {
  activeReferrals: number;
  upcomingDuties: number;
}