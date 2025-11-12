import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  Sparkles,
  Edit2,
  Film,
  Plus,
  Trash2,
  Image as ImageIcon,
  SettingsIcon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useStoryLabProject } from '../../hooks/useStoryLabProject';
import { PromptTemplateEditor } from '../recipe/PromptTemplateEditor';

interface Scene {
  id: string;
  number: number;
  title: string;
  description: string;
  visualNote: string;
  image: string;
}

interface Stage4Props {
  project?: any;
  projectId?: string;
  updateAIStoryboard?: (storyboard: any, projectId: string) => Promise<void>;
  updateStoryboardCustomizations?: (customizations: any, projectId: string) => Promise<void>;
  markStageCompleted?: (stage: string) => Promise<void>;
  advanceToNextStage?: () => Promise<void>;
}

type ViewMode = 'grid';

export function Stage4Storyboard({
  project: propProject,
  projectId: propProjectId,
  updateAIStoryboard: propUpdateAIStoryboard,
  updateStoryboardCustomizations: propUpdateStoryboardCustomizations,
  markStageCompleted: propMarkStageCompleted,
  advanceToNextStage: propAdvanceToNextStage,
}: Stage4Props) {
  // Load project using hook, but prefer passed props from WorkflowView
  const hookResult = useStoryLabProject({ autoLoad: true, projectId: propProjectId || propProject?.id || '' });

  // Use passed props from WorkflowView (preferred) or fall back to hook results
  const project = propProject || hookResult.project;
  const isSaving = hookResult.isSaving;
  const updateAIStoryboard = propUpdateAIStoryboard || hookResult.updateAIStoryboard;
  const updateStoryboardCustomizations = propUpdateStoryboardCustomizations || hookResult.updateStoryboardCustomizations;
  const markStageCompleted = propMarkStageCompleted || hookResult.markStageCompleted;
  const advanceToNextStage = propAdvanceToNextStage || hookResult.advanceToNextStage;
  const loadProject = hookResult.loadProject;

  const generatedScenesRef = useRef<HTMLDivElement>(null);

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [viewMode] = useState<ViewMode>('grid');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);

  // Sync scenes with project data when loaded
  useEffect(() => {
    if (project?.aiGeneratedStoryboard?.scenes) {
      const loadedScenes: Scene[] = project.aiGeneratedStoryboard.scenes.map((s, i) => ({
        id: s.sceneNumber?.toString() || i.toString(),
        number: s.sceneNumber || i + 1,
        title: s.title || '',
        description: s.description || '',
        visualNote: s.cameraInstructions || '',
        image: (s.image as any)?.url || (s.referenceImage as any)?.url || (s.referenceImage as any) || '',
      }));
      setScenes(loadedScenes);
    } else {
      setScenes([]);
    }
  }, [project?.aiGeneratedStoryboard]);

  const handleGenerateStoryboard = async () => {
    setIsGenerating(true);
    try {
      if (!project) throw new Error('No project loaded. Please go back and reload the project.');

      // Get selected narrative
      const selectedNarrative = project?.aiGeneratedNarratives?.narratives?.find(
        (n: any) => n.id === project?.narrativePreferences?.narrativeStyle
      );

      if (!selectedNarrative) {
        throw new Error('No narrative selected. Please select a narrative theme first.');
      }

      // Get selected persona
      const selectedPersona = project?.aiGeneratedPersonas?.personas?.find(
        (p: any) => p.id === project?.userPersonaSelection?.selectedPersonaIds?.[0]
      );

      if (!selectedPersona) {
        throw new Error('No persona selected. Please select a persona first.');
      }

      // Generate storyboard using adaptor-based V2 service
      const generationResponse = await fetch('/api/generation/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          productDescription: project.campaignDetails.productDescription,
          targetAudience: project.campaignDetails.targetAudience,
          selectedPersonaName: selectedPersona.coreIdentity?.name || 'Unknown',
          selectedPersonaDescription: selectedPersona.coreIdentity?.bio || '',
          selectedPersonaImage: selectedPersona.image?.url || '',
          narrativeTheme: selectedNarrative.title || '',
          narrativeStructure: selectedNarrative.structure || '',
          numberOfScenes: 5,
          videoDuration: project.campaignDetails.videoDuration || '30s',
        }),
      });

      if (!generationResponse.ok) {
        const errorData = await generationResponse.json();
        throw new Error(errorData.error || 'Failed to generate storyboard');
      }

      const generationData = await generationResponse.json();
      const storyboard = generationData.data?.scenes || [];

      if (!Array.isArray(storyboard) || storyboard.length === 0) {
        throw new Error('No storyboard returned from generation service');
      }

      // Map API response to Scene interface
      const generatedScenes: Scene[] = storyboard.map((scene: any, index: number) => ({
        id: scene.sceneNumber?.toString() || `scene_${index}`,
        number: scene.sceneNumber || index + 1,
        title: scene.title || `Scene ${index + 1}`,
        description: scene.description || '',
        visualNote: scene.cameraWork || scene.keyFrameDescription || scene.cameraInstructions || '',
        image: scene.image?.url || scene.referenceImage?.url || scene.referenceImage || '',
      }));

      console.log('Setting generated scenes:', generatedScenes);
      setScenes(generatedScenes);

      // Save generated storyboard to project
      const storyboardPayload = {
        scenes: storyboard,
        generatedAt: new Date(),
        model: 'storyboard-generation-v2',
        count: storyboard.length,
      };

      console.log('Saving storyboard to project...', {
        projectId: project.id,
        sceneCount: storyboard.length,
      });

      const savedProject = await updateAIStoryboard(storyboardPayload, project.id);
      console.log('Storyboard saved successfully');

      // Reload project to ensure we have latest data
      await new Promise(resolve => setTimeout(resolve, 1500));
      await loadProject(project.id);

      // Scroll to the generated scenes section
      setTimeout(() => {
        if (generatedScenesRef.current) {
          generatedScenesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate storyboard';
      console.error('Error generating storyboard:', errorMessage);
      alert(`Failed to generate storyboard: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditPrompts = () => {
    setShowPromptEditor(true);
  };

  const handleEditOpen = (scene: Scene) => {
    setEditingScene({ ...scene });
  };

  const handleEditSave = () => {
    if (editingScene) {
      setScenes(scenes.map(s => s.id === editingScene.id ? editingScene : s));
      setEditingScene(null);
    }
  };

  const handleEditChange = (field: keyof Scene, value: string | number) => {
    if (editingScene) {
      setEditingScene({ ...editingScene, [field]: value });
    }
  };

  const handleDelete = (id: string) => {
    const updatedScenes = scenes.filter(s => s.id !== id);
    setScenes(updatedScenes.map((s, i) => ({ ...s, number: i + 1 })));
  };

  const handleAddScene = () => {
    const newScene: Scene = {
      id: Date.now().toString(),
      number: scenes.length + 1,
      title: 'New Scene',
      description: 'Scene description',
      visualNote: 'Visual notes and camera direction',
      image: '',
    };
    setScenes([...scenes, newScene]);
    setEditingScene(newScene);
  };

  const handleSubmit = async () => {
    try {
      // Save storyboard customizations
      if (scenes.length > 0) {
        await updateStoryboardCustomizations({
          editedScenes: scenes,
          lastEditedAt: new Date(),
        });
      }
      // Mark stage as completed and get updated project
      const updatedProject = await markStageCompleted('storyboard');
      // Advance to next stage with updated project
      await advanceToNextStage(updatedProject || undefined);
    } catch (error) {
      console.error('Failed to save storyboard:', error);
    }
  };

  // Show prompt editor if requested
  if (showPromptEditor) {
    return (
      <PromptTemplateEditor
        stageType="stage_4_storyboard"
        projectId={project?.id}
        onBack={() => setShowPromptEditor(false)}
        stageData={{
          productDescription: project?.campaignDetails?.productDescription || '',
          targetAudience: project?.campaignDetails?.targetAudience || '',
          videoDuration: project?.campaignDetails?.videoDuration || '',
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <Film className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-white">Build Storyboard</h2>
              <p className="text-gray-400">
                Visualize the main scenes based on your chosen narrative
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleEditPrompts}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-xl"
              size="lg"
            >
              <SettingsIcon className="w-5 h-5 mr-2" />
              Edit Prompts
            </Button>
          </div>
        </div>
      </div>

      {/* Generate Button - Always Visible for Regeneration */}
      <div className="mb-8">
        <Button
          onClick={handleGenerateStoryboard}
          disabled={isGenerating}
          className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Sparkles className="w-5 h-5 mr-2 animate-spark-intense" />
              Generating Storyboard...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              {scenes.length > 0 ? 'Regenerate Storyboard' : 'Generate Storyboard'}
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

      {/* Generated Scenes Section */}
      {scenes.length > 0 && (
        <div ref={generatedScenesRef} className="mb-8">
          <h3 className="text-white mb-4">Generated Scenes</h3>
        </div>
      )}

      {/* Storyboard Scenes - Grid View */}
      {scenes.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {scenes.map((scene) => (
              <Card
                key={scene.id}
                className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden group relative hover:border-gray-700 transition-all"
              >
                {/* Scene Image */}
                <div className="relative h-56 overflow-hidden bg-gray-900">
                  {scene.image ? (
                    <ImageWithFallback
                      src={scene.image}
                      alt={scene.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
                      <ImageIcon className="w-16 h-16 text-gray-700" />
                    </div>
                  )}
                  {/* Scene Number Badge */}
                  <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full">
                    Scene {scene.number}
                  </div>
                  {/* Action Buttons */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      onClick={() => handleEditOpen(scene)}
                      size="sm"
                      className="bg-gray-900/90 hover:bg-gray-800 text-white rounded-lg h-8 w-8 p-0"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(scene.id)}
                      size="sm"
                      className="bg-gray-900/90 hover:bg-red-600 text-white rounded-lg h-8 w-8 p-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Scene Details */}
                <div className="p-5 space-y-2">
                  <h3 className="text-white font-semibold">{scene.title}</h3>

                  {/* Description with Expandable Option */}
                  <Collapsible
                    open={expandedSceneId === scene.id}
                    onOpenChange={() => setExpandedSceneId(expandedSceneId === scene.id ? null : scene.id)}
                  >
                    <div className="space-y-2">
                      <p className={`text-gray-400 text-sm ${expandedSceneId !== scene.id ? 'line-clamp-2' : ''}`}>
                        {scene.description}
                      </p>
                      <CollapsibleTrigger
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-gray-500 hover:text-gray-300 text-xs font-medium transition-colors"
                      >
                        {expandedSceneId === scene.id ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            <span>Show less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            <span>Show more</span>
                          </>
                        )}
                      </CollapsibleTrigger>
                    </div>
                  </Collapsible>
                </div>
              </Card>
            ))}

            {/* Add Scene Card */}
            <Card
              onClick={handleAddScene}
              className="bg-[#151515] border-gray-800 border-dashed rounded-xl cursor-pointer hover:border-blue-500 transition-all flex items-center justify-center min-h-[380px]"
            >
              <div className="text-center">
                <Plus className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Add Scene</p>
              </div>
            </Card>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button
              onClick={handleGenerateStoryboard}
              disabled={isGenerating}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Regenerate
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={scenes.length === 0 || isSaving}
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
                  Continue to Screenplay
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingScene} onOpenChange={() => setEditingScene(null)}>
        <DialogContent className="bg-[#151515] border-gray-800 text-white rounded-xl max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Scene {editingScene?.number}</DialogTitle>
          </DialogHeader>
          {editingScene && (
            <div className="space-y-4 mt-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="edit-title" className="text-gray-300">Scene Title</Label>
                <Input
                  id="edit-title"
                  value={editingScene.title}
                  onChange={(e) => handleEditChange('title', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="edit-description" className="text-gray-300">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingScene.description}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-20"
                />
              </div>

              {/* Visual Notes */}
              <div className="space-y-2">
                <Label htmlFor="edit-visual" className="text-gray-300">Visual Notes</Label>
                <Textarea
                  id="edit-visual"
                  value={editingScene.visualNote}
                  onChange={(e) => handleEditChange('visualNote', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-20"
                  placeholder="Camera angles, lighting, mood, etc."
                />
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="edit-image" className="text-gray-300">Image URL</Label>
                <Input
                  id="edit-image"
                  value={editingScene.image}
                  onChange={(e) => handleEditChange('image', e.target.value)}
                  className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg"
                  placeholder="https://..."
                />
              </div>

              {/* Preview */}
              {editingScene.image && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Preview</Label>
                  <div className="relative h-48 rounded-lg overflow-hidden bg-gray-900">
                    <ImageWithFallback
                      src={editingScene.image}
                      alt={editingScene.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button
                  onClick={() => setEditingScene(null)}
                  variant="outline"
                  className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
