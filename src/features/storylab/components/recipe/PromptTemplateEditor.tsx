import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, AlertCircle, Loader } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import './PromptTemplateEditor.css';

interface PromptConfig {
  systemPrompt?: string;
  userPromptTemplate?: string;
  aiModel?: any;
}

interface PromptTemplate {
  id: string;
  stageType: string;
  name: string;
  prompts: {
    textGeneration?: PromptConfig;
    imageGeneration?: PromptConfig;
    videoGeneration?: PromptConfig;
  };
}

interface PromptTemplateEditorProps {
  stageType: string;
  onBack: () => void;
}

const CAPABILITY_LABELS: Record<string, { label: string; icon: string }> = {
  textGeneration: { label: 'Text Generation', icon: '✍️' },
  imageGeneration: { label: 'Image Generation', icon: '🎨' },
  videoGeneration: { label: 'Video Generation', icon: '🎬' },
};

export function PromptTemplateEditor({ stageType, onBack }: PromptTemplateEditorProps) {
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [localChanges, setLocalChanges] = useState<Record<string, any>>({});

  // Load template
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(`[PromptTemplateEditor] Loading template for stage: ${stageType}`);

        const response = await fetch(`/api/prompts/templates?stageType=${stageType}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to load prompt template`);
        }

        const data = await response.json();
        console.log(`[PromptTemplateEditor] Response received:`, data);

        if (data.templates && data.templates.length > 0) {
          const loadedTemplate = data.templates[0];
          console.log(`[PromptTemplateEditor] Template loaded:`, loadedTemplate);
          setTemplate(loadedTemplate);

          // Set initial active tab to first available capability
          const capabilities = Object.keys(loadedTemplate.prompts || {});
          console.log(`[PromptTemplateEditor] Available capabilities:`, capabilities);
          if (capabilities.length > 0) {
            setActiveTab(capabilities[0]);
          }
        } else {
          setError(`No prompt template found for stage: ${stageType}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load template';
        console.error(`[PromptTemplateEditor] Error:`, errorMsg);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadTemplate();
  }, [stageType]);

  const handlePromptChange = (capability: string, field: 'systemPrompt' | 'userPromptTemplate', value: string) => {
    setLocalChanges({
      ...localChanges,
      [capability]: {
        ...(localChanges[capability] || {}),
        [field]: value,
      },
    });
  };

  const handleSave = async () => {
    if (!template) return;

    try {
      setIsSaving(true);
      setError(null);

      // Merge local changes with template
      const updatedTemplate = {
        ...template,
        prompts: {
          ...template.prompts,
          ...Object.entries(localChanges).reduce((acc, [capability, changes]) => {
            return {
              ...acc,
              [capability]: {
                ...(template.prompts[capability as keyof typeof template.prompts] || {}),
                ...changes,
              },
            };
          }, {}),
        },
      };

      const response = await fetch(`/api/prompts/templates/${template.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
        },
        body: JSON.stringify(updatedTemplate),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save template');
      }

      setTemplate(updatedTemplate);
      setLocalChanges({});
      setSuccessMessage('Prompt template saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const getFieldValue = (capability: string, field: 'systemPrompt' | 'userPromptTemplate') => {
    // Check local changes first, then fall back to template
    if (localChanges[capability] && localChanges[capability][field] !== undefined) {
      return localChanges[capability][field];
    }
    return template?.prompts[capability as keyof typeof template.prompts]?.[field] || '';
  };

  const capabilities = template ? Object.keys(template.prompts) : [];
  const hasMultipleCapabilities = capabilities.length > 1;

  return (
    <div className="prompt-template-editor">
      {/* Header */}
      <div className="prompt-editor-header">
        <div className="prompt-editor-header-content">
          <button
            className="prompt-editor-back-button"
            onClick={onBack}
            disabled={isSaving}
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="prompt-editor-title-section">
            <h1 className="prompt-editor-title">Edit Prompts</h1>
            {template && (
              <p className="prompt-editor-subtitle">
                {template.name} • {stageType}
              </p>
            )}
          </div>

          <div className="prompt-editor-actions">
            {error && (
              <div className="prompt-editor-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="prompt-editor-success">
                <span>✓ {successMessage}</span>
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving || Object.keys(localChanges).length === 0}
              className="save-button"
            >
              {isSaving ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="prompt-editor-content">
        {isLoading ? (
          <div className="prompt-editor-loading">
            <Loader className="w-8 h-8 animate-spin" />
            <span>Loading prompt template...</span>
          </div>
        ) : error && !template ? (
          <div className="prompt-editor-error-state">
            <AlertCircle className="w-12 h-12" />
            <p>{error}</p>
            <Button onClick={onBack} variant="outline">
              Go Back
            </Button>
          </div>
        ) : template ? (
          <>
            {/* Tabs for multiple capabilities */}
            {hasMultipleCapabilities && (
              <div className="prompt-editor-tabs">
                {capabilities.map((capability) => (
                  <button
                    key={capability}
                    className={`prompt-tab ${activeTab === capability ? 'active' : ''}`}
                    onClick={() => setActiveTab(capability)}
                  >
                    <span className="tab-icon">
                      {CAPABILITY_LABELS[capability]?.icon || '⚙️'}
                    </span>
                    <span className="tab-label">
                      {CAPABILITY_LABELS[capability]?.label || capability}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Prompt Editor Cards */}
            <div className="prompt-editor-cards">
              {capabilities.map((capability) => (
                <div
                  key={capability}
                  className={`prompt-card ${activeTab === capability || !hasMultipleCapabilities ? 'visible' : 'hidden'}`}
                >
                  <div className="card-header">
                    <h2 className="card-title">
                      {CAPABILITY_LABELS[capability]?.icon}{' '}
                      {CAPABILITY_LABELS[capability]?.label || capability}
                    </h2>
                  </div>

                  <div className="card-content">
                    {/* System Prompt */}
                    <div className="field-group">
                      <Label htmlFor={`system-${capability}`} className="field-label">
                        System Prompt
                      </Label>
                      <Textarea
                        id={`system-${capability}`}
                        value={getFieldValue(capability, 'systemPrompt')}
                        onChange={(e) => handlePromptChange(capability, 'systemPrompt', e.target.value)}
                        placeholder="Enter system prompt (e.g., 'You are an expert...')"
                        className="field-textarea system-prompt"
                        rows={6}
                      />
                    </div>

                    {/* User Prompt Template */}
                    <div className="field-group">
                      <Label htmlFor={`user-${capability}`} className="field-label">
                        User Prompt Template
                      </Label>
                      <Textarea
                        id={`user-${capability}`}
                        value={getFieldValue(capability, 'userPromptTemplate')}
                        onChange={(e) => handlePromptChange(capability, 'userPromptTemplate', e.target.value)}
                        placeholder="Enter user prompt template with {{variables}}"
                        className="field-textarea user-prompt"
                        rows={10}
                      />
                      <p className="field-hint">
                        Use {`{{variableName}}`} to reference input variables
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default PromptTemplateEditor;
