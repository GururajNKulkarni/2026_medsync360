import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Plus, 
  Filter,
  Download, 
  ChevronLeft, 
  ChevronRight,
  Grid3X3,
  List,
  RefreshCw,
  Clock,
  Users,
  Search, 
  CalendarDays,
  User,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  AlertCircle,
  CheckCircle,
  Bug,
  Database,
  Trash2
} from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { useResponsive } from '../../../hooks/useResponsive';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card'; 
import { ResponsiveModal } from '../../ui/ResponsiveModal'; 
import { RosterCalendar } from './RosterCalendar';
import { ScheduleDutyForm } from './ScheduleDutyForm';
import { SwapDutyModal } from './SwapDutyModal';
import { RosterFilters } from './RosterFilters'; 
import { ExportRoster } from './ExportRoster';
import { DutyRosterDiagnostics } from './DutyRosterDiagnostics';
import { supabase } from '../../../lib/supabase'; 
import { cn } from '../../../lib/utils';
import { format, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { useDuties, useCreateDuty, useSwapDuty, useDeleteDuty, createTestDuty } from '../../../hooks/useDuties';
import toast from 'react-hot-toast'; 
import { useRef, useEffect } from 'react';
import type { Duty, DutySwapRequest, ShiftType, DutyStatus } from '../../../types/duty.types';

// Shortened department list for better UI performance
const DEPARTMENTS = [
  'MD General Medicine',
  'MD General Surgery',
  'MD Pediatrics',
  'MD Obstetrics & Gynecology',
  'MD Orthopedics',
  'MD Psychiatry',
  'MD Dermatology',
  'MD Radiology',
  'MD Anesthesiology',
  'MD Ophthalmology',
  'MD ENT',
  'DM Cardiology',
  'DM Neurology',
  'DM Nephrology',
  'DM Oncology'
];

const SHIFT_CONFIGS = {
  'Day': { 
    start: '08:00', 
    end: '16:00', 
    color: 'bg-green-500',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200'
  },
  'Afternoon': { 
    start: '16:00', 
    end: '00:00', 
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  },
  'Afternoon': { 
    start: '16:00', 
    end: '00:00', 
    color: 'bg-orange-500',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200'
  }
};

const DutyRosterManagement = () => {
  const { profile } = useAuthStore();
  const { isMobile } = useResponsive();
  
  // Get user's department from profile - ensure it's never empty
  const userDepartment = useMemo(() => {
    if (!profile?.department) {
      return '';
    }
    return profile.department;
  }, [profile?.department]);
  
  // State management
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedDuty, setSelectedDuty] = useState<Duty | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [dutyToDelete, setDutyToDelete] = useState<Duty | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [personalViewOnly, setPersonalViewOnly] = useState(false);
  const [creatingTestData, setCreatingTestData] = useState(false);
  const [debugMode, setDebugMode] = useState(false); 
  
  // Memory monitoring
  const memoryMonitorRef = useRef<{
    initialMemory: number | null;
    intervalId: number | null;
    snapshots: Array<{timestamp: number; usage: number}>;
  }>({
    initialMemory: null,
    intervalId: null,
    snapshots: []
  });
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  // FIXED: Properly constructed duty query parameters
  const dutyParams = useMemo(() => {
    const params = {
      currentDate,
      viewMode,
      // FIXED: Pass user ID string when personal view is enabled, undefined otherwise
      personalViewOnly: personalViewOnly ? profile?.id : undefined
    };
    
    console.log('🔧 Creating duty params:', {
      currentDate: format(currentDate, 'yyyy-MM-dd'),
      viewMode,
      personalViewOnly: personalViewOnly ? 'USER: ' + profile?.id : 'ALL USERS',
      profileExists: !!profile?.id
    });
    
    return params;
  }, [currentDate, viewMode, personalViewOnly, profile?.id]);

  // Set up memory monitoring
  useEffect(() => {
    // Only monitor memory in debug mode
    if (!debugMode) return;
    
    // Check if performance.memory is available (Chrome only)
    if (typeof window !== 'undefined' && (performance as any).memory) {
      // Get initial memory usage
      const initialMemory = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
      memoryMonitorRef.current.initialMemory = initialMemory;
      
      console.log('🧠 Initial memory usage:', initialMemory.toFixed(2), 'MB');
      
      // Set up interval to monitor memory usage
      const intervalId = window.setInterval(() => {
        const currentMemory = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
        
        // Add to snapshots (keep only last 20)
        memoryMonitorRef.current.snapshots.push({
          timestamp: Date.now(),
          usage: currentMemory
        });
        
        if (memoryMonitorRef.current.snapshots.length > 20) {
          memoryMonitorRef.current.snapshots.shift();
        }
        
        // Log if memory usage increases significantly
        if (memoryMonitorRef.current.initialMemory && 
            currentMemory > memoryMonitorRef.current.initialMemory * 1.5) {
          console.warn('⚠️ Memory usage increased by 50%:', currentMemory.toFixed(2), 'MB');
        }
      }, 5000);
      
      memoryMonitorRef.current.intervalId = intervalId;
      
      return () => {
        if (memoryMonitorRef.current.intervalId) window.clearInterval(memoryMonitorRef.current.intervalId);
      };
    }
  }, [debugMode]);

  // React Query hooks with detailed logging
  const { 
    data: duties = [], 
    isLoading, 
    error, 
    refetch,
    isError 
  } = useDuties(dutyParams);
  
  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      // Log memory usage on unmount if available
      if (typeof window !== 'undefined' && (performance as any).memory && memoryMonitorRef.current.initialMemory) {
        const finalMemory = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
        const initialMemory = memoryMonitorRef.current.initialMemory;
        
        console.log('🧹 DutyRosterManagement unmounting, memory stats:', {
          initial: initialMemory.toFixed(2) + ' MB',
          final: finalMemory.toFixed(2) + ' MB',
          difference: (finalMemory - initialMemory).toFixed(2) + ' MB'
        });
      }
      
      // Clear any references that might cause memory leaks
      memoryMonitorRef.current.snapshots = [];
    };
  }, []);
  
  const createDutyMutation = useCreateDuty();
  const swapDutyMutation = useSwapDuty(); 
  const deleteDutyMutation = useDeleteDuty();

  // Debug logging for duties
  console.log('📊 DutyRosterManagement state:', {
    dutiesReceived: duties.length,
    isLoading, 
    error: error?.message,
    personalViewOnly,
    profileId: profile?.id,
    searchQuery: searchQuery || 'none',
    selectedDepartments: selectedDepartments.length
  });

  // FIXED: Filtered duties with comprehensive filtering
  const filteredDuties = useMemo(() => { 
    if (!duties || duties.length === 0) {
      console.log('📋 No duties to filter (empty array)');
      return [];
    }

    let filtered = [...duties]; // Create a copy to avoid mutation

    // Apply search query filter - optimized for memory efficiency
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const beforeCount = filtered.length;
      
      filtered = filtered.filter(duty => {
        const doctorName = duty.user?.full_name?.toLowerCase() || '';
        const kmcNumber = duty.user?.kmc_number?.toLowerCase() || '';
        const department = duty.department?.toLowerCase() || '';
        const shiftType = duty.shift_type?.toLowerCase() || '';
        
        return doctorName.includes(query) ||
                       kmcNumber.includes(query) ||
                       department.includes(query) ||
                       shiftType.includes(query);
        
        return matches;
      });
      
      console.log(`🔍 Search filter: ${beforeCount} → ${filtered.length} (query: "${query}")`); 
    }

    // Apply department filter
    if (selectedDepartments.length > 0) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(duty => selectedDepartments.includes(duty.department));
      console.log(`🏥 Department filter: ${beforeCount} → ${filtered.length} (${selectedDepartments.length} depts selected)`);
    }

    console.log('✅ Final filtered duties:', { 
      original: duties.length,
      filtered: filtered.length,
      searchActive: !!searchQuery.trim(),
      deptFilterActive: selectedDepartments.length > 0,
      personalViewActive: personalViewOnly
    });

    return filtered;
  }, [duties, searchQuery, selectedDepartments]);

  // TEST: Direct database connection test
  const testDatabaseConnection = useCallback(async () => {
    try {
      console.log('🧪 Testing direct database connection...');
      
      const { data, error } = await supabase
        .from('duty_roster')
        .select(` 
          *,
          user:users(id, full_name, kmc_number, department)
        `)
        .limit(5);
      
      if (error) {
        console.error('❌ Direct DB test failed:', error);
        toast.error(`Database error: ${error.message}`); 
      } else {
        console.log('✅ Direct DB test success:', data);
        toast.success(`✅ Database working! Found ${data?.length || 0} duties`);
      }
    } catch (err) {
      console.error('❌ Direct DB test exception:', err);
      toast.error('❌ Database connection failed');
    } 
  }, []);

  // FIXED: Create test data function
  const createTestData = useCallback(async () => {
    if (creatingTestData || !profile?.id) {
      if (!profile?.id) {
        toast.error('Please log in first');
        return;
      } 
      return;
    }
    
    setCreatingTestData(true);
    try {
      console.log('🧪 Creating test duty for user:', profile.id);
      
      await createTestDuty(profile.id); 
      toast.success('✅ Test duty created!');
      
      // Refresh the data
      await refetch();
      
    } catch (error) {
      console.error('❌ Error creating test data:', error);
      toast.error('❌ Failed to create test data');
    } finally { 
      setCreatingTestData(false);
    }
  }, [creatingTestData, profile?.id, refetch]);

  // FIXED: Navigation handlers
  const navigatePrevious = useCallback(() => {
    if (viewMode === 'weekly') {
      setCurrentDate(prev => subWeeks(prev, 1)); 
    } else {
      setCurrentDate(prev => subMonths(prev, 1));
    }
  }, [viewMode]);

  const navigateNext = useCallback(() => {
    if (viewMode === 'weekly') {
      setCurrentDate(prev => addWeeks(prev, 1)); 
    } else {
      setCurrentDate(prev => addMonths(prev, 1));
    }
  }, [viewMode]);

  const navigateToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []); 

  // FIXED: Handle duty creation
  const handleDutyCreated = useCallback((newDuty: Omit<Duty, 'id' | 'created_at' | 'updated_at' | 'user'>) => {
    if (!profile?.id) {
      toast.error('User not authenticated');
      return;
    }
    
    if (!userDepartment) {
      toast.error('Department not set in your profile');
      return;
    }

    // Check if user already has a duty on the selected date
    (async () => {
      try {
        const { data, error } = await supabase
          .from('duty_roster')
          .select('id')
          .eq('user_id', profile.id)
          .eq('shift_date', newDuty.shift_date)
          .limit(1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          toast.error('You already have a duty on the same day');
          return;
        }
        
        // No duplicate found, proceed with creating the duty
        const dutyData = {
          user_id: profile.id,
          department: newDuty.department,
          shift_date: newDuty.shift_date, 
          shift_type: newDuty.shift_type,
          start_time: newDuty.start_time,
          end_time: newDuty.end_time,
          status: 'Scheduled' as const
        };
        
        console.log('📝 Creating new duty:', dutyData);
        
        createDutyMutation.mutate(dutyData, {
          onSuccess: () => {
            setShowScheduleModal(false);
            console.log('✅ Duty created successfully');
          },
          onError: (error) => {
            console.error('❌ Failed to create duty:', error);
          }
        });
      } catch (error) {
        console.error('Error checking for duplicate duties:', error);
        toast.error('Failed to check for existing duties');
      }
    })();
  }, [profile?.id, createDutyMutation]);

  // FIXED: Handle duty swap
  const handleDutySwap = useCallback((swapRequest: DutySwapRequest) => {
    console.log('🔄 Processing duty swap:', swapRequest);
    
    swapDutyMutation.mutate(swapRequest, {
      onSuccess: () => {
        setShowSwapModal(false); 
        setSelectedDuty(null);
        console.log('✅ Duty swap completed');
      },
      onError: (error) => {
        console.error('❌ Duty swap failed:', error);
      }
    });
  }, [swapDutyMutation]); 

  // FIXED: Handle duty click
  const handleDutyClick = useCallback((duty: Duty) => {
    console.log('👆 Duty clicked:', duty.id, duty.user?.full_name);
    setSelectedDuty(duty);
    setShowSwapModal(true);
  }, []);
  
  // ADDED: Handle duty delete
  const handleDutyDelete = useCallback((duty: Duty) => {
    console.log('🗑️ Delete duty clicked:', duty.id, duty.user?.full_name);
    setDutyToDelete(duty);
    setShowDeleteConfirmModal(true);
  }, []);

  // ADDED: Confirm duty deletion 
  const confirmDeleteDuty = useCallback(() => {
    if (!dutyToDelete) return;
    
    console.log('🗑️ Confirming duty deletion:', dutyToDelete.id);
    
    deleteDutyMutation.mutate(dutyToDelete.id, {
      onSuccess: () => {
        setShowDeleteConfirmModal(false);
        setDutyToDelete(null);
      },
      onError: (error) => {
        console.error('❌ Duty deletion failed:', error);
      }
    });
  }, [dutyToDelete, deleteDutyMutation]); 

  // Show error state with detailed information
  if (isError) {
    return (
      <div className="p-6">
        <Card padding="lg" className="border-red-200 bg-red-50">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" /> 
            <h3 className="text-lg font-semibold text-red-800">Duty Roster Error</h3>
          </div>
          <p className="text-red-700 mb-4">
            {error instanceof Error ? error.message : 'Failed to load duty roster data'}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" /> 
              Retry
            </Button>
            <Button onClick={testDatabaseConnection} variant="outline" size="sm">
              <Database className="w-4 h-4 mr-2" />
              Test Database
            </Button> 
          </div>
        </Card>
      </div>
    );
  }

  // Memory leak detection - show warning if memory usage is growing rapidly
  const memoryWarning = useMemo(() => {
    if (memoryMonitorRef.current.snapshots.length >= 5) {
      const first = memoryMonitorRef.current.snapshots[0];
      const last = memoryMonitorRef.current.snapshots[memoryMonitorRef.current.snapshots.length - 1];
      const growthRate = (last.usage - first.usage) / ((last.timestamp - first.timestamp) / 1000);
      
      if (growthRate > 1) { // More than 1MB/s growth
        return `Memory leak detected: ${growthRate.toFixed(2)} MB/s growth rate`;
      }
    }
    return null;
  }, [memoryMonitorRef.current.snapshots]);

  return (
    <div className="space-y-6">
      {/* Header with enhanced status information */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Duty Roster Management</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <p className="text-gray-600"> 
              Manage and view duty schedules for medical staff
            </p>
            {isLoading && (
              <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center">
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Loading...
              </span>
            )} 
            {filteredDuties.length > 0 && (
              <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded">
                {filteredDuties.length} duties found
              </span>
            )}
            {duties.length > 0 && filteredDuties.length === 0 && (
              <span className="text-sm bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                {duties.length} duties hidden by filters
              </span>
            )}
            {memoryWarning && (
              <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded flex items-center">
                <AlertCircle className="w-3 h-3 mr-1" />
                {memoryWarning}
              </span>
            )}
            
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Schedule Duty Button */}
          <Button
            onClick={() => setShowScheduleModal(true)}
            disabled={!profile?.id}
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Schedule Duty
          </Button>
          
          {/* Export Button */}
          <ExportRoster duties={filteredDuties} isLoading={isLoading} />
        </div>
      </div>

      {/* Enhanced Controls */ }
      <Card padding="sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Button onClick={navigatePrevious} variant="outline" size="sm">
              <ChevronLeft className="w-4 h-4" />
            </Button>
             
            <div className="text-center min-w-[200px]">
              <h2 className="font-semibold text-gray-900 text-sm">
                {viewMode === 'weekly' 
                  ? format(currentDate, 'MMM d, yyyy')
                  : format(currentDate, 'MMMM yyyy')
                }
              </h2>
              <p className="text-sm text-gray-500">
                {viewMode === 'weekly' ? 'Week View' : 'Month View'}
              </p>
            </div>
             
            <Button onClick={navigateNext} variant="outline" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
            
            <Button onClick={navigateToday} variant="outline" size="sm">
              Today
            </Button>
          </div> 

          {/* View Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" 
                placeholder="Search duties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-48"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
          </div>
           
            {/* Personal View Toggle */}
            <Button
              onClick={() => setPersonalViewOnly(!personalViewOnly)}
              variant={personalViewOnly ? "primary" : "outline"}
              size="sm"
            >
              {personalViewOnly ? <User className="w-4 h-4 mr-2" /> : <Users className="w-4 h-4 mr-2" />}
              {personalViewOnly ? 'My Duties' : 'All Duties'} 
            </Button>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <Button
                onClick={() => setViewMode('weekly')}
                variant={viewMode === 'weekly' ? "primary" : "ghost"}
                size="sm" 
                className="rounded-none"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Week
              </Button>
              <Button
                onClick={() => setViewMode('monthly')}
                variant={viewMode === 'monthly' ? "primary" : "ghost"}
                size="sm" 
                className="rounded-none border-l border-gray-300"
              >
                <Grid3X3 className="w-4 h-4 mr-2" />
                Month
              </Button>
            </div>
            {/* Filters */}
            <Button
              onClick={() => setShowFiltersModal(true)}
              variant="outline" 
              size="sm"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {selectedDepartments.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                  {selectedDepartments.length}
                </span>
              )}
            </Button>
            {/* Refresh */}
            <Button
              onClick={() => refetch()}
              disabled={isLoading} 
              variant="outline"
              size="sm"
            >
            )} 
            </Button>
        </div>
      </Card>

      {/* Loading State */ }
      {isLoading && (
        <Card padding="lg">
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mr-3" />
            <span className="text-gray-600">Loading duty roster...</span>
          </div>
        </Card>
      )}

      {/* No Data State with Clear Actions */ }
      {!isLoading && duties.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-6">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Duties Found</h3>
            <p className="text-gray-600 mb-4">
              No duties have been scheduled in the database yet.
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={createTestData} disabled={creatingTestData}> 
                <Plus className="w-4 h-4 mr-1" />
                Create Test Data
              </Button>
              <Button onClick={testDatabaseConnection} variant="outline">
                <Database className="w-4 h-4 mr-1" />
                Test Database
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Filtered Out State */ }
      {!isLoading && duties.length > 0 && filteredDuties.length === 0 && (
        <Card padding="lg">
          <div className="text-center py-6">
            <Filter className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Duties Filtered Out</h3>
            <p className="text-gray-600 mb-4">
              Found {duties.length} duties in database, but your current filters hide them all.
            </p>
            <div className="flex justify-center gap-2">
              {searchQuery && ( 
                <Button onClick={() => setSearchQuery('')} variant="outline">
                  Clear Search
                </Button>
              )}
              {selectedDepartments.length > 0 && (
                <Button onClick={() => setSelectedDepartments([])} variant="outline">
                  Clear Department Filter
                </Button>
              )}
              {personalViewOnly && (
                <Button onClick={() => setPersonalViewOnly(false)} variant="outline">
                  Show All Duties
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Calendar Display */ }
      {!isLoading && filteredDuties.length > 0 && (
        <RosterCalendar
          duties={filteredDuties}
          viewMode={viewMode}
          currentDate={currentDate}
          currentUserId={profile?.id}
          loading={isLoading}
          onDutyClick={handleDutyClick}
          onDutyDelete={handleDutyDelete}
          shiftConfigs={SHIFT_CONFIGS}
          showAllDoctors={!personalViewOnly}
        />
      )} 

      {/* Admin Tools (Collapsed by Default) */ }
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button 
          onClick={() => setDebugMode(!debugMode)}
          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center">
            <Bug className="w-4 h-4 text-gray-600 mr-2" />
            <span className="font-medium text-gray-700">Admin Tools</span> 
          </div>
          <ChevronRight className={`w-4 h-4 text-gray-600 transition-transform ${debugMode ? 'rotate-90' : ''}`} />
        </button>
        
        <AnimatePresence>
          {debugMode && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-gray-200 p-3 bg-gray-50 flex flex-wrap gap-2"
            >
              <Button onClick={testDatabaseConnection} variant="outline" size="sm"> 
                <Database className="w-4 h-4 mr-1" /> Test Database
              </Button>
              <Button onClick={createTestData} variant="outline" size="sm" disabled={creatingTestData || !profile?.id}>
                {creatingTestData ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />} Create Test Data
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Debug Panel */ }
      <AnimatePresence>
        {debugMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <DutyRosterDiagnostics
              duties={duties}
              filteredDuties={filteredDuties}
              isLoading={isLoading}
              personalViewOnly={personalViewOnly}
              searchQuery={searchQuery}
              currentDate={currentDate}
              viewMode={viewMode}
            /> 
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <ResponsiveModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)} 
        title="Schedule New Duty"
      >
        <ScheduleDutyForm
          onSubmit={handleDutyCreated} 
          onCancel={() => setShowScheduleModal(false)}
          departments={DEPARTMENTS}
          userDepartment={userDepartment}
          shiftConfigs={SHIFT_CONFIGS}
          currentDate={currentDate} 
          isLoading={createDutyMutation.isLoading}
        />
      </ResponsiveModal>

      {/* Delete Confirmation Modal */}
      <ResponsiveModal
        isOpen={showDeleteConfirmModal}
        onClose={() => { 
          setShowDeleteConfirmModal(false);
          setDutyToDelete(null);
        }}
        title="Confirm Duty Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg"> 
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800 mb-1">Are you sure you want to delete this duty?</h3>
                {dutyToDelete && (
                  <div className="text-sm text-red-700">
                    <p><strong>Date:</strong> {format(new Date(dutyToDelete.shift_date), 'EEEE, MMMM d, yyyy')}</p>
                    <p><strong>Shift:</strong> {dutyToDelete.shift_type} ({dutyToDelete.start_time} - {dutyToDelete.end_time})</p> 
                    <p><strong>Department:</strong> {dutyToDelete.department}</p>
                  </div>
                )}
                <p className="text-sm text-red-700 mt-2">This action cannot be undone.</p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button
              variant="outline" 
              onClick={() => {
                setShowDeleteConfirmModal(false);
                setDutyToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="danger"
              onClick={confirmDeleteDuty}
              disabled={deleteDutyMutation.isPending}
              loading={deleteDutyMutation.isPending}
            >
              <Trash2 size={16} className="mr-2" />
              Delete Duty
            </Button>
          </div>
        </div>
      </ResponsiveModal>

      <ResponsiveModal
        isOpen={showSwapModal}
        onClose={() => { 
          setShowSwapModal(false);
          setSelectedDuty(null);
        }}
        title="Swap Duty Assignment"
        size="lg"
      >
        {selectedDuty && (
          <SwapDutyModal 
            duty={selectedDuty}
            onSwap={handleDutySwap}
            onCancel={() => {
              setShowSwapModal(false);
              setSelectedDuty(null);
            }}
            isLoading={swapDutyMutation.isLoading}
          />
        )}
      </ResponsiveModal>

      <ResponsiveModal
        isOpen={showFiltersModal}
        onClose={() => setShowFiltersModal(false)} 
        title="Filter Duties"
        size="md"
      >
        <RosterFilters
          departments={DEPARTMENTS}
          selectedDepartments={selectedDepartments}
          onDepartmentChange={setSelectedDepartments}
          onClose={() => setShowFiltersModal(false)}
        />
      </ResponsiveModal>
    </div>
  );
}; 

export default React.memo(DutyRosterManagement);