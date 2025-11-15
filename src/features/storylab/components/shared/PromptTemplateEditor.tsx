import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Loader, Play } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import Editor from 'react-simple-code-editor';
import './PromptTemplateEditor.css';

interface PromptConfig {
  id: string;
  capability: string;
  name: string;
  description?: string;
  systemPrompt?: string;
  userPromptTemplate?: string;
  outputFormat?: string;
  variables?: Array<{ name: string; description: string; placeholder?: string }>;
  isDefault?: boolean;
  isActive?: boolean;
}

interface PromptTemplate {
  id: string;
  stageType: string;
  prompts: PromptConfig[];
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeCapability, setActiveCapability] = useState<string>('');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [variableValues, setVariableValues] = useState<VariableValue>({});
  const [testOutput, setTestOutput] = useState<string | null>(null);

  // Edited prompt state (isolated from parent)
  const [editedPrompt, setEditedPrompt] = useState<PromptConfig | null>(null);

  // Store inputs and outputs per prompt (preserves state when switching prompts)
  const [promptStates, setPromptStates] = useState<Record<string, { variables: VariableValue; output: string | null }>>({});

  // For array outputs from previous prompt - track selected item
  const [selectedOutputItem, setSelectedOutputItem] = useState<number>(0);

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

          // Get prompts array
          const prompts = loadedTemplate.prompts || [];

          console.log(`[PromptTemplateEditor] Available prompts:`, prompts.length);

          // Set first prompt as selected
          if (prompts.length > 0) {
            const firstPrompt = prompts[0];
            setSelectedPromptId(firstPrompt.id);
            setActiveCapability(firstPrompt.capability);
            setEditedPrompt({ ...firstPrompt }); // Create isolated copy

            // Prefill variable values from stageData if provided
            if (stageData) {
              console.log(`[PromptTemplateEditor] Prefilling variables from stageData:`, stageData);
              const initialValues: VariableValue = {};
              Object.entries(stageData).forEach(([key, value]) => {
                initialValues[key] = String(value);
              });
              setVariableValues(initialValues);

              // Save initial state for first prompt
              setPromptStates({
                [firstPrompt.id]: {
                  variables: initialValues,
                  output: null
                }
              });
            }
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
    if (!template || !activeCapability || !selectedPromptId) return;

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

      // Save output to prompt state
      setPromptStates(prev => ({
        ...prev,
        [selectedPromptId]: {
          variables: variableValues,
          output: data.output
        }
      }));

      setSuccessMessage('Prompt test completed successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test prompt');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!editedPrompt || !stageType) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/prompts/templates/${stageType}/${editedPrompt.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates: {
            userPromptTemplate: editedPrompt.userPromptTemplate,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save prompt');
      }

      setSuccessMessage('Prompt saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh template to get latest from database
      const refreshResponse = await fetch(`/api/prompts/templates?stageType=${stageType}`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.templates && refreshData.templates.length > 0) {
          setTemplate(refreshData.templates[0]);
          // Update editedPrompt with the saved version
          const updatedPrompt = refreshData.templates[0].prompts.find((p: PromptConfig) => p.id === editedPrompt.id);
          if (updatedPrompt) {
            setEditedPrompt({ ...updatedPrompt });
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save prompt');
    } finally {
      setIsSaving(false);
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

  // Helper function to check if a string is an image URL
  const isImageUrl = (str: string): boolean => {
    if (!str || typeof str !== 'string') return false;

    // Check for base64 data URI (e.g., data:image/png;base64,...)
    if (str.startsWith('data:image/')) {
      return true;
    }

    // Must start with http or https for regular URLs
    if (!str.startsWith('http://') && !str.startsWith('https://')) {
      return false;
    }

    // Check if it ends with image extension
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|tif|heic|heif)(\?.*)?$/i;
    if (imageExtensions.test(str)) {
      return true;
    }

    // Check for known image hosting services and CDNs
    const imageHostPatterns = [
      /cloudinary/i,
      /imgur/i,
      /unsplash/i,
      /cdn\./i,
      /storage\.googleapis/i,
      /s3\.amazonaws/i,
      /cloudfront\.net/i,
      /blob\.core\.windows/i,
      /imagekit\.io/i,
      /images\./i,
      /img\./i,
      /static\./i,
      /assets\./i,
      /media\./i,
      /firebase/i,
      /supabase/i,
    ];

    return imageHostPatterns.some(pattern => pattern.test(str));
  };

  // Highlight function for syntax highlighting
  const highlightVariables = (code: string): string => {
    // Escape HTML to prevent XSS
    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Split by variable pattern and highlight variables
    const parts = code.split(/(\{\{[^}]+\}\})/g);

    return parts
      .map((part) => {
        if (part.match(/^\{\{[^}]+\}\}$/)) {
          // This is a variable - highlight it
          return `<span style="color: #0061ff; font-weight: 600; background-color: rgba(0, 97, 255, 0.1); padding: 2px 4px; border-radius: 3px;">${escapeHtml(part)}</span>`;
        } else {
          // Regular text
          return escapeHtml(part);
        }
      })
      .join('');
  };

  // Render JSON output in a user-friendly format
  const renderJsonOutput = (data: any): JSX.Element => {
    if (Array.isArray(data)) {
      // Array of items (e.g., personas, narratives)
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {data.map((item, index) => (
            <div
              key={index}
              style={{
                padding: '1rem',
                backgroundColor: 'rgba(21, 21, 21, 0.5)',
                border: '1px solid rgba(51, 51, 51, 0.2)',
                borderRadius: '8px',
              }}
            >
              <h3 style={{
                color: '#0061ff',
                fontSize: '0.9rem',
                marginBottom: '0.75rem',
                fontWeight: '600'
              }}>
                Item {index + 1}
              </h3>
              {renderObjectFields(item)}
            </div>
          ))}
        </div>
      );
    } else if (typeof data === 'object' && data !== null) {
      // Single object
      return renderObjectFields(data);
    } else {
      // Primitive value
      return <pre className="output-text">{String(data)}</pre>;
    }
  };

  // Render object fields recursively
  const renderObjectFields = (obj: any, depth: number = 0): JSX.Element => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {Object.entries(obj).map(([key, value]) => {
          // Check if value is an image URL
          const isImage = typeof value === 'string' && isImageUrl(value);

          if (isImage) {
            return (
              <div key={key} style={{ marginBottom: '0.5rem' }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#a0aec0',
                  marginBottom: '0.5rem',
                  textTransform: 'capitalize'
                }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <img
                  src={value as string}
                  alt={key}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '300px',
                    borderRadius: '6px',
                    objectFit: 'contain',
                    border: '1px solid rgba(51, 51, 51, 0.2)'
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            );
          } else if (Array.isArray(value)) {
            return (
              <div key={key} style={{ marginBottom: '0.5rem' }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#a0aec0',
                  marginBottom: '0.5rem',
                  textTransform: 'capitalize'
                }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#e0e0e0',
                  paddingLeft: depth > 0 ? '1rem' : '0'
                }}>
                  {value.map((item, idx) => (
                    <div key={idx} style={{ marginBottom: '0.25rem' }}>
                      • {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                    </div>
                  ))}
                </div>
              </div>
            );
          } else if (typeof value === 'object' && value !== null) {
            return (
              <div key={key} style={{ marginBottom: '0.5rem' }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#a0aec0',
                  marginBottom: '0.5rem',
                  textTransform: 'capitalize'
                }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div style={{ paddingLeft: '1rem' }}>
                  {renderObjectFields(value, depth + 1)}
                </div>
              </div>
            );
          } else {
            return (
              <div key={key} style={{ marginBottom: '0.5rem' }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#a0aec0',
                  marginBottom: '0.25rem',
                  textTransform: 'capitalize'
                }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: '#e0e0e0',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {String(value)}
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  };

  // Get all prompts
  const allPrompts = template ? template.prompts : [];

  // Use editedPrompt for display (isolated state)
  const currentPrompt = editedPrompt;
  const variables = currentPrompt
    ? extractVariables(`${currentPrompt.systemPrompt || ''}${currentPrompt.userPromptTemplate || ''}`)
    : [];

  // Strip markdown code fences from output
  const stripCodeFences = (text: string): string => {
    let cleaned = text.trim();

    // Remove opening code fence (```json, ```javascript, or just ```)
    cleaned = cleaned.replace(/^```(?:json|javascript|js)?\s*\n?/i, '');

    // Remove closing code fence
    cleaned = cleaned.replace(/\n?```\s*$/, '');

    return cleaned.trim();
  };

  // Get prefill values from previous prompt output and stageData
  const getPrefillValues = (currentPromptId: string, itemIndex?: number): { values: VariableValue; arrayOutput: any[] | null } => {
    // Get the previous prompt (the one before current in the prompts array)
    const prompts = template?.prompts || [];
    const currentIndex = prompts.findIndex(p => p.id === currentPromptId);

    if (currentIndex <= 0) {
      // No previous prompt or this is the first prompt
      return { values: {}, arrayOutput: null };
    }

    const previousPrompt = prompts[currentIndex - 1];
    const previousState = promptStates[previousPrompt.id];

    if (!previousState || !previousState.output) {
      // No output from previous prompt
      return { values: {}, arrayOutput: null };
    }

    // Try to parse previous output as JSON
    try {
      const cleaned = stripCodeFences(previousState.output);
      const parsed = JSON.parse(cleaned);

      let dataToExtract: any;
      let arrayOutput: any[] | null = null;

      if (Array.isArray(parsed)) {
        // Array output - use provided index or selected item from state
        arrayOutput = parsed;
        const indexToUse = itemIndex !== undefined ? itemIndex : selectedOutputItem;
        dataToExtract = parsed[indexToUse] || parsed[0];
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Single object
        dataToExtract = parsed;
      } else {
        // Primitive value
        return { values: {}, arrayOutput: null };
      }

      // Extract values from the data
      const extractedValues: VariableValue = {};

      // Recursively extract all string values from nested objects
      const extractStrings = (obj: any, prefix: string = '') => {
        Object.entries(obj).forEach(([key, value]) => {
          const fullKey = prefix ? `${prefix}.${key}` : key;

          if (typeof value === 'string') {
            // Store both with prefix and without
            extractedValues[key] = value;
            if (prefix) {
              extractedValues[fullKey] = value;
            }
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // Recursively extract from nested objects
            extractStrings(value, key);
          } else if (typeof value === 'number' || typeof value === 'boolean') {
            extractedValues[key] = String(value);
          }
        });
      };

      extractStrings(dataToExtract);

      // Merge with stageData (stageData takes precedence for missing values)
      const finalValues = { ...extractedValues };
      if (stageData) {
        Object.entries(stageData).forEach(([key, value]) => {
          if (!finalValues[key] || finalValues[key] === '') {
            finalValues[key] = String(value);
          }
        });
      }

      return { values: finalValues, arrayOutput };
    } catch (error) {
      // Failed to parse, return empty
      console.log('[PromptEditor] Failed to parse previous output for prefill:', error);
      return { values: {}, arrayOutput: null };
    }
  };

  // Parse and render output
  const renderOutput = () => {
    if (!testOutput) {
      return (
        <div className="output-placeholder">
          Click Start to run generation...
        </div>
      );
    }

    // Check if it's an image URL
    if (isImageUrl(testOutput)) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '1rem'
        }}>
          <img
            src={testOutput}
            alt="Generated output"
            style={{
              maxWidth: '100%',
              maxHeight: '600px',
              borderRadius: '8px',
              objectFit: 'contain',
              border: '1px solid rgba(51, 51, 51, 0.2)'
            }}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        </div>
      );
    }

    // Try to parse as JSON
    try {
      // Strip markdown code fences if present
      const cleaned = stripCodeFences(testOutput);
      const parsed = JSON.parse(cleaned);
      console.log('[PromptEditor] Parsed JSON successfully');
      return (
        <div style={{ padding: '0.5rem' }}>
          {renderJsonOutput(parsed)}
        </div>
      );
    } catch (error) {
      console.log('[PromptEditor] JSON parse failed, showing as plain text');
      // Not valid JSON, show as plain text
      return <pre className="output-text">{testOutput}</pre>;
    }
  };

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

                {/* Prompt Selector with Type Label */}
                <div className="capability-selector">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label className="capability-label">Select Prompt</label>
                    {currentPrompt && (
                      <span style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: '#0061ff',
                        backgroundColor: 'rgba(0, 97, 255, 0.1)',
                        border: '1px solid rgba(0, 97, 255, 0.2)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.3px'
                      }}>
                        {CAPABILITY_LABELS[currentPrompt.capability]?.icon || '📝'}
                        {CAPABILITY_LABELS[currentPrompt.capability]?.label || currentPrompt.capability}
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedPromptId}
                    onChange={(e) => {
                      const newPromptId = e.target.value;

                      // Save current prompt's state before switching
                      if (selectedPromptId) {
                        setPromptStates(prev => ({
                          ...prev,
                          [selectedPromptId]: {
                            variables: variableValues,
                            output: testOutput
                          }
                        }));
                      }

                      // Switch to new prompt
                      setSelectedPromptId(newPromptId);
                      const prompt = template?.prompts.find(p => p.id === newPromptId);
                      if (prompt) {
                        setActiveCapability(prompt.capability);
                        setEditedPrompt({ ...prompt }); // Create isolated copy

                        // Restore saved state for this prompt (if exists)
                        const savedState = promptStates[newPromptId];
                        if (savedState) {
                          setVariableValues(savedState.variables);
                          setTestOutput(savedState.output);
                        } else {
                          // No saved state - try to prefill from previous prompt's output
                          const { values: prefillValues } = getPrefillValues(newPromptId);
                          if (Object.keys(prefillValues).length > 0) {
                            setVariableValues(prefillValues);

                            // Save the prefilled values to promptStates so they persist
                            setPromptStates(prev => ({
                              ...prev,
                              [newPromptId]: {
                                variables: prefillValues,
                                output: null
                              }
                            }));
                          } else {
                            setVariableValues({});
                          }
                          setTestOutput(null);
                        }
                      }
                    }}
                    className="capability-select"
                  >
                    <option value="">Choose a prompt...</option>
                    {allPrompts.map((prompt) => (
                      <option key={prompt.id} value={prompt.id}>
                        {prompt.name} {prompt.isDefault ? '(Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Display & Edit Selected Prompt */}
                {currentPrompt && (
                  <div className="prompt-display" style={{ marginTop: '16px' }}>
                    {/* Editable User Prompt Template - Larger */}
                    <div className="prompt-display-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 className="prompt-display-title" style={{ margin: 0 }}>User Prompt Template</h3>
                        <Button
                          onClick={handleSavePrompt}
                          disabled={isSaving || isTesting}
                          size="sm"
                          className="test-button"
                          style={{
                            backgroundColor: '#0061ff',
                            color: '#ffffff',
                            fontSize: '11px',
                            padding: '8px 20px',
                            height: 'auto',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            fontWeight: '600'
                          }}
                        >
                          {isSaving ? 'Saving...' : 'Save Prompt'}
                        </Button>
                      </div>
                      <div style={{
                        width: '100%',
                        minHeight: '450px',
                        backgroundColor: 'rgba(21, 21, 21, 0.5)',
                        border: '1px solid rgba(51, 51, 51, 0.15)',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        overflow: 'auto'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = '#0061ff';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0, 97, 255, 0.1)';
                        e.currentTarget.style.backgroundColor = 'rgba(21, 21, 21, 0.9)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(51, 51, 51, 0.15)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.backgroundColor = 'rgba(21, 21, 21, 0.5)';
                      }}>
                        <Editor
                          value={currentPrompt.userPromptTemplate || ''}
                          onValueChange={(code) => setEditedPrompt({ ...currentPrompt, userPromptTemplate: code })}
                          highlight={highlightVariables}
                          padding={12}
                          placeholder="Enter your prompt template here. Use {{variableName}} for variables."
                          style={{
                            fontFamily: '"Monaco", "Courier New", monospace',
                            fontSize: '12px',
                            lineHeight: '1.6',
                            minHeight: '450px',
                            color: '#e0e0e0',
                            backgroundColor: 'transparent',
                            outline: 'none'
                          }}
                          textareaClassName="prompt-editor-textarea"
                        />
                      </div>
                      <p style={{
                        fontSize: '11px',
                        color: '#a0aec0',
                        marginTop: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>Use</span>
                        <code style={{
                          backgroundColor: 'rgba(51, 51, 51, 0.3)',
                          color: '#0061ff',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontFamily: 'Monaco, Courier New, monospace',
                          fontSize: '10px',
                          border: '1px solid rgba(51, 51, 51, 0.2)'
                        }}>
                          {'{{variableName}}'}
                        </code>
                        <span>syntax for variables</span>
                      </p>
                    </div>
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

                    {/* Array Item Selector - shows if previous prompt has array output */}
                    {(() => {
                      const { arrayOutput } = getPrefillValues(selectedPromptId);
                      if (arrayOutput && arrayOutput.length > 1) {
                        return (
                          <div className="variable-input-group" style={{ marginBottom: '1rem' }}>
                            <Label htmlFor="output-item-selector" className="variable-label">
                              Select Item from Previous Output
                            </Label>
                            <select
                              id="output-item-selector"
                              value={selectedOutputItem}
                              onChange={(e) => {
                                const newIndex = parseInt(e.target.value, 10);
                                setSelectedOutputItem(newIndex);

                                // Re-prefill with the newly selected item (pass newIndex directly)
                                const { values: newPrefillValues } = getPrefillValues(selectedPromptId, newIndex);
                                setVariableValues(newPrefillValues);

                                // Save to prompt state
                                setPromptStates(prev => ({
                                  ...prev,
                                  [selectedPromptId]: {
                                    variables: newPrefillValues,
                                    output: testOutput
                                  }
                                }));
                              }}
                              className="capability-select"
                              style={{
                                padding: '0.6rem 0.75rem',
                                backgroundColor: 'rgba(21, 21, 21, 0.5)',
                                border: '1px solid rgba(51, 51, 51, 0.15)',
                                color: '#ffffff',
                                borderRadius: '8px',
                                fontSize: '0.8rem'
                              }}
                            >
                              {arrayOutput.map((item: any, index: number) => {
                                // Try to get a meaningful label from the item
                                let label = `Item ${index + 1}`;
                                if (item.name) {
                                  label = `${index + 1}. ${item.name}`;
                                } else if (item.title) {
                                  label = `${index + 1}. ${item.title}`;
                                } else if (item.coreIdentity?.name) {
                                  label = `${index + 1}. ${item.coreIdentity.name}`;
                                }
                                return (
                                  <option key={index} value={index}>
                                    {label}
                                  </option>
                                );
                              })}
                            </select>
                            <p style={{
                              fontSize: '0.7rem',
                              color: '#a0aec0',
                              marginTop: '0.5rem',
                              marginBottom: 0
                            }}>
                              Previous prompt generated {arrayOutput.length} items. Select one to use its data.
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="variables-form">
                      {variables.length > 0 ? (
                        variables.map((variable) => {
                          const value = variableValues[variable] || '';
                          const isImage = isImageUrl(value);

                          return (
                            <div key={variable} className="variable-input-group">
                              <Label htmlFor={`var-${variable}`} className="variable-label">
                                {variable}
                              </Label>
                              <Input
                                id={`var-${variable}`}
                                type="text"
                                value={value}
                                onChange={(e) => {
                                  const updatedValues = {
                                    ...variableValues,
                                    [variable]: e.target.value,
                                  };
                                  setVariableValues(updatedValues);

                                  // Save to prompt state
                                  setPromptStates(prev => ({
                                    ...prev,
                                    [selectedPromptId]: {
                                      variables: updatedValues,
                                      output: testOutput
                                    }
                                  }));
                                }}
                                placeholder={`Enter ${variable}...`}
                                className="variable-input"
                              />
                              {isImage && value && (
                                <div style={{
                                  marginTop: '8px',
                                  padding: '8px',
                                  backgroundColor: 'rgba(21, 21, 21, 0.5)',
                                  border: '1px solid rgba(51, 51, 51, 0.15)',
                                  borderRadius: '8px',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center'
                                }}>
                                  <img
                                    src={value}
                                    alt={variable}
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: '200px',
                                      borderRadius: '4px',
                                      objectFit: 'contain'
                                    }}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })
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
                    <div className="output-content">
                      {renderOutput()}
                    </div>
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
