import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Loader, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import './PromptTemplateEditor.css';

interface PromptConfig {
  systemPrompt?: string;
  userPromptTemplate?: string;
  aiModel?: any;
}

interface PromptTemplate {
  id: string;
  templateId?: string;
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
  projectId?: string;
  onBack: () => void;
  stageData?: Record<string, string>;
}

const CAPABILITY_LABELS: Record<string, { label: string; icon: string }> = {
  textGeneration: { label: 'Text Generation', icon: '✍️' },
  imageGeneration: { label: 'Image Generation', icon: '🎨' },
  videoGeneration: { label: 'Video Generation', icon: '🎬' },
};

interface VariableValue {
  [key: string]: string;
}

export function PromptTemplateEditor({ stageType, projectId, onBack, stageData }: PromptTemplateEditorProps) {
  const [template, setTemplate] = useState<PromptTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeCapability, setActiveCapability] = useState<string>('');
  const [variableValues, setVariableValues] = useState<VariableValue>({});
  const [testOutput, setTestOutput] = useState<string | null>(null);

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

          // Set initial active capability to first available
          const capabilities = Object.keys(loadedTemplate.prompts || {});
          console.log(`[PromptTemplateEditor] Available capabilities:`, capabilities);
          if (capabilities.length > 0) {
            setActiveCapability(capabilities[0]);
          }

          // Prefill variable values from stageData if provided
          if (stageData) {
            console.log(`[PromptTemplateEditor] Prefilling variables from stageData:`, stageData);
            const initialValues: VariableValue = {};
            Object.entries(stageData).forEach(([key, value]) => {
              initialValues[key] = String(value);
            });
            setVariableValues(initialValues);
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

  const handleTestPrompt = async () => {
    if (!template || !activeCapability) return;

    try {
      setIsTesting(true);
      setError(null);
      setTestOutput(null);

      const response = await fetch(`/api/prompts/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageType,
          projectId,
          capability: activeCapability,
          variables: variableValues,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to test prompt');
      }

      const data = await response.json();
      setTestOutput(data.output);
      setSuccessMessage('Prompt test completed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test prompt');
    } finally {
      setIsTesting(false);
    }
  };

  const extractVariables = (template: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(template)) !== null) {
      if (!matches.includes(match[1])) {
        matches.push(match[1]);
      }
    }
    return matches;
  };

  const capabilities = template ? Object.keys(template.prompts) : [];
  const currentPrompt = activeCapability && template ? template.prompts[activeCapability as keyof typeof template.prompts] : null;
  const variables = currentPrompt ? extractVariables(`${currentPrompt.systemPrompt || ''}${currentPrompt.userPromptTemplate || ''}`) : [];

  return (
    <div className="prompt-template-editor-split">
      {/* Header */}
      <div className="prompt-editor-header">
        <div className="prompt-editor-header-content">
          <button
            className="prompt-editor-back-button"
            onClick={onBack}
            disabled={isTesting}
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="prompt-editor-title-section">
            <h1 className="prompt-editor-title">Playground</h1>
            <p className="prompt-editor-subtitle">Iterate on and test prompts.</p>
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
          </div>
        </div>
      </div>

      {/* Content - Split Pane */}
      <div className="prompt-editor-content-split">
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
            {/* Left Pane - Prompts */}
            <div className="prompt-pane-left">
              <div className="prompts-section">
                <div className="prompts-header">
                  <h2 className="prompts-title">Prompts</h2>
                </div>

                {/* Capability Selector */}
                <div className="capability-selector">
                  <label className="capability-label">Select prompt</label>
                  <select
                    value={activeCapability}
                    onChange={(e) => {
                      setActiveCapability(e.target.value);
                      setTestOutput(null);
                      setVariableValues({});
                    }}
                    className="capability-select"
                  >
                    <option value="">Choose a prompt...</option>
                    {capabilities.map((cap) => (
                      <option key={cap} value={cap}>
                        {CAPABILITY_LABELS[cap]?.label || cap}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display Selected Prompt */}
                {currentPrompt && (
                  <div className="prompt-display">
                    <div className="prompt-display-section">
                      <h3 className="prompt-display-title">System Prompt</h3>
                      <div className="prompt-text">
                        {currentPrompt.systemPrompt || 'No system prompt'}
                      </div>
                    </div>

                    <div className="prompt-display-section">
                      <h3 className="prompt-display-title">User Prompt Template</h3>
                      <div className="prompt-text">
                        {currentPrompt.userPromptTemplate || 'No user prompt'}
                      </div>
                    </div>

                    {currentPrompt.aiModel && (
                      <div className="prompt-display-section">
                        <h3 className="prompt-display-title">Model</h3>
                        <div className="model-info">
                          {currentPrompt.aiModel.modelName || currentPrompt.aiModel.provider}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Pane - Inputs & Output */}
            <div className="prompt-pane-right">
              {currentPrompt ? (
                <>
                  {/* Inputs Section */}
                  <div className="inputs-section">
                    <h2 className="inputs-title">Inputs</h2>
                    <div className="variables-form">
                      {variables.length > 0 ? (
                        variables.map((variable) => (
                          <div key={variable} className="variable-input-group">
                            <Label htmlFor={`var-${variable}`} className="variable-label">
                              {variable}
                            </Label>
                            <Input
                              id={`var-${variable}`}
                              type="text"
                              value={variableValues[variable] || ''}
                              onChange={(e) =>
                                setVariableValues({
                                  ...variableValues,
                                  [variable]: e.target.value,
                                })
                              }
                              placeholder={`Enter ${variable}...`}
                              className="variable-input"
                            />
                          </div>
                        ))
                      ) : (
                        <p className="no-variables">No variables in this prompt</p>
                      )}
                    </div>

                    {/* Test Button */}
                    <Button
                      onClick={handleTestPrompt}
                      disabled={isTesting}
                      className="test-button"
                    >
                      {isTesting ? (
                        <>
                          <Loader className="w-4 h-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Output Section */}
                  <div className="output-section">
                    <h2 className="output-title">Output</h2>
                    {testOutput ? (
                      <div className="output-content">
                        <pre className="output-text">{testOutput}</pre>
                      </div>
                    ) : (
                      <div className="output-placeholder">
                        Click Start to run generation...
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="no-capability-selected">
                  <p>Select a prompt from the left to test it</p>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default PromptTemplateEditor;
