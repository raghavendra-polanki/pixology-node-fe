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
  ChevronUp,
  Wand2,
  Upload
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
import { PromptTemplateEditor } from '../shared/PromptTemplateEditor';
import { GenerationProgressIndicator } from '../shared/GenerationProgressIndicator';

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
  navigateToStage?: (stageId: number) => void;
}

type ViewMode = 'grid';

export function Stage4Storyboard({
  project: propProject,
  projectId: propProjectId,
  updateAIStoryboard: propUpdateAIStoryboard,
  updateStoryboardCustomizations: propUpdateStoryboardCustomizations,
  markStageCompleted: propMarkStageCompleted,
  advanceToNextStage: propAdvanceToNextStage,
  navigateToStage: propNavigateToStage,
}: Stage4Props) {
  // Load project using hook, but prefer passed props from WorkflowView
  const hookResult = useStoryLabProject({ autoLoad: true, projectId: propProjectId || propProject?.id || '' });

  // Use passed props from WorkflowView (preferred) since we call WorkflowView's loadProject
  // which updates WorkflowView's project state that gets passed down
  const project = propProject || hookResult.project;
  const isSaving = hookResult.isSaving;
  const updateAIStoryboard = propUpdateAIStoryboard || hookResult.updateAIStoryboard;
  const updateStoryboardCustomizations = propUpdateStoryboardCustomizations || hookResult.updateStoryboardCustomizations;
  const markStageCompleted = propMarkStageCompleted || hookResult.markStageCompleted;
  const advanceToNextStage = propAdvanceToNextStage || hookResult.advanceToNextStage;
  const navigateToStage = propNavigateToStage;
  const loadProject = hookResult.loadProject;

  const generatedScenesRef = useRef<HTMLDivElement>(null);
  const lastLoadedScenesRef = useRef<string>(''); // Track last loaded scenes to prevent unnecessary reloads

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [viewMode] = useState<ViewMode>('grid');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [expandedSceneId, setExpandedSceneId] = useState<string | null>(null);
  const [aiEditingScene, setAiEditingScene] = useState<Scene | null>(null);
  const [aiEditPrompt, setAiEditPrompt] = useState('');
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newGeneratedImage, setNewGeneratedImage] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [locallyModified, setLocallyModified] = useState(false);

  // Sync scenes with project data when loaded
  useEffect(() => {
    // Only reload from project if we haven't made local modifications
    // This prevents tab switching from overwriting unsaved local changes
    if (!locallyModified && project?.aiGeneratedStoryboard?.scenes) {
      // Create a hash of the scene data to detect actual changes
      const sceneDataHash = JSON.stringify(
        project.aiGeneratedStoryboard.scenes.map((s: any) => ({
          id: s.sceneNumber,
          title: s.title,
          imageUrl: (s.image as any)?.url || (s.referenceImage as any)?.url || (s.referenceImage as any),
        }))
      );

      // Only reload if the scene data has actually changed
      if (sceneDataHash !== lastLoadedScenesRef.current) {
        const loadedScenes: Scene[] = project.aiGeneratedStoryboard.scenes.map((s, i) => ({
          id: s.sceneNumber?.toString() || i.toString(),
          number: s.sceneNumber || i + 1,
          title: s.title || '',
          description: s.description || '',
          visualNote: s.cameraInstructions || '',
          image: (s.image as any)?.url || (s.referenceImage as any)?.url || (s.referenceImage as any) || '',
        }));
        setScenes(loadedScenes);
        lastLoadedScenesRef.current = sceneDataHash;
      }
    } else if (!project?.aiGeneratedStoryboard?.scenes && !locallyModified) {
      setScenes([]);
      lastLoadedScenesRef.current = '';
    }
    // Note: locallyModified is intentionally NOT in the dependency array
    // We only want to reload when project data changes, not when the flag changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.aiGeneratedStoryboard]);

  const handleGenerateStoryboard = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Initializing...');
    setScenes([]); // Clear existing scenes for progressive loading
    setLocallyModified(false); // Reset flag when generating new storyboard
    lastLoadedScenesRef.current = ''; // Reset tracking when generating new storyboard

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

      // Generate storyboard using streaming endpoint
      const response = await fetch('/api/generation/storyboard-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          campaignDescription: project.campaignDetails.campaignDescription || '',
          productDescription: project.campaignDetails.productDescription,
          targetAudience: project.campaignDetails.targetAudience,
          selectedPersonaName: selectedPersona.coreIdentity?.name || 'Unknown',
          selectedPersonaDescription: selectedPersona.coreIdentity?.bio || '',
          selectedPersonaImage: selectedPersona.image?.url || '',
          productImageUrl: project.campaignDetails.productImageUrl || '',
          narrativeTheme: selectedNarrative.title || '',
          narrativeStructure: selectedNarrative.structure || '',
          numberOfScenes: 5,
          videoDuration: project.campaignDetails.videoDuration || '30s',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start storyboard generation');
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      // Read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = '';
      const tempScenes = new Map<number, Scene>();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Split by newlines to process SSE events
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue; // Skip empty lines

          if (line.startsWith('event:')) {
            currentEventType = line.substring(7).trim();
          } else if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());

              // Handle different event types
              if (currentEventType === 'start') {
                setGenerationStatus(data.message || 'Starting generation...');
              } else if (currentEventType === 'progress') {
                setGenerationStatus(data.message || '');
                if (data.progress !== undefined) {
                  setGenerationProgress(data.progress);
                }
              } else if (currentEventType === 'scene') {
                // Add scene to temp map and update UI immediately
                const scene: Scene = {
                  id: data.scene.sceneNumber?.toString() || data.sceneNumber.toString(),
                  number: data.sceneNumber,
                  title: data.scene.title || `Scene ${data.sceneNumber}`,
                  description: data.scene.description || '',
                  visualNote: data.scene.cameraWork || data.scene.keyFrameDescription || '',
                  image: '', // Will be filled when image is generated
                };

                tempScenes.set(data.sceneNumber, scene);

                // Update scenes array progressively
                const updatedScenes = Array.from(tempScenes.values()).sort((a, b) => a.number - b.number);
                setScenes(updatedScenes);
                setGenerationProgress(data.progress || 0);
              } else if (currentEventType === 'image') {
                // Update scene with image URL
                const existingScene = tempScenes.get(data.sceneNumber);
                if (existingScene) {
                  existingScene.image = data.imageUrl || '';
                  tempScenes.set(data.sceneNumber, existingScene);
                  const updatedScenes = Array.from(tempScenes.values()).sort((a, b) => a.number - b.number);
                  setScenes(updatedScenes);
                }

                setGenerationProgress(data.progress || 0);
              } else if (currentEventType === 'complete') {
                setGenerationStatus('Storyboard complete!');
                setGenerationProgress(100);

                // Reload project to get latest data from Firestore
                await loadProject(project.id);

                // Scroll to generated scenes
                setTimeout(() => {
                  if (generatedScenesRef.current) {
                    generatedScenesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 500);
              } else if (currentEventType === 'error') {
                throw new Error(data.message || 'Generation failed');
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError);
            }
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate storyboard';
      console.error('Error generating storyboard:', errorMessage);
      alert(`Failed to generate storyboard: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
      setGenerationStatus('');
    }
  };

  const handleEditPrompts = () => {
    setShowPromptEditor(true);
  };

  const handleEditOpen = (scene: Scene) => {
    setEditingScene({ ...scene });
  };

  const handleEditSave = async () => {
    if (!editingScene) return;

    try {
      // Mark as locally modified to prevent useEffect from overwriting changes
      setLocallyModified(true);

      // Update local state
      const updatedScenes = scenes.map(s => s.id === editingScene.id ? editingScene : s);
      setScenes(updatedScenes);

      // Save to database - update the storyboard in the project
      const updatedStoryboard = project?.aiGeneratedStoryboard?.scenes?.map((s: any) =>
        s.sceneNumber?.toString() === editingScene.id
          ? {
              ...s,
              title: editingScene.title,
              description: editingScene.description,
              visualNote: editingScene.visualNote,
              // Preserve image object structure - update URL while keeping metadata
              image: typeof editingScene.image === 'string'
                ? { ...s.image, url: editingScene.image }
                : editingScene.image,
            }
          : s
      );

      if (updatedStoryboard) {
        await updateAIStoryboard(
          {
            scenes: updatedStoryboard,
            generatedAt: project?.aiGeneratedStoryboard?.generatedAt || new Date(),
            model: project?.aiGeneratedStoryboard?.model || 'storyboard-generation-v2',
            count: updatedStoryboard.length,
          },
          project.id
        );

        console.log('Scene edits saved successfully');

        // Reload project to get fresh data from database
        // This ensures when we navigate away and back, we have the latest data
        await new Promise(resolve => setTimeout(resolve, 800));
        await loadProject(project.id);

        // Keep locallyModified=true to prevent the useEffect from immediately overwriting
        // It will be reset when navigating to another stage
      }

      // Cleanup and close dialog
      if (uploadedImagePreview) {
        URL.revokeObjectURL(uploadedImagePreview);
      }
      setUploadedImagePreview(null);
      setEditingScene(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save changes';
      console.error('Error saving scene edits:', errorMessage);
      alert(`Failed to save changes: ${errorMessage}`);
    }
  };

  const handleEditChange = (field: keyof Scene, value: string | number) => {
    if (editingScene) {
      setEditingScene({ ...editingScene, [field]: value });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingScene) return;

    try {
      setUploadingImage(true);

      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setUploadedImagePreview(previewUrl);

      // Upload to GCS
      const formData = new FormData();
      formData.append('image', file);
      formData.append('projectId', project.id);
      formData.append('sceneId', editingScene.id);
      formData.append('oldImageUrl', editingScene.image);

      const response = await fetch('/api/storyboard/upload-scene-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to upload image');
      }

      const { imageUrl } = await response.json();

      // Update editing scene with new image URL
      setEditingScene({ ...editingScene, image: imageUrl });

      console.log('Image uploaded successfully:', imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      setUploadedImagePreview(null);
    } finally {
      setUploadingImage(false);
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

  const handleAiEditOpen = (scene: Scene) => {
    setAiEditingScene(scene);
    setAiEditPrompt('');
    setNewGeneratedImage(null);
  };

  const handleAiEditSubmit = async () => {
    if (!aiEditingScene || !aiEditPrompt.trim()) {
      alert('Please provide edit instructions');
      return;
    }

    setIsRegeneratingImage(true);
    try {
      // Get the current scene data from local state (which has the latest image)
      const currentSceneFromState = scenes.find(s => s.id === aiEditingScene.id);

      if (!currentSceneFromState) {
        throw new Error('Could not find scene in local state');
      }

      // Get the full scene metadata from project, but use the current image from local state
      const fullSceneData = project?.aiGeneratedStoryboard?.scenes?.find(
        (s: any) => s.sceneNumber?.toString() === aiEditingScene.id
      );

      if (!fullSceneData) {
        throw new Error('Could not find complete scene data');
      }

      // Merge the scene data with the current image from local state
      // Preserve image object structure while updating the URL
      const sceneDataWithCurrentImage = {
        ...fullSceneData,
        image: typeof currentSceneFromState.image === 'string'
          ? { ...fullSceneData.image, url: currentSceneFromState.image }
          : currentSceneFromState.image,
      };

      // Call AI image edit API
      const response = await fetch('/api/storyboard/edit-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          sceneNumber: aiEditingScene.number,
          sceneData: sceneDataWithCurrentImage,
          editPrompt: aiEditPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to edit image');
      }

      const result = await response.json();
      const newImageUrl = result.imageUrl;

      // Store the new image but don't update storyboard yet
      setNewGeneratedImage(newImageUrl);
      setAiEditPrompt(''); // Clear prompt for next edit
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to regenerate image';
      console.error('Error regenerating image:', errorMessage);
      alert(`Failed to regenerate image: ${errorMessage}`);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleSaveEditedImage = async () => {
    if (!aiEditingScene || !newGeneratedImage) return;

    try {
      // Mark as locally modified to prevent useEffect from overwriting changes
      setLocallyModified(true);

      // Update scene with new image
      const updatedScenes = scenes.map(s =>
        s.id === aiEditingScene.id ? { ...s, image: newGeneratedImage } : s
      );
      setScenes(updatedScenes);

      // Save to database
      const updatedStoryboard = project?.aiGeneratedStoryboard?.scenes?.map((s: any) =>
        s.sceneNumber?.toString() === aiEditingScene.id
          ? { ...s, image: { ...s.image, url: newGeneratedImage } }
          : s
      );

      if (updatedStoryboard) {
        await updateAIStoryboard(
          {
            scenes: updatedStoryboard,
            generatedAt: new Date(),
            model: 'storyboard-generation-v2-edited',
            count: updatedStoryboard.length,
          },
          project.id
        );

        console.log('AI edited image saved successfully');

        // Reload project to get fresh data from database
        // This ensures when we navigate away and back, we have the latest data
        await new Promise(resolve => setTimeout(resolve, 800));
        await loadProject(project.id);

        // Keep locallyModified=true to prevent the useEffect from immediately overwriting
        // It will be reset when navigating to another stage
      }

      // Close dialog
      setAiEditingScene(null);
      setNewGeneratedImage(null);
      setAiEditPrompt('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save image';
      console.error('Error saving image:', errorMessage);
      alert(`Failed to save image: ${errorMessage}`);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      // Prepare storyboard customizations if any
      const additionalUpdates = scenes.length > 0 ? {
        storyboardCustomizations: {
          editedScenes: scenes,
          lastEditedAt: new Date(),
        }
      } : undefined;

      // Mark stage as completed with batched updates (includes customizations, stage execution, and stage advancement)
      await markStageCompleted('storyboard', undefined, additionalUpdates);

      // Reload project to ensure latest storyboard data is available for next stage
      await loadProject(project.id);

      // Reset flag so fresh data loads when returning to this stage
      setLocallyModified(false);

      // Navigate to next stage (Screenplay = stage 5)
      if (navigateToStage) {
        navigateToStage(5);
      }
    } catch (error) {
      console.error('Failed to save storyboard:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show prompt editor if requested
  if (showPromptEditor) {
    // Get primary selected persona
    const primaryPersonaId = project?.userPersonaSelection?.primaryPersonaId;
    const allPersonas = project?.aiGeneratedPersonas?.personas || [];
    const primaryPersona = allPersonas.find((p: any) => p.id === primaryPersonaId) || allPersonas[0];

    // Format persona information
    const personaName = primaryPersona?.coreIdentity?.name || 'Unknown';
    const personaDemographic = primaryPersona?.coreIdentity?.demographic || '';
    const personaBio = primaryPersona?.coreIdentity?.bio || '';
    const personaMotivation = primaryPersona?.coreIdentity?.motivation || '';
    const personaDescription = `${personaName} - ${personaDemographic}\n\nBio: ${personaBio}\n\nMotivation: ${personaMotivation}`;

    // Get persona image URL
    const personaImageUrl = primaryPersona?.image?.url || primaryPersona?.image || '';

    // Get product image URL
    const productImageUrl = project?.campaignDetails?.productImageUrl || '';

    // Get selected narrative information
    const narrativeStyle = project?.narrativePreferences?.narrativeStyle;
    const selectedNarrative = project?.aiGeneratedNarratives?.narratives?.find((n: any) => n.id === narrativeStyle);
    const narrativeTheme = selectedNarrative?.title || project?.narrativePreferences?.customNarrative || 'Not selected';
    const narrativeStructure = selectedNarrative?.structure || selectedNarrative?.description || '';

    return (
      <PromptTemplateEditor
        stageType="stage_4_storyboard"
        projectId={project?.id}
        onBack={() => setShowPromptEditor(false)}
        stageData={{
          campaignDescription: project?.campaignDetails?.campaignDescription || '',
          productDescription: project?.campaignDetails?.productDescription || '',
          targetAudience: project?.campaignDetails?.targetAudience || '',
          videoDuration: project?.campaignDetails?.videoDuration || '30s',
          numberOfScenes: '6',
          selectedPersonaName: personaName,
          selectedPersonaDescription: personaDescription,
          personaImageUrl: personaImageUrl,
          productImageUrl: productImageUrl,
          narrativeTheme: narrativeTheme,
          narrativeStructure: narrativeStructure,
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
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
      </div>

      {/* Generate & Edit Buttons */}
      <div className="mb-8">
        <div className="flex gap-4">
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

        {/* Progress Indicator */}
        <GenerationProgressIndicator
          isGenerating={isGenerating}
          progress={generationProgress}
          status={generationStatus}
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
                  ) : isGenerating ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
                        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400/30 rounded-full animate-ping" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
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
                      onClick={() => handleAiEditOpen(scene)}
                      size="sm"
                      className="bg-blue-600/90 hover:bg-blue-700 text-white rounded-lg h-8 w-8 p-0"
                      title="AI Edit Image"
                    >
                      <Wand2 className="w-4 h-4" />
                    </Button>
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
              disabled={scenes.length === 0 || isSaving || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8"
              size="lg"
            >
              {isSaving || isSubmitting ? (
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
      <Dialog open={!!editingScene} onOpenChange={() => {
        if (uploadedImagePreview) {
          URL.revokeObjectURL(uploadedImagePreview);
        }
        setUploadedImagePreview(null);
        setEditingScene(null);
      }}>
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

              {/* Upload New Image */}
              <div className="space-y-2">
                <Label className="text-gray-300">Or Upload New Image</Label>
                <div className="flex gap-2">
                  <label className="flex-1">
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <span>{uploadingImage ? 'Uploading...' : 'Choose Image'}</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  Upload a new image to replace the current one (max 10MB)
                </p>
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

      {/* AI Edit Dialog */}
      <Dialog open={!!aiEditingScene} onOpenChange={() => {
        setAiEditingScene(null);
        setNewGeneratedImage(null);
        setAiEditPrompt('');
      }}>
        <DialogContent className="bg-[#151515] border-gray-800 text-white rounded-xl max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-blue-500" />
              AI Edit Scene {aiEditingScene?.number} Image
            </DialogTitle>
          </DialogHeader>
          {aiEditingScene && (
            <div className="flex gap-6 mt-4 h-[calc(90vh-10rem)]">
              {/* Left Side - Image Preview */}
              <div className="flex-1 flex flex-col min-w-0">
                <Label className="text-gray-300 mb-2">
                  {newGeneratedImage ? 'New Generated Image' : 'Current Image'}
                </Label>
                <div className="relative flex-1 rounded-lg overflow-hidden bg-gray-900 flex items-center justify-center">
                  <ImageWithFallback
                    src={newGeneratedImage || aiEditingScene.image}
                    alt={aiEditingScene.title}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                {newGeneratedImage && (
                  <p className="text-sm text-green-400 flex items-center gap-2 mt-3">
                    <Sparkles className="w-4 h-4" />
                    Image regenerated successfully! Click "Save & Apply" to update the storyboard.
                  </p>
                )}
              </div>

              {/* Right Side - Controls */}
              <div className="flex-1 flex flex-col gap-4 min-w-0">
                {/* Edit Instructions */}
                <div className="space-y-2">
                  <Label htmlFor="ai-edit-prompt" className="text-gray-300">
                    What would you like to change?
                  </Label>
                  <Textarea
                    id="ai-edit-prompt"
                    value={aiEditPrompt}
                    onChange={(e) => setAiEditPrompt(e.target.value)}
                    className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-32 resize-none"
                    placeholder="E.g., 'Make the lighting warmer', 'Change to outdoor setting', 'Add more products in the background', etc."
                    disabled={isRegeneratingImage}
                  />
                </div>

                {/* Info Box */}
                <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-3">
                  <p className="text-sm text-blue-300">
                    {newGeneratedImage
                      ? 'You can continue editing or save the current result. Click "Regenerate" to apply more changes.'
                      : 'AI will regenerate the image based on your instructions while maintaining the scene\'s overall concept and style.'
                    }
                  </p>
                </div>

                {/* Spacer to push buttons to bottom */}
                <div className="flex-1"></div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                  <Button
                    onClick={() => {
                      setAiEditingScene(null);
                      setNewGeneratedImage(null);
                      setAiEditPrompt('');
                    }}
                    variant="outline"
                    className="border-gray-700 text-gray-300 hover:bg-gray-800 rounded-lg"
                    disabled={isRegeneratingImage}
                  >
                    Cancel
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      onClick={handleAiEditSubmit}
                      disabled={!aiEditPrompt.trim() || isRegeneratingImage}
                      variant="outline"
                      className="border-blue-600 text-blue-400 hover:bg-blue-600/10 rounded-lg"
                    >
                      {isRegeneratingImage ? (
                        <>
                          <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Regenerate
                        </>
                      )}
                    </Button>
                    {newGeneratedImage && (
                      <Button
                        onClick={handleSaveEditedImage}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                      >
                        Save & Apply
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
