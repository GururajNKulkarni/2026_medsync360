import React from 'react';
import { AlertTriangle, CheckCircle, Clock, DollarSign, Database, Zap } from 'lucide-react';
import { getOpenAIUsage, testOpenAIConnection, clearOpenAICache } from '../../../lib/openai';
import { Button } from '../../ui/Button';
import toast from 'react-hot-toast';

interface OpenAIUsageMonitorProps {
  className?: string;
}

const OpenAIUsageMonitor: React.FC<OpenAIUsageMonitorProps> = ({ className }) => {
  const [usage, setUsage] = React.useState(getOpenAIUsage());
  const [testing, setTesting] = React.useState(false);
  const [lastTest, setLastTest] = React.useState<{
    success: boolean;
    message: string;
    timestamp: number;
  } | null>(null);

  // Update usage stats every 30 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setUsage(getOpenAIUsage());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleTestConnection = async () => {
    if (testing) return;
    
    setTesting(true);
    try {
      const result = await testOpenAIConnection();
      setLastTest({
        ...result,
        timestamp: Date.now()
      });
      
      if (result.success) {
        toast.success('OpenAI connection test successful');
      } else {
        toast.error(`Connection test failed: ${result.message}`);
      }
    } catch (error: any) {
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setTesting(false);
      // Refresh usage after test
      setUsage(getOpenAIUsage());
    }
  };

  const handleClearCache = () => {
    const success = clearOpenAICache();
    if (success) {
      toast.success('OpenAI cache cleared');
      setUsage(getOpenAIUsage());
    } else {
      toast.error('Failed to clear cache');
    }
  };

  const getUsageColor = (current: number, limit: number) => {
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(cost);
  };

  if (!usage.available) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-medium">OpenAI Not Available</span>
        </div>
        <p className="text-sm text-yellow-700 mt-1">
          API key not configured. Research Insight will use mock data.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-600" />
            OpenAI Usage Monitor
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
            >
              Clear Cache
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Connection Status */}
        {lastTest && (
          <div className="flex items-center gap-2 text-sm">
            {lastTest.success ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span className={lastTest.success ? 'text-green-700' : 'text-red-700'}>
              {lastTest.message}
            </span>
            <span className="text-gray-500">
              ({new Date(lastTest.timestamp).toLocaleTimeString()})
            </span>
          </div>
        )}

        {/* Usage Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Tokens */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {usage.totalTokens.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Tokens Used</div>
            <div className={`text-xs ${getUsageColor(usage.totalTokens, 100000)}`}>
              {usage.remainingTokens.toLocaleString()} remaining
            </div>
          </div>

          {/* Requests */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {usage.totalRequests}
            </div>
            <div className="text-xs text-gray-500">Requests Made</div>
            <div className={`text-xs ${getUsageColor(usage.totalRequests, 1000)}`}>
              {usage.remainingRequests} remaining
            </div>
          </div>

          {/* Cost */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {formatCost(usage.totalCost)}
            </div>
            <div className="text-xs text-gray-500">Estimated Cost</div>
            <div className="text-xs text-gray-500">Today</div>
          </div>

          {/* Cache */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {usage.cacheSize}
            </div>
            <div className="text-xs text-gray-500">Cache Entries</div>
            <div className="text-xs text-green-600">
              Saves tokens
            </div>
          </div>
        </div>

        {/* Usage Bars */}
        <div className="space-y-3">
          {/* Token Usage Bar */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Daily Token Usage</span>
              <span>{((usage.totalTokens / 100000) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  usage.totalTokens / 100000 >= 0.9
                    ? 'bg-red-500'
                    : usage.totalTokens / 100000 >= 0.7
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((usage.totalTokens / 100000) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Request Usage Bar */}
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Daily Request Usage</span>
              <span>{((usage.totalRequests / 1000) * 100).toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  usage.totalRequests / 1000 >= 0.9
                    ? 'bg-red-500'
                    : usage.totalRequests / 1000 >= 0.7
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((usage.totalRequests / 1000) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Optimization Tips */}
        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="font-medium text-blue-900 text-sm mb-2">💡 Optimization Tips</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Cache is automatically used for consistent queries (temperature ≤ 0.3)</li>
            <li>• Lower token limits reduce costs - content is optimized for conciseness</li>
            <li>• Daily limits reset automatically every 24 hours</li>
            <li>• Clear cache if you need fresh content generation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OpenAIUsageMonitor;
