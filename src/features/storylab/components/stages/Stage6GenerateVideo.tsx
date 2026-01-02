import { useState, useEffect, useRef } from 'react';
import { Sparkles, Download, AlertCircle, Play, RefreshCw, SettingsIcon, CheckCircle, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { useStoryLabProject } from '../../hooks/useStoryLabProject';
import { PromptTemplateEditor } from '@/shared/components/PromptTemplateEditor';
import { GenerationProgressIndicator } from '../shared/GenerationProgressIndicator';
import { useAuth } from '@/shared/contexts/AuthContext';

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
  const { canEditPrompts } = useAuth();
  // Load project using hook, but prefer passed props from WorkflowView
  const hookResult = useStoryLabProject({ autoLoad: true, projectId: propProjectId || propProject?.id || '' });

  // Use passed props from WorkflowView (preferred) or fall back to hook results
  const project = propProject || hookResult.project;
  const isSaving = hookResult.isSaving;
  const updateVideoProduction = propUpdateVideoProduction || hookResult.updateVideoProduction;
  const updateAIVideos = hookResult.updateAIVideos;
  const markStageCompleted = propMarkStageCompleted || hookResult.markStageCompleted;
  const advanceToNextStage = propAdvanceToNextStage || hookResult.advanceToNextStage;

  const [sceneVideos, setSceneVideos] = useState<SceneVideoStatus>({});
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [playingScenes, setPlayingScenes] = useState<Set<number>>(new Set());
  const videoRef = useRef<HTMLVideoElement>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // State for "Generate All Videos" functionality
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [overallStatus, setOverallStatus] = useState('');

  const handlePlayClick = () => {
    if (selectedScene !== null && videoRef.current) {
      videoRef.current.play();
      setPlayingScenes(new Set([...playingScenes, selectedScene]));
    }
  };

  const handleSceneCardClick = (sceneNumber: number) => {
    setSelectedScene(sceneNumber);
    // Auto-play video if it's already generated
    setTimeout(() => {
      if (videoRef.current && sceneVideos[sceneNumber]?.status === 'complete') {
        videoRef.current.play();
        setPlayingScenes(new Set([...playingScenes, sceneNumber]));
      }
    }, 0);
  };

  // Initialize scene video statuses when project loads
  useEffect(() => {
    try {
      // Check if we have the required data
      if (!project) {
        setInitError('Project data not loaded');
        console.warn('Stage6: Project data not yet loaded');
        return;
      }

      if (!project.aiGeneratedStoryboard?.scenes || project.aiGeneratedStoryboard.scenes.length === 0) {
        setInitError('No storyboard scenes found. Please complete the Storyboard stage first.');
        console.warn('Stage6: No storyboard scenes available');
        return;
      }

      setInitError(null); // Clear any previous errors

      const initialStatuses: SceneVideoStatus = {};

      // Create a map of generated videos for quick lookup
      const generatedVideoMap = new Map();
      if (project.aiGeneratedVideos?.videos) {
        project.aiGeneratedVideos.videos.forEach((video: any) => {
          generatedVideoMap.set(video.sceneNumber, video);
        });
      }

      // Initialize status for each scene
      project.aiGeneratedStoryboard.scenes.forEach((scene: any) => {
        // Check if video has been generated and saved in aiGeneratedVideos
        const generatedVideo = generatedVideoMap.get(scene.sceneNumber);

        if (generatedVideo && generatedVideo.videoUrl) {
          // Video has been generated and saved
          initialStatuses[scene.sceneNumber] = {
            status: 'complete',
            progress: 100,
            videoData: {
              sceneNumber: scene.sceneNumber,
              sceneTitle: generatedVideo.sceneTitle || scene.title || `Scene ${scene.sceneNumber}`,
              videoUrl: generatedVideo.videoUrl,
              videoFormat: generatedVideo.format || 'mp4',
              duration: generatedVideo.duration || scene.duration || '6s',
              generatedAt: new Date(generatedVideo.generatedAt).toISOString(),
            }
          };
        } else {
          // No video generated yet
          initialStatuses[scene.sceneNumber] = {
            status: 'idle',
            progress: 0,
          };
        }
      });
      setSceneVideos(initialStatuses);

      // Set first scene as selected if none is selected
      if (selectedScene === null && project.aiGeneratedStoryboard.scenes.length > 0) {
        const firstSceneNumber = project.aiGeneratedStoryboard.scenes[0].sceneNumber;
        setSelectedScene(firstSceneNumber);
        console.log(`Stage6: Auto-selected first scene: ${firstSceneNumber}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error initializing stage';
      setInitError(errorMsg);
      console.error('Stage6 initialization error:', error);
    }
  }, [project?.id, project?.aiGeneratedStoryboard?.scenes?.length, project?.aiGeneratedVideos?.videos?.length]);

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

  const handleGenerateAll = async () => {
    if (!project?.aiGeneratedStoryboard?.scenes || project.aiGeneratedStoryboard.scenes.length === 0) {
      alert('No scenes found. Please generate storyboard first.');
      return;
    }

    setIsGeneratingAll(true);
    setOverallProgress(0);
    setOverallStatus('Initializing...');

    const scenes = project.aiGeneratedStoryboard.scenes;
    const totalScenes = scenes.length;

    // Track videos locally to avoid stale project data
    let accumulatedVideos: any[] = project?.aiGeneratedVideos?.videos || [];

    try {
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const sceneNumber = scene.sceneNumber;

        // Update overall status
        setOverallStatus(`Generating Scene ${sceneNumber} (${i + 1}/${totalScenes})...`);

        // Generate video for this scene and get the result
        await handleGenerateWithAccumulation(sceneNumber, accumulatedVideos);

        // After successful generation, update accumulated videos
        // The videos are updated by reference in handleGenerateWithAccumulation

        // Update overall progress
        const progressPercentage = Math.round(((i + 1) / totalScenes) * 100);
        setOverallProgress(progressPercentage);
      }

      setOverallStatus('All videos generated successfully!');
      setOverallProgress(100);

      // Clear status after a delay
      setTimeout(() => {
        setIsGeneratingAll(false);
        setOverallProgress(0);
        setOverallStatus('');
      }, 3000);
    } catch (error) {
      console.error('Error in Generate All:', error);
      setOverallStatus('Generation failed. Please try again.');
      setTimeout(() => {
        setIsGeneratingAll(false);
        setOverallProgress(0);
        setOverallStatus('');
      }, 3000);
    }
  };

  const handleGenerateWithAccumulation = async (sceneNumber: number, accumulatedVideos: any[]) => {
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

      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], progress: 20 }
      }));

      // Generate video using adaptor-based V2 service
      const generationResponse = await fetch('/api/generation/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          screenplayEntries: [screenplayEntry],
          storyboardScenes: [sceneData],
          videoDuration: '6s',
          aspectRatio: '16:9',
          resolution: '1080p',
        }),
      });

      if (!generationResponse.ok) {
        const errorData = await generationResponse.json();
        throw new Error(errorData.error || 'Failed to generate video');
      }

      const generationData = await generationResponse.json();
      const videos = generationData.data || [];

      if (!Array.isArray(videos) || videos.length === 0) {
        throw new Error('No video returned from generation service');
      }

      const result = videos[0];

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
        duration: result.duration || '6s',
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

      // Use accumulated videos instead of project data
      const videoIndex = accumulatedVideos.findIndex(v => v.sceneNumber === sceneNumber);

      // Create AIGeneratedVideo entry
      const newVideoEntry = {
        videoId: `video_${sceneNumber}_${Date.now()}`,
        sceneNumber,
        sceneTitle: result.sceneTitle || `Scene ${sceneNumber}`,
        videoUrl: result.videoUrl,
        gcsUri: result.gcsUri,
        duration: result.duration || '6s',
        resolution: result.resolution || '1080p',
        format: 'mp4',
        status: 'complete' as const,
        generatedAt: new Date(),
        model: 'video-generation-v2',
      };

      // Update or add the video entry to accumulated videos
      if (videoIndex >= 0) {
        accumulatedVideos[videoIndex] = newVideoEntry;
      } else {
        accumulatedVideos.push(newVideoEntry);
      }

      // Create or update AIGeneratedVideos collection
      const aiGeneratedVideos = {
        videoCollectionId: project?.id || `videos_${Date.now()}`,
        title: `Video Generation for ${project?.name || 'Project'}`,
        videos: accumulatedVideos,
        completedCount: accumulatedVideos.filter(v => v.status === 'complete').length,
        failedCount: accumulatedVideos.filter(v => v.status === 'error').length,
        totalCount: accumulatedVideos.length,
        generatedAt: new Date(),
        model: 'video-generation-v2',
      };

      // Update project with aiGeneratedVideos using hook method
      await updateAIVideos(aiGeneratedVideos, project?.id);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`❌ Error generating video for Scene ${sceneNumber}:`, err);

      // Mark as error in local state
      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { status: 'error', progress: 0, error: errorMsg }
      }));

      // Also save the error status to the project
      const videoIndex = accumulatedVideos.findIndex(v => v.sceneNumber === sceneNumber);
      const errorVideoEntry = {
        videoId: `video_${sceneNumber}_${Date.now()}`,
        sceneNumber,
        sceneTitle: `Scene ${sceneNumber}`,
        videoUrl: '',
        gcsUri: '',
        duration: '6s',
        resolution: '1080p',
        format: 'mp4',
        status: 'error' as const,
        error: errorMsg,
        generatedAt: new Date(),
        model: 'video-generation-v2',
      };

      if (videoIndex >= 0) {
        accumulatedVideos[videoIndex] = errorVideoEntry;
      } else {
        accumulatedVideos.push(errorVideoEntry);
      }

      // Save error state to project
      const aiGeneratedVideos = {
        videoCollectionId: project?.id || `videos_${Date.now()}`,
        title: `Video Generation for ${project?.name || 'Project'}`,
        videos: accumulatedVideos,
        completedCount: accumulatedVideos.filter(v => v.status === 'complete').length,
        failedCount: accumulatedVideos.filter(v => v.status === 'error').length,
        totalCount: accumulatedVideos.length,
        generatedAt: new Date(),
        model: 'video-generation-v2',
      };

      try {
        await updateAIVideos(aiGeneratedVideos, project?.id);
      } catch (saveErr) {
        console.error('Failed to save error status:', saveErr);
      }

      // Don't re-throw - continue with next video in batch
    }
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

      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { ...prev[sceneNumber], progress: 20 }
      }));

      // Generate video using adaptor-based V2 service
      const generationResponse = await fetch('/api/generation/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          screenplayEntries: [screenplayEntry],
          storyboardScenes: [sceneData],
          videoDuration: '6s',
          aspectRatio: '16:9',
          resolution: '1080p',
        }),
      });

      if (!generationResponse.ok) {
        const errorData = await generationResponse.json();
        throw new Error(errorData.error || 'Failed to generate video');
      }

      const generationData = await generationResponse.json();
      const videos = generationData.data || [];

      if (!Array.isArray(videos) || videos.length === 0) {
        throw new Error('No video returned from generation service');
      }

      const result = videos[0];

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
        duration: result.duration || '6s',
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

      // Save to aiGeneratedVideos structure in project
      const existingVideos = project?.aiGeneratedVideos?.videos || [];
      const videoIndex = existingVideos.findIndex(v => v.sceneNumber === sceneNumber);

      // Create AIGeneratedVideo entry
      const newVideoEntry = {
        videoId: `video_${sceneNumber}_${Date.now()}`,
        sceneNumber,
        sceneTitle: result.sceneTitle || `Scene ${sceneNumber}`,
        videoUrl: result.videoUrl,
        gcsUri: result.gcsUri,
        duration: result.duration || '6s',
        resolution: result.resolution || '1080p',
        format: 'mp4',
        status: 'complete' as const,
        generatedAt: new Date(),
        model: 'video-generation-v2',
      };

      // Update or add the video entry
      const updatedVideos = [...existingVideos];
      if (videoIndex >= 0) {
        updatedVideos[videoIndex] = newVideoEntry;
      } else {
        updatedVideos.push(newVideoEntry);
      }

      // Create or update AIGeneratedVideos collection
      const aiGeneratedVideos = {
        videoCollectionId: project?.id || `videos_${Date.now()}`,
        title: `Video Generation for ${project?.name || 'Project'}`,
        videos: updatedVideos,
        completedCount: updatedVideos.filter(v => v.status === 'complete').length,
        failedCount: updatedVideos.filter(v => v.status === 'error').length,
        totalCount: updatedVideos.length,
        generatedAt: new Date(),
        model: 'video-generation-v2',
      };

      // Update project with aiGeneratedVideos using hook method
      await updateAIVideos(aiGeneratedVideos, project?.id);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`❌ Error generating video for Scene ${sceneNumber}:`, err);

      // Mark as error in local state
      setSceneVideos(prev => ({
        ...prev,
        [sceneNumber]: { status: 'error', progress: 0, error: errorMsg }
      }));

      // Also save the error status to the project
      const existingVideos = project?.aiGeneratedVideos?.videos || [];
      const videoIndex = existingVideos.findIndex(v => v.sceneNumber === sceneNumber);

      const errorVideoEntry = {
        videoId: `video_${sceneNumber}_${Date.now()}`,
        sceneNumber,
        sceneTitle: `Scene ${sceneNumber}`,
        videoUrl: '',
        gcsUri: '',
        duration: '6s',
        resolution: '1080p',
        format: 'mp4',
        status: 'error' as const,
        error: errorMsg,
        generatedAt: new Date(),
        model: 'video-generation-v2',
      };

      const updatedVideos = [...existingVideos];
      if (videoIndex >= 0) {
        updatedVideos[videoIndex] = errorVideoEntry;
      } else {
        updatedVideos.push(errorVideoEntry);
      }

      const aiGeneratedVideos = {
        videoCollectionId: project?.id || `videos_${Date.now()}`,
        title: `Video Generation for ${project?.name || 'Project'}`,
        videos: updatedVideos,
        completedCount: updatedVideos.filter(v => v.status === 'complete').length,
        failedCount: updatedVideos.filter(v => v.status === 'error').length,
        totalCount: updatedVideos.length,
        generatedAt: new Date(),
        model: 'video-generation-v2',
      };

      try {
        await updateAIVideos(aiGeneratedVideos, project?.id);
      } catch (saveErr) {
        console.error('Failed to save error status:', saveErr);
      }
    }
  };

  const handleDownload = async () => {
    const selectedSceneVideo = selectedScene ? sceneVideos[selectedScene]?.videoData : null;
    if (selectedSceneVideo?.videoUrl) {
      setIsDownloading(true);
      try {
        // Use backend endpoint to download video (bypasses CORS)
        const downloadUrl = `/api/videos/download?url=${encodeURIComponent(selectedSceneVideo.videoUrl)}&filename=scene-${selectedScene}-video.mp4`;

        // Create a download link that triggers the backend endpoint
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `scene-${selectedScene}-video.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Download failed:', error);
        alert(`Failed to download video: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleComplete = async () => {
    try {
      await markStageCompleted('video');
    } catch (error) {
      console.error('Failed to mark video stage complete:', error);
    }
  };

  const handleEditPrompts = () => {
    setShowPromptEditor(true);
  };

  // Show prompt editor if requested
  if (showPromptEditor) {
    // Prepare screenplay and storyboard data for prompt editor
    const screenplay = project?.aiGeneratedScreenplay?.screenplay || [];
    const storyboardScenes = project?.aiGeneratedStoryboard?.scenes || [];

    // Format screenplay entries for the prompt editor
    const screenplayText = screenplay.map((entry: any, index: number) => {
      return `Scene ${entry.sceneNumber || index + 1} (${entry.timeStart || '0:00'} - ${entry.timeEnd || '0:00'}):
Visual: ${entry.visual || 'No visual description'}
Camera Flow: ${entry.cameraFlow || 'No camera direction'}
Script: ${entry.script || 'No script'}
Background Music: ${entry.backgroundMusic || 'No music specified'}`;
    }).join('\n\n');

    // Format storyboard scenes for the prompt editor
    const storyboardText = storyboardScenes.map((scene: any, index: number) => {
      return `Scene ${scene.sceneNumber || index + 1}: ${scene.title || 'Untitled'}
Description: ${scene.description || 'No description'}
Location: ${scene.location || 'Not specified'}
Visual Elements: ${scene.visualElements || 'Not specified'}
Camera Work: ${scene.cameraWork || 'Not specified'}`;
    }).join('\n\n');

    // Get first screenplay entry as example data for variables
    const firstScreenplay = screenplay[0] || {};

    return (
      <PromptTemplateEditor
        stageType="stage_6_video"
        projectId={project?.id}
        onBack={() => setShowPromptEditor(false)}
        stageData={{
          sceneNumber: firstScreenplay.sceneNumber || '1',
          visual: firstScreenplay.visual || 'No visual description available',
          cameraFlow: firstScreenplay.cameraFlow || 'No camera flow available',
          script: firstScreenplay.script || 'No script available',
          backgroundMusic: firstScreenplay.backgroundMusic || 'No background music specified',
          duration: firstScreenplay.timeEnd || project?.campaignDetails?.videoDuration || '6s',
          videoDuration: project?.campaignDetails?.videoDuration || '30s',
          screenplay: screenplayText || 'No screenplay available',
          storyboard: storyboardText || 'No storyboard available',
        }}
      />
    );
  }

  const allScenesGenerated = project?.aiGeneratedStoryboard?.scenes?.every((scene: any) =>
    sceneVideos[scene.sceneNumber]?.status === 'complete'
  );

  return (
    <div className="max-w-7xl mx-auto p-8 lg:p-12">
      {/* Error State */}
      {initError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{initError}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {!project && !initError && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-400">Loading project data...</p>
          </div>
        </div>
      )}

      {/* Content - Only show if project loaded and no errors */}
      {project && !initError && (
        <>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
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

        {/* Generate All & Edit Buttons */}
        <div className="mb-4">
          <div className="flex gap-4">
            <Button
              onClick={handleGenerateAll}
              disabled={isGeneratingAll}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl"
              size="lg"
            >
              {isGeneratingAll ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spark-intense" />
                  Generating All Videos...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate All Videos
                </>
              )}
            </Button>
            {canEditPrompts && (
              <Button
                onClick={handleEditPrompts}
                variant="outline"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white rounded-xl"
                size="lg"
              >
                <SettingsIcon className="w-5 h-5 mr-2" />
                Edit Prompts
              </Button>
            )}
          </div>

          {/* Progress Indicator */}
          <GenerationProgressIndicator
            isGenerating={isGeneratingAll}
            progress={overallProgress}
            status={overallStatus}
          />

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
                      <Sparkles className="w-10 h-10 text-white animate-spark-intense" />
                    </div>
                    <div>
                      <h3 className="text-white mb-2">Generating Video for Scene {selectedScene}</h3>
                      <p className="text-gray-400">
                        AI is generating your scene video. This may take a few minutes...
                      </p>
                    </div>

                    {/* Infinite Progress Bar */}
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="h-3 bg-gray-800 rounded overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 animate-pulse"></div>
                        <div
                          className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                          style={{
                            animation: 'shimmer 2s infinite'
                          }}
                        ></div>
                      </div>
                      <div className="text-center text-gray-400 text-sm">
                        <span>Processing... This may take a few minutes</span>
                      </div>
                    </div>

                    <style>{`
                      @keyframes shimmer {
                        0% {
                          transform: translateX(-100%);
                        }
                        100% {
                          transform: translateX(100%);
                        }
                      }
                    `}</style>
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
                          ref={videoRef}
                          key={`video-${selectedScene}`}
                          controls
                          className="w-full h-full bg-black"
                          controlsList="nodownload"
                          onPlay={() => {
                            if (selectedScene !== null) {
                              setPlayingScenes(new Set([...playingScenes, selectedScene]));
                            }
                          }}
                          onPause={() => {
                            if (selectedScene !== null) {
                              const newPlaying = new Set(playingScenes);
                              newPlaying.delete(selectedScene);
                              setPlayingScenes(newPlaying);
                            }
                          }}
                        >
                          <source src={sceneVideos[selectedScene]?.videoData?.videoUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>

                        {/* Play Button Overlay */}
                        {!playingScenes.has(selectedScene || -1) && (
                          <button
                            onClick={handlePlayClick}
                            className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors group"
                          >
                            <div className="w-20 h-20 rounded-full bg-blue-600/80 hover:bg-blue-600 flex items-center justify-center transition-colors">
                              <Play className="w-8 h-8 text-white fill-white" />
                            </div>
                          </button>
                        )}

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
                          <Button
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isDownloading ? (
                              <>
                                <div className="animate-spin mr-2">⏳</div>
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </>
                            )}
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
                      disabled={sceneVideos[selectedScene]?.status === 'generating'}
                      className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl px-8 disabled:opacity-50 disabled:cursor-not-allowed"
                      size="lg"
                    >
                      <Sparkles className={`w-5 h-5 mr-2 ${sceneVideos[selectedScene]?.status === 'generating' ? 'animate-spark-intense' : ''}`} />
                      {sceneVideos[selectedScene]?.status === 'generating' ? 'Generating Video...' : 'Generate Video'}
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
                      onClick={() => handleSceneCardClick(scene.sceneNumber)}
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
                        {(sceneStatus?.status === 'generating' || sceneStatus?.status === 'complete' || sceneStatus?.status === 'error') && (
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
                              {sceneStatus?.status === 'error' && (
                                <div
                                  className="flex items-center gap-1 cursor-pointer group relative"
                                  title={sceneStatus?.error || 'Generation failed'}
                                >
                                  <AlertCircle className="w-4 h-4 text-red-500" />
                                  <span className="text-red-400 text-xs font-medium">Failed</span>
                                  <Info className="w-3 h-3 text-red-400 ml-1" />

                                  {/* Tooltip */}
                                  <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-50">
                                    <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl max-w-xs border border-red-500/30">
                                      <p className="font-semibold text-red-400 mb-1">Error:</p>
                                      <p className="text-gray-300">{sceneStatus?.error || 'Generation failed'}</p>
                                    </div>
                                  </div>
                                </div>
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
        </>
      )}
    </div>
  );
}
