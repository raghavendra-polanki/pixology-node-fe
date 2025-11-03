import { useState, useEffect } from 'react';
import { Sparkles, Download, ThumbsUp, ThumbsDown, AlertCircle, Play, Volume2, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { useStoryLabProject } from '../../hooks/useStoryLabProject';

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

  const [status, setStatus] = useState<'idle' | 'generating' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<'good' | 'needs-edit' | null>(null);
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync video status with project data when loaded
  useEffect(() => {
    if (project?.videoProduction?.status) {
      setStatus(project.videoProduction.status as any);
      setProgress(100);
      if (project.videoProduction.videoUrl) {
        setVideoData(project.videoProduction as VideoData);
      }
    }
  }, [project?.videoProduction]);

  const handleGenerate = async () => {
    try {
      setStatus('generating');
      setProgress(0);
      setError(null);

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

      // Get first scene (Scene 1) data
      const sceneData = project.aiGeneratedStoryboard.scenes[0];
      const screenplayEntry = project.aiGeneratedScreenplay.screenplay[0];
      const sceneImage = sceneData?.image?.url || null;

      if (!sceneData) {
        throw new Error('No scene data found for Scene 1');
      }

      if (!screenplayEntry) {
        throw new Error('No screenplay entry found for Scene 1');
      }

      if (!sceneImage) {
        throw new Error('No image available for Scene 1. Please generate storyboard images first.');
      }

      console.log('Starting video generation for Scene 1...');
      setProgress(10);

      // Step 1: Fetch the recipe
      const recipeResponse = await fetch('/api/recipes?stageType=stage_6_video');
      const recipeData = await recipeResponse.json();

      if (!recipeData.recipes || recipeData.recipes.length === 0) {
        throw new Error('No recipe found for video generation. Please seed recipes first.');
      }

      const recipe = recipeData.recipes[0];
      const recipeId = recipe.id;
      setProgress(20);

      // Prepare execution input
      const executionInput = {
        sceneImage,
        sceneData,
        screenplayEntry,
        projectId: project?.id,
        sceneIndex: 0,
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
        }),
      });

      if (!executeResponse.ok) {
        const errorData = await executeResponse.json();
        throw new Error(errorData.error || 'Failed to execute recipe');
      }

      const executionData = await executeResponse.json();
      const executionId = executionData.executionId;

      console.log('Video generation started, execution ID:', executionId);
      setProgress(30);

      // Step 3: Poll for execution results
      let execution: any = null;
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes with 5-second polling

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds

        const statusResponse = await fetch(`/api/recipes/executions/${executionId}`);
        execution = await statusResponse.json();

        if (execution.execution.status === 'completed') {
          break;
        }

        if (execution.execution.status === 'failed') {
          throw new Error(`Recipe execution failed: ${execution.execution.executionContext?.error}`);
        }

        // Update progress based on attempts (30% -> 90%)
        const newProgress = Math.min(30 + (attempts * 0.5), 90);
        setProgress(newProgress);
        attempts++;
      }

      if (!execution || execution.execution.status !== 'completed') {
        throw new Error('Recipe execution timed out after 10 minutes');
      }

      console.log('Video generation completed');
      setProgress(95);

      // Step 4: Extract video data from result
      // The final node's output key is 'uploadedVideos', but for single scene it returns an array
      const uploadedVideos = execution.execution.result?.uploadedVideos || [];

      if (uploadedVideos.length === 0) {
        throw new Error('No video data in result');
      }

      const generatedVideo = uploadedVideos[0];

      // Step 5: Update video state
      setVideoData({
        sceneNumber: generatedVideo.sceneNumber || 1,
        sceneTitle: generatedVideo.sceneTitle || 'Scene 1',
        videoUrl: generatedVideo.videoUrl || '',
        videoFormat: generatedVideo.videoFormat || 'mp4',
        duration: generatedVideo.duration || '8s',
        generatedAt: new Date().toISOString(),
      });

      // Step 6: Save to project
      await updateVideoProduction(
        {
          videoUrl: generatedVideo.videoUrl,
          status: 'complete',
          title: generatedVideo.sceneTitle || project?.campaignDetails?.campaignName || 'Generated Video',
          videoData: generatedVideo,
        },
        project?.id || projectId || ''
      );

      console.log('Video saved successfully');
      setProgress(100);
      setStatus('complete');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error generating video:', err);
      setError(errorMsg);
      setStatus('idle');
    }
  };

  const handleFeedback = (type: 'good' | 'needs-edit') => {
    setFeedback(type);
  };

  const handleDownload = () => {
    // Simulate download
    console.log('Downloading video...');
  };

  const handleComplete = async () => {
    try {
      // Mark stage as completed
      await markStageCompleted('video');
    } catch (error) {
      console.error('Failed to mark video stage complete:', error);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white">Generate Video</h2>
            <p className="text-gray-400">
              Initiate final video assembly and review the result
            </p>
          </div>
        </div>
      </div>

      {/* Idle State - Generate Button */}
      {status === 'idle' && (
        <div className="space-y-6">
          {error && (
            <Alert className="bg-red-950/20 border-red-900/50 rounded-xl">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <AlertDescription className="text-red-200">
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          <Alert className="bg-blue-950/20 border-blue-900/50 rounded-xl">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <AlertDescription className="text-blue-200">
              <strong>Important:</strong> Video generation typically takes 5-10 minutes depending on complexity.
              You'll be notified when it's ready. Make sure all previous steps are finalized before proceeding.
            </AlertDescription>
          </Alert>

          <Card className="bg-[#151515] border-gray-800 rounded-xl p-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-white mb-2">Ready to Generate Your Video</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Our AI will combine your campaign details, personas, narrative, storyboard, and screenplay 
                  into a professional marketing video.
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl px-8"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Video
              </Button>
            </div>
          </Card>

          {/* Summary */}
          <Card className="bg-[#151515] border-gray-800 rounded-xl p-6">
            <h3 className="text-white mb-4">Campaign Summary</h3>
            {project ? (
              <div className="space-y-3 text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Campaign Name:</span>
                  <span className="text-gray-300">{project.campaignDetails?.campaignName || 'Not set'}</span>
                </div>
                <Separator className="bg-gray-800" />
                <div className="flex items-center justify-between">
                  <span>Video Length:</span>
                  <span className="text-gray-300">{project.campaignDetails?.videoLength || 'Not set'}</span>
                </div>
                <Separator className="bg-gray-800" />
                <div className="flex items-center justify-between">
                  <span>Selected Personas:</span>
                  <span className="text-gray-300">{project.aiGeneratedPersonas?.personas?.length || 0} personas</span>
                </div>
                <Separator className="bg-gray-800" />
                <div className="flex items-center justify-between">
                  <span>Storyboard Scenes:</span>
                  <span className="text-gray-300">{project.aiGeneratedStoryboard?.scenes?.length || 0} scenes</span>
                </div>
              </div>
            ) : (
              <div className="text-gray-400">Loading project data...</div>
            )}
          </Card>
        </div>
      )}

      {/* Generating State */}
      {status === 'generating' && (
        <Card className="bg-[#151515] border-gray-800 rounded-xl p-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center mx-auto">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-white mb-2">Generating Your Video</h3>
              <p className="text-gray-400">
                AI is assembling your campaign video. This may take a few minutes...
              </p>
            </div>
            
            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-3">
              <Progress value={progress} className="h-3 bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-blue-600 [&>div]:to-blue-500" />
              <div className="flex items-center justify-between text-gray-400">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
            </div>

            {/* Status Messages */}
            <div className="text-gray-500 space-y-2">
              {progress < 30 && <p>Analyzing screenplay and storyboard...</p>}
              {progress >= 30 && progress < 60 && <p>Rendering scenes and transitions...</p>}
              {progress >= 60 && progress < 90 && <p>Adding audio and voiceover...</p>}
              {progress >= 90 && <p>Finalizing video...</p>}
            </div>
          </div>
        </Card>
      )}

      {/* Complete State */}
      {status === 'complete' && (
        <div className="space-y-6">
          {/* Video Player */}
          <Card className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden">
            {videoData?.videoUrl ? (
              <div className="bg-[#0a0a0a] aspect-video relative group">
                {/* HTML5 Video Player */}
                <video
                  controls
                  className="w-full h-full bg-black"
                  controlsList="nodownload"
                >
                  <source src={videoData.videoUrl} type="video/mp4" />
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
              <div className="bg-[#0a0a0a] aspect-video flex items-center justify-center relative group">
                {/* Placeholder for video player */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-blue-600/20 backdrop-blur flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600/30 transition-all cursor-pointer">
                      <Play className="w-8 h-8 text-blue-500" />
                    </div>
                    <p className="text-gray-400">Video Preview</p>
                    <p className="text-gray-600">Click to play</p>
                  </div>
                </div>

                {/* StoryLab Watermark */}
                <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <p className="text-white text-xs">
                    Story<span className="text-blue-500">Lab</span>
                  </p>
                </div>
              </div>
            )}

            {/* Video Info */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white mb-1">{videoData?.sceneTitle || project?.campaignDetails?.campaignName || 'Generated Video'}</h3>
                  <p className="text-gray-400">Duration: {videoData?.duration || project?.campaignDetails?.videoLength || '8s'}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleGenerate()}
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate
                  </Button>
                  <Button
                    onClick={handleDownload}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Feedback Section */}
          <Card className="bg-[#151515] border-gray-800 rounded-xl p-6">
            <h3 className="text-white mb-4">How does it look?</h3>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => handleFeedback('good')}
                variant={feedback === 'good' ? 'default' : 'outline'}
                className={`rounded-lg flex-1 ${
                  feedback === 'good'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <ThumbsUp className="w-5 h-5 mr-2" />
                Looks Great!
              </Button>
              <Button
                onClick={() => handleFeedback('needs-edit')}
                variant={feedback === 'needs-edit' ? 'default' : 'outline'}
                className={`rounded-lg flex-1 ${
                  feedback === 'needs-edit'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <ThumbsDown className="w-5 h-5 mr-2" />
                Needs Edits
              </Button>
            </div>
            {feedback === 'needs-edit' && (
              <p className="text-gray-400 mt-4">
                You can go back to previous stages to make adjustments and regenerate the video.
              </p>
            )}
          </Card>

          {/* Complete Project */}
          {status === 'complete' && feedback === 'good' && (
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
      )}
    </div>
  );
}
