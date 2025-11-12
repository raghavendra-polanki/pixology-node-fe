import { useState } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface AdaptorConfig {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeout?: number;
  retryAttempts?: number;
  customParameters?: Record<string, string>;
}

interface AdaptorConfigPanelProps {
  adaptorId: string;
  modelId: string;
  currentConfig?: AdaptorConfig;
  onConfigSaved: (config: AdaptorConfig) => Promise<void>;
  disabled?: boolean;
}

export function AdaptorConfigPanel({
  adaptorId,
  modelId,
  currentConfig,
  onConfigSaved,
  disabled = false
}: AdaptorConfigPanelProps) {
  const [config, setConfig] = useState<AdaptorConfig>(
    currentConfig || {
      temperature: 0.7,
      maxTokens: 4000,
      topP: 1.0,
      frequencyPenalty: 0,
      presencePenalty: 0,
      timeout: 300,
      retryAttempts: 3,
      customParameters: {}
    }
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleParameterChange = (key: keyof AdaptorConfig, value: number | string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value
    }));
  };

  const handleCustomParameterChange = (paramKey: string, value: string) => {
    setConfig((prev) => ({
      ...prev,
      customParameters: {
        ...prev.customParameters,
        [paramKey]: value
      }
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      // Validate config
      if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 2)) {
        throw new Error('Temperature must be between 0 and 2');
      }

      if (config.maxTokens !== undefined && config.maxTokens < 1) {
        throw new Error('Max tokens must be at least 1');
      }

      if (config.topP !== undefined && (config.topP < 0 || config.topP > 1)) {
        throw new Error('Top P must be between 0 and 1');
      }

      await onConfigSaved(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-purple-600" />
            Adaptor Configuration
          </h3>
          <p className="text-sm text-gray-600">
            {adaptorId} / {modelId}
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-800">Configuration saved successfully!</p>
          </div>
        )}

        {/* Core Parameters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="temperature" className="text-sm font-medium text-gray-700 block mb-2">
              Temperature (0 - 2)
            </Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={config.temperature ?? 0.7}
              onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
              disabled={disabled || isSaving}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lower = more focused and deterministic, Higher = more random and creative
            </p>
          </div>

          <div>
            <Label htmlFor="maxTokens" className="text-sm font-medium text-gray-700 block mb-2">
              Max Tokens
            </Label>
            <Input
              id="maxTokens"
              type="number"
              min="1"
              value={config.maxTokens ?? 4000}
              onChange={(e) => handleParameterChange('maxTokens', parseInt(e.target.value))}
              disabled={disabled || isSaving}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum tokens in the response</p>
          </div>

          <div>
            <Label htmlFor="topP" className="text-sm font-medium text-gray-700 block mb-2">
              Top P (0 - 1)
            </Label>
            <Input
              id="topP"
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={config.topP ?? 1.0}
              onChange={(e) => handleParameterChange('topP', parseFloat(e.target.value))}
              disabled={disabled || isSaving}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Nucleus sampling parameter</p>
          </div>

          <div>
            <Label htmlFor="frequencyPenalty" className="text-sm font-medium text-gray-700 block mb-2">
              Frequency Penalty (0 - 2)
            </Label>
            <Input
              id="frequencyPenalty"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={config.frequencyPenalty ?? 0}
              onChange={(e) => handleParameterChange('frequencyPenalty', parseFloat(e.target.value))}
              disabled={disabled || isSaving}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Penalize repeated tokens</p>
          </div>

          <div>
            <Label htmlFor="presencePenalty" className="text-sm font-medium text-gray-700 block mb-2">
              Presence Penalty (0 - 2)
            </Label>
            <Input
              id="presencePenalty"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={config.presencePenalty ?? 0}
              onChange={(e) => handleParameterChange('presencePenalty', parseFloat(e.target.value))}
              disabled={disabled || isSaving}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Penalize new tokens</p>
          </div>

          <div>
            <Label htmlFor="timeout" className="text-sm font-medium text-gray-700 block mb-2">
              Timeout (seconds)
            </Label>
            <Input
              id="timeout"
              type="number"
              min="10"
              step="10"
              value={config.timeout ?? 300}
              onChange={(e) => handleParameterChange('timeout', parseInt(e.target.value))}
              disabled={disabled || isSaving}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Request timeout</p>
          </div>

          <div>
            <Label htmlFor="retryAttempts" className="text-sm font-medium text-gray-700 block mb-2">
              Retry Attempts
            </Label>
            <Input
              id="retryAttempts"
              type="number"
              min="0"
              max="10"
              value={config.retryAttempts ?? 3}
              onChange={(e) => handleParameterChange('retryAttempts', parseInt(e.target.value))}
              disabled={disabled || isSaving}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Number of retry attempts on failure</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={disabled || isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default AdaptorConfigPanel;
