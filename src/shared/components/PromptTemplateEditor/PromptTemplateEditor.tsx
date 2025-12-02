import React, { useState, useEffect } from 'react';
import { ArrowLeft, AlertCircle, Loader, Play, Maximize2, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import Editor, { loader } from '@monaco-editor/react';
import './PromptTemplateEditor.css';

// Configure Monaco to load from local node_modules instead of CDN
// This avoids CSP issues with external CDN loading
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};

loader.config({ monaco });

interface ModelConfig {
  adaptorId: string;
  modelId: string;
}

interface AvailableModel {
  adaptorId: string;
  adaptorName: string;
  modelId: string;
  displayName: string;
  description: string;
  isDefault?: boolean;
}

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
  modelConfig?: ModelConfig;
}

interface PromptTemplate {
  id: string;
  stageType: string;
  prompts: PromptConfig[];
}

interface ThemeOption {
  id: string;
  name: string;
  description?: string;
  category?: string;
  thumbnailUrl?: string;
  players?: Array<{
    id: string;
    name: string;
    number: string;
    position?: string;
    photoUrl?: string;
  }>;
}

interface PromptTemplateEditorProps {
  stageType: string;
  projectId?: string;
  onBack: () => void;
  stageData?: Record<string, string>;
  accentColor?: string; // Optional accent color (default: #0061ff for blue)
  apiBasePath?: string; // API base path (default: /api/prompts for StoryLab, use /api/flarelab/prompts for FlareLab)
  themeSelector?: {
    themes: ThemeOption[];
    contextData?: Record<string, string>; // Additional context like sportType, homeTeam, etc.
  };
}

const CAPABILITY_LABELS: Record<string, { label: string; icon: string }> = {
  textGeneration: { label: 'Text Generation', icon: '✍️' },
  imageGeneration: { label: 'Image Generation', icon: '🎨' },
  videoGeneration: { label: 'Video Generation', icon: '🎬' },
  themeGeneration: { label: 'Theme Generation', icon: '🎨' },
  imageAnalysisAndRecommendation: { label: 'Image Analysis', icon: '🔍' },
  animationScreenplay: { label: 'Animation', icon: '🎬' },
};

interface VariableValue {
  [key: string]: string;
}

export function PromptTemplateEditor({ stageType, projectId, onBack, stageData, accentColor = '#0061ff', apiBasePath = '/api/prompts', themeSelector }: PromptTemplateEditorProps) {
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

  // Model configuration state
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Save confirmation dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  // Edited prompt state (isolated from parent)
  const [editedPrompt, setEditedPrompt] = useState<PromptConfig | null>(null);

  // Track the prompt template text separately to avoid Editor re-render issues
  const [promptText, setPromptText] = useState<string>('');

  // Store inputs and outputs per prompt (preserves state when switching prompts)
  const [promptStates, setPromptStates] = useState<Record<string, { variables: VariableValue; output: string | null }>>({});

  // For array outputs from previous prompt - track selected item
  const [selectedOutputItem, setSelectedOutputItem] = useState<number>(0);

  // Theme selector state
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');

  // Image preview modal state
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Handle theme selection - populate variables with theme data
  const handleThemeSelect = (themeId: string) => {
    if (!themeSelector) return;

    setSelectedThemeId(themeId);
    const theme = themeSelector.themes.find(t => t.id === themeId);
    if (!theme) return;

    // Build player info string and collect headshot URLs
    const playerInfo = theme.players?.map(p =>
      `${p.name} (#${p.number})${p.position ? ` - ${p.position}` : ''}`
    ).join(', ') || '';

    // Build variable values from theme and context data
    const themeVariables: VariableValue = {
      ...themeSelector.contextData,
      themeName: theme.name,
      themeDescription: theme.description || '',
      themeCategory: theme.category || '',
      themeImageUrl: theme.thumbnailUrl || '',
      playerInfo,
      playerCount: String(theme.players?.length || 0),
    };

    // Add individual player headshots
    theme.players?.forEach((player, idx) => {
      if (player.photoUrl) {
        themeVariables[`player${idx + 1}Headshot`] = player.photoUrl;
        themeVariables[`player${idx + 1}Name`] = player.name;
      }
    });

    setVariableValues(themeVariables);

    // Save to prompt state
    setPromptStates(prev => ({
      ...prev,
      [selectedPromptId]: {
        variables: themeVariables,
        output: testOutput
      }
    }));
  };

  // Load template
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log(`[PromptTemplateEditor] Loading template for stage: ${stageType}`);

        const response = await fetch(`${apiBasePath}/templates?stageType=${stageType}`);

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
            setPromptText(firstPrompt.userPromptTemplate || ''); // Initialize prompt text

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

  // Load available models when capability changes
  useEffect(() => {
    if (activeCapability) {
      loadAvailableModels(activeCapability);
    }
  }, [activeCapability]);

  const handleTestPrompt = async () => {
    if (!template || !activeCapability || !selectedPromptId) return;

    try {
      setIsTesting(true);
      setError(null);
      setTestOutput(null);

      const response = await fetch(`${apiBasePath}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageType,
          projectId,
          capability: activeCapability,
          variables: variableValues,
          customPrompt: promptText, // Send the live edited prompt text
          modelConfig: editedPrompt?.modelConfig, // Send the edited model config for testing
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

  const handleSaveButtonClick = () => {
    // Show confirmation dialog instead of saving directly
    setConfirmText('');
    setShowConfirmDialog(true);
  };

  const handleConfirmSave = async () => {
    // Close dialog and reset confirmation text
    setShowConfirmDialog(false);
    setConfirmText('');

    // Proceed with save
    await handleSavePrompt();
  };

  const handleSavePrompt = async () => {
    if (!editedPrompt || !stageType) return;

    try {
      setIsSaving(true);
      setError(null);

      // Save the prompt template
      const response = await fetch(`${apiBasePath}/templates/${stageType}/${editedPrompt.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          updates: {
            userPromptTemplate: promptText,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save prompt');
      }

      // Save the model configuration if it was changed
      if (editedPrompt.modelConfig) {
        try {
          const modelConfigResponse = await fetch(`${apiBasePath}/model-config`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              stageType,
              capability: editedPrompt.capability,
              modelConfig: editedPrompt.modelConfig,
              projectId: null, // Save to default template, not project-specific
            }),
          });

          if (!modelConfigResponse.ok) {
            const errorData = await modelConfigResponse.json();
            console.warn('Failed to save model config:', errorData.error);
            // Don't fail the whole save if model config fails
          }
        } catch (modelConfigError) {
          console.warn('Error saving model config:', modelConfigError);
          // Don't fail the whole save if model config fails
        }
      }

      setSuccessMessage('Prompt saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // Refresh template to get latest from database
      const refreshResponse = await fetch(`${apiBasePath}/templates?stageType=${stageType}`);
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        if (refreshData.templates && refreshData.templates.length > 0) {
          setTemplate(refreshData.templates[0]);
          // Update editedPrompt with the saved version
          const updatedPrompt = refreshData.templates[0].prompts.find((p: PromptConfig) => p.id === editedPrompt.id);
          if (updatedPrompt) {
            setEditedPrompt({ ...updatedPrompt });
            setPromptText(updatedPrompt.userPromptTemplate || ''); // Keep promptText in sync
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

  // Load available models for the current capability
  const loadAvailableModels = async (capability: string) => {
    try {
      setIsLoadingModels(true);
      console.log(`[PromptTemplateEditor] Loading available models for capability: ${capability}`);

      const response = await fetch(`${apiBasePath}/available-models?capability=${capability}`);

      if (!response.ok) {
        throw new Error('Failed to load available models');
      }

      const data = await response.json();
      setAvailableModels(data.models || []);
      console.log(`[PromptTemplateEditor] Loaded ${data.models?.length || 0} models for ${capability}`);
    } catch (err) {
      console.error('[PromptTemplateEditor] Error loading models:', err);
      setAvailableModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Update model configuration for current prompt (local state only, saved on "Save Prompt")
  const handleModelChange = (newModelConfig: ModelConfig) => {
    if (!activeCapability || !editedPrompt) return;

    console.log(`[PromptTemplateEditor] Updating model config (local) for ${stageType}/${activeCapability} to ${newModelConfig.adaptorId}/${newModelConfig.modelId}`);

    // Update only local state - will be saved when "Save Prompt" is clicked
    setEditedPrompt({
      ...editedPrompt,
      modelConfig: newModelConfig,
    });
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

  // Monaco Editor configuration - called BEFORE editor mounts
  const handleEditorBeforeMount = (monacoInstance: any) => {
    // Register custom language for prompt templates
    monacoInstance.languages.register({ id: 'prompt-template' });

    // Define syntax highlighting rules
    monacoInstance.languages.setMonarchTokensProvider('prompt-template', {
      tokenizer: {
        root: [
          // Highlight {{variableName}} pattern
          [/\{\{[^}]+\}\}/, 'variable'],
        ],
      },
    });

    // Define colors for the tokens - this runs BEFORE editor renders
    monacoInstance.editor.defineTheme('prompt-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'variable', foreground: accentColor.replace('#', ''), fontStyle: 'bold' },
      ],
      colors: {
        'editor.background': '#0a0a0a',
        'editor.foreground': '#e0e0e0',
        'editorLineNumber.foreground': '#666666',
        'editor.lineHighlightBackground': '#1a1a1a',
        'editor.selectionBackground': '#264f78',
        'editorCursor.foreground': accentColor,
      },
    });
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
                color: accentColor,
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
          padding: '1rem',
          position: 'relative',
        }}>
          <img
            src={testOutput}
            alt="Generated output"
            style={{
              maxWidth: '100%',
              maxHeight: '600px',
              borderRadius: '8px',
              objectFit: 'contain',
              border: '1px solid rgba(51, 51, 51, 0.2)',
              cursor: 'pointer',
            }}
            onClick={() => setPreviewImage({ url: testOutput, title: 'Generated Output' })}
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
          <button
            onClick={() => setPreviewImage({ url: testOutput, title: 'Generated Output' })}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              width: '36px',
              height: '36px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              border: 'none',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              opacity: 0.7,
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            title="View larger"
          >
            <Maximize2 style={{ width: '18px', height: '18px', color: 'white' }} />
          </button>
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
    <div className="prompt-template-editor-split" style={{ '--prompt-editor-accent': accentColor } as React.CSSProperties}>
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
            <h1 className="prompt-editor-title" style={{ color: accentColor }}>Playground</h1>
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
                        color: accentColor,
                        backgroundColor: `${accentColor}15`,
                        border: `1px solid ${accentColor}30`,
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
                  <Select
                    value={selectedPromptId}
                    onValueChange={(newPromptId) => {
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
                        setPromptText(prompt.userPromptTemplate || ''); // Update prompt text

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
                  >
                    <SelectTrigger style={{ backgroundColor: 'rgba(21, 21, 21, 0.6)', border: '1px solid rgba(51, 51, 51, 0.2)', color: '#ffffff' }}>
                      <SelectValue placeholder="Choose a prompt..." />
                    </SelectTrigger>
                    <SelectContent style={{ backgroundColor: '#151515', border: '1px solid rgba(51, 51, 51, 0.2)' }}>
                      {allPrompts.map((prompt) => (
                        <SelectItem key={prompt.id} value={prompt.id} style={{ color: '#ffffff' }}>
                          {prompt.name} {prompt.isDefault ? '(Default)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Model Selector */}
                {currentPrompt && editedPrompt && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: 'rgba(51, 51, 51, 0.08)',
                    borderRadius: '8px',
                    border: '1px solid rgba(51, 51, 51, 0.2)'
                  }}>
                    <Label style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#a0aec0',
                      marginBottom: '8px',
                      display: 'block',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      AI Model Configuration
                    </Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                      <Select
                        value={editedPrompt.modelConfig ? `${editedPrompt.modelConfig.adaptorId}/${editedPrompt.modelConfig.modelId}` : ''}
                        onValueChange={(value) => {
                          const [adaptorId, modelId] = value.split('/');
                          if (adaptorId && modelId) {
                            handleModelChange({ adaptorId, modelId });
                          }
                        }}
                        disabled={isLoadingModels}
                      >
                        <SelectTrigger style={{ flex: 1, backgroundColor: 'rgba(21, 21, 21, 0.6)', border: '1px solid rgba(51, 51, 51, 0.2)', color: '#ffffff' }}>
                          <SelectValue placeholder="Select a model..." />
                        </SelectTrigger>
                        <SelectContent style={{ backgroundColor: '#151515', border: '1px solid rgba(51, 51, 51, 0.2)' }}>
                          {isLoadingModels ? (
                            <SelectItem value="loading" disabled>Loading models...</SelectItem>
                          ) : availableModels.length === 0 ? (
                            <SelectItem value="none" disabled>No models available</SelectItem>
                          ) : (
                            <>
                              {availableModels.map((model) => (
                                <SelectItem
                                  key={`${model.adaptorId}/${model.modelId}`}
                                  value={`${model.adaptorId}/${model.modelId}`}
                                  style={{ color: '#ffffff' }}
                                >
                                  {model.adaptorName} - {model.displayName}
                                  {model.isDefault ? ' (Default)' : ''}
                                </SelectItem>
                              ))}
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    {editedPrompt.modelConfig && availableModels.length > 0 && (
                      <p style={{
                        marginTop: '8px',
                        fontSize: '0.7rem',
                        color: '#a0aec0',
                        lineHeight: '1.4',
                        margin: '8px 0 0 0'
                      }}>
                        {availableModels.find(m => m.modelId === editedPrompt.modelConfig?.modelId)?.description || 'Model configuration for this prompt'}
                      </p>
                    )}
                  </div>
                )}

                {/* Display & Edit Selected Prompt */}
                {currentPrompt && (
                  <div className="prompt-display" style={{ marginTop: '16px' }}>
                    {/* Editable User Prompt Template - Larger */}
                    <div className="prompt-display-section">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <h3 className="prompt-display-title" style={{ margin: 0 }}>User Prompt Template</h3>
                        <Button
                          onClick={handleSaveButtonClick}
                          disabled={isSaving || isTesting}
                          size="sm"
                          className="test-button"
                          style={{
                            backgroundColor: accentColor,
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
                        height: '450px',
                        border: '1px solid rgba(51, 51, 51, 0.15)',
                        borderRadius: '8px',
                        overflow: 'hidden'
                      }}>
                        <Editor
                          height="450px"
                          defaultLanguage="prompt-template"
                          language="prompt-template"
                          theme="prompt-theme"
                          value={promptText}
                          onChange={(value) => {
                            const newValue = value || '';
                            // Update promptText directly - this is the source of truth
                            setPromptText(newValue);
                            // Keep editedPrompt in sync for other uses
                            setEditedPrompt(prev => prev ? { ...prev, userPromptTemplate: newValue } : null);
                          }}
                          beforeMount={handleEditorBeforeMount}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            lineNumbers: 'off',
                            wordWrap: 'on',
                            wrappingIndent: 'same',
                            automaticLayout: true,
                            scrollBeyondLastLine: false,
                            folding: false,
                            renderLineHighlight: 'none',
                            overviewRulerBorder: false,
                            hideCursorInOverviewRuler: true,
                            overviewRulerLanes: 0,
                            scrollbar: {
                              vertical: 'visible',
                              horizontal: 'visible',
                              verticalScrollbarSize: 10,
                              horizontalScrollbarSize: 10,
                            },
                            padding: { top: 12, bottom: 12 },
                            // Disable autocomplete and suggestions
                            quickSuggestions: false,
                            suggestOnTriggerCharacters: false,
                            wordBasedSuggestions: 'off',
                            parameterHints: { enabled: false },
                            suggest: {
                              showWords: false,
                              showSnippets: false,
                            },
                            acceptSuggestionOnEnter: 'off',
                            tabCompletion: 'off',
                            // Disable glyph margin (area for breakpoints, etc.)
                            glyphMargin: false,
                            // Disable line decorations
                            lineDecorationsWidth: 0,
                            lineNumbersMinChars: 0,
                          }}
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
                          color: accentColor,
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

                    {/* Theme Selector for stages with multiple themes */}
                    {themeSelector && themeSelector.themes.length > 0 && (
                      <div style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        backgroundColor: 'rgba(21, 21, 21, 0.8)',
                        border: '1px solid rgba(51, 51, 51, 0.3)',
                        borderRadius: '12px',
                      }}>
                        <Label style={{ display: 'block', marginBottom: '0.75rem', color: '#e2e8f0', fontWeight: 600 }}>
                          Select Theme
                        </Label>
                        <Select value={selectedThemeId} onValueChange={handleThemeSelect}>
                          <SelectTrigger className="w-full" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }}>
                            <SelectValue placeholder="Choose a theme to populate inputs..." />
                          </SelectTrigger>
                          <SelectContent>
                            {themeSelector.themes.map((theme) => (
                              <SelectItem key={theme.id} value={theme.id}>
                                {theme.name} {theme.category && `(${theme.category})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Show selected theme preview */}
                        {selectedThemeId && (() => {
                          const theme = themeSelector.themes.find(t => t.id === selectedThemeId);
                          if (!theme) return null;
                          return (
                            <div style={{ marginTop: '1rem' }}>
                              {/* Theme Image */}
                              {theme.thumbnailUrl && (
                                <div style={{ marginBottom: '1rem' }}>
                                  <Label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0aec0', fontSize: '0.8rem' }}>
                                    Theme Reference Image
                                  </Label>
                                  <div style={{
                                    padding: '8px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    position: 'relative',
                                  }}>
                                    <img
                                      src={theme.thumbnailUrl}
                                      alt={theme.name}
                                      style={{
                                        maxWidth: '100%',
                                        maxHeight: '150px',
                                        borderRadius: '6px',
                                        objectFit: 'contain',
                                        cursor: 'pointer',
                                      }}
                                      onClick={() => setPreviewImage({ url: theme.thumbnailUrl!, title: `Theme: ${theme.name}` })}
                                    />
                                    <button
                                      onClick={() => setPreviewImage({ url: theme.thumbnailUrl!, title: `Theme: ${theme.name}` })}
                                      style={{
                                        position: 'absolute',
                                        top: '12px',
                                        right: '12px',
                                        width: '28px',
                                        height: '28px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                        border: 'none',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        opacity: 0.7,
                                        transition: 'opacity 0.2s',
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                                      title="View larger"
                                    >
                                      <Maximize2 style={{ width: '14px', height: '14px', color: 'white' }} />
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Player Headshots */}
                              {theme.players && theme.players.length > 0 && (
                                <div>
                                  <Label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0aec0', fontSize: '0.8rem' }}>
                                    Player Headshots ({theme.players.length})
                                  </Label>
                                  <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '12px',
                                    padding: '8px',
                                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                    borderRadius: '8px',
                                  }}>
                                    {theme.players.map((player, idx) => (
                                      <div key={player.id || idx} style={{ textAlign: 'center', position: 'relative' }}>
                                        {player.photoUrl ? (
                                          <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <img
                                              src={player.photoUrl}
                                              alt={player.name}
                                              style={{
                                                width: '60px',
                                                height: '60px',
                                                borderRadius: '8px',
                                                objectFit: 'cover',
                                                border: '2px solid #333',
                                                cursor: 'pointer',
                                              }}
                                              onClick={() => setPreviewImage({ url: player.photoUrl!, title: `${player.name} (#${player.number})` })}
                                            />
                                            <button
                                              onClick={() => setPreviewImage({ url: player.photoUrl!, title: `${player.name} (#${player.number})` })}
                                              style={{
                                                position: 'absolute',
                                                top: '2px',
                                                right: '2px',
                                                width: '20px',
                                                height: '20px',
                                                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                                border: 'none',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                opacity: 0,
                                                transition: 'opacity 0.2s',
                                              }}
                                              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                              title="View larger"
                                            >
                                              <Maximize2 style={{ width: '10px', height: '10px', color: 'white' }} />
                                            </button>
                                          </div>
                                        ) : (
                                          <div style={{
                                            width: '60px',
                                            height: '60px',
                                            borderRadius: '8px',
                                            backgroundColor: accentColor,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontWeight: 'bold',
                                            fontSize: '1.2rem'
                                          }}>
                                            {player.number}
                                          </div>
                                        )}
                                        <p style={{
                                          fontSize: '0.7rem',
                                          color: '#a0aec0',
                                          marginTop: '4px',
                                          maxWidth: '70px',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {player.name}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}

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
                                  alignItems: 'center',
                                  position: 'relative',
                                }}>
                                  <img
                                    src={value}
                                    alt={variable}
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: '200px',
                                      borderRadius: '4px',
                                      objectFit: 'contain',
                                      cursor: 'pointer',
                                    }}
                                    onClick={() => setPreviewImage({ url: value, title: variable })}
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                  <button
                                    onClick={() => setPreviewImage({ url: value, title: variable })}
                                    style={{
                                      position: 'absolute',
                                      top: '12px',
                                      right: '12px',
                                      width: '28px',
                                      height: '28px',
                                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                      border: 'none',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      cursor: 'pointer',
                                      opacity: 0.7,
                                      transition: 'opacity 0.2s',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                                    title="View larger"
                                  >
                                    <Maximize2 style={{ width: '14px', height: '14px', color: 'white' }} />
                                  </button>
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
                      style={{ backgroundColor: accentColor }}
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

      {/* Save Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent style={{ backgroundColor: '#0a0a0a', border: '1px solid #333333' }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: '#ffffff' }}>Confirm Prompt Save</AlertDialogTitle>
            <AlertDialogDescription style={{ color: '#a0aec0' }}>
              This will save the prompt template and model configuration. This action will affect all future generations using this prompt.
              <br /><br />
              Type <strong style={{ color: accentColor }}>CONFIRM</strong> to proceed:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ margin: '16px 0' }}>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type CONFIRM"
              style={{
                backgroundColor: 'rgba(21, 21, 21, 0.6)',
                border: '1px solid rgba(51, 51, 51, 0.2)',
                color: '#ffffff'
              }}
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowConfirmDialog(false);
                setConfirmText('');
              }}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #333333',
                color: '#d1d5db'
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              disabled={confirmText !== 'CONFIRM'}
              style={{
                backgroundColor: confirmText === 'CONFIRM' ? accentColor : '#333333',
                color: '#ffffff',
                cursor: confirmText === 'CONFIRM' ? 'pointer' : 'not-allowed',
                opacity: confirmText === 'CONFIRM' ? 1 : 0.5
              }}
            >
              Save Prompt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              width: '40px',
              height: '40px',
              backgroundColor: 'rgba(55, 55, 55, 0.8)',
              border: 'none',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(75, 75, 75, 0.9)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(55, 55, 55, 0.8)'}
          >
            <X style={{ width: '20px', height: '20px', color: 'white' }} />
          </button>
          <div style={{ textAlign: 'center', maxWidth: '90vw', maxHeight: '90vh' }}>
            <img
              src={previewImage.url}
              alt={previewImage.title}
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <p style={{
              color: 'white',
              marginTop: '1rem',
              fontSize: '0.9rem',
              opacity: 0.8,
            }}>
              {previewImage.title}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PromptTemplateEditor;
