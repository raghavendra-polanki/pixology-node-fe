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
  const [testVideoUrl, setTestVideoUrl] = useState('https://storage.googleapis.com/pixology-personas/videos/HIoCx9ZZb1YAwyg84n2t/scene_3/15754933715511817930/sample_0.mp4');

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

  // Helper: Build video prompt from screenplay data
  const buildVideoPrompt = (sceneData: any, screenplayEntry: any): string => {
    const {
      title = `Scene ${sceneData.sceneNumber}`,
      description = 'Professional video scene',
    } = sceneData;

    const {
      visual = 'Professional video content',
      cameraFlow = 'Smooth camera movement',
      script = 'Scene dialogue or narration',
      backgroundMusic = 'Background music',
    } = screenplayEntry;

    return `Create a professional marketing video for this scene:

**Scene Title:** ${title}
**Scene Number:** ${sceneData.sceneNumber}

**Visual Description:**
${visual}

**Camera Direction:**
${cameraFlow}

**Script/Dialogue/Narration:**
${script}

**Background Audio/Music:**
${backgroundMusic}

**Overall Scene Description:**
${description}

**Requirements:**
- Professional cinematography quality
- Natural, relatable UGC-style video
- Smooth camera movements as specified
- Authentic lighting and atmosphere
- Include the script/dialogue delivery
- Background music should enhance the scene
- Duration: 6 seconds (Veo3 supports 4s, 6s, or 8s durations)
- High quality 720p resolution
- 24 fps

Generate a high-quality, professional marketing video that brings this scene to life.`;
  };

  // Helper: Extract GCS URI from storyboard image
  const getSceneImageGcsUri = (sceneData: any): string | null => {
    const image = sceneData?.image;
    if (!image) return null;

    let imageUrl: string | null = null;

    // Handle string format (direct URL)
    if (typeof image === 'string') {
      imageUrl = image;
    }
    // Handle object with url property
    else if (typeof image === 'object' && image.url) {
      imageUrl = image.url;
    }

    if (!imageUrl) return null;

    // If already a GCS URI, return as-is
    if (imageUrl.startsWith('gs://')) {
      return imageUrl;
    }

    // Convert HTTPS public URL back to GCS URI format
    // Example: https://storage.googleapis.com/pixology-personas/personas/...
    // becomes: gs://pixology-personas/personas/...
    if (imageUrl.startsWith('https://storage.googleapis.com/')) {
      // Parse bucket name from URL: https://storage.googleapis.com/{bucket}/{path}
      const urlParts = imageUrl.replace('https://storage.googleapis.com/', '').split('/');
      const bucketName = urlParts[0];
      const gcsPath = urlParts.slice(1).join('/');
      return `gs://${bucketName}/${gcsPath}`;
    }

    return null;
  };

  const handleGenerate = async (sceneNumber: number) => {
    try {
      // Reset error state before generation
      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], status: 'generating', progress: 0, error: undefined }
      }));

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

      if (!sceneData) {
        throw new Error(`No scene data found for Scene ${sceneNumber}`);
      }

      if (!screenplayEntry) {
        throw new Error(`No screenplay entry found for Scene ${sceneNumber}`);
      }

      // Get GCS URI for storyboard image
      const sceneImageGcsUri = getSceneImageGcsUri(sceneData);
      if (!sceneImageGcsUri) {
        const imageInfo = sceneData?.image
          ? `Image exists but not in expected format: ${JSON.stringify(sceneData.image).substring(0, 100)}`
          : 'No image data found in scene';
        throw new Error(`No GCS image URI available for Scene ${sceneNumber}. ${imageInfo}`);
      }
      console.log(`✓ Scene ${sceneNumber} image GCS URI: ${sceneImageGcsUri}`);

      const gcsBucket = import.meta.env.VITE_GCS_BUCKET_NAME || 'pixology-personas';
      const expectedOutputPath = `gs://${gcsBucket}/videos/${project?.id || 'unknown'}/scene_${sceneNumber}/`;
      console.log(`🎬 Starting video generation for Scene ${sceneNumber}...`);
      console.log(`   Output will be stored in: ${expectedOutputPath}`);
      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], progress: 10 }
      }));

      // Build prompt from screenplay data
      const prompt = buildVideoPrompt(sceneData, screenplayEntry);
      console.log(`📝 Prompt generated for Scene ${sceneNumber}`);

      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], progress: 20 }
      }));

      // Call Veo3 Direct API via backend
      const response = await fetch('/api/videos/generate-veo3', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sceneImageGcsUri: sceneImageGcsUri,
          prompt: prompt,
          sceneData: sceneData,
          screenplayEntry: screenplayEntry,
          durationSeconds: 6,
          aspectRatio: '16:9',
          resolution: '720p',
          projectId: project?.id,
          sceneNumber: sceneNumber,
        }),
      });

      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType?.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } else {
            const text = await response.text();
            errorMessage = text || errorMessage;
          }
        } catch (e) {
          // Fallback to status code if parsing fails
        }
        throw new Error(errorMessage);
      }

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse video generation response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
      }
      console.log(`✅ Video generation response received for Scene ${sceneNumber}`);

      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], progress: 90 }
      }));

      // Extract video data from result
      const videoData: VideoData = {
        sceneNumber: result.sceneNumber || sceneNumber,
        sceneTitle: result.sceneTitle || `Scene ${sceneNumber}`,
        videoUrl: result.videoUrl || '',
        videoFormat: result.videoFormat || 'mp4',
        duration: result.duration || '5s',
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

      // Save to project
      await updateVideoProduction(
        {
          videoUrl: result.videoUrl,
          status: 'complete',
          title: result.sceneTitle || `Scene ${sceneNumber}`,
          videoData: result,
          sceneNumber,
        },
        project?.id || projectId || ''
      );

      console.log(`✅ Video saved successfully for Scene ${sceneNumber}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`❌ Error generating video for Scene ${sceneNumber}:`, err);
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
          <div className="flex gap-2">
            <Button
              onClick={() => {
                if (selectedScene) {
                  setSceneVideos(prev => ({
                    ...prev,
                    [selectedScene]: {
                      status: 'complete',
                      progress: 100,
                      videoData: {
                        sceneNumber: selectedScene,
                        sceneTitle: `Scene ${selectedScene}`,
                        videoUrl: testVideoUrl,
                        videoFormat: 'mp4',
                        duration: '6s',
                        generatedAt: new Date().toISOString(),
                      }
                    }
                  }));
                }
              }}
              variant="outline"
              className="border-yellow-700 text-yellow-300 hover:bg-yellow-900/20 rounded-lg"
            >
              Load Test Video
            </Button>
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
        <div className="lg:col-span-1 border-l border-gray-800 flex flex-col bg-[#0a0a0a] max-h-screen lg:max-h-[600px]">
          <div className="p-4 border-b border-gray-800 flex-shrink-0">
            <h3 className="text-white font-semibold text-sm">Scenes</h3>
            <p className="text-gray-400 text-xs mt-1">{Object.values(sceneVideos).filter(s => s.status === 'complete').length}/{project?.aiGeneratedStoryboard?.scenes?.length || 0} Generated</p>
          </div>

          {/* Scrollable Scene List */}
          <div className="overflow-y-auto flex-1 scrollbar-styled">
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
                      className={`scene-card cursor-pointer rounded-lg overflow-hidden border ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/50'
                          : 'border-gray-700'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="scene-thumbnail relative aspect-video bg-black">
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
