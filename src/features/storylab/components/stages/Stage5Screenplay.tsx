import { useState, useEffect } from 'react';
import { ArrowRight, Sparkles, FileText, Edit2, Save, SettingsIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useStoryLabProject } from '../../hooks/useStoryLabProject';
import RecipeEditorPage from '../recipe/RecipeEditorPage';

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
}

// Helper function to format script/dialogue content
function formatScriptContent(script: any): string {
  if (typeof script === 'string') {
    return script;
  }
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

export function Stage5Screenplay({
  project: propProject,
  projectId: propProjectId,
  updateAIScreenplay: propUpdateAIScreenplay,
  updateScreenplayCustomizations: propUpdateScreenplayCustomizations,
  markStageCompleted: propMarkStageCompleted,
  advanceToNextStage: propAdvanceToNextStage,
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

  const [screenplay, setScreenplay] = useState<ScreenplayEntry[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showRecipeEditor, setShowRecipeEditor] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<any>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

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

      // Get authentication token
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

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

      // Step 1: Fetch the recipe
      const recipeResponse = await fetch('/api/recipes?stageType=stage_5_screenplay');

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
        throw new Error('No recipe found for screenplay generation. Please seed recipes first.');
      }

      const recipe = recipeData.recipes[0];
      const recipeId = recipe.id;

      // Prepare execution input
      const executionInput = {
        storyboardScenes: project.aiGeneratedStoryboard.scenes,
        videoDuration,
        selectedPersonaName,
      };

      // Step 2: Execute the screenplay generation recipe
      const executeResponse = await fetch(`/api/recipes/${recipeId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          input: executionInput,
          projectId: project?.id,
          stageId: 'stage_5',
        }),
      });

      if (!executeResponse.ok) {
        let errorMessage = `HTTP ${executeResponse.status}`;
        try {
          const errorData = await executeResponse.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If response is not JSON (HTML error page), use status code
          errorMessage = `HTTP ${executeResponse.status}: Failed to execute recipe`;
        }
        throw new Error(errorMessage);
      }

      let executionData;
      try {
        executionData = await executeResponse.json();
      } catch (parseError) {
        throw new Error(`Failed to parse recipe execution response: Invalid JSON returned`);
      }
      const executionId = executionData.executionId;

      console.log('Screenplay generation started, execution ID:', executionId);

      // Step 3: Poll for execution results
      let execution: any = null;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes with 5-second polling

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
        throw new Error('Recipe execution timed out after 10 minutes');
      }

      console.log('Screenplay generation completed');

      // Step 4: Extract screenplay entries from result
      const screenplayEntries: ScreenplayEntry[] = execution.execution.result?.screenplayEntries || [];

      if (screenplayEntries.length === 0) {
        throw new Error('No screenplay entries in result');
      }

      // Step 5: Update screenplay state
      setScreenplay(screenplayEntries);

      // Step 6: Save to project
      await updateAIScreenplay(
        {
          screenplay: screenplayEntries,
          generatedAt: new Date(),
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

      // Save screenplay customizations
      if (screenplay.length > 0) {
        console.log('handleSubmit: Saving screenplay customizations...');
        await updateScreenplayCustomizations({
          editedText: screenplay,
          lastEditedAt: new Date(),
        });
        console.log('handleSubmit: Screenplay customizations saved');
      }

      // Mark stage as completed and get updated project
      console.log('handleSubmit: Marking screenplay stage as completed...');
      const updatedProject = await markStageCompleted('screenplay');
      console.log('handleSubmit: Stage marked as completed, updated project:', {
        currentStageIndex: updatedProject?.currentStageIndex,
      });

      // Advance to next stage using the updated project
      // This ensures we're using the latest state
      console.log('handleSubmit: Advancing to next stage...');
      await advanceToNextStage(updatedProject || undefined);
      console.log('handleSubmit: Successfully advanced to next stage');
    } catch (error) {
      console.error('Failed to save screenplay:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert(`Error finalizing screenplay: ${errorMessage}`);
    }
  };

  const loadRecipe = async () => {
    try {
      setIsLoadingRecipe(true);
      const authToken = sessionStorage.getItem('authToken');
      if (!authToken) throw new Error('Authentication token not found');

      // Fetch screenplay generation recipe with cache-busting
      const response = await fetch(`/api/recipes?stageType=stage_5_screenplay&t=${Date.now()}`, {
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
        });
        setCurrentRecipe(data.recipes[0]);
        setShowRecipeEditor(true);
      } else {
        alert('No screenplay recipe found. Please seed recipes first.');
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
      alert('Failed to load screenplay recipe');
    } finally {
      setIsLoadingRecipe(false);
    }
  };

  const handleSaveRecipe = async (recipe: any) => {
    try {
      const authToken = sessionStorage.getItem('authToken');
      if (!authToken) throw new Error('Authentication token not found');

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

      // Reload recipe from database to verify the changes were saved
      const verifyResponse = await fetch(`/api/recipes?stageType=stage_5_screenplay&t=${Date.now()}`, {
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
          id: savedRecipe.id,
        });
        setCurrentRecipe(savedRecipe);
      }

      setShowRecipeEditor(false);
      alert('Screenplay recipe saved successfully!');
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert(`Failed to save recipe: ${error}`);
    }
  };

  // Show recipe editor if requested
  if (showRecipeEditor && currentRecipe) {
    // Build previous stage output from project data (Stage 4 storyboard output)
    // Extract persona name from selected persona
    const selectedPersona = project?.aiGeneratedPersonas?.personas?.find(
      (p: any) => p.id === project?.userPersonaSelection?.selectedPersonaIds?.[0]
    );
    const selectedPersonaName = selectedPersona?.coreIdentity?.name || 'Character';

    const previousStageOutput = {
      selectedPersonaName,
      storyboardScenes: project?.storyboard?.scenes || project?.aiGeneratedStoryboard?.scenes || [],
    };

    return (
      <RecipeEditorPage
        onBack={() => setShowRecipeEditor(false)}
        recipe={currentRecipe}
        onSave={handleSaveRecipe}
        previousStageOutput={previousStageOutput}
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
            onClick={loadRecipe}
            disabled={isLoadingRecipe}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
          >
            <SettingsIcon className="w-4 h-4 mr-2" />
            {isLoadingRecipe ? 'Loading Recipe...' : 'Edit Recipe'}
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
                            <p className="text-gray-300 text-sm leading-relaxed">{formatScriptContent(entry.visual)}</p>
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
                            <p className="text-gray-300 text-sm leading-relaxed">{formatScriptContent(entry.cameraFlow)}</p>
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
                            <p className="text-gray-300 text-sm leading-relaxed">{formatScriptContent(entry.script)}</p>
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
