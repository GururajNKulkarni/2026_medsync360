import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, Building2, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/Button';
import { useAuthStore } from '../../../store/authStore';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { format, addDays } from 'date-fns';
import type { Duty, ShiftType } from '../../../types/duty.types';
import toast from 'react-hot-toast';

interface ScheduleDutyFormProps {
  departments: string[];
  userDepartment: string;
  currentDate: Date;
  shiftConfigs: Record<ShiftType, any>;
  onSubmit: (duty: Omit<Duty, 'id' | 'created_at' | 'updated_at' | 'user'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormData {
  shift_date: string;
  shift_type: ShiftType | '';
  department: string;
}

export const ScheduleDutyForm: React.FC<ScheduleDutyFormProps> = ({
  departments,
  userDepartment,
  currentDate,
  onSubmit,
  onCancel,
  shiftConfigs,
  isLoading = false
}) => {
  const { profile } = useAuthStore();
  const [formData, setFormData] = useState<FormData>({
    shift_date: format(addDays(currentDate, 1), 'yyyy-MM-dd'),
    shift_type: '',
    department: userDepartment || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.shift_date) {
      newErrors.shift_date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.shift_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.shift_date = 'Cannot schedule duties in the past';
      }
    }

    if (!formData.shift_type) {
      newErrors.shift_type = 'Shift type is required';
    }

    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Check if user already has a duty on the selected date
  const checkDuplicateDuty = async (userId: string, date: string): Promise<boolean> => {
    setCheckingDuplicates(true);
    try {
      const { data, error } = await supabase
        .from('duty_roster')
        .select('id')
        .eq('user_id', userId)
        .eq('shift_date', date)
        .limit(1);
      
      if (error) throw error;
      
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking for duplicate duties:', error);
      return false;
    } finally {
      setCheckingDuplicates(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile?.id) {
      toast.error('User not authenticated');
      return;
    }
    
    if (!profile?.id) {
      toast.error('User not authenticated');
      return;
    }
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Check for duplicate duty on the same day
      const hasDuplicateDuty = await checkDuplicateDuty(profile.id, formData.shift_date);
      
      if (hasDuplicateDuty) {
        toast.error('You already have a duty on the same day');
        setIsSubmitting(false);
        return;
      }
      
      const shiftConfig = shiftConfigs[formData.shift_type as ShiftType];
      
      const dutyData = {
        department: formData.department,
        shift_date: formData.shift_date,
        shift_type: formData.shift_type as ShiftType,
        start_time: shiftConfig.start,
        end_time: shiftConfig.end,
        status: 'Scheduled' as const
      };

      await onSubmit(dutyData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const shiftTypes: ShiftType[] = ['Day', 'Afternoon', 'Night'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date Selection */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Duty Date <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="date"
            value={formData.shift_date}
            onChange={(e) => setFormData(prev => ({ ...prev, shift_date: e.target.value }))}
            min={format(new Date(), 'yyyy-MM-dd')}
            className={cn(
              "w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors",
              errors.shift_date ? 'border-red-300' : 'border-neutral-300'
            )}
          />
        </div>
        {errors.shift_date && (
          <p className="text-xs text-red-600 mt-1 flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            {errors.shift_date}
          </p>
        )}
      </div>

      {/* Shift Type Selection */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-3">
          Shift Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {shiftTypes.map((shiftType) => {
            const config = shiftConfigs[shiftType];
            const isSelected = formData.shift_type === shiftType;
            
            return (
              <motion.button
                key={shiftType}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, shift_type: shiftType }))}
                className={cn(
                  "p-4 rounded-lg border-2 transition-all text-left",
                  isSelected 
                    ? `${config.bgColor} ${config.borderColor} ${config.textColor}` 
                    : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300'
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center mb-2">
                  <div className={cn(
                    "w-3 h-3 rounded-full mr-3",
                    isSelected ? config.color : 'bg-neutral-200'
                  )} />
                  <span className="font-semibold">{shiftType}</span>
                </div>
                <div className="flex items-center text-sm opacity-75">
                  <Clock size={14} className="mr-1" />
                  <span>{config.start} - {config.end}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
        {errors.shift_type && (
          <p className="text-xs text-red-600 mt-1 flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            {errors.shift_type}
          </p>
        )}
      </div>

      {/* Department (Read-only) */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Department <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <select
            value={formData.department}
            onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
            disabled={!!userDepartment}
            className={cn(
              "w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors appearance-none",
              errors.department ? 'border-red-300' : 'border-neutral-300',
              userDepartment ? 'bg-gray-50 text-gray-700 cursor-not-allowed' : ''
            )}
          >
            <option value="">Select Department</option>
            {userDepartment ? (
              <option value={userDepartment}>{userDepartment}</option>
            ) : (
              departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))
            )}
          </select>
        </div>
        {errors.department && (
          <p className="text-xs text-red-600 mt-1 flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            {errors.department}
          </p>
        )}
        <p className="text-xs text-neutral-500 mt-1">
          You can only schedule duties for your own department
        </p>
      </div>

      {/* Summary */}
      {formData.shift_type && formData.shift_date && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-primary-50 rounded-lg border border-primary-200"
        >
          <h4 className="font-medium text-primary-900 mb-2">Duty Summary</h4>
          <div className="space-y-1 text-sm text-primary-700">
            <p><strong>Date:</strong> {format(new Date(formData.shift_date), 'EEEE, MMMM d, yyyy')}</p>
            <p><strong>Shift:</strong> {formData.shift_type}</p>
            <p><strong>Time:</strong> {shiftConfigs[formData.shift_type as ShiftType]?.start} - {shiftConfigs[formData.shift_type as ShiftType]?.end}</p>
            <p><strong>Department:</strong> {formData.department}</p>
          </div>
        </motion.div>
      )}

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 sm:flex-none"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          loading={isSubmitting}
          className="flex-1"
          title={checkingDuplicates ? "Checking for existing duties..." : ""}
        >
          Schedule Duty
        </Button>
      </div>
    </form>
  );
};