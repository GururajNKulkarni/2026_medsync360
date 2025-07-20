import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bug, 
  Database, 
  Calendar,
  User, 
  Filter, 
  Eye, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../lib/supabase';
import { testDirectDbConnection } from '../../../hooks/useDuties';
import { useAuthStore } from '../../../store/authStore';
import { format } from 'date-fns';

interface DiagnosticsProps {
  duties: any[];
  filteredDuties: any[];
  isLoading: boolean;
  personalViewOnly: boolean;
  searchQuery: string;
  currentDate: Date;
  viewMode: string;
}

export const DutyRosterDiagnostics: React.FC<DiagnosticsProps> = ({
  duties,
  filteredDuties,
  isLoading,
  isLoading,
  personalViewOnly,
  searchQuery,
  currentDate,
  viewMode
}) => {
  const { profile } = useAuthStore();
  const [dbStats, setDbStats] = useState<any>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [queryTimes, setQueryTimes] = useState<{start: number, end: number, duration: number}[]>([]);

  const runDatabaseDiagnostics = async () => {
    setTestingConnection(true);
    const startTime = performance.now();
    try {
      // Test basic connection
      console.time('connection_test');
      const { data: connectionTest, error: connectionError } = await supabase
        .from('duty_roster')
        .select('count')
        .limit(1);
      console.timeEnd('connection_test');

      // Get total count
      console.time('count_query');
      const { count: totalCount } = await supabase
        .from('duty_roster')
        .select('*', { count: 'exact', head: true });
      console.timeEnd('count_query');

      // Get user count
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get duties with user info
      console.time('duties_with_users_query');
      const { data: dutiesWithUsers, error: dutiesError } = await supabase
        .from('duty_roster')
        .select(`
          *,
          user:users(id, full_name, kmc_number, department)
        `)
        .limit(10);
      console.timeEnd('duties_with_users_query');

      // Get current user's duties
      const { data: currentUserDuties } = await supabase
        .from('duty_roster')
        .select('*')
        .eq('user_id', profile?.id || '')
        .limit(5);

      // Test direct connection with performance tracking
      console.time('direct_connection_test');
      const directTestResult = await testDirectDbConnection();
      console.timeEnd('direct_connection_test');

      const endTime = performance.now();
      
      setDbStats({
        connectionWorking: !connectionError,
        totalDuties: totalCount || 0,
        totalUsers: userCount || 0,
        dutiesWithUsers: dutiesWithUsers?.length || 0,
        currentUserDuties: currentUserDuties?.length || 0,
        sampleDuties: dutiesWithUsers?.slice(0, 3) || [],
        directTestResult: directTestResult?.length || 0,
        queryTime: (endTime - startTime).toFixed(2),
        errors: {
          connection: connectionError?.message,
          duties: dutiesError?.message
        } 
      });
    } catch (error) {
      console.error('Diagnostics error:', error);
      setDbStats({
        connectionWorking: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      setQueryTimes(prev => [...prev, { start: startTime, end: performance.now(), duration: performance.now() - startTime }]);
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    runDatabaseDiagnostics();
    
    // Track query performance
    const trackQueryPerformance = () => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        setQueryTimes(prev => [...prev.slice(-4), { start: startTime, end: endTime, duration: endTime - startTime }]);
      };
    };
    
    const cleanup = trackQueryPerformance();
    return cleanup;
  }, []);

  const getStatusIcon = (condition: boolean) => {
    return condition ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getStatusColor = (condition: boolean) => {
    return condition ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card padding="lg" className="bg-gray-50 border-2 border-blue-200 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Duty Roster Diagnostics</h3>
        </div>
        <Button
          onClick={runDatabaseDiagnostics}
          disabled={testingConnection}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${testingConnection ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Database Status */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <Database className="w-4 h-4 mr-2" />
            Database Status
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Connection:</span>
              <div className="flex items-center gap-1">
                {getStatusIcon(dbStats?.connectionWorking)}
                <span className={getStatusColor(dbStats?.connectionWorking)}>
                  {dbStats?.connectionWorking ? 'Working' : 'Failed'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Duties:</span>
              <span className="font-mono">{dbStats?.totalDuties || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Users:</span>
              <span className="font-mono">{dbStats?.totalUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Duties with Users:</span>
              <span className="font-mono">{dbStats?.dutiesWithUsers || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Query Time:</span>
              <span className="font-mono">{dbStats?.queryTime || 0}ms</span>
            </div>
          </div>
        </div>

        {/* Data Flow */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Data Flow
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Raw Duties:</span>
              <span className="font-mono">{duties.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Filtered Duties:</span>
              <span className="font-mono">{filteredDuties.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Loading:</span>
              <div className="flex items-center gap-1">
                {getStatusIcon(!isLoading)}
                <span className={getStatusColor(!isLoading)}>
                  {isLoading ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>View Mode:</span>
              <span className="font-mono">{viewMode}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Loading State:</span>
              <span className={isLoading ? "text-yellow-600 font-medium" : "text-green-600 font-medium"}>{isLoading ? "Loading..." : "Idle"}</span>
            </div>
          </div>
        </div>

        {/* User & Filters */}
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-800 flex items-center">
            <User className="w-4 h-4 mr-2" />
            User & Filters
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Current User:</span>
              <span className="font-mono text-xs">{profile?.full_name || 'None'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Personal View:</span>
              <div className="flex items-center gap-1">
                {getStatusIcon(personalViewOnly)}
                <span>{personalViewOnly ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Search Query:</span>
              <span className="font-mono text-xs">"{searchQuery || 'None'}"</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="mt-6">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <Clock className="w-4 h-4 mr-2 text-blue-600" />
          Query Performance:
        </h4>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700">Recent Query Times</span>
            <span className="text-xs text-gray-500">Last {queryTimes.length} queries</span>
          </div>
          <div className="h-20 flex items-end justify-between gap-1">
            {queryTimes.map((query, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className={`w-full ${query.duration > 1000 ? 'bg-red-500' : query.duration > 500 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                  style={{ height: `${Math.min(100, query.duration / 20)}%` }}>
                </div>
                <span className="text-xs mt-1">{Math.round(query.duration)}ms</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sample Data */}
      {dbStats?.sampleDuties && dbStats.sampleDuties.length > 0 && (
        <div className="mt-6">
          <h4 className="font-semibold text-gray-800 mb-3">Sample Duties from Database:</h4>
          <div className="bg-white rounded-lg p-4 space-y-2">
            {dbStats.sampleDuties.map((duty: any, index: number) => (
              <div key={index} className="text-sm font-mono bg-gray-50 p-2 rounded">
                <span className="text-blue-600">{duty.user?.full_name || 'No User'}</span> 
                {duty.user?.kmc_number && (
                  <span className="text-green-600"> ({duty.user.kmc_number})</span>
                )}
                <span className="text-gray-600"> - {duty.shift_date} - {duty.shift_type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issues Detection */}
      <div className="mt-6">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
          <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" /> 
          Potential Issues:
        </h4>
        <div className="space-y-2">
          {duties.length === 0 && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <XCircle className="w-4 h-4" />
              No duties found in database
            </div>
          )}
          {duties.length > 0 && filteredDuties.length === 0 && (
            <div className="flex items-center gap-2 text-yellow-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Duties exist but all filtered out
            </div>
          )}
          {!profile?.id && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <XCircle className="w-4 h-4" />
              No current user ID found
            </div>
          )}
          {queryTimes.length > 0 && queryTimes[queryTimes.length - 1].duration > 1000 && (
            <div className="flex items-center gap-2 text-yellow-600 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Slow query performance: {Math.round(queryTimes[queryTimes.length - 1].duration)}ms
            </div>
          )}
          {dbStats && !dbStats.connectionWorking && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <XCircle className="w-4 h-4" />
              Database connection failed
            </div>
          )}
        </div>
      </div>

      {/* Errors */}
      {dbStats?.errors && (dbStats.errors.connection || dbStats.errors.duties) && ( 
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-semibold text-red-800 mb-2">Errors:</h4>
          {dbStats.errors.connection && (
            <p className="text-sm text-red-600">Connection: {dbStats.errors.connection}</p>
          )}
          {dbStats.errors.duties && (
            <p className="text-sm text-red-600">Duties: {dbStats.errors.duties}</p>
          )}
        </div>
      )}
    </Card>
  );
};
