import { useState, useEffect } from 'react';
import { Zap, AlertCircle, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';

interface Adaptor {
  id: string;
  name: string;
  description: string;
  models: string[];
  capabilities: string[];
  isHealthy: boolean;
  lastHealthCheck?: string;
}

interface AdaptorSelectorProps {
  projectId: string;
  stageType: string;
  capability: 'textGeneration' | 'imageGeneration' | 'videoGeneration';
  selectedAdaptor?: string;
  onAdaptorSelected: (adaptorId: string, modelId: string) => Promise<void>;
  disabled?: boolean;
}

export function AdaptorSelector({
  projectId,
  stageType,
  capability,
  selectedAdaptor,
  onAdaptorSelected,
  disabled = false
}: AdaptorSelectorProps) {
  const [adaptors, setAdaptors] = useState<Adaptor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ adaptorId: string; modelId: string } | null>(null);

  useEffect(() => {
    loadAdaptors();
  }, [projectId, capability]);

  const loadAdaptors = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/adaptors/available?projectId=${projectId}&capability=${capability}`
      );

      if (!response.ok) {
        throw new Error('Failed to load adaptors');
      }

      const data = await response.json();
      setAdaptors(data.adaptors || []);

      // Set default selection if available
      if (data.adaptors && data.adaptors.length > 0) {
        const defaultAdaptor = data.adaptors[0];
        const defaultModel = defaultAdaptor.models[0];
        setSelectedModel({ adaptorId: defaultAdaptor.id, modelId: defaultModel });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load adaptors');
      console.error('Error loading adaptors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdaptorChange = (adaptorId: string, modelId: string) => {
    setSelectedModel({ adaptorId, modelId });
  };

  const handleConfirm = async () => {
    if (!selectedModel) return;

    try {
      await onAdaptorSelected(selectedModel.adaptorId, selectedModel.modelId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selection');
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-2">Loading adaptors...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-red-900">Error Loading Adaptors</h3>
            <p className="text-sm text-red-800 mt-1">{error}</p>
            <Button onClick={loadAdaptors} variant="outline" size="sm" className="mt-3">
              Retry
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  if (adaptors.length === 0) {
    return (
      <Card className="p-6 border-yellow-200 bg-yellow-50">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-900">No Adaptors Available</h3>
            <p className="text-sm text-yellow-800 mt-1">
              No AI adaptors configured for {capability} in this project.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-purple-600" />
            Select AI Adaptor
          </h3>
          <Label className="text-sm text-gray-600">
            Choose which AI service to use for {capability.replace('Generation', '').toLowerCase()} generation
          </Label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {adaptors.map((adaptor) => (
            <div
              key={adaptor.id}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                selectedModel?.adaptorId === adaptor.id
                  ? 'border-purple-600 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleAdaptorChange(adaptor.id, adaptor.models[0])}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold capitalize">{adaptor.name}</h4>
                  <p className="text-sm text-gray-600">{adaptor.description}</p>
                </div>
                {selectedModel?.adaptorId === adaptor.id && (
                  <Check className="w-5 h-5 text-purple-600 flex-shrink-0" />
                )}
              </div>

              {/* Health Status */}
              <div className="mb-3">
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  adaptor.isHealthy
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${adaptor.isHealthy ? 'bg-green-600' : 'bg-red-600'}`}></span>
                  {adaptor.isHealthy ? 'Healthy' : 'Unavailable'}
                </span>
              </div>

              {/* Models */}
              <div className="mb-3">
                <Label className="text-xs font-medium text-gray-700 block mb-2">Models</Label>
                <select
                  value={selectedModel?.adaptorId === adaptor.id ? selectedModel.modelId : adaptor.models[0]}
                  onChange={(e) => handleAdaptorChange(adaptor.id, e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
                  disabled={disabled}
                >
                  {adaptor.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              {/* Capabilities */}
              <div>
                <Label className="text-xs font-medium text-gray-700 block mb-2">Capabilities</Label>
                <div className="flex flex-wrap gap-1">
                  {adaptor.capabilities.map((cap) => (
                    <span key={cap} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedModel && (
          <div className="flex justify-end gap-2">
            <Button
              onClick={handleConfirm}
              disabled={disabled}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Confirm Selection
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default AdaptorSelector;
