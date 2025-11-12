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
import RecipeEditorPage from '../recipe/RecipeEditorPage';

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
  const [showRecipeEditor, setShowRecipeEditor] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<any>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
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

      const token = sessionStorage.getItem('authToken');
      if (!token) throw new Error('Authentication token not found');

      // Step 1: Fetch the recipe
      const recipeResponse = await fetch('/api/recipes?stageType=stage_4_storyboard');

      if (!recipeResponse.ok) {
        throw new Error(`Failed to fetch recipe: HTTP ${recipeResponse.status}`);
      }

      let recipeData;
      try {
        recipeData = await recipeResponse.json();
      } catch (parseError) {
        throw new Error('Failed to parse recipe response: Invalid JSON returned');
      }

      if (!recipeData.recipes || recipeData.recipes.length === 0) {
        throw new Error('No recipe found for storyboard generation. Please seed recipes first.');
      }

      const recipe = recipeData.recipes[0];
      const recipeId = recipe.id;

      // Extract numberOfScenes from recipe configuration (allows customization via recipe editor)
      const numberOfScenes = recipe.nodes?.[0]?.parameters?.numberOfScenes || 6;

      // Step 2: Get selected narrative
      const selectedNarrative = project?.aiGeneratedNarratives?.narratives?.find(
        (n: any) => n.id === project?.narrativePreferences?.narrativeStyle
      );

      if (!selectedNarrative) {
        throw new Error('No narrative selected. Please select a narrative theme first.');
      }

      // Step 3: Get selected persona
      const selectedPersona = project?.aiGeneratedPersonas?.personas?.find(
        (p: any) => p.id === project?.userPersonaSelection?.selectedPersonaIds?.[0]
      );

      if (!selectedPersona) {
        throw new Error('No persona selected. Please select a persona first.');
      }

      // Step 4: Prepare input data with persona image for consistency
      const executionInput = {
        productDescription: project?.campaignDetails?.productDescription || '',
        targetAudience: project?.campaignDetails?.targetAudience || '',
        selectedPersonaName: selectedPersona.coreIdentity?.name || 'Unknown',
        selectedPersonaDescription: selectedPersona.coreIdentity?.bio || '',
        selectedPersonaImage: selectedPersona.image?.url || '', // Include persona image for consistency
        narrativeTheme: selectedNarrative.title || '',
        narrativeStructure: selectedNarrative.structure || '',
        numberOfScenes: numberOfScenes, // Use recipe configuration value
        videoDuration: project?.campaignDetails?.videoDuration || '30s',
      };

      // Step 5: Execute the recipe
      const executionResponse = await fetch(`/api/recipes/${recipeId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          input: executionInput,
          projectId: project?.id,
          stageId: 'stage_4',
        }),
      });

      if (!executionResponse.ok) {
        let errorMessage = `HTTP ${executionResponse.status}`;
        try {
          const errorData = await executionResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON (HTML error page), use status code
          errorMessage = `HTTP ${executionResponse.status}: Failed to execute recipe`;
        }
        throw new Error(errorMessage);
      }

      let executionData;
      try {
        executionData = await executionResponse.json();
      } catch (parseError) {
        throw new Error(`Failed to parse recipe execution response: Invalid JSON returned`);
      }
      const executionId = executionData.executionId;

      // Step 6: Poll for execution results
      let execution: any = null;
      let attempts = 0;
      const maxAttempts = 36; // 3 minutes with 5-second polling (180 seconds / 5 = 36)

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(`/api/recipes/executions/${executionId}`);

        // Check if response is OK before parsing
        if (!statusResponse.ok) {
          const errorStatus = statusResponse.status;
          let errorMessage = 'Unknown error';
          try {
            const errorData = await statusResponse.json();
            errorMessage = errorData.error || errorStatus.toString();
          } catch {
            // If response is not JSON (HTML error page), use status code
            errorMessage = `HTTP ${errorStatus}`;
          }
          throw new Error(`Failed to fetch execution status: ${errorMessage}`);
        }

        try {
          execution = await statusResponse.json();
        } catch (parseError) {
          throw new Error(`Failed to parse execution response: Invalid JSON returned. ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
        }

        if (execution.execution.status === 'completed') {
          break;
        }

        if (execution.execution.status === 'failed') {
          throw new Error(`Recipe execution failed: ${execution.execution.executionContext?.error}`);
        }

        attempts++;
      }

      if (!execution || execution.execution.status !== 'completed') {
        throw new Error('Recipe execution timed out after 3 minutes');
      }

      // Step 7: Process results and map to Scene interface
      console.log('Processing execution results...');
      console.log('Execution result structure:', execution.execution.result);

      // Get storyboard from result.finalStoryboard (output key from recipe)
      const finalStoryboard = execution.execution.result?.finalStoryboard || [];

      if (!Array.isArray(finalStoryboard) || finalStoryboard.length === 0) {
        throw new Error('No storyboard returned from recipe execution');
      }

      // Map API response to Scene interface
      const generatedScenes: Scene[] = finalStoryboard.map((scene: any, index: number) => ({
        id: scene.sceneNumber?.toString() || `scene_${index}`,
        number: scene.sceneNumber || index + 1,
        title: scene.title || `Scene ${index + 1}`,
        description: scene.description || '',
        visualNote: scene.cameraWork || scene.keyFrameDescription || '',
        image: scene.image?.url || '',
      }));

      console.log('Setting generated scenes:', generatedScenes);
      setScenes(generatedScenes);

      // Step 8: Save generated storyboard to project
      const storyboardPayload = {
        scenes: finalStoryboard,
        generatedAt: new Date(),
        generationRecipeId: recipeId,
        generationExecutionId: executionId,
        model: 'storyboard-generation-pipeline',
        count: finalStoryboard.length,
      };

      console.log('Saving storyboard to project...', {
        projectId: project.id,
        sceneCount: finalStoryboard.length,
      });

      const savedProject = await updateAIStoryboard(storyboardPayload, project.id);
      console.log('After updateAIStoryboard - returned project:', savedProject?.aiGeneratedStoryboard);

      // Step 9: Reload project to ensure we have latest data
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

  const loadRecipe = async () => {
    try {
      setIsLoadingRecipe(true);
      const authToken = sessionStorage.getItem('authToken');
      if (!authToken) throw new Error('Authentication token not found');

      // Fetch storyboard generation recipe with cache-busting
      const response = await fetch(`/api/recipes?stageType=stage_4_storyboard&t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      const data = await response.json();

      if (data.recipes && data.recipes.length > 0) {
        console.log('Loaded recipe from database:', {
          id: data.recipes[0].id,
          numberOfScenes: data.recipes[0].nodes?.[0]?.parameters?.numberOfScenes,
        });
        setCurrentRecipe(data.recipes[0]);
        setShowRecipeEditor(true);
      } else {
        alert('No storyboard recipe found. Please seed recipes first.');
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
      alert('Failed to load storyboard recipe');
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const handleSaveRecipe = async (recipe: any) => {
    try {
      const authToken = sessionStorage.getItem('authToken');
      if (!authToken) throw new Error('Authentication token not found');

      console.log('Saving recipe with numberOfScenes:', recipe.nodes?.[0]?.parameters?.numberOfScenes);

      const response = await fetch(`/api/recipes/${recipe.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(recipe),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save recipe');
      }

      const savedData = await response.json();
      console.log('Recipe saved response:', {
        numberOfScenes: savedData.recipe?.nodes?.[0]?.parameters?.numberOfScenes,
      });

      // Reload recipe from database to verify the changes were saved
      const verifyResponse = await fetch(`/api/recipes?stageType=stage_4_storyboard&t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
      const verifyData = await verifyResponse.json();

      if (verifyData.recipes && verifyData.recipes.length > 0) {
        const savedRecipe = verifyData.recipes[0];
        console.log('Verified recipe from database:', {
          numberOfScenes: savedRecipe.nodes?.[0]?.parameters?.numberOfScenes,
        });
        setCurrentRecipe(savedRecipe);
      }

      setShowRecipeEditor(false);
      alert('Storyboard recipe saved successfully!');
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert(`Failed to save recipe: ${error}`);
    }
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

  // Show recipe editor if requested
  if (showRecipeEditor && currentRecipe) {
    // Prepare external input with all required data from previous stages
    const selectedNarrative = project?.aiGeneratedNarratives?.narratives?.find(
      (n: any) => n.id === project?.narrativePreferences?.narrativeStyle
    );
    const selectedPersona = project?.aiGeneratedPersonas?.personas?.find(
      (p: any) => p.id === project?.userPersonaSelection?.selectedPersonaIds?.[0]
    );

    // Extract numberOfScenes from current recipe (updates when recipe is modified)
    const recipeNumberOfScenes = currentRecipe.nodes?.[0]?.parameters?.numberOfScenes || 6;

    const externalInput = {
      productDescription: project?.campaignDetails?.productDescription || '',
      targetAudience: project?.campaignDetails?.targetAudience || '',
      selectedPersonaName: selectedPersona?.coreIdentity?.name || 'Unknown',
      selectedPersonaDescription: selectedPersona?.coreIdentity?.bio || '',
      selectedPersonaImage: selectedPersona?.image?.url || '', // Include persona image for consistency
      narrativeTheme: selectedNarrative?.title || '',
      narrativeStructure: selectedNarrative?.structure || '',
      numberOfScenes: recipeNumberOfScenes,
      videoDuration: project?.campaignDetails?.videoDuration || '30s',
    };

    return (
      <RecipeEditorPage
        recipe={currentRecipe}
        previousStageOutput={externalInput}
        onSave={handleSaveRecipe}
        onBack={() => setShowRecipeEditor(false)}
        title="Edit Storyboard Generation Recipe"
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
              onClick={loadRecipe}
              disabled={isLoadingRecipe}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-xl"
              size="lg"
            >
              <SettingsIcon className="w-5 h-5 mr-2" />
              {isLoadingRecipe ? 'Loading Recipe...' : 'Edit Recipe'}
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
