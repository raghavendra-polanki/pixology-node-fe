import { useState, useEffect } from 'react';
import { Sparkles, Download, AlertCircle, Play, RefreshCw, SettingsIcon, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { useStoryLabProject } from '../../hooks/useStoryLabProject';
import RecipeEditorPage from '../recipe/RecipeEditorPage';

interface Stage6Props {
  project?: any;
  projectId?: string;
  updateVideoProduction?: (video: any, projectId?: string) => Promise<void>;
  markStageCompleted?: (stage: string) => Promise<void>;
  advanceToNextStage?: () => Promise<void>;
}

interface VideoData {
  sceneNumber: number;
  sceneTitle: string;
  videoUrl: string;
  videoFormat: string;
  duration: string;
  generatedAt: string;
}

interface SceneVideoStatus {
  [sceneNumber: number]: {
    status: 'idle' | 'generating' | 'complete';
    progress: number;
    videoData?: VideoData;
    error?: string;
  };
}

export function Stage6GenerateVideo({
  project: propProject,
  projectId: propProjectId,
  updateVideoProduction: propUpdateVideoProduction,
  markStageCompleted: propMarkStageCompleted,
  advanceToNextStage: propAdvanceToNextStage,
}: Stage6Props) {
  // Load project using hook, but prefer passed props from WorkflowView
  const hookResult = useStoryLabProject({ autoLoad: true, projectId: propProjectId || propProject?.id || '' });

  // Use passed props from WorkflowView (preferred) or fall back to hook results
  const project = propProject || hookResult.project;
  const isSaving = hookResult.isSaving;
  const updateVideoProduction = propUpdateVideoProduction || hookResult.updateVideoProduction;
  const markStageCompleted = propMarkStageCompleted || hookResult.markStageCompleted;
  const advanceToNextStage = propAdvanceToNextStage || hookResult.advanceToNextStage;

  const [sceneVideos, setSceneVideos] = useState<SceneVideoStatus>({});
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [showRecipeEditor, setShowRecipeEditor] = useState(false);
  const [currentRecipe, setCurrentRecipe] = useState<any>(null);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);

  // Initialize scene video statuses when project loads
  useEffect(() => {
    if (project?.aiGeneratedStoryboard?.scenes) {
      const initialStatuses: SceneVideoStatus = {};
      project.aiGeneratedStoryboard.scenes.forEach((scene: any) => {
        initialStatuses[scene.sceneNumber] = {
          status: 'idle',
          progress: 0,
        };
      });
      setSceneVideos(initialStatuses);

      // Set first scene as selected
      if (project.aiGeneratedStoryboard.scenes.length > 0 && selectedScene === null) {
        setSelectedScene(project.aiGeneratedStoryboard.scenes[0].sceneNumber);
      }
    }
  }, [project?.aiGeneratedStoryboard?.scenes]);

  const handleGenerate = async (sceneNumber: number) => {
    try {
      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], status: 'generating', progress: 0, error: undefined }
      }));

      // Get authentication token
      const token = sessionStorage.getItem('authToken');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Validate required project data
      if (!project?.aiGeneratedStoryboard?.scenes || project.aiGeneratedStoryboard.scenes.length === 0) {
        throw new Error('No storyboard scenes found. Please generate storyboard first.');
      }

      if (!project?.aiGeneratedScreenplay?.screenplay || project.aiGeneratedScreenplay.screenplay.length === 0) {
        throw new Error('No screenplay found. Please generate screenplay first.');
      }

      // Find the scene and screenplay entry by sceneNumber
      const sceneData = project.aiGeneratedStoryboard.scenes.find((s: any) => s.sceneNumber === sceneNumber);
      const screenplayEntry = project.aiGeneratedScreenplay.screenplay.find((s: any) => s.sceneNumber === sceneNumber);
      const sceneImage = sceneData?.image?.url || null;

      if (!sceneData) {
        throw new Error(`No scene data found for Scene ${sceneNumber}`);
      }

      if (!screenplayEntry) {
        throw new Error(`No screenplay entry found for Scene ${sceneNumber}`);
      }

      if (!sceneImage) {
        throw new Error(`No image available for Scene ${sceneNumber}. Please generate storyboard images first.`);
      }

      console.log(`Starting video generation for Scene ${sceneNumber}...`);
      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], progress: 10 }
      }));

      // Step 1: Fetch the recipe
      const recipeResponse = await fetch('/api/recipes?stageType=stage_6_video');
      const recipeData = await recipeResponse.json();

      if (!recipeData.recipes || recipeData.recipes.length === 0) {
        throw new Error('No recipe found for video generation. Please seed recipes first.');
      }

      const recipe = recipeData.recipes[0];
      const recipeId = recipe.id;
      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], progress: 20 }
      }));

      // Prepare execution input
      const executionInput = {
        sceneImage,
        sceneData,
        screenplayEntry,
        projectId: project?.id,
        sceneIndex: sceneNumber - 1,
      };

      // Step 2: Execute the video generation recipe
      const executeResponse = await fetch(`/api/recipes/${recipeId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          input: executionInput,
          projectId: project?.id,
          stageId: 'stage_6',
          sceneNumber,
        }),
      });

      if (!executeResponse.ok) {
        const errorData = await executeResponse.json();
        throw new Error(errorData.error || 'Failed to execute recipe');
      }

      const executionData = await executeResponse.json();
      const executionId = executionData.executionId;

      console.log(`Video generation started for Scene ${sceneNumber}, execution ID:`, executionId);
      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], progress: 30 }
      }));

      // Step 3: Poll for execution results
      let execution: any = null;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes with 5-second polling

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(`/api/recipes/executions/${executionId}`);
        execution = await statusResponse.json();

        if (execution.execution?.status === 'completed') {
          break;
        }

        if (execution.execution?.status === 'failed') {
          throw new Error(`Recipe execution failed: ${execution.execution?.executionContext?.error}`);
        }

        // Update progress based on attempts (30% -> 90%)
        const newProgress = Math.min(30 + (attempts * 0.5), 90);
        setSceneVideos(prev => ({
          ...prev,
          [sceneNumber]: { ...prev[sceneNumber], progress: newProgress }
        }));
        attempts++;
      }

      if (!execution || execution.execution?.status !== 'completed') {
        throw new Error('Recipe execution timed out after 10 minutes');
      }

      console.log(`Video generation completed for Scene ${sceneNumber}`);
      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], progress: 95 }
      }));

      // Step 4: Extract video data from result
      const uploadedVideos = execution.execution?.result?.uploadedVideos || [];

      if (uploadedVideos.length === 0) {
        throw new Error('No video data in result. Uploaded videos array is empty.');
      }

      const generatedVideo = uploadedVideos[0];

      if (!generatedVideo) {
        throw new Error('Generated video object is undefined. uploadedVideos structure may be incorrect.');
      }

      // Step 5: Update video state for this scene
      const videoData: VideoData = {
        sceneNumber: generatedVideo.sceneNumber || sceneNumber,
        sceneTitle: generatedVideo.sceneTitle || `Scene ${sceneNumber}`,
        videoUrl: generatedVideo.videoUrl || '',
        videoFormat: generatedVideo.videoFormat || 'mp4',
        duration: generatedVideo.duration || '8s',
        generatedAt: new Date().toISOString(),
      };

      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: {
          status: 'complete',
          progress: 100,
          videoData,
        }
      }));

      // Step 6: Save to project
      await updateVideoProduction(
        {
          videoUrl: generatedVideo.videoUrl,
          status: 'complete',
          title: generatedVideo.sceneTitle || `Scene ${sceneNumber}`,
          videoData: generatedVideo,
          sceneNumber,
        },
        project?.id || projectId || ''
      );

      console.log(`Video saved successfully for Scene ${sceneNumber}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error generating video for Scene ${sceneNumber}:`, err);
      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], status: 'idle', progress: 0, error: errorMsg }
      }));
    }
  };

  const handleDownload = () => {
    const selectedSceneVideo = selectedScene ? sceneVideos[selectedScene]?.videoData : null;
    if (selectedSceneVideo?.videoUrl) {
      const link = document.createElement('a');
      link.href = selectedSceneVideo.videoUrl;
      link.download = `scene-${selectedScene}-video.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleComplete = async () => {
    try {
      await markStageCompleted('video');
    } catch (error) {
      console.error('Failed to mark video stage complete:', error);
    }
  };

  const loadRecipe = async () => {
    try {
      setIsLoadingRecipe(true);
      const authToken = sessionStorage.getItem('authToken');
      if (!authToken) throw new Error('Authentication token not found');

      // Fetch video generation recipe with cache-busting
      const response = await fetch(`/api/recipes?stageType=stage_6_video&t=${Date.now()}`, {
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
        alert('No video recipe found. Please seed recipes first.');
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
      alert('Failed to load video recipe');
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
      const verifyResponse = await fetch(`/api/recipes?stageType=stage_6_video&t=${Date.now()}`, {
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
      alert('Video recipe saved successfully!');
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert(`Failed to save recipe: ${error}`);
    }
  };

  // Show recipe editor if requested
  if (showRecipeEditor && currentRecipe) {
    // Build previous stage output with scene and screenplay data
    const previousStageOutput = {
      sceneData: project?.aiGeneratedStoryboard?.scenes?.[0] || {},
      screenplayEntry: project?.aiGeneratedScreenplay?.screenplay?.[0] || {},
      sceneImage: project?.aiGeneratedStoryboard?.scenes?.[0]?.image?.url || '',
      storyboardScenes: project?.aiGeneratedStoryboard?.scenes || [],
      screenplay: project?.aiGeneratedScreenplay?.screenplay || [],
      projectId: project?.id || '',
      sceneIndex: 0,
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

  const allScenesGenerated = project?.aiGeneratedStoryboard?.scenes?.every((scene: any) =>
    sceneVideos[scene.sceneNumber]?.status === 'complete'
  );

  return (
    <div className="max-w-7xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white">Generate Videos</h2>
              <p className="text-gray-400">
                Generate video for each scene and review results
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

      {/* Main Layout: Video Player + Scene Navigation as Single Card */}
      <Card className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 h-full">
          {/* Video Player - Takes 3 columns */}
          <div className="lg:col-span-3 space-y-0">
          {selectedScene ? (
            <>
              {sceneVideos[selectedScene]?.status === 'generating' ? (
                // Generating State
                <div className="p-8">
                  <div className="text-center space-y-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center mx-auto">
                      <Sparkles className="w-10 h-10 text-white animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-white mb-2">Generating Video for Scene {selectedScene}</h3>
                      <p className="text-gray-400">
                        AI is generating your scene video. This may take a few minutes...
                      </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="max-w-md mx-auto space-y-3">
                      <Progress
                        value={sceneVideos[selectedScene]?.progress || 0}
                        className="h-3 bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-blue-600 [&>div]:to-blue-500"
                      />
                      <div className="flex items-center justify-between text-gray-400">
                        <span>Progress</span>
                        <span>{sceneVideos[selectedScene]?.progress || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : sceneVideos[selectedScene]?.status === 'complete' ? (
                // Complete State
                <>
                  {/* Video Player */}
                  <div className="overflow-hidden">
                    {sceneVideos[selectedScene]?.videoData?.videoUrl ? (
                      <div className="bg-[#0a0a0a] aspect-video relative group">
                        <video
                          controls
                          className="w-full h-full bg-black"
                          controlsList="nodownload"
                        >
                          <source src={sceneVideos[selectedScene]?.videoData?.videoUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>

                        {/* StoryLab Watermark */}
                        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                          <p className="text-white text-xs">
                            Story<span className="text-blue-500">Lab</span>
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#0a0a0a] aspect-video flex items-center justify-center">
                        <p className="text-gray-400">No video data</p>
                      </div>
                    )}

                    {/* Video Info */}
                    <div className="p-6 border-t border-gray-800 bg-[#0a0a0a]">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-white mb-1">Scene {selectedScene}</h3>
                          <p className="text-gray-400">Duration: {sceneVideos[selectedScene]?.videoData?.duration || '8s'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleGenerate(selectedScene)}
                            variant="outline"
                            className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Regenerate
                          </Button>
                          <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                            <Download className="w-4 h-4 mr-2" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Idle State - Show placeholder
                <div className="overflow-hidden">
                  <div className="bg-[#0a0a0a] aspect-video flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 rounded-full bg-blue-600/20 backdrop-blur flex items-center justify-center mx-auto mb-4">
                        <Play className="w-10 h-10 text-blue-500" />
                      </div>
                      <p className="text-gray-400 mb-1">Scene {selectedScene} - Not Generated Yet</p>
                      <p className="text-gray-500 text-sm">Click "Generate Video" button below to create video for this scene</p>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="p-6 border-t border-gray-800 bg-[#0a0a0a] flex justify-center">
                    <Button
                      onClick={() => handleGenerate(selectedScene)}
                      className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl px-8"
                      size="lg"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Video
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="overflow-hidden">
              <div className="bg-[#0a0a0a] aspect-video flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gray-700/30 backdrop-blur flex items-center justify-center mx-auto mb-4">
                    <Play className="w-10 h-10 text-gray-500" />
                  </div>
                  <p className="text-gray-400">Select a scene to start</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scene Navigation Sidebar - Takes 1 column */}
        <div className="lg:col-span-1 border-l border-gray-800 flex flex-col bg-[#0a0a0a]">
          <div className="p-4 border-b border-gray-800">
            <h3 className="text-white font-semibold text-sm">Scenes</h3>
            <p className="text-gray-400 text-xs mt-1">{Object.values(sceneVideos).filter(s => s.status === 'complete').length}/{project?.aiGeneratedStoryboard?.scenes?.length || 0} Generated</p>
          </div>

          {/* Scrollable Scene List */}
          <div className="overflow-y-auto flex-1 scrollbar-hide">
              <div className="space-y-2 p-3">
                {project?.aiGeneratedStoryboard?.scenes?.map((scene: any) => {
                  const sceneStatus = sceneVideos[scene.sceneNumber];
                  const isSelected = selectedScene === scene.sceneNumber;
                  const getImageUrl = (image: any): string | null => {
                    if (!image) return null;
                    if (typeof image === 'string') return image;
                    if (image.url) return image.url;
                    return null;
                  };
                  const imageUrl = getImageUrl(scene?.image);

                  return (
                    <div
                      key={scene.sceneNumber}
                      onClick={() => setSelectedScene(scene.sceneNumber)}
                      className={`cursor-pointer rounded-lg overflow-hidden border transition-all ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/50'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-black">
                        {imageUrl ? (
                          <img src={imageUrl} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-900">
                            <span className="text-gray-600 text-xs">No image</span>
                          </div>
                        )}

                        {/* Status Indicator */}
                        {(sceneStatus?.status === 'generating' || sceneStatus?.status === 'complete') && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                            <div className="flex items-center gap-1">
                              {sceneStatus?.status === 'complete' && (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                  <span className="text-green-400 text-xs font-medium">Done</span>
                                </>
                              )}
                              {sceneStatus?.status === 'generating' && (
                                <span className="text-blue-400 text-xs animate-pulse">Generating...</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Scene Number */}
                      <div className="bg-[#0a0a0a] p-2 border-t border-gray-800">
                        <p className="text-white text-xs font-medium">Scene {scene.sceneNumber}</p>
                        {scene.title && (
                          <p className="text-gray-400 text-xs line-clamp-1">{scene.title}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Complete Project Button */}
      {allScenesGenerated && (
        <div className="flex justify-end mt-8">
          <Button
            onClick={handleComplete}
            disabled={isSaving}
            className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-8"
            size="lg"
          >
            {isSaving ? (
              <>
                <div className="animate-spin mr-2">⏳</div>
                Completing...
              </>
            ) : (
              <>
                Complete Project
                <Sparkles className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
