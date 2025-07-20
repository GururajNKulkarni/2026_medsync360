import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  AlertCircle, 
  Database, 
  Server, 
  Cpu, 
  BarChart, 
  RefreshCw,
  CheckCircle,
  XCircle, 
  Trash2,
  Zap
} from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { cn } from '../../../lib/utils';
import type { Duty } from '../../../types/duty.types';

interface PerformanceMetric {
  name: string; 
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  threshold: {
    warning: number;
    critical: number;
  };
}

// Memory usage history for tracking leaks
interface PerformanceMonitorProps {
  isActive: boolean;
  dutyCount: number; 
  filteredCount: number; 
  isLoading: boolean;
  onRefresh: () => void;
  error: Error | null;
}

const DutyRosterPerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  isActive, 
  dutyCount,
  filteredCount,
  isLoading,
  onRefresh,
  error
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [networkRequests, setNetworkRequests] = useState<{url: string, duration: number, status: number}[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false); 
  const [isCapturing, setIsCapturing] = useState(true);
  const startTimeRef = useRef<number>(performance.now());
  const renderTimeRef = useRef<number>(0);
  const memoryHistoryRef = useRef<Array<{time: number, usage: number}>>([]);
  const memorySnapshotsRef = useRef<Array<{time: number, usage: number}>>([]);
  const networkMonitorRef = useRef<any>(null);

  // Start monitoring when component mounts
  useEffect(() => {
    if (!isActive) return;
    
    startTimeRef.current = performance.now();
    renderTimeRef.current = 0; 
    
    // Monitor render time
    const rafId = requestAnimationFrame(() => {
      renderTimeRef.current = performance.now() - startTimeRef.current; 
      updateMetrics();
    });
    
    // Set up network monitoring 
    const originalFetch = window.fetch;
    const requests: {url: string, start: number, duration?: number, status?: number}[] = [];
    
    window.fetch = async function(input, init) {
      const url = typeof input === 'string' ? input : input.url;
      const start = performance.now();
      requests.push({ url, start });
      const requestIndex = requests.length - 1; 
      
      try {
        const response = await originalFetch(input, init);
        const duration = performance.now() - start;
        requests[requestIndex].duration = duration;
        requests[requestIndex].status = response.status;
        
        // Update network metrics 
        if (isCapturing) {
          setNetworkRequests(prev => [
            ...prev, 
            { 
              url: url.split('?')[0], // Remove query params for cleaner display
              duration, 
              status: response.status 
            }
          ].slice(-5)); // Keep only the last 5 requests
        }
        
        return response;
      } catch (error) {
        const duration = performance.now() - start;
        requests[requestIndex].duration = duration;
        requests[requestIndex].status = 0; // Error 
        
        if (isCapturing) {
          setNetworkRequests(prev => [
            ...prev, 
            { 
              url: url.split('?')[0],
              duration, 
              status: 0  
            }
          ].slice(-5));
        }
        
        throw error;
      }
    };
     
    // Store reference to restore later
    networkMonitorRef.current = { originalFetch, requests };
    
    // Initial metrics update
    updateMetrics();

    // Set up memory monitoring if available
    if (typeof window !== 'undefined' && (performance as any).memory) {
      const monitorMemory = () => {
        try {
          const currentUsage = (performance as any).memory.usedJSHeapSize / (1024 * 1024);
          memorySnapshotsRef.current.push({time: performance.now(), usage: currentUsage});
          // Keep only the last 20 snapshots
          if (memorySnapshotsRef.current.length > 20) {
            memorySnapshotsRef.current.shift();
          }
        } catch (e) {
          // Silently fail if memory API is not available
        }
      };
      const memoryInterval = setInterval(monitorMemory, 2000);
      return () => clearInterval(memoryInterval);
    }
    
    // Cleanup
    return () => { 
      cancelAnimationFrame(rafId);
      if (networkMonitorRef.current) {
        window.fetch = networkMonitorRef.current.originalFetch;
      }
    };
  }, [isActive]);
  
  // Update metrics periodically 
  useEffect(() => {
    if (!isActive || !isCapturing) return;
    
    const interval = setInterval(() => {
      updateMetrics();
    }, 2000);
    
    return () => clearInterval(interval);
  }, [isActive, isCapturing]);
  
  const updateMetrics = useCallback(() => {
    const now = performance.now();
    const totalLoadTime = now - startTimeRef.current;
    
    // Memory usage (estimate)
    let memoryUsage = 0;
    if ((performance as any).memory) {
      memoryUsage = ((performance as any).memory).usedJSHeapSize / (1024 * 1024);
    }
    
    // Calculate average network request time 
    let avgNetworkTime = 0;
    if (networkMonitorRef.current?.requests.length > 0) {
      const completedRequests = networkMonitorRef.current.requests.filter((r: any) => r.duration);
      if (completedRequests.length > 0) {
        avgNetworkTime = completedRequests.reduce((sum: number, r: any) => sum + r.duration, 0) / completedRequests.length;
      }
    }
    
    // Track memory usage over time for leak detection
    if ((performance as any).memory) {
      memoryHistoryRef.current.push({
        time: now,
        usage: memoryUsage
      });
      
      // Keep only the last 30 snapshots
      if (memoryHistoryRef.current.length > 30) {
        memoryHistoryRef.current.shift();
      }
    }
    let memoryGrowthRate = 0;
    if (memorySnapshotsRef.current.length >= 2) {
      const first = memorySnapshotsRef.current[0];
      const last = memorySnapshotsRef.current[memorySnapshotsRef.current.length - 1];
      memoryGrowthRate = (last.usage - first.usage) / ((last.time - first.time) / 1000); // MB/s
    }
    
    // Update metrics
    setMetrics([
      {
        name: 'Total Load Time',
        value: Math.round(totalLoadTime),
        unit: 'ms',
        status: totalLoadTime > 3000 ? 'critical' : totalLoadTime > 1000 ? 'warning' : 'good',
        threshold: { warning: 1000, critical: 3000 }
      }, 
      {
        name: 'Initial Render',
        value: Math.round(renderTimeRef.current),
        unit: 'ms',
        status: renderTimeRef.current > 500 ? 'critical' : renderTimeRef.current > 200 ? 'warning' : 'good',
        threshold: { warning: 200, critical: 500 }
      },
      { 
        name: 'Network Requests',
        value: Math.round(avgNetworkTime),
        unit: 'ms',
        status: avgNetworkTime > 1000 ? 'critical' : avgNetworkTime > 500 ? 'warning' : 'good',
        threshold: { warning: 500, critical: 1000 }
      },
      {
        name: 'Memory Usage',
        value: Math.round(memoryUsage * 10) / 10,
        unit: 'MB',
        status: memoryUsage > 100 ? 'critical' : memoryUsage > 50 ? 'warning' : 'good',
        threshold: { warning: 50, critical: 100 }
      },
      {
        name: 'Memory Growth',
        value: Math.round(memoryGrowthRate * 100) / 100,
        unit: 'MB/s',
        status: memoryUsage > 100 ? 'critical' : memoryUsage > 50 ? 'warning' : 'good',
        threshold: { warning: 50, critical: 100 }
      }
    ]); 
  }, []);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };
  
  const getStatusBg = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100';
      case 'warning': return 'bg-yellow-100';
      case 'critical': return 'bg-red-100';
      default: return 'bg-gray-100';
    } 
  };
  
  if (!isActive) return null;
  
  return (
    <Card padding="none" className="border-blue-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 border-b border-blue-200 flex items-center justify-between"> 
        <div className="flex items-center">
          <Zap className="w-5 h-5 text-blue-600 mr-2" />
          <h3 className="font-semibold text-blue-900">Performance Diagnostics</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"  
            onClick={() => setIsCapturing(!isCapturing)}
            className={cn(
              "border-blue-300",
              isCapturing ? "bg-blue-100 text-blue-700" : "text-blue-600"
            )}
          >
            {isCapturing ? (
              <> 
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                Monitoring
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 mr-1" />
                Paused
              </>
            )}
          </Button>
          <Button  
            variant="ghost" 
            size="sm" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-blue-600"
          >
            {isCollapsed ? 'Expand' : 'Collapse'}
          </Button>
        </div> 
      </div>
      
      {/* Content */}
      {!isCollapsed && (
        <div className="p-4">
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {metrics.map((metric) => ( 
              <div 
                key={metric.name} 
                className={cn(
                  "p-3 rounded-lg border",
                  getStatusBg(metric.status),
                  metric.status === 'critical' ? "border-red-200" : 
                  metric.status === 'warning' ? "border-yellow-200" : 
                  "border-green-200" 
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{metric.name}</span>
                  <span className={cn(
                    "text-sm font-bold",
                    getStatusColor(metric.status)
                  )}> 
                    {metric.value} {metric.unit}
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full",
                      metric.status === 'good' ? "bg-green-500" : 
                      metric.status === 'warning' ? "bg-yellow-500" :
                      "bg-red-500"
                    )}
                    style={{ 
                      width: `${Math.min(100, (metric.value / metric.threshold.critical) * 100)}%` 
                    }}
                  />
                </div> 
              </div>
            ))}
          </div>
          
          {/* Network Requests */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
              <Server className="w-4 h-4 mr-1 text-gray-500" />
              Recent Network Requests
            </h4>
            <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">URL</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 w-24">Duration</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 w-20">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {networkRequests.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-3 text-center text-gray-500">
                        No network requests captured yet
                      </td>
                    </tr>
                  ) : (
                    networkRequests.map((req, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-xs text-gray-700 truncate max-w-[200px]">
                          {req.url}
                        </td>
                        <td className={cn(
                          "px-3 py-2 text-xs text-right",
                          req.duration > 1000 ? "text-red-600 font-medium" :
                          req.duration > 500 ? "text-yellow-600" :
                          "text-green-600"
                        )}>
                          {req.duration.toFixed(0)} ms
                        </td>
                        <td className="px-3 py-2 text-center">
                          {req.status >= 200 && req.status < 300 ? (
                            <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Memory Usage Graph */}
          {memorySnapshotsRef.current.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center"> 
                <Database className="w-4 h-4 mr-2 text-blue-600" />
                Memory Usage Over Time
              </h4>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="h-40 flex items-end justify-between gap-1 relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-gray-500">
                    <span>100MB</span> 
                    <span>50MB</span>
                    <span>0MB</span>
                  </div>
                  
                  {/* Memory graph */}
                  <div className="ml-8 flex-1 flex items-end justify-between gap-1 h-full">
                    {memorySnapshotsRef.current.map((snapshot, i) => {
                      const height = `${Math.min(100, (snapshot.usage / 100) * 100)}%`; 
                      const memoryValue = snapshot.usage.toFixed(1);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <div 
                            className={`w-full ${snapshot.usage > 100 ? 'bg-red-500' : snapshot.usage > 50 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                            style={{ height }}
                            title={`${memoryValue} MB`}
                            aria-label={`Memory usage: ${memoryValue} MB`}
                          />
                        </div> 
                      );
                    })}
                  </div>
                </div>
                <div className="mt-2 text-xs text-center text-gray-500">
                  Memory samples over time (newest on right)
                </div>
              </div> 
            </div>
          )}
          
          {/* Data Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-indigo-700">Total Duties</span> 
                <span className="text-sm font-bold text-indigo-700">{dutyCount}</span>
              </div>
              <div className="text-xs text-indigo-600">
                {dutyCount > 100 ? 
                  "Large dataset may impact performance" : 
                  "Dataset size is optimal"}
              </div>
            </div> 
            
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-purple-700">Filtered Duties</span>
                <span className="text-sm font-bold text-purple-700">{filteredCount}</span>
              </div>
              <div className="text-xs text-purple-600">
                {dutyCount > 0 && filteredCount === 0 ?  
                  "All duties filtered out - check filters" : 
                  `${Math.round((filteredCount / Math.max(dutyCount, 1)) * 100)}% of total shown`}
              </div>
            </div>
            
            <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-teal-700">Render Efficiency</span> 
                <span className="text-sm font-bold text-teal-700">
                  {dutyCount > 0 ? Math.round(renderTimeRef.current / dutyCount) : 0} ms/duty
                </span>
              </div>
              <div className="text-xs text-teal-600">
                {dutyCount > 0 && (renderTimeRef.current / dutyCount) > 5 ? 
                  "Rendering performance could be improved" : 
                  "Rendering performance is good"}
              </div>
            </div> 
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                <div> 
                  <h3 className="font-medium text-red-800 mb-1">Error Detected</h3>
                  <p className="text-sm text-red-700 font-mono">{error.message}</p>
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="text-xs text-red-600 cursor-pointer">Stack Trace</summary>
                      <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-40">
                        {error.stack}
                      </pre> 
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Recommendations */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-semibold text-blue-700 mb-2 flex items-center">
              <Cpu className="w-4 h-4 mr-1" />
              Performance Recommendations
            </h4>
            <ul className="space-y-1 text-xs text-blue-700">
              {dutyCount > 100 && (
                <li className="flex items-start"> 
                  <span className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                    <AlertCircle className="w-3 h-3 text-yellow-600" />
                  </span>
                  Consider pagination or virtual scrolling for large datasets ({dutyCount} duties)
                </li>
              )}
              {metrics.some(m => m.name === 'Network Requests' && m.status === 'critical') && (
                <li className="flex items-start"> 
                  <span className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                    <AlertCircle className="w-3 h-3 text-red-600" />
                  </span>
                  Network requests are slow ({Math.round(metrics.find(m => m.name === 'Network Requests')?.value || 0)} ms) - check API performance
                </li>
              )}
              {metrics.some(m => m.name === 'Memory Usage' && m.status !== 'good') && (
                <li className="flex items-start"> 
                  <span className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                    <AlertCircle className="w-3 h-3 text-yellow-600" />
                  </span>
                  High memory usage ({metrics.find(m => m.name === 'Memory Usage')?.value} MB) - check for memory leaks
                </li>
              )}
              {metrics.some(m => m.name === 'Initial Render' && m.status !== 'good') && (
                <li className="flex items-start"> 
                  <span className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                    <AlertCircle className="w-3 h-3 text-yellow-600" />
                  </span>
                  Slow initial render ({metrics.find(m => m.name === 'Initial Render')?.value} ms) - optimize component rendering
                </li>
              )}
              {metrics.every(m => m.status === 'good') && (
                <li className="flex items-start"> 
                  <span className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  </span>
                  All performance metrics are within acceptable ranges
                </li>
              )}
              {memorySnapshotsRef.current.length >= 2 && (
                (() => {
                  const first = memorySnapshotsRef.current[0];
                  const last = memorySnapshotsRef.current[memorySnapshotsRef.current.length - 1];
                  const growthRate = (last.usage - first.usage) / ((last.time - first.time) / 1000);
                  
                  if (growthRate > 1) {
                    return (
                      <li className="flex items-start">
                        <span className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                          <AlertCircle className="w-3 h-3 text-red-600" />
                        </span>
                        Memory leak detected: {growthRate.toFixed(2)} MB/s growth rate
                      </li>
                    );
                  } else if (growthRate > 0.2) {
                    return (
                      <li className="flex items-start">
                        <span className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center mr-2 mt-0.5">
                          <AlertCircle className="w-3 h-3 text-yellow-600" />
                        </span>
                        Possible memory leak: {growthRate.toFixed(2)} MB/s growth rate
                      </li>
                    );
                  }
                  return null;
                })()
              )}
            </ul>
            
            {/* Memory leak detection */}
            {memoryHistoryRef.current.length >= 5 && (
              (() => {
                const first = memoryHistoryRef.current[0];
                const last = memoryHistoryRef.current[memoryHistoryRef.current.length - 1];
                const growthRate = (last.usage - first.usage) / ((last.time - first.time) / 1000);
                
                if (growthRate > 0.5) { // More than 0.5MB/s growth
                  return (
                    <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded-lg flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-red-600" />
                      <span className="text-red-700 font-medium">Memory leak detected: {growthRate.toFixed(2)} MB/s growth</span>
                    </div>
                  );
                }
                return null;
              })()
            )}
          </div>
        </div>
      )}
      
      {/* Footer */}
      <div className="bg-gray-50 p-2 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <span>Performance monitoring {isCapturing ? 'active' : 'paused'}</span>
        <Button  
          variant="ghost" 
          size="sm" 
          onClick={onRefresh}
          className="text-blue-600"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh Metrics
        </Button> 
      </div>
    </Card>
  );
};

export default React.memo(DutyRosterPerformanceMonitor);