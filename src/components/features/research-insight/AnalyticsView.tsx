import React from 'react';
import { motion } from 'framer-motion';
import { BarChart, PieChart, TrendingUp, Clock, Eye, Bookmark, Share2, Download, Calendar } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';

interface AnalyticsViewProps {
  onClose: () => void;
}

// Sample analytics data - in a real app, this would come from a database
const analyticsData = {
  viewsByContentType: [
    { type: 'News', count: 45, color: 'bg-blue-500' },
    { type: 'Drugs', count: 32, color: 'bg-green-500' },
    { type: 'Cases', count: 28, color: 'bg-purple-500' }
  ],
  interactionsByType: [
    { type: 'View', count: 105, icon: Eye, color: 'text-blue-500' },
    { type: 'Bookmark', count: 23, icon: Bookmark, color: 'text-yellow-500' },
    { type: 'Share', count: 12, icon: Share2, color: 'text-green-500' },
    { type: 'Download', count: 8, icon: Download, color: 'text-purple-500' }
  ],
  viewsByDay: [
    { day: 'Mon', count: 15 },
    { day: 'Tue', count: 22 },
    { day: 'Wed', count: 18 },
    { day: 'Thu', count: 25 },
    { day: 'Fri', count: 30 },
    { day: 'Sat', count: 12 },
    { day: 'Sun', count: 8 }
  ],
  topCategories: [
    { name: 'Cardiology', count: 28, percentage: 22 },
    { name: 'Oncology', count: 24, percentage: 19 },
    { name: 'Neurology', count: 20, percentage: 16 },
    { name: 'Infectious Disease', count: 18, percentage: 14 },
    { name: 'Endocrinology', count: 12, percentage: 9 }
  ]
};

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ onClose }) => {
  // Calculate max value for bar chart
  const maxDayCount = Math.max(...analyticsData.viewsByDay.map(d => d.count));
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-neutral-900 flex items-center">
          <BarChart className="w-5 h-5 mr-2 text-primary-600" />
          Research Analytics
        </h2>
        <Button variant="outline" size="sm" onClick={onClose}>
          Back to Research
        </Button>
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {analyticsData.interactionsByType.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.type} padding="md" className="text-center">
              <div className={cn("mx-auto w-10 h-10 rounded-full flex items-center justify-center mb-2", 
                stat.type === 'View' ? 'bg-blue-100' : 
                stat.type === 'Bookmark' ? 'bg-yellow-100' : 
                stat.type === 'Share' ? 'bg-green-100' : 'bg-purple-100'
              )}>
                <Icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <h3 className="text-2xl font-bold text-neutral-900">{stat.count}</h3>
              <p className="text-sm text-neutral-600">{stat.type}s</p>
            </Card>
          );
        })}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Content Type Distribution */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900 flex items-center">
              <PieChart className="w-4 h-4 mr-2 text-neutral-500" />
              Content Type Distribution
            </h3>
          </div>
          
          <div className="flex items-center justify-center h-48">
            <div className="relative w-32 h-32">
              {/* Simple pie chart */}
              <svg viewBox="0 0 32 32" className="w-full h-full">
                <circle 
                  r="16" 
                  cx="16" 
                  cy="16" 
                  fill="transparent"
                  stroke="#3b82f6" 
                  strokeWidth="32" 
                  strokeDasharray={`${45 * 100 / 105} 100`} 
                  transform="rotate(-90) translate(-32)" 
                />
                <circle 
                  r="16" 
                  cx="16" 
                  cy="16" 
                  fill="transparent"
                  stroke="#22c55e" 
                  strokeWidth="32" 
                  strokeDasharray={`${32 * 100 / 105} 100`} 
                  strokeDashoffset={`${-45 * 100 / 105}`}
                  transform="rotate(-90) translate(-32)" 
                />
                <circle 
                  r="16" 
                  cx="16" 
                  cy="16" 
                  fill="transparent"
                  stroke="#a855f7" 
                  strokeWidth="32" 
                  strokeDasharray={`${28 * 100 / 105} 100`} 
                  strokeDashoffset={`${-(45 + 32) * 100 / 105}`}
                  transform="rotate(-90) translate(-32)" 
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-neutral-900">105</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mt-4">
            {analyticsData.viewsByContentType.map((item) => (
              <div key={item.type} className="flex items-center">
                <div className={cn("w-3 h-3 rounded-full mr-2", item.color)}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{item.type}</p>
                  <p className="text-xs text-neutral-500">{item.count} views</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        
        {/* Views by Day */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-neutral-900 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-neutral-500" />
              Views by Day
            </h3>
            <div className="flex items-center text-xs text-neutral-500">
              <Calendar className="w-3 h-3 mr-1" />
              Last 7 days
            </div>
          </div>
          
          <div className="h-48 flex items-end justify-between">
            {analyticsData.viewsByDay.map((day) => (
              <div key={day.day} className="flex flex-col items-center">
                <div 
                  className="w-8 bg-primary-500 rounded-t"
                  style={{ height: `${(day.count / maxDayCount) * 100}%` }}
                ></div>
                <p className="text-xs font-medium text-neutral-600 mt-2">{day.day}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
      
      {/* Top Categories */}
      <Card padding="lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-900">Top Categories</h3>
        </div>
        
        <div className="space-y-4">
          {analyticsData.topCategories.map((category) => (
            <div key={category.name} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-900">{category.name}</span>
                <span className="text-sm text-neutral-500">{category.count} views ({category.percentage}%)</span>
              </div>
              <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary-500 rounded-full"
                  style={{ width: `${category.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      {/* Export Options */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Download size={14} />
          Export Report
        </Button>
      </div>
    </div>
  );
};

export default AnalyticsView;