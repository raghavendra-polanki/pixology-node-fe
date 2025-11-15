import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, FileText, Edit2, Save, SettingsIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useStoryLabProject } from '../../hooks/useStoryLabProject';
import { PromptTemplateEditor } from '../shared/PromptTemplateEditor';

interface ScreenplayEntry {
  sceneNumber: number;
  timeStart: string;
  timeEnd: string;
  visual: string;
  cameraFlow: string;
  script: string;
  backgroundMusic: string;
  transition: string;
}

interface Stage5Props {
  project?: any;
  projectId?: string;
  updateAIScreenplay?: (screenplay: any, projectId: string) => Promise<void>;
  updateScreenplayCustomizations?: (customizations: any, projectId: string) => Promise<void>;
  markStageCompleted?: (stage: string) => Promise<void>;
  advanceToNextStage?: () => Promise<void>;
  navigateToStage?: (stageId: number) => void;
}

// Helper function to format script/dialogue content
function formatScriptContent(script: any): string {
  // Handle arrays - join with newlines
  if (Array.isArray(script)) {
    return script.map(item => formatScriptContent(item)).join('\n');
  }

  // Handle strings - try to parse if it looks like JSON
  if (typeof script === 'string') {
    // Check if string is a JSON array
    const trimmed = script.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.join('\n');
        }
      } catch (e) {
        // Not valid JSON, return as is
      }
    }
    return script;
  }

  // Handle objects with specific structure
  if (typeof script === 'object' && script !== null) {
    // Handle script objects with {type, speaker, text} structure
    if (script.speaker && script.text) {
      return `${script.speaker}: ${script.text}`;
    }
    if (script.text) {
      return script.text;
    }
    // Fallback: convert object to string
    return JSON.stringify(script);
  }

  return String(script);
}

// Helper function to parse and format content with timecodes
function parseTimecodeContent(content: string): { timecode: string; text: string }[] | null {
  if (!content || typeof content !== 'string') return null;

  // Pattern to match timecode entries like "0:00-0:01: text" or "SFX 0:00-0:01: text" or "VO 0:02-0:03: text"
  const timecodePattern = /(?:^|\n)(?:(SFX|VO|Text)\s+)?(\d+:\d+(?:\.\d+)?)\s*[-–]\s*(\d+:\d+(?:\.\d+)?)\s*:\s*(.+?)(?=(?:\n(?:SFX|VO|Text)?\s*\d+:\d+|\n\n|$))/gis;

  const matches = Array.from(content.matchAll(timecodePattern));

  if (matches.length === 0) return null;

  return matches.map(match => ({
    timecode: `${match[1] ? match[1] + ' ' : ''}${match[2]}-${match[3]}`,
    text: match[4].trim()
  }));
}

// Component to render formatted timecode content
function TimecodeContent({ content }: { content: string }) {
  const parsed = parseTimecodeContent(content);

  if (!parsed) {
    // No timecodes found, render as plain text with line breaks
    return (
      <div className="space-y-1">
        {content.split('\n').filter(line => line.trim()).map((line, idx) => (
          <p key={idx} className="text-gray-300 text-sm leading-relaxed">{line}</p>
        ))}
      </div>
    );
  }

  // Render with timecode formatting
  return (
    <div className="space-y-2">
      {parsed.map((item, idx) => (
        <div key={idx} className="flex gap-2">
          <span className="text-blue-400 text-xs font-mono whitespace-nowrap flex-shrink-0 mt-0.5">
            {item.timecode}
          </span>
          <span className="text-gray-300 text-sm leading-relaxed flex-1">
            {item.text}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Stage5Screenplay({
  project: propProject,
  projectId: propProjectId,
  updateAIScreenplay: propUpdateAIScreenplay,
  updateScreenplayCustomizations: propUpdateScreenplayCustomizations,
  markStageCompleted: propMarkStageCompleted,
  advanceToNextStage: propAdvanceToNextStage,
  navigateToStage: propNavigateToStage,
}: Stage5Props) {
  // Load project using hook, but prefer passed props from WorkflowView
  const hookResult = useStoryLabProject({ autoLoad: true, projectId: propProjectId || propProject?.id || '' });

  // Use passed props from WorkflowView (preferred) or fall back to hook results
  const project = propProject || hookResult.project;
  const isSaving = hookResult.isSaving;
  const updateAIScreenplay = propUpdateAIScreenplay || hookResult.updateAIScreenplay;
  const updateScreenplayCustomizations = propUpdateScreenplayCustomizations || hookResult.updateScreenplayCustomizations;
  const markStageCompleted = propMarkStageCompleted || hookResult.markStageCompleted;
  const advanceToNextStage = propAdvanceToNextStage || hookResult.advanceToNextStage;
  const navigateToStage = propNavigateToStage;

  const [screenplay, setScreenplay] = useState<ScreenplayEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);

  // Sync screenplay with project data when loaded
  useEffect(() => {
    if (project?.aiGeneratedScreenplay?.screenplay && Array.isArray(project.aiGeneratedScreenplay.screenplay)) {
      setScreenplay(project.aiGeneratedScreenplay.screenplay);
    } else {
      setScreenplay([]);
    }
  }, [project?.aiGeneratedScreenplay]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);

      // Validate required project data
      if (!project?.aiGeneratedStoryboard?.scenes || project.aiGeneratedStoryboard.scenes.length === 0) {
        throw new Error('No storyboard scenes found. Please generate storyboard first.');
      }

      const selectedPersona = project?.aiGeneratedPersonas?.personas?.find(
        (p: any) => p.id === project?.userPersonaSelection?.selectedPersonaIds?.[0]
      );

      if (!selectedPersona) {
        throw new Error('No persona selected. Please select a persona first.');
      }

      const selectedPersonaName = selectedPersona.coreIdentity?.name || 'Character';
      const videoDuration = project?.campaignDetails?.videoDuration || '30s';

      console.log('Generating screenplay for scenes:', project.aiGeneratedStoryboard.scenes.length);

      // Generate screenplay using adaptor-based V2 service
      const generationResponse = await fetch('/api/generation/screenplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          storyboardScenes: project.aiGeneratedStoryboard.scenes,
          videoDuration,
          selectedPersonaName,
        }),
      });

      if (!generationResponse.ok) {
        const errorData = await generationResponse.json();
        throw new Error(errorData.error || 'Failed to generate screenplay');
      }

      const generationData = await generationResponse.json();
      const screenplayEntries: ScreenplayEntry[] = generationData.data?.screenplay || [];

      if (screenplayEntries.length === 0) {
        throw new Error('No screenplay entries returned from generation service');
      }

      console.log('Screenplay generation completed');

      // Update screenplay state
      setScreenplay(screenplayEntries);

      // Save to project
      await updateAIScreenplay(
        {
          screenplay: screenplayEntries,
          generatedAt: new Date(),
          model: 'screenplay-generation-v2',
        },
        project?.id || projectId || ''
      );

      console.log('Screenplay saved successfully');
    } catch (error) {
      console.error('Error generating screenplay:', error);
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEdit = (sceneNumber: number, field: keyof ScreenplayEntry, value: string | number) => {
    setScreenplay(screenplay.map(s => s.sceneNumber === sceneNumber ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async () => {
    try {
      console.log('handleSubmit: Starting screenplay finalization');

      // Prepare screenplay customizations if any
      const additionalUpdates = screenplay.length > 0 ? {
        screenplayCustomizations: {
          editedText: screenplay,
          lastEditedAt: new Date(),
        }
      } : undefined;

      // Mark stage as completed with batched updates (includes customizations, stage execution, and stage advancement)
      console.log('handleSubmit: Marking screenplay stage as completed with batched updates...');
      await markStageCompleted('screenplay', undefined, additionalUpdates);
      console.log('handleSubmit: Screenplay stage completed and advanced to next stage (single save operation)');

      // Navigate to next stage (Generate Video = stage 6)
      if (navigateToStage) {
        navigateToStage(6);
      }
    } catch (error) {
      console.error('Failed to save screenplay:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Error finalizing screenplay: ${errorMessage}`);
    }
  };

  const handleEditPrompts = () => {
    setShowPromptEditor(true);
  };

  // Show prompt editor if requested
  if (showPromptEditor) {
    // Get selected persona
    const selectedPersona = project?.aiGeneratedPersonas?.personas?.find(
      (p: any) => p.id === project?.userPersonaSelection?.selectedPersonaIds?.[0]
    );
    const selectedPersonaName = selectedPersona?.coreIdentity?.name || 'Character';

    // Format storyboard scenes for the prompt
    const storyboardScenes = project?.aiGeneratedStoryboard?.scenes || [];
    const storyboardScenesText = storyboardScenes.map((scene: any, index: number) => {
      return `Scene ${index + 1}: ${scene.title || 'Untitled'}
Description: ${scene.description || 'No description'}
Location: ${scene.location || 'Not specified'}
Visual Elements: ${scene.visualElements || 'Not specified'}
Camera Work: ${scene.cameraWork || 'Not specified'}`;
    }).join('\n\n');

    return (
      <PromptTemplateEditor
        stageType="stage_5_screenplay"
        projectId={project?.id}
        onBack={() => setShowPromptEditor(false)}
        stageData={{
          storyboardScenes: storyboardScenesText || 'No storyboard scenes available',
          selectedPersonaName: selectedPersonaName,
          videoDuration: project?.campaignDetails?.videoDuration || '30s',
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-white">Create Screenplay</h2>
              <p className="text-gray-400">
                Convert your storyboard into a detailed, timed script
              </p>
            </div>
          </div>
          <Button
            onClick={handleEditPrompts}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
          >
            <SettingsIcon className="w-4 h-4 mr-2" />
            Edit Prompts
          </Button>
        </div>
      </div>

      {/* Generate Button */}
      {screenplay.length === 0 && (
        <div className="mb-8">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Sparkles className="w-5 h-5 mr-2 animate-spark-intense" />
                Generating Screenplay...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Screenplay
              </>
            )}
          </Button>
          <style>{`
            @keyframes sparkIntense {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(1.2); }
            }
            .animate-spark-intense {
              animation: sparkIntense 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
            }
          `}</style>
        </div>
      )}

      {/* Screenplay Table */}
      {screenplay.length > 0 && (
        <>
          {/* Regenerate Button */}
          <div className="mb-6 flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spark-intense" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate Screenplay
                </>
              )}
            </Button>
            <style>{`
              @keyframes sparkIntense {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(1.2); }
              }
              .animate-spark-intense {
                animation: sparkIntense 0.8s cubic-bezier(0.4, 0, 0.6, 1) infinite;
              }
            `}</style>
          </div>

          <div className="space-y-4 mb-8">
            {screenplay.map((entry) => {
              // Find corresponding storyboard scene
              const storyboardScene = project?.aiGeneratedStoryboard?.scenes?.find(
                (scene: any) => scene.sceneNumber === entry.sceneNumber
              );

              // Helper to get image URL
              const getImageUrl = (image: any): string | null => {
                if (!image) return null;
                if (typeof image === 'string') return image;
                if (image.url) return image.url;
                return null;
              };

              const storyboardImageUrl = getImageUrl(storyboardScene?.image);

              return (
                <Card key={entry.sceneNumber} className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-3 gap-0">
                    {/* Right Column - Screenplay Details (2 columns - 66% width) */}
                    <div className="col-span-2 p-6 flex flex-col">
                      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Scene {entry.sceneNumber}</h3>
                          <p className="text-sm text-gray-400">
                            {entry.timeStart} - {entry.timeEnd}
                          </p>
                        </div>
                        <Button
                          onClick={() =>
                            setEditingId(editingId === entry.sceneNumber.toString() ? null : entry.sceneNumber.toString())
                          }
                          variant="ghost"
                          size="sm"
                          className="text-gray-400 hover:text-white rounded-lg"
                        >
                          {editingId === entry.sceneNumber.toString() ? (
                            <Save className="w-4 h-4" />
                          ) : (
                            <Edit2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* Scene Fields */}
                      <div className="space-y-4 flex-1 overflow-y-auto">
                        {/* Visual Description */}
                        <div>
                          <Label className="text-xs font-medium text-gray-400 mb-2 block">Visual Description</Label>
                          {editingId === entry.sceneNumber.toString() ? (
                            <Textarea
                              value={typeof entry.visual === 'string' ? entry.visual : formatScriptContent(entry.visual)}
                              onChange={(e) => handleEdit(entry.sceneNumber, 'visual', e.target.value)}
                              className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-16 text-sm"
                            />
                          ) : (
                            <TimecodeContent content={formatScriptContent(entry.visual)} />
                          )}
                        </div>

                        {/* Camera Flow */}
                        <div>
                          <Label className="text-xs font-medium text-gray-400 mb-2 block">Camera Flow</Label>
                          {editingId === entry.sceneNumber.toString() ? (
                            <Textarea
                              value={typeof entry.cameraFlow === 'string' ? entry.cameraFlow : formatScriptContent(entry.cameraFlow)}
                              onChange={(e) => handleEdit(entry.sceneNumber, 'cameraFlow', e.target.value)}
                              className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-12 text-sm"
                            />
                          ) : (
                            <TimecodeContent content={formatScriptContent(entry.cameraFlow)} />
                          )}
                        </div>

                        {/* Script / Dialogue */}
                        <div>
                          <Label className="text-xs font-medium text-gray-400 mb-2 block">Script / Dialogue</Label>
                          {editingId === entry.sceneNumber.toString() ? (
                            <Textarea
                              value={typeof entry.script === 'string' ? entry.script : formatScriptContent(entry.script)}
                              onChange={(e) => handleEdit(entry.sceneNumber, 'script', e.target.value)}
                              className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-12 text-sm"
                            />
                          ) : (
                            <TimecodeContent content={formatScriptContent(entry.script)} />
                          )}
                        </div>

                        {/* Background Music */}
                        <div>
                          <Label className="text-xs font-medium text-gray-400 mb-2 block">Background Music</Label>
                          {editingId === entry.sceneNumber.toString() ? (
                            <Textarea
                              value={typeof entry.backgroundMusic === 'string' ? entry.backgroundMusic : formatScriptContent(entry.backgroundMusic)}
                              onChange={(e) => handleEdit(entry.sceneNumber, 'backgroundMusic', e.target.value)}
                              className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-12 text-sm"
                            />
                          ) : (
                            <p className="text-gray-300 text-sm leading-relaxed">{formatScriptContent(entry.backgroundMusic)}</p>
                          )}
                        </div>

                        {/* Transition */}
                        <div>
                          <Label className="text-xs font-medium text-gray-400 mb-2 block">Transition to Next Scene</Label>
                          {editingId === entry.sceneNumber.toString() ? (
                            <Input
                              value={typeof entry.transition === 'string' ? entry.transition : formatScriptContent(entry.transition)}
                              onChange={(e) => handleEdit(entry.sceneNumber, 'transition', e.target.value)}
                              className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg text-sm"
                              placeholder="e.g., Cut, Fade, Dissolve"
                            />
                          ) : (
                            <p className="text-gray-300 text-sm">{formatScriptContent(entry.transition)}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Left Column - Storyboard Reference (1 column - 33% width) */}
                    <div className="border-l border-gray-800 p-4 flex flex-col">
                      <div className="pb-3 border-b border-gray-800 mb-3">
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Storyboard</h4>
                        <p className="text-xs text-gray-400">
                          Scene {entry.sceneNumber}
                        </p>
                        {storyboardScene?.title && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{storyboardScene.title}</p>
                        )}
                      </div>

                      {/* Storyboard Image */}
                      {storyboardImageUrl && (
                        <div className="mb-3 rounded-lg overflow-hidden bg-black flex-shrink-0 aspect-auto">
                          <img
                            src={storyboardImageUrl}
                            alt={`Scene ${entry.sceneNumber}`}
                            className="w-full h-auto object-contain"
                          />
                        </div>
                      )}

                      {/* Storyboard Description */}
                      <div className="flex-1 overflow-y-auto">
                        <p className="text-xs font-medium text-gray-500 mb-1">Description</p>
                        <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">
                          {storyboardScene?.description || 'No description'}
                        </p>

                        {/* Additional Storyboard Details */}
                        {storyboardScene?.visualElements && (
                          <div className="mt-3 pt-3 border-t border-gray-800">
                            <p className="text-xs font-medium text-gray-500 mb-1">Visual Elements</p>
                            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                              {storyboardScene.visualElements}
                            </p>
                          </div>
                        )}

                        {storyboardScene?.cameraWork && (
                          <div className="mt-2 pt-2 border-t border-gray-800">
                            <p className="text-xs font-medium text-gray-500 mb-1">Camera</p>
                            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                              {storyboardScene.cameraWork}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              onClick={handleGenerate}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={screenplay.length === 0 || isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8"
              size="lg"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin mr-2">⏳</div>
                  Saving...
                </>
              ) : (
                <>
                  Finalize Screenplay
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
