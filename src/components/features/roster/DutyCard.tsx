import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Clock, User, CreditCard, Shield, Calendar, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Duty } from '../../../types/duty.types';

interface DutyCardProps {
  duty: Duty;
  isCurrentUser: boolean;
  onClick: () => void;
  shiftConfig: {
    color: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
  };
  compact?: boolean;
  showDoctorInfo?: boolean;
  onDelete?: (duty: Duty) => void;
}

const DutyCard: React.FC<DutyCardProps> = ({
  duty,
  isCurrentUser,
  onClick,
  shiftConfig,
  compact = false,
  showDoctorInfo = true,
  onDelete
}) => {
  // Enhanced color scheme for current user vs others
  const cardColors = isCurrentUser ? {
    // Current user - Enhanced blue theme
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-900',
    accentColor: 'text-blue-700'
  } : {
    // Other doctors - Neutral theme
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    textColor: 'text-gray-800',
    accentColor: 'text-gray-600'
  };

  const tooltipContent = duty.user ? 
    `${duty.user.full_name}${duty.user.kmc_number ? ` (${duty.user.kmc_number})` : ''} - ${duty.shift_type} Shift` : 
    `${duty.shift_type} Shift`;

  return (
    <div className="relative group" onClick={(e) => e.stopPropagation()} data-duty-id={duty.id}>
      {/* Tooltip */}
      <div className={cn(
        "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg z-50",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap",
        "before:content-[''] before:absolute before:top-full before:left-1/2 before:transform before:-translate-x-1/2",
        "before:border-4 before:border-transparent before:border-t-gray-900"
      )}>
        {tooltipContent}
      </div>

      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }} 
        onClick={(e) => {
          e.stopPropagation(); 
          onClick();
        }}
        className={cn(
          "rounded-lg border-2 transition-all cursor-pointer relative overflow-hidden",
          cardColors.bgColor,
          cardColors.borderColor,
          isCurrentUser && "ring-1 ring-blue-400 shadow-sm",
          !isCurrentUser && "hover:shadow-sm",
          compact ? "p-1.5" : "p-2"
        )}
      >
        {/* Current user indicator */ }
        {isCurrentUser && (
          <>
            <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600" />
          </>
        )}

        <div className="flex items-center justify-between"> 
          <div className="flex-1 min-w-0">
            {/* Shift Type */}
            <div className="flex items-center gap-1 mb-0.5">
              <div className={cn(
                "w-2 h-2 rounded-full",
                isCurrentUser ? "bg-blue-500" : shiftConfig.color
              )} />
              <span className={cn( 
                "font-semibold truncate",
                "text-xs",
                cardColors.textColor
              )}>
                {duty.shift_type}
              </span>
              {isCurrentUser && (
                <span className="text-[10px] bg-blue-200 text-blue-800 px-1 py-0.5 rounded-full font-medium">
                  YOU
                </span>
              )}
            </div>
            
            {/* Doctor Information */ }
            {showDoctorInfo && duty.user && (
              <div className="space-y-0.5">
                <div className={cn(
                  "flex items-center text-[10px]",
                  cardColors.accentColor
                )}>
                  <User size={8} className="mr-0.5 flex-shrink-0" />
                  <span className={cn( 
                    "truncate font-medium",
                    isCurrentUser && "text-blue-700"
                  )}>
                    {duty.user.full_name}
                  </span>
                </div>
                
                {/* KMC Number */ }
                {duty.user.kmc_number && (
                  <div className={cn(
                    "flex items-center text-[10px]",
                    cardColors.accentColor
                  )}>
                    <CreditCard size={8} className="mr-0.5 flex-shrink-0" />
                    <span className={cn(
                      "font-mono", 
                      isCurrentUser && "text-blue-600"
                    )}>
                      {duty.user.kmc_number}
                    </span>
                    <Shield size={8} className={cn(
                      "ml-1",
                      isCurrentUser ? "text-blue-500" : "text-green-500"
                    )} />
                  </div>
                )}
                
                {/* Role */ }
                {!compact && duty.user.role && (
                  <div className={cn(
                    "text-[10px]",
                    cardColors.accentColor,
                    isCurrentUser && "text-blue-600"
                  )}>
                    {duty.user.role}
                  </div>
                )}
              </div>
            )}
            
            {/* Time */ }
            <div className={cn(
              "flex items-center text-[10px] mt-1",
              cardColors.accentColor
            )}>
              <Clock size={8} className="mr-0.5 flex-shrink-0" />
              <span className={isCurrentUser ? "text-blue-600 font-medium" : ""}>
                {duty.start_time} - {duty.end_time}
              </span>
            </div>
          </div>
          
          {/* Department (if not compact) */}
          {!compact && ( 
            <div className={cn(
              "text-[10px] text-right max-w-[80px] truncate",
              cardColors.accentColor,
              isCurrentUser && "text-blue-600 font-medium"
            )}>
              {duty.department.replace('MD ', '').replace('DM ', '').replace('MCh ', '')}
            </div>
          )}
        </div>
        
        {/* Delete button for current user's duties */}
        {isCurrentUser && onDelete && ( 
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (onDelete) onDelete(duty);
            }}
            className={cn(
              "absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-bl-md flex items-center justify-center",
              "opacity-0 group-hover:opacity-100 transition-opacity", 
              "hover:bg-red-600"
            )}
            aria-label={`Delete ${duty.shift_type} duty on ${duty.shift_date}`}
          >
            <Trash2 size={10} />
          </button>
        )}
        
        {/* Status badge */}
        {duty.status !== 'Scheduled' && ( 
          <div className={cn(
            "absolute bottom-1 right-1 px-1 py-0.5 rounded text-[10px] font-medium",
            duty.status === 'Completed' && "bg-green-100 text-green-700",
            duty.status === 'Swapped' && "bg-yellow-100 text-yellow-700",
            isCurrentUser && "ring-1 ring-blue-300"
          )}>
            {duty.status}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default memo(DutyCard);
export { DutyCard };