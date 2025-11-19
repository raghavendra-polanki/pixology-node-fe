import { useState, useEffect } from 'react';
import { Edit2, Save, X, Plus, AlertCircle, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface PromptVariable {
  name: string;
  description: string;
  placeholder?: string;
}

interface PromptSet {
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat: 'text' | 'json';
}

interface PromptTemplate {
  id: string;
  stageType: string;
  name: string;
  description: string;
  version: number;
  prompts: {
    [capability: string]: PromptSet;
  };
  variables: PromptVariable[];
  isDefault: boolean;
  isActive: boolean;
  createdBy?: string;
  createdAt?: string;
}

interface PromptTemplateEditorProps {
  projectId: string;
  stageType: string;
  currentTemplate?: PromptTemplate;
  onSave: (template: PromptTemplate) => Promise<void>;
  onCancel?: () => void;
}

export function PromptTemplateEditor({
  projectId,
  stageType,
  currentTemplate,
  onSave,
  onCancel
}: PromptTemplateEditorProps) {
  const [template, setTemplate] = useState<PromptTemplate>(
    currentTemplate || {
      id: '',
      stageType,
      name: '',
      description: '',
      version: 1,
      prompts: {
        textGeneration: {
          systemPrompt: '',
          userPromptTemplate: '',
          outputFormat: 'json',
        },
      },
      variables: [],
      isDefault: false,
      isActive: true,
    }
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedCapability, setSelectedCapability] = useState('textGeneration');
  const [newVariable, setNewVariable] = useState<PromptVariable | null>(null);

  const currentPromptSet = template.prompts[selectedCapability];

  const handleNameChange = (value: string) => {
    setTemplate((prev) => ({ ...prev, name: value }));
  };

  const handleDescriptionChange = (value: string) => {
    setTemplate((prev) => ({ ...prev, description: value }));
  };

  const handlePromptChange = (field: keyof PromptSet, value: string) => {
    setTemplate((prev) => ({
      ...prev,
      prompts: {
        ...prev.prompts,
        [selectedCapability]: {
          ...prev.prompts[selectedCapability],
          [field]: value,
        },
      },
    }));
  };

  const handleAddVariable = () => {
    if (!newVariable || !newVariable.name) return;

    setTemplate((prev) => ({
      ...prev,
      variables: [
        ...prev.variables.filter((v) => v.name !== newVariable.name),
        newVariable,
      ],
    }));
    setNewVariable(null);
  };

  const handleRemoveVariable = (variableName: string) => {
    setTemplate((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v.name !== variableName),
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      // Validate template
      if (!template.name) throw new Error('Template name is required');
      if (!currentPromptSet.systemPrompt && !currentPromptSet.userPromptTemplate) {
        throw new Error('At least one of System Prompt or User Prompt must be provided');
      }

      await onSave(template);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
              <Edit2 className="w-5 h-5 text-purple-600" />
              Prompt Template Editor
            </h3>
            <p className="text-sm text-gray-600">{stageType}</p>
          </div>
          {onCancel && (
            <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded">
            <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-green-800">Template saved successfully!</p>
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-2">
              Template Name
            </Label>
            <Input
              id="name"
              value={template.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Persona Generation v2"
              disabled={isSaving}
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-700 block mb-2">
              Description
            </Label>
            <Textarea
              id="description"
              value={template.description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              placeholder="Describe what this template is for..."
              rows={2}
              disabled={isSaving}
            />
          </div>
        </div>

        {/* Capability Selector */}
        <div>
          <Label className="text-sm font-medium text-gray-700 block mb-2">Capability</Label>
          <select
            value={selectedCapability}
            onChange={(e) => setSelectedCapability(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            disabled={isSaving}
          >
            <option value="textGeneration">Text Generation</option>
            <option value="imageGeneration">Image Generation</option>
            <option value="videoGeneration">Video Generation</option>
          </select>
        </div>

        {/* Prompts */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-semibold text-gray-900">Prompts</h4>

          <div>
            <Label htmlFor="systemPrompt" className="text-sm font-medium text-gray-700 block mb-2">
              System Prompt
            </Label>
            <Textarea
              id="systemPrompt"
              value={currentPromptSet.systemPrompt}
              onChange={(e) => handlePromptChange('systemPrompt', e.target.value)}
              placeholder="Enter the system prompt... Use {{variableName}} for variables"
              rows={4}
              disabled={isSaving}
              className="font-mono text-xs"
            />
            <p className="text-xs text-gray-500 mt-1">
              Sets the behavior and context for the AI model
            </p>
          </div>

          <div>
            <Label htmlFor="userPrompt" className="text-sm font-medium text-gray-700 block mb-2">
              User Prompt Template
            </Label>
            <Textarea
              id="userPrompt"
              value={currentPromptSet.userPromptTemplate}
              onChange={(e) => handlePromptChange('userPromptTemplate', e.target.value)}
              placeholder="Enter the user prompt template... Use {{variableName}} for variables"
              rows={4}
              disabled={isSaving}
              className="font-mono text-xs"
            />
            <p className="text-xs text-gray-500 mt-1">
              The main prompt sent to the model with variable substitution
            </p>
          </div>

          <div>
            <Label htmlFor="outputFormat" className="text-sm font-medium text-gray-700 block mb-2">
              Output Format
            </Label>
            <select
              id="outputFormat"
              value={currentPromptSet.outputFormat}
              onChange={(e) => handlePromptChange('outputFormat', e.target.value as any)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              disabled={isSaving}
            >
              <option value="text">Text</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>

        {/* Variables */}
        <div className="space-y-4 border-t pt-4">
          <h4 className="font-semibold text-gray-900">Template Variables</h4>

          {template.variables.length > 0 && (
            <div className="space-y-2">
              {template.variables.map((variable) => (
                <div
                  key={variable.name}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded border border-gray-200"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-gray-900">{`{${variable.name}}`}</p>
                    <p className="text-sm text-gray-600">{variable.description}</p>
                    {variable.placeholder && (
                      <p className="text-xs text-gray-500 mt-1">Placeholder: {variable.placeholder}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveVariable(variable.name)}
                    disabled={isSaving}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Variable */}
          <div className="space-y-2 p-4 bg-gray-50 rounded border border-gray-200">
            <p className="text-sm font-medium text-gray-700">Add Variable</p>
            <Input
              type="text"
              value={newVariable?.name || ''}
              onChange={(e) =>
                setNewVariable((prev) => ({
                  ...(prev || { name: '', description: '' }),
                  name: e.target.value,
                }))
              }
              placeholder="Variable name (e.g., productDescription)"
              disabled={isSaving}
            />
            <Input
              type="text"
              value={newVariable?.description || ''}
              onChange={(e) =>
                setNewVariable((prev) => ({
                  ...(prev || { name: '', description: '' }),
                  description: e.target.value,
                }))
              }
              placeholder="Description of the variable"
              disabled={isSaving}
            />
            <Input
              type="text"
              value={newVariable?.placeholder || ''}
              onChange={(e) =>
                setNewVariable((prev) => ({
                  ...(prev || { name: '', description: '' }),
                  placeholder: e.target.value,
                }))
              }
              placeholder="Example value (optional)"
              disabled={isSaving}
            />
            <Button
              onClick={handleAddVariable}
              disabled={!newVariable?.name || isSaving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Add Variable
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          {onCancel && (
            <Button
              onClick={onCancel}
              variant="outline"
              disabled={isSaving}
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </div>
    </Card>
  );
}

export default PromptTemplateEditor;
