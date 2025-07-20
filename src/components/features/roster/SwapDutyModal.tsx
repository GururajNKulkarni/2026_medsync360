import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeftRight, 
  UserPlus, 
  Search, 
  User, 
  Calendar, 
  Clock, 
  Building2,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { ResponsiveModal } from '../../ui/ResponsiveModal';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { supabase } from '../../../lib/supabase';
import { cn } from '../../../lib/utils';
import { useAuthStore } from '../../../store/authStore';
import { format } from 'date-fns';
import type { Duty, DutySwapRequest } from '../../../types/duty.types';

interface SwapDutyModalProps {
  duty: Duty | null;
  onSwap: (swapRequest: DutySwapRequest) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface User {
  id: string;
  full_name: string;
  role: string;
  department: string;
}

type SwapStep = 'type' | 'doctor' | 'duty' | 'confirm';

export const SwapDutyModal: React.FC<SwapDutyModalProps> = ({
  duty,
  onSwap,
  onCancel,
  isLoading = false
}) => {
  const { profile } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<SwapStep>('type');
  const [swapType, setSwapType] = useState<'direct' | 'assignment'>('direct');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedDuty, setSelectedDuty] = useState<Duty | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [userDuties, setUserDuties] = useState<Duty[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset state when component mounts
  useEffect(() => {
    setCurrentStep('type');
    setSwapType('direct');
    setSelectedUser(null);
    setSelectedDuty(null);
    setSearchQuery('');
    setSelectedDepartment('');
  }, []);

  // Load users when needed
  const loadUsers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('users')
        .select('id, full_name, role, department')
        .neq('id', duty?.user_id)
        .eq('is_active', true);

      if (selectedDepartment) {
        query = query.eq('department', selectedDepartment);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load duties for selected user
  const loadUserDuties = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('duty_roster')
        .select(`
          *,
          user:users(id, full_name, role, department)
        `)
        .eq('user_id', userId)
        .eq('status', 'Scheduled')
        .gte('shift_date', format(new Date(), 'yyyy-MM-dd'))
        .order('shift_date', { ascending: true });

      if (error) throw error;
      setUserDuties(data || []);
    } catch (error) {
      console.error('Error loading user duties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStep === 'doctor') {
      loadUsers();
    }
  }, [currentStep, selectedDepartment]);

  useEffect(() => {
    if (selectedUser && swapType === 'direct') {
      loadUserDuties(selectedUser.id);
    }
  }, [selectedUser, swapType]);

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNext = () => {
    switch (currentStep) {
      case 'type':
        setCurrentStep('doctor');
        break;
      case 'doctor':
        if (swapType === 'direct') {
          setCurrentStep('duty');
        } else {
          setCurrentStep('confirm');
        }
        break;
      case 'duty':
        setCurrentStep('confirm');
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'doctor':
        setCurrentStep('type');
        break;
      case 'duty':
        setCurrentStep('doctor');
        break;
      case 'confirm':
        if (swapType === 'direct') {
          setCurrentStep('duty');
        } else {
          setCurrentStep('doctor');
        }
        break;
    }
  };

  const handleConfirm = () => {
    if (!duty || !selectedUser) return;

    const swapRequest: DutySwapRequest = {
      originalDutyId: duty.id,
      targetUserId: selectedUser.id,
      swapType,
      ...(swapType === 'direct' && selectedDuty && { targetDutyId: selectedDuty.id })
    };

    onSwap(swapRequest);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'type':
        return true;
      case 'doctor':
        return !!selectedUser;
      case 'duty':
        return !!selectedDuty;
      case 'confirm':
        return true;
      default:
        return false;
    }
  };

  if (!duty) return null;
  
  return (
    <div className="space-y-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {['Type', 'Doctor', swapType === 'direct' ? 'Duty' : null, 'Confirm'].filter(Boolean).map((step, index, array) => (
            <React.Fragment key={step}>
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium",
                index <= array.findIndex(s => s === currentStep.charAt(0).toUpperCase() + currentStep.slice(1))
                  ? "bg-primary-600 text-white"
                  : "bg-neutral-200 text-neutral-600"
              )}>
                {index + 1}
              </div>
              {index < array.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2",
                  index < array.findIndex(s => s === currentStep.charAt(0).toUpperCase() + currentStep.slice(1))
                    ? "bg-primary-600"
                    : "bg-neutral-200"
                )} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Current Duty Info */}
        <Card padding="md" className="bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">Your Current Duty</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-600">Date:</span>
              <p className="font-medium text-blue-900">
                {format(new Date(duty.shift_date), 'EEEE, MMM d, yyyy')}
              </p>
            </div>
            <div>
              <span className="text-blue-600">Shift:</span>
              <p className="font-medium text-blue-900">{duty.shift_type}</p>
            </div>
            <div>
              <span className="text-blue-600">Time:</span>
              <p className="font-medium text-blue-900">{duty.start_time} - {duty.end_time}</p>
            </div>
            <div>
              <span className="text-blue-600">Department:</span>
              <p className="font-medium text-blue-900">{duty.department}</p>
            </div>
          </div>
        </Card>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === 'type' && (
            <motion.div
              key="type"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-neutral-900">Choose Swap Type</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <motion.button
                  onClick={() => setSwapType('direct')}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all",
                    swapType === 'direct'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 hover:border-neutral-300'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center mb-2">
                    <ArrowLeftRight className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Direct Swap</span>
                  </div>
                  <p className="text-sm opacity-75">
                    Exchange your duty with another doctor's duty on a different date
                  </p>
                </motion.button>

                <motion.button
                  onClick={() => setSwapType('assignment')}
                  className={cn(
                    "p-4 rounded-lg border-2 text-left transition-all",
                    swapType === 'assignment'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-neutral-200 hover:border-neutral-300'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center mb-2">
                    <UserPlus className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Simple Assignment</span>
                  </div>
                  <p className="text-sm opacity-75">
                    Assign your duty to another available doctor
                  </p>
                </motion.button>
              </div>
            </motion.div>
          )}

          {currentStep === 'doctor' && (
            <motion.div
              key="doctor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-neutral-900">Select Doctor</h3>
              
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <input
                    type="text"
                    placeholder="Search doctors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">All Departments</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Doctor List */}
              <div className="max-h-64 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    No doctors found
                  </div>
                ) : (
                  filteredUsers.map(user => (
                    <motion.button
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        selectedUser?.id === user.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      )}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-neutral-900">{user.full_name}</p>
                          <p className="text-sm text-neutral-600">{user.role} • {user.department}</p>
                        </div>
                        {selectedUser?.id === user.id && (
                          <ChevronRight className="w-5 h-5 text-primary-600" />
                        )}
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 'duty' && swapType === 'direct' && (
            <motion.div
              key="duty"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-neutral-900">
                Select {selectedUser?.full_name}'s Duty
              </h3>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  </div>
                ) : userDuties.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    No upcoming duties found for this doctor
                  </div>
                ) : (
                  userDuties.map(userDuty => (
                    <motion.button
                      key={userDuty.id}
                      onClick={() => setSelectedDuty(userDuty)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        selectedDuty?.id === userDuty.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300'
                      )}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium text-neutral-900">
                            {format(new Date(userDuty.shift_date), 'EEE, MMM d')}
                          </p>
                          <p className="text-sm text-neutral-600">{userDuty.shift_type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-neutral-600">
                            {userDuty.start_time} - {userDuty.end_time}
                          </p>
                          <p className="text-sm text-neutral-600">{userDuty.department}</p>
                        </div>
                      </div>
                    </motion.button>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 'confirm' && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <h3 className="text-lg font-semibold text-neutral-900">Confirm Swap</h3>
              
              <div className="space-y-4">
                <Card padding="md" className="bg-green-50 border-green-200">
                  <h4 className="font-medium text-green-900 mb-2">
                    {swapType === 'direct' ? 'Duty Exchange' : 'Duty Assignment'}
                  </h4>
                  
                  {swapType === 'direct' ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-green-600">You will take:</p>
                        <p className="font-medium text-green-900">
                          {selectedDuty && format(new Date(selectedDuty.shift_date), 'EEEE, MMM d')} - {selectedDuty?.shift_type}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-green-600">{selectedUser?.full_name} will take:</p>
                        <p className="font-medium text-green-900">
                          {format(new Date(duty.shift_date), 'EEEE, MMM d')} - {duty.shift_type}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-green-600">{selectedUser?.full_name} will take your duty:</p>
                      <p className="font-medium text-green-900">
                        {format(new Date(duty.shift_date), 'EEEE, MMM d')} - {duty.shift_type}
                      </p>
                    </div>
                  )}
                </Card>

                <div className="flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    <p className="font-medium">Important:</p>
                    <p>This action cannot be undone. Please ensure both parties have agreed to this swap.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <Button
            variant="outline"
            onClick={currentStep === 'type' ? onCancel : handleBack}
            className="flex-1 sm:flex-none"
          >
            {currentStep === 'type' ? 'Cancel' : 'Back'}
          </Button>
          
          {currentStep === 'confirm' ? (
            <Button
              onClick={handleConfirm}
              disabled={!canProceed() || isLoading}
              loading={isLoading}
              className="flex-1"
            >
              Confirm Swap
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || loading}
              loading={loading}
              className="flex-1"
            >
              Next
            </Button>
          )}
        </div>
      </div>
  );
};