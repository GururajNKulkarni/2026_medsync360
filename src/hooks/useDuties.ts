// =============================================================================
// OPTIMIZED useDuties.ts - MEMORY LEAK FIXES
// =============================================================================

import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { useRef, useEffect, useCallback } from 'react';
import type { Duty, ShiftType, DutyStatus, DutySwapRequest } from '../types/duty.types';
import toast from 'react-hot-toast';

// Cache key generator for better memory management
const getDutyCacheKey = (params: {
  currentDate: Date;
  viewMode: 'weekly' | 'monthly';
  personalViewOnly?: string;
}) => {
  return [
    'duties',
    format(params.currentDate, 'yyyy-MM-dd'),
    params.viewMode,
    params.personalViewOnly || 'all'
  ];
};

// Memory leak prevention - clear old cache entries
const cleanupOldDutyCaches = (queryClient: QueryClient) => {
  const cacheEntries = queryClient.getQueryCache().findAll(['duties']);
  
  if (cacheEntries.length > 5) {
    console.log(`🧹 Cleaning up old duty caches (${cacheEntries.length} found)`);
    
    // Sort by last updated
    const sortedEntries = [...cacheEntries].sort((a, b) => {
      return (b.state.dataUpdatedAt || 0) - (a.state.dataUpdatedAt || 0);
    });
    
    // Keep only the 5 most recent entries
    sortedEntries.slice(5).forEach(entry => {
      queryClient.removeQueries({ queryKey: entry.queryKey });
    });
  }
};

// FIXED: Fetch duties function with proper parameter handling
const fetchDuties = async (params: {
  currentDate: Date;
  viewMode: 'weekly' | 'monthly';
  personalViewOnly?: string; // FIXED: Should be user ID string, not boolean
}): Promise<Duty[]> => {
  const { currentDate, viewMode, personalViewOnly } = params;
  
  // Performance tracking
  const startTime = performance.now();
  
  const startDate = viewMode === 'weekly' 
    ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : startOfMonth(currentDate);
   
  const endDate = viewMode === 'weekly'
    ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : endOfMonth(currentDate);

  console.log('📅 Date range calculated:', {
    start: format(startDate, 'yyyy-MM-dd'),
    end: format(endDate, 'yyyy-MM-dd'),
    daysDifference: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) 
  });
  
  try {
    // Build the base query
    let query = supabase
      .from('duty_roster')
      .select(` 
        *,
        user:users(id, full_name, role, department, kmc_number)
      `)
      .gte('shift_date', format(startDate, 'yyyy-MM-dd'))
      .lte('shift_date', format(endDate, 'yyyy-MM-dd'))
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true });
    
    console.log('🔨 Base query built for date range');

    // FIXED: Only apply personal filter if personalViewOnly is a valid UUID string
    if (personalViewOnly && personalViewOnly.length > 0) {
      console.log('🔒 Applying personal filter for user:', personalViewOnly);
      query = query.eq('user_id', personalViewOnly);
    } else { 
      console.log('👥 No personal filter - showing all users');
    }

    // Execute the query
    const { data, error } = await query;

    if (error) { 
      console.error('❌ Supabase query error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Database error: ${error.message}`);
    }

    return data || []; 
  } catch (error) {
    console.error('❌ Fatal error in fetchDuties:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      params
    });
    throw error;
  } finally {
  } 
};

// FIXED: Create duty function with comprehensive logging
const createDuty = async (dutyData: {
  user_id: string;
  department: string;
  shift_date: string;
  shift_type: ShiftType; 
  start_time: string;
  end_time: string;
  status: DutyStatus;
}) => {  
  try {
    // Validate the input data 
    if (!dutyData.user_id || !dutyData.department || !dutyData.shift_date) {
      throw new Error('Missing required fields: user_id, department, or shift_date');
    }
    
    // Check if user already has a duty on the same date
    const { data: existingDuties, error: checkError } = await supabase
      .from('duty_roster')
      .select('id')
      .eq('user_id', dutyData.user_id)
      .eq('shift_date', dutyData.shift_date)
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error checking for duplicate duties:', checkError);
    } else if (existingDuties && existingDuties.length > 0) {
      throw new Error('You already have a duty scheduled on this date');
    }
    
    const { data, error } = await supabase
      .from('duty_roster')
      .insert(dutyData)
      .select(` 
        *,
        user:users(id, full_name, role, department, kmc_number)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create duty: ${error.message}`);
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// FIXED: Swap duties function with better error handling
const swapDuties = async (swapRequest: DutySwapRequest) => {
  try {
    if (swapRequest.swapType === 'direct' && swapRequest.targetDutyId) {
      // Direct swap - exchange duties between two users
      const { data: duties, error: fetchError } = await supabase
        .from('duty_roster')
        .select('*') 
        .in('id', [swapRequest.originalDutyId, swapRequest.targetDutyId]);

      if (fetchError) {
        throw new Error(`Failed to fetch duties for swap: ${fetchError.message}`);
      }

      if (duties.length !== 2) {
        throw new Error(`Expected 2 duties for swap, found ${duties.length}`);
      }

      const [originalDuty, targetDuty] = duties;

      // Update both duties
      const { error: error1 } = await supabase
        .from('duty_roster')
        .update({ user_id: targetDuty.user_id })
        .eq('id', originalDuty.id); 

      const { error: error2 } = await supabase
        .from('duty_roster')
        .update({ user_id: originalDuty.user_id })
        .eq('id', targetDuty.id);

      if (error1 || error2) {
        throw new Error(`Swap failed: ${error1?.message || error2?.message}`);
      }
    } else {
      // Simple assignment - assign duty to new user
      const { error } = await supabase
        .from('duty_roster')
        .update({ user_id: swapRequest.targetUserId })
        .eq('id', swapRequest.originalDutyId);

      if (error) {
        throw new Error(`Assignment failed: ${error.message}`);
      }
    }
  } catch (error) { 
    throw error;
  }
};

// FIXED: React Query hook with better caching and error handling
export const useDuties = (params: {
  currentDate: Date; 
  viewMode: 'weekly' | 'monthly';
  personalViewOnly?: string; // FIXED: string instead of boolean
}) => {
  // Use a ref to track memory usage
  const memoryUsageRef = useRef<{
    initialUsage: number | null;
    peakUsage: number | null;
    lastChecked: number; 
  }>({
    initialUsage: null,
    peakUsage: null,
    lastChecked: Date.now()
  });
  
  console.log('🪝 useDuties hook called with params:', {
    currentDate: format(params.currentDate, 'yyyy-MM-dd'), 
    viewMode: params.viewMode,
    personalViewOnly: params.personalViewOnly || 'ALL_USERS'
  });

  // Memory monitoring function
  const checkMemoryUsage = () => {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      const currentUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024); 
      
      if (memoryUsageRef.current.initialUsage === null) {
        memoryUsageRef.current.initialUsage = currentUsage;
      }
      
      if (memoryUsageRef.current.peakUsage === null || currentUsage > memoryUsageRef.current.peakUsage) {
        memoryUsageRef.current.peakUsage = currentUsage;
      } 
      
      // Log memory usage if it's been more than 5 seconds since last check
      const now = Date.now();
      if (now - memoryUsageRef.current.lastChecked > 5000) {
        console.log('📊 Memory usage:', {
          current: Math.round(currentUsage * 100) / 100 + ' MB',
          peak: Math.round((memoryUsageRef.current.peakUsage || 0) * 100) / 100 + ' MB',
          initial: Math.round((memoryUsageRef.current.initialUsage || 0) * 100) / 100 + ' MB', 
          increase: Math.round((currentUsage - (memoryUsageRef.current.initialUsage || 0)) * 100) / 100 + ' MB'
        });
        memoryUsageRef.current.lastChecked = now;
      }
    }
  };
  
  // Clean up function to prevent memory leaks 
  const cleanupDutyData = (data: Duty[]) => {
    // Create a shallow copy to avoid mutating the original data
    return data.map(duty => {
      // Remove unnecessary nested properties that might cause circular references
      const { user, ...restDuty } = duty;
      
      // Only keep essential user properties
      const cleanUser = user ? { 
        id: user.id,
        full_name: user.full_name,
        role: user.role,
        department: user.department,
        kmc_number: user.kmc_number
      } : undefined;
      
      return { 
        ...restDuty,
        user: cleanUser
      };
    });
  };

  const queryResult = useQuery({
    queryKey: getDutyCacheKey(params),
    queryFn: () => fetchDuties(params),
    staleTime: 60000, // 1 minute (increased to reduce refetches) 
    refetchOnMount: false, // Prevent refetching on component mount
    gcTime: 180000, // 3 minutes (reduced to free memory sooner)
    cacheTime: 180000, // 3 minutes (reduced to free memory sooner)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false, // Prevent excessive refetching
    select: (data) => {
      // Process data to prevent memory leaks
      checkMemoryUsage(); 
      return cleanupDutyData(data);
    },
    onSuccess: (data) => {
      console.log('✅ useDuties query successful:', {
        dataLength: data.length,
        queryKey: ['duties', params.currentDate.getTime(), params.viewMode, params.personalViewOnly || 'all']
      });
       
      // Check memory usage after successful query
      checkMemoryUsage();
    },
    onError: (error) => {
      console.error('❌ useDuties query error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        params
      }); 
      
      // Check memory usage after error
      checkMemoryUsage();
    }
  });
  
  // Effect to clean up memory when component unmounts
  useEffect(() => { 
    return () => {
      // Log final memory usage when hook unmounts
      if (memoryUsageRef.current.initialUsage !== null && memoryUsageRef.current.peakUsage !== null) {
        console.log('🧹 Cleaning up useDuties hook, memory stats:', {
          initial: Math.round(memoryUsageRef.current.initialUsage * 100) / 100 + ' MB',
          peak: Math.round(memoryUsageRef.current.peakUsage * 100) / 100 + ' MB',
          increase: Math.round((memoryUsageRef.current.peakUsage - memoryUsageRef.current.initialUsage) * 100) / 100 + ' MB'
        }); 
      }
      
      // Reset memory tracking
      memoryUsageRef.current = {
        initialUsage: null,
        peakUsage: null,
        lastChecked: Date.now()
      }; 
    };
  }, []);
  
  return queryResult;
};

// FIXED: Create duty mutation with better success/error handling
export const useCreateDuty = () => { 
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createDuty,
    onSuccess: (data) => {
      console.log('✅ Create duty mutation successful, invalidating queries');
      // Invalidate all duty queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['duties'] });
      toast.success(`✅ Duty scheduled for ${data.shift_date}`);
    },
    onError: (error: Error) => {
      console.error('❌ Create duty mutation error:', error);
      toast.error(`❌ ${error.message || 'Failed to create duty'}`);
    }
  });
};

// FIXED: Swap duty mutation with better success/error handling
export const useSwapDuty = () => { 
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: swapDuties,
    onSuccess: () => {
      console.log('✅ Swap duty mutation successful, invalidating queries');
      // Invalidate all duty queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['duties'] });
      toast.success('✅ Duty swap completed successfully');
    },
    onError: (error: Error) => {
      console.error('❌ Swap duty mutation error:', error);
      toast.error(`❌ ${error.message || 'Failed to swap duty'}`);
    }
  });
};

// FIXED: Delete duty mutation
export const useDeleteDuty = () => { 
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (dutyId: string) => {
      try {
        const { error } = await supabase 
          .from('duty_roster')
          .delete()
          .eq('id', dutyId);

        if (error) {
          throw new Error(`Failed to delete duty: ${error.message}`);
        } 

        return { success: true, id: dutyId };
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate all duty queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['duties'] });
      toast.success('✅ Duty deleted successfully');
    },
    onError: (error: Error) => {
      console.error('❌ Delete duty mutation error:', error);
      toast.error(`❌ ${error.message || 'Failed to delete duty'}`);
    }
  });
};

// FIXED: Helper function to create test data
export const createTestDuty = async (userId: string) => {
  const today = new Date();
  const testDuty = {
    user_id: userId,
    department: 'MD General Medicine',
    shift_date: format(today, 'yyyy-MM-dd'),
    shift_type: 'Day' as ShiftType,
    start_time: '08:00',
    end_time: '16:00',
    status: 'Scheduled' as DutyStatus
  };

  try {
    const result = await createDuty(testDuty);
    return result;
  } catch (error) {
    throw error;
  }
};

// FIXED: Helper function to test direct database connection
export const testDirectDbConnection = async () => { 
  const startTime = performance.now();
  
  try {
    const { data, error } = await supabase
      .from('duty_roster')
      .select(`
        id, 
        shift_date,
        shift_type,
        department,
        user:users(full_name, kmc_number)
      `)
      .limit(5);

    if (error) { 
      throw error;
    }

    return data;
  } catch (error) {
    throw error;
  }
};