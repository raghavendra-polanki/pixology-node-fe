/**
 * AIImageEditor - A reusable AI-powered image editing component
 *
 * Features:
 * - Side-by-side comparison (original vs edited)
 * - Edit history with undo capability
 * - Customizable quick edit presets per product
 * - Better loading states and visual feedback
 */

import { useState, useCallback } from 'react';
import {
  Wand2,
  X,
  Check,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  History,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';

// ============ Types ============

interface EditHistoryItem {
  imageUrl: string;
  prompt: string;
  timestamp: Date;
}

export interface PresetItem {
  label: string;
  prompt: string;
}

export interface PresetCategory {
  [category: string]: PresetItem[];
}

export interface AIImageEditorProps {
  /** Original image URL to edit */
  originalImageUrl: string;
  /** Title of the image being edited */
  title?: string;
  /** Accent color for the UI (default: orange-500) */
  accentColor?: string;
  /** Context information for better AI understanding */
  context?: {
    [key: string]: string | undefined;
  };
  /** Stage type for API routing */
  stageType?: string;
  /** Project ID */
  projectId: string;
  /** Called when user saves the edited image */
  onSave: (newImageUrl: string) => Promise<void>;
  /** Called when user cancels/closes the editor */
  onClose: () => void;
  /** API base path for the image edit endpoint */
  apiBasePath?: string;
  /** Custom presets - if not provided, uses default FlareLab presets */
  presets?: PresetCategory;
}

// ============ Default Presets (FlareLab - Sports Broadcast) ============

export const FLARELAB_PRESETS: PresetCategory = {
  lighting: [
    { label: 'Warmer tones', prompt: 'Make the lighting warmer with golden/orange tones' },
    { label: 'Cooler tones', prompt: 'Make the lighting cooler with blue/cyan tones' },
    { label: 'More dramatic', prompt: 'Add more dramatic lighting with stronger shadows and highlights' },
    { label: 'Brighter', prompt: 'Make the overall image brighter and more vibrant' },
  ],
  style: [
    { label: 'More intense', prompt: 'Make the visual style more intense and dynamic' },
    { label: 'More subtle', prompt: 'Make the visual style more subtle and refined' },
    { label: 'Add glow effects', prompt: 'Add glowing neon or light effects to enhance the broadcast look' },
    { label: 'More cinematic', prompt: 'Make the image more cinematic with film-like color grading' },
  ],
  composition: [
    { label: 'Add depth', prompt: 'Add more depth to the background with layers or blur' },
    { label: 'More dynamic', prompt: 'Make the composition more dynamic with motion blur or action lines' },
    { label: 'Center focus', prompt: 'Increase focus on the center subject with vignette effect' },
    { label: 'Add particles', prompt: 'Add particle effects like sparks, dust, or energy particles' },
  ],
  broadcast: [
    { label: 'ESPN style', prompt: 'Style this like an ESPN broadcast graphic with bold colors and sharp text areas' },
    { label: 'FOX Sports style', prompt: 'Style this like a FOX Sports broadcast with dynamic angles and energetic colors' },
    { label: 'NBC Sports style', prompt: 'Style this like an NBC Sports broadcast with clean, professional look' },
    { label: 'Add team colors', prompt: 'Incorporate more of the team colors into the design' },
  ],
};

// ============ StoryLab Presets (Marketing Video Storyboard) ============

export const STORYLAB_PRESETS: PresetCategory = {
  mood: [
    { label: 'Uplifting & Bright', prompt: 'Make the mood more uplifting with bright, optimistic lighting and warm colors' },
    { label: 'Dramatic & Bold', prompt: 'Add dramatic tension with high contrast lighting and bold shadows' },
    { label: 'Calm & Serene', prompt: 'Create a calm, peaceful atmosphere with soft lighting and muted tones' },
    { label: 'Energetic & Dynamic', prompt: 'Make the scene more energetic with vibrant colors and dynamic lighting' },
  ],
  setting: [
    { label: 'Modern Interior', prompt: 'Transform the setting to a modern, clean interior space with contemporary design' },
    { label: 'Outdoor Natural', prompt: 'Change to an outdoor natural setting with soft natural lighting' },
    { label: 'Urban Environment', prompt: 'Place the scene in an urban city environment with street elements' },
    { label: 'Studio Setup', prompt: 'Create a professional studio setting with controlled lighting' },
  ],
  product: [
    { label: 'Hero Shot', prompt: 'Make the product more prominent as the hero of the shot with better lighting and focus' },
    { label: 'Lifestyle Context', prompt: 'Show the product in a natural lifestyle context being used or enjoyed' },
    { label: 'Close-up Detail', prompt: 'Focus on product details with a closer, more detailed view' },
    { label: 'Subtle Placement', prompt: 'Make the product placement more subtle and natural within the scene' },
  ],
  style: [
    { label: 'Cinematic Film', prompt: 'Apply cinematic film-like color grading with letterbox aspect and rich colors' },
    { label: 'Commercial Polish', prompt: 'Make it look like a polished TV commercial with professional lighting' },
    { label: 'Social Media Ready', prompt: 'Optimize for social media with vibrant, eye-catching colors and clarity' },
    { label: 'Documentary Feel', prompt: 'Give it a documentary-style authenticity with natural, less polished look' },
  ],
  character: [
    { label: 'More Expressive', prompt: 'Make the person/character more expressive with clearer emotions visible' },
    { label: 'Professional Look', prompt: 'Give the person a more professional, polished appearance' },
    { label: 'Relatable & Casual', prompt: 'Make the person look more relatable and casual, like an everyday person' },
    { label: 'Confident Pose', prompt: 'Adjust to show more confident body language and positioning' },
  ],
};

// ============ Component ============

export function AIImageEditor({
  originalImageUrl,
  title = 'Edit Image',
  accentColor = '#f97316',
  context = {},
  stageType = 'stage_2_themes',
  projectId,
  onSave,
  onClose,
  apiBasePath = '/api/flarelab/image-edit',
  presets = FLARELAB_PRESETS,
}: AIImageEditorProps) {
  // State
  const [editPrompt, setEditPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit history - starts with original image
  const [editHistory, setEditHistory] = useState<EditHistoryItem[]>([
    { imageUrl: originalImageUrl, prompt: 'Original', timestamp: new Date() }
  ]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(0);

  // UI state
  const [showPresets, setShowPresets] = useState(true);
  const presetCategories = Object.keys(presets);
  const [activePresetCategory, setActivePresetCategory] = useState<string>(presetCategories[0] || 'lighting');

  // Current image being displayed
  const currentImage = editHistory[currentHistoryIndex];
  const hasEdits = editHistory.length > 1;
  const isShowingOriginal = currentHistoryIndex === 0;
  const latestEdit = editHistory[editHistory.length - 1];

  // Handle AI edit submission
  const handleEditSubmit = useCallback(async (prompt?: string) => {
    const editText = prompt || editPrompt.trim();
    if (!editText) {
      setError('Please describe what changes you want to make');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`${apiBasePath}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          imageUrl: currentImage.imageUrl, // Use current image as base
          editPrompt: editText,
          context,
          stageType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit image');
      }

      const result = await response.json();

      // Add to history
      const newHistoryItem: EditHistoryItem = {
        imageUrl: result.imageUrl,
        prompt: editText,
        timestamp: new Date(),
      };

      // If we're not at the end of history, truncate future edits
      const newHistory = [...editHistory.slice(0, currentHistoryIndex + 1), newHistoryItem];
      setEditHistory(newHistory);
      setCurrentHistoryIndex(newHistory.length - 1);

      // Clear prompt for next edit
      setEditPrompt('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to edit image');
    } finally {
      setIsGenerating(false);
    }
  }, [editPrompt, currentImage, apiBasePath, projectId, context, stageType, editHistory, currentHistoryIndex]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!hasEdits) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(latestEdit.imageUrl);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save image');
    } finally {
      setIsSaving(false);
    }
  }, [hasEdits, latestEdit, onSave, onClose]);

  // Navigate history
  const goBack = () => setCurrentHistoryIndex(Math.max(0, currentHistoryIndex - 1));
  const goForward = () => setCurrentHistoryIndex(Math.min(editHistory.length - 1, currentHistoryIndex + 1));
  const goToOriginal = () => setCurrentHistoryIndex(0);
  const goToLatest = () => setCurrentHistoryIndex(editHistory.length - 1);

  // Apply preset
  const applyPreset = (preset: PresetItem) => {
    setEditPrompt(preset.prompt);
  };

  // Get current category presets
  const currentPresets = presets[activePresetCategory] || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-[95vw] max-w-7xl h-[90vh] bg-[#0a0a0a] rounded-2xl overflow-hidden flex flex-col border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Wand2 className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">AI Image Editor</h2>
              <p className="text-gray-400 text-sm">{title}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Image Display */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-800">
            {/* Image Comparison View */}
            <div className="flex-1 flex items-center justify-center p-6 bg-gray-950">
              <div className="relative max-w-full max-h-full">
                <img
                  src={currentImage.imageUrl}
                  alt="Current edit"
                  className="max-w-full max-h-[calc(90vh-280px)] object-contain rounded-lg shadow-2xl"
                />

                {/* Edit badge */}
                {!isShowingOriginal && (
                  <div
                    className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
                    style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                  >
                    <Sparkles className="w-4 h-4" />
                    Edit {currentHistoryIndex} of {editHistory.length - 1}
                  </div>
                )}

                {isShowingOriginal && (
                  <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-800 text-gray-300">
                    Original
                  </div>
                )}
              </div>
            </div>

            {/* History Navigation */}
            {hasEdits && (
              <div className="px-6 py-4 bg-gray-900/50 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-400">Edit History</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      onClick={goToOriginal}
                      variant="ghost"
                      size="sm"
                      disabled={isShowingOriginal}
                      className="text-gray-400 hover:text-white"
                    >
                      Original
                    </Button>

                    <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
                      <button
                        onClick={goBack}
                        disabled={currentHistoryIndex === 0}
                        className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-gray-300 px-2 min-w-[60px] text-center">
                        {currentHistoryIndex + 1} / {editHistory.length}
                      </span>
                      <button
                        onClick={goForward}
                        disabled={currentHistoryIndex === editHistory.length - 1}
                        className="p-1.5 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <Button
                      onClick={goToLatest}
                      variant="ghost"
                      size="sm"
                      disabled={currentHistoryIndex === editHistory.length - 1}
                      className="text-gray-400 hover:text-white"
                    >
                      Latest
                    </Button>
                  </div>
                </div>

                {/* Current edit prompt */}
                {!isShowingOriginal && (
                  <div className="mt-3 p-3 bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-300">
                      <span className="text-gray-500">Edit {currentHistoryIndex}:</span> {currentImage.prompt}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Edit Controls */}
          <div className="w-[420px] flex flex-col bg-gray-900/30 overflow-y-auto">
            {/* Edit Prompt Input */}
            <div className="p-6 border-b border-gray-800">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Describe your changes
              </label>
              <Textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="E.g., 'Make the lighting more dramatic' or 'Add a subtle glow effect'..."
                className="min-h-[120px] bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-500 resize-none"
                disabled={isGenerating}
              />

              {/* Error Message */}
              {error && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={() => handleEditSubmit()}
                disabled={!editPrompt.trim() || isGenerating}
                className="w-full mt-4 h-12"
                style={{
                  backgroundColor: isGenerating ? '#374151' : accentColor,
                  color: '#ffffff',
                }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5 mr-2" />
                    Apply Edit
                  </>
                )}
              </Button>
            </div>

            {/* Quick Presets */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-300">Quick Edits</span>
                </div>
                <button
                  onClick={() => setShowPresets(!showPresets)}
                  className="text-xs text-gray-500 hover:text-gray-300"
                >
                  {showPresets ? 'Hide' : 'Show'}
                </button>
              </div>

              {showPresets && (
                <>
                  {/* Preset Category Tabs */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                    {presetCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setActivePresetCategory(category)}
                        className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                          activePresetCategory === category
                            ? 'text-white'
                            : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                        style={activePresetCategory === category ? { backgroundColor: `${accentColor}30`, color: accentColor } : {}}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Preset Buttons */}
                  <div className="space-y-2">
                    {currentPresets.map((preset, index) => (
                      <button
                        key={index}
                        onClick={() => applyPreset(preset)}
                        disabled={isGenerating}
                        className="w-full p-3 text-left bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 hover:border-gray-600 transition-all disabled:opacity-50"
                      >
                        <p className="text-sm text-white font-medium">{preset.label}</p>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">{preset.prompt}</p>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-gray-800 bg-gray-900/50">
              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                  disabled={isGenerating || isSaving}
                >
                  Cancel
                </Button>

                {hasEdits && (
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || isGenerating}
                    className="flex-1"
                    style={{ backgroundColor: accentColor }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                )}
              </div>

              {hasEdits && (
                <p className="text-xs text-gray-500 text-center mt-3">
                  This will save the latest edit to your project
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIImageEditor;
