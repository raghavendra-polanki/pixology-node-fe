import { useState, useEffect } from 'react';
import { BarChart3, AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

interface UsageStats {
  adaptorId: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCost: number;
  lastUsed: string;
  period: 'day' | 'week' | 'month' | 'all';
}

interface UsageTrackerPanelProps {
  projectId: string;
  onClose?: () => void;
}

export function UsageTrackerPanel({ projectId, onClose }: UsageTrackerPanelProps) {
  const [stats, setStats] = useState<UsageStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'all'>('month');

  useEffect(() => {
    loadUsageStats();
  }, [projectId, period]);

  const loadUsageStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/usage/stats?projectId=${projectId}&period=${period}`
      );

      if (!response.ok) {
        throw new Error('Failed to load usage statistics');
      }

      const data = await response.json();
      setStats(data.stats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load usage statistics');
      console.error('Error loading usage stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalCost = stats.reduce((sum, s) => sum + s.totalCost, 0);
  const totalRequests = stats.reduce((sum, s) => sum + s.totalRequests, 0);
  const totalTokens = stats.reduce((sum, s) => sum + s.inputTokens + s.outputTokens, 0);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2">Loading usage statistics...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Usage & Cost Tracking
            </h3>
            <p className="text-sm text-gray-600">Monitor API usage and costs across all adaptors</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          )}
        </div>

        {/* Period Selector */}
        <div className="flex gap-2">
          {(['day', 'week', 'month', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button
            onClick={loadUsageStats}
            className="ml-auto p-2 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Total Requests</p>
            <p className="text-2xl font-bold text-blue-900">{totalRequests.toLocaleString()}</p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <p className="text-sm text-gray-600 mb-1">Total Tokens</p>
            <p className="text-2xl font-bold text-green-900">{(totalTokens / 1000).toFixed(1)}K</p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
            <p className="text-sm text-gray-600 mb-1">Total Cost</p>
            <p className="text-2xl font-bold text-amber-900">${totalCost.toFixed(2)}</p>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <p className="text-sm text-gray-600 mb-1">Avg Cost/Request</p>
            <p className="text-2xl font-bold text-purple-900">
              ${(totalCost / Math.max(totalRequests, 1)).toFixed(4)}
            </p>
          </Card>
        </div>

        {/* Adaptor Details */}
        {stats.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Breakdown by Adaptor</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">Adaptor</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Requests</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Input Tokens</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Output Tokens</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Cost</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">Success Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((stat) => (
                    <tr key={`${stat.adaptorId}-${stat.modelId}`} className="border-b border-gray-100">
                      <td className="py-3 px-3">
                        <div>
                          <p className="font-medium capitalize">{stat.adaptorId}</p>
                          <p className="text-xs text-gray-500">{stat.modelId}</p>
                        </div>
                      </td>
                      <td className="text-right py-3 px-3">{stat.totalRequests.toLocaleString()}</td>
                      <td className="text-right py-3 px-3">{(stat.inputTokens / 1000).toFixed(1)}K</td>
                      <td className="text-right py-3 px-3">{(stat.outputTokens / 1000).toFixed(1)}K</td>
                      <td className="text-right py-3 px-3 font-semibold">${stat.totalCost.toFixed(2)}</td>
                      <td className="text-right py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          stat.successfulRequests === stat.totalRequests
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          <TrendingUp className="w-3 h-3" />
                          {((stat.successfulRequests / stat.totalRequests) * 100).toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No usage data available for the selected period</p>
          </div>
        )}

        {/* Last Used */}
        {stats.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              Last used: {new Date(stats[0].lastUsed).toLocaleDateString()} at{' '}
              {new Date(stats[0].lastUsed).toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

export default UsageTrackerPanel;
