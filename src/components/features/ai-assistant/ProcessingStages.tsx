import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ProcessingStage {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  progress: number;
  color: string;
}

interface ProcessingStagesProps {
  stages: ProcessingStage[];
}

export const ProcessingStages: React.FC<ProcessingStagesProps> = ({ stages }) => {
  const getStageIcon = (stage: ProcessingStage) => {
    switch (stage.status) {
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'active':
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getProgressBarColor = (stage: ProcessingStage) => {
    switch (stage.color) {
      case 'blue': return 'bg-blue-500';
      case 'orange': return 'bg-orange-500';
      case 'purple': return 'bg-purple-500';
      case 'green': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Medical Data</h3>
      
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <motion.div
            key={stage.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4"
          >
            {/* Stage Icon */}
            <div className="flex-shrink-0">
              {getStageIcon(stage)}
            </div>

            {/* Stage Info */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className={cn(
                  "text-sm font-medium",
                  stage.status === 'complete' && "text-green-700",
                  stage.status === 'active' && "text-blue-700",
                  stage.status === 'error' && "text-red-700",
                  stage.status === 'pending' && "text-gray-500"
                )}>
                  {stage.label}
                </span>
                {stage.status === 'active' && (
                  <span className="text-xs text-gray-500">
                    {stage.progress}%
                  </span>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    getProgressBarColor(stage)
                  )}
                  initial={{ width: 0 }}
                  animate={{ 
                    width: stage.status === 'complete' 
                      ? '100%' 
                      : stage.status === 'active' 
                      ? `${stage.progress}%` 
                      : '0%' 
                  }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Overall Progress */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Overall Progress</span>
          <span className="font-medium text-gray-900">
            {stages.filter(s => s.status === 'complete').length} of {stages.length} complete
          </span>
        </div>
      </div>
    </motion.div>
  );
};