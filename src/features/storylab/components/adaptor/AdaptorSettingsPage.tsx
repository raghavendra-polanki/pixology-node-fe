import { useState } from 'react';
import { Settings, AlertCircle, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { AdaptorSelector } from './AdaptorSelector';
import { AdaptorConfigPanel } from './AdaptorConfigPanel';
import { ModelInfoCard } from './ModelInfoCard';
import { PromptTemplateEditor } from './PromptTemplateEditor';
import { UsageTrackerPanel } from './UsageTrackerPanel';

interface AdaptorSettingsPageProps {
  projectId: string;
  onClose?: () => void;
}

type Tab = 'adaptors' | 'config' | 'prompts' | 'usage';

export function AdaptorSettingsPage({ projectId, onClose }: AdaptorSettingsPageProps) {
  const [activeTab, setActiveTab] = useState<Tab>('adaptors');
  const [selectedStage, setSelectedStage] = useState('stage_2_personas');
  const [selectedCapability, setSelectedCapability] = useState<'textGeneration' | 'imageGeneration' | 'videoGeneration'>('textGeneration');
  const [selectedAdaptor, setSelectedAdaptor] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const stages = [
    { id: 'stage_2_personas', label: 'Personas' },
    { id: 'stage_3_narratives', label: 'Narratives' },
    { id: 'stage_4_storyboard', label: 'Storyboard' },
    { id: 'stage_5_screenplay', label: 'Screenplay' },
    { id: 'stage_6_video', label: 'Video' },
  ];

  const capabilities = [
    { id: 'textGeneration', label: 'Text Generation' },
    { id: 'imageGeneration', label: 'Image Generation' },
    { id: 'videoGeneration', label: 'Video Generation' },
  ] as const;

  const handleAdaptorSelected = async (adaptorId: string, modelId: string) => {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch('/api/adaptors/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          stageType: selectedStage,
          capability: selectedCapability,
          adaptorId,
          modelId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save adaptor selection');
      }

      setSelectedAdaptor(adaptorId);
      setSelectedModel(modelId);
      setMessage({ type: 'success', text: 'Adaptor selection saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save adaptor',
      });
    }
  };

  const handleConfigSaved = async (config: any) => {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch('/api/adaptors/config/parameters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          stageType: selectedStage,
          adaptorId: selectedAdaptor,
          config,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save configuration');
      }

      setMessage({ type: 'success', text: 'Configuration saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save configuration',
      });
    }
  };

  const handlePromptSaved = async (template: any) => {
    try {
      const token = sessionStorage.getItem('authToken');
      if (!token) throw new Error('Authentication token not found');

      const response = await fetch('/api/prompts/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          stageType: selectedStage,
          template,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      setShowPromptEditor(false);
      setMessage({ type: 'success', text: 'Prompt template saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save template',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8 text-purple-600" />
            Adaptor & Prompt Settings
          </h1>
          <p className="text-gray-600 mt-1">Configure AI adaptors and prompts for each stage</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Close</span>
            <span className="text-2xl">✕</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {message && (
        <div className={`flex items-start gap-3 p-4 rounded border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          {message.type === 'success' ? (
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <p className={`text-sm ${
            message.type === 'success' ? 'text-green-800' : 'text-red-800'
          }`}>
            {message.text}
          </p>
        </div>
      )}

      {/* Stage & Capability Selectors */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Select Stage
            </label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {stages.map((stage) => (
                <option key={stage.id} value={stage.id}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Select Capability
            </label>
            <select
              value={selectedCapability}
              onChange={(e) => setSelectedCapability(e.target.value as any)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {capabilities.map((cap) => (
                <option key={cap.id} value={cap.id}>
                  {cap.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4" aria-label="Tabs">
          {[
            { id: 'adaptors', label: 'Adaptors' },
            { id: 'config', label: 'Configuration' },
            { id: 'prompts', label: 'Prompts' },
            { id: 'usage', label: 'Usage' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'adaptors' && (
          <AdaptorSelector
            projectId={projectId}
            stageType={selectedStage}
            capability={selectedCapability}
            selectedAdaptor={selectedAdaptor || undefined}
            onAdaptorSelected={handleAdaptorSelected}
          />
        )}

        {activeTab === 'config' && selectedAdaptor && selectedModel && (
          <AdaptorConfigPanel
            adaptorId={selectedAdaptor}
            modelId={selectedModel}
            onConfigSaved={handleConfigSaved}
          />
        )}

        {activeTab === 'config' && !selectedAdaptor && (
          <Card className="p-6 border-yellow-200 bg-yellow-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Please select an adaptor first to configure parameters.
              </p>
            </div>
          </Card>
        )}

        {activeTab === 'prompts' && !showPromptEditor && (
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Prompt Templates</h3>
              <p className="text-sm text-gray-600">
                Manage prompt templates for {selectedStage}
              </p>
              <Button
                onClick={() => setShowPromptEditor(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                Create/Edit Prompt Template
              </Button>
            </div>
          </Card>
        )}

        {activeTab === 'prompts' && showPromptEditor && (
          <PromptTemplateEditor
            projectId={projectId}
            stageType={selectedStage}
            onSave={handlePromptSaved}
            onCancel={() => setShowPromptEditor(false)}
          />
        )}

        {activeTab === 'usage' && (
          <UsageTrackerPanel projectId={projectId} />
        )}
      </div>
    </div>
  );
}

export default AdaptorSettingsPage;
