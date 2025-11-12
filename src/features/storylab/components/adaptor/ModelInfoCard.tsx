import { Info, Zap, DollarSign } from 'lucide-react';
import { Card } from '../ui/card';

interface Pricing {
  inputTokenPrice: number;
  outputTokenPrice: number;
  currency: string;
  unit: string;
}

interface ModelInfo {
  modelId: string;
  adaptorId: string;
  displayName: string;
  description: string;
  inputTokenLimit?: number;
  maxOutputTokens?: number;
  costPerRequest?: number;
  pricing?: Pricing;
  supportedCapabilities: string[];
  contextWindow?: number;
  releaseDate?: string;
  estimatedCostPer1kTokens?: number;
}

interface ModelInfoCardProps {
  modelInfo: ModelInfo;
  estimatedTokens?: number;
  compact?: boolean;
}

export function ModelInfoCard({ modelInfo, estimatedTokens, compact = false }: ModelInfoCardProps) {
  const estimatedCost = estimatedTokens && modelInfo.estimatedCostPer1kTokens
    ? ((estimatedTokens / 1000) * modelInfo.estimatedCostPer1kTokens).toFixed(4)
    : null;

  if (compact) {
    return (
      <Card className="p-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm">{modelInfo.displayName}</p>
            <p className="text-xs text-gray-600">{modelInfo.adaptorId}</p>
          </div>
          {estimatedCost && (
            <div className="flex items-center gap-1 text-xs">
              <DollarSign className="w-3 h-3" />
              <span>${estimatedCost}</span>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
      <div className="space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{modelInfo.displayName}</h3>
              <p className="text-sm text-gray-600 capitalize">{modelInfo.adaptorId}</p>
            </div>
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />
          </div>
          <p className="text-sm text-gray-700">{modelInfo.description}</p>
        </div>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3">
          {modelInfo.contextWindow && (
            <div className="bg-white rounded p-3 border border-blue-100">
              <Label className="text-xs font-medium text-gray-600 block mb-1">Context Window</Label>
              <p className="text-sm font-semibold text-gray-900">
                {(modelInfo.contextWindow / 1000).toFixed(0)}K tokens
              </p>
            </div>
          )}

          {modelInfo.maxOutputTokens && (
            <div className="bg-white rounded p-3 border border-blue-100">
              <Label className="text-xs font-medium text-gray-600 block mb-1">Max Output</Label>
              <p className="text-sm font-semibold text-gray-900">
                {(modelInfo.maxOutputTokens / 1000).toFixed(0)}K tokens
              </p>
            </div>
          )}

          {modelInfo.costPerRequest && (
            <div className="bg-white rounded p-3 border border-blue-100">
              <Label className="text-xs font-medium text-gray-600 block mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                Cost/Request
              </Label>
              <p className="text-sm font-semibold text-gray-900">${modelInfo.costPerRequest.toFixed(4)}</p>
            </div>
          )}

          {modelInfo.releaseDate && (
            <div className="bg-white rounded p-3 border border-blue-100">
              <Label className="text-xs font-medium text-gray-600 block mb-1">Release Date</Label>
              <p className="text-sm font-semibold text-gray-900">
                {new Date(modelInfo.releaseDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {/* Pricing Breakdown */}
        {modelInfo.pricing && (
          <div className="bg-white rounded p-3 border border-blue-100">
            <Label className="text-sm font-medium text-gray-700 block mb-2 flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Pricing (per {modelInfo.pricing.unit})
            </Label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Input:</span>
                <span className="font-semibold ml-1">${modelInfo.pricing.inputTokenPrice}</span>
              </div>
              <div>
                <span className="text-gray-600">Output:</span>
                <span className="font-semibold ml-1">${modelInfo.pricing.outputTokenPrice}</span>
              </div>
            </div>
          </div>
        )}

        {/* Estimated Cost */}
        {estimatedTokens && estimatedCost && (
          <div className="bg-green-50 rounded p-3 border border-green-200">
            <Label className="text-xs font-medium text-gray-600 block mb-1">
              Est. Cost ({estimatedTokens.toLocaleString()} tokens)
            </Label>
            <p className="text-lg font-bold text-green-700">${estimatedCost}</p>
          </div>
        )}

        {/* Capabilities */}
        {modelInfo.supportedCapabilities.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-gray-700 block mb-2">Supported Capabilities</Label>
            <div className="flex flex-wrap gap-2">
              {modelInfo.supportedCapabilities.map((cap) => (
                <span
                  key={cap}
                  className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full"
                >
                  <Zap className="w-3 h-3" />
                  {cap}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Placeholder Label component for the import
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}

export default ModelInfoCard;
