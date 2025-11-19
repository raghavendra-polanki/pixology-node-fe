import { useState, useEffect, useRef } from 'react';
import {
  ArrowRight,
  BookOpen,
  Lightbulb,
  Check,
  ChevronDown,
  ChevronUp,
  Wand2,
  SettingsIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useStoryLabProject } from '../../hooks/useStoryLabProject';
import { PromptTemplateEditor } from '../shared/PromptTemplateEditor';
import { GenerationProgressIndicator } from '../shared/GenerationProgressIndicator';

interface Narrative {
  id: string;
  title: string;
  description: string;
  structure: string;
  gradient: string;
  patternColor: string;
  ringColor: string;
}

interface Stage3Props {
  project?: any;
  projectId?: string;
  updateNarrativePreferences?: (preferences: any) => Promise<void>;
  updateAINarratives?: (narratives: any) => Promise<void>;
  markStageCompleted?: (stage: string) => Promise<void>;
  advanceToNextStage?: () => Promise<void>;
  navigateToStage?: (stageId: number) => void;
}

const narrativeOptions: Narrative[] = [
  {
    id: 'problem-solution',
    title: 'Problem/Solution',
    description: 'Start with a relatable problem, then introduce your product as the solution.',
    structure: 'Hook: Problem → Build: Consequences → Solution: Your Product → Resolution: Better Life',
    gradient: 'from-red-600 via-red-500 to-orange-500',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-red-500',
  },
  {
    id: 'day-in-life',
    title: 'A Day in the Life',
    description: 'Follow a character through their day with your product seamlessly integrated.',
    structure: 'Morning: Challenge → Midday: Discovery → Afternoon: Integration → Evening: Success',
    gradient: 'from-orange-600 via-orange-500 to-yellow-500',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-orange-500',
  },
  {
    id: 'before-after',
    title: 'Before/After Transformation',
    description: 'Show dramatic contrast emphasizing the transformation your product enables.',
    structure: 'Before: Struggle → Discovery: Product → Transition → After: Transformation',
    gradient: 'from-cyan-600 via-blue-500 to-indigo-600',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-cyan-500',
  },
  {
    id: 'testimonial',
    title: 'Customer Journey',
    description: 'Share an authentic story of a customer discovering and benefiting from your product.',
    structure: 'Introduction: Meet Customer → Challenge: Their Problem → Experience: Using Product → Results: Success Story',
    gradient: 'from-green-600 via-emerald-500 to-teal-500',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-green-500',
  },
  {
    id: 'comparison',
    title: 'Competitive Edge',
    description: 'Highlight what makes your product unique compared to typical solutions.',
    structure: 'Old Way: Limitations → New Way: Your Solution → Advantages: Key Benefits → Call-to-Action',
    gradient: 'from-blue-600 via-blue-500 to-cyan-500',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-blue-500',
  },
];

// Color palette for AI-generated narratives
const colorPalette = [
  {
    gradient: 'from-red-600 via-red-500 to-orange-500',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-red-500',
  },
  {
    gradient: 'from-orange-600 via-orange-500 to-yellow-500',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-orange-500',
  },
  {
    gradient: 'from-cyan-600 via-blue-500 to-indigo-600',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-cyan-500',
  },
  {
    gradient: 'from-green-600 via-emerald-500 to-teal-500',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-green-500',
  },
  {
    gradient: 'from-blue-600 via-blue-500 to-cyan-500',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-blue-500',
  },
  {
    gradient: 'from-purple-600 via-purple-500 to-pink-500',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-purple-500',
  },
];

// Function to get color for a narrative by index
const getColorForNarrative = (index: number) => {
  return colorPalette[index % colorPalette.length];
};

// Shape configurations for hover animations
const shapeConfigurations = [
  {
    // Shape 1: Square + Circle
    topLeftClass: 'rounded-lg rotate-12 group-hover:rotate-45',
    topLeftHoverScale: 'group-hover:scale-125',
    bottomRightClass: 'rounded-full group-hover:scale-110',
    bottomRightHoverRotate: '',
  },
  {
    // Shape 2: Circle + Rounded Square
    topLeftClass: 'rounded-full rotate-45 group-hover:rotate-90',
    topLeftHoverScale: 'group-hover:scale-110',
    bottomRightClass: 'rounded-2xl group-hover:scale-125',
    bottomRightHoverRotate: 'group-hover:rotate-12',
  },
  {
    // Shape 3: Small Square + Large Circle
    topLeftClass: 'rounded-sm rotate-0 group-hover:rotate-180',
    topLeftHoverScale: 'group-hover:scale-150',
    bottomRightClass: 'rounded-full group-hover:scale-125',
    bottomRightHoverRotate: 'group-hover:rotate-45',
  },
  {
    // Shape 4: Diamond + Circle
    topLeftClass: 'rounded-none rotate-45 group-hover:rotate-90',
    topLeftHoverScale: 'group-hover:scale-110',
    bottomRightClass: 'rounded-full group-hover:scale-110',
    bottomRightHoverRotate: 'group-hover:rotate-180',
  },
  {
    // Shape 5: Curved Square + Square
    topLeftClass: 'rounded-3xl rotate-0 group-hover:rotate-360',
    topLeftHoverScale: 'group-hover:scale-110',
    bottomRightClass: 'rounded-lg group-hover:scale-125',
    bottomRightHoverRotate: 'group-hover:rotate-45',
  },
  {
    // Shape 6: Large Circle + Small Square
    topLeftClass: 'rounded-full rotate-0 group-hover:rotate-360',
    topLeftHoverScale: 'group-hover:scale-125',
    bottomRightClass: 'rounded-md group-hover:scale-110',
    bottomRightHoverRotate: 'group-hover:rotate-90',
  },
];

// Function to get shape configuration by index
const getShapeForNarrative = (index: number) => {
  return shapeConfigurations[index % shapeConfigurations.length];
};

export function Stage3Narratives({
  project: propProject,
  projectId,
  updateNarrativePreferences: propUpdateNarrativePreferences,
  updateAINarratives: propUpdateAINarratives,
  markStageCompleted: propMarkStageCompleted,
  advanceToNextStage: propAdvanceToNextStage,
  navigateToStage: propNavigateToStage,
}: Stage3Props) {
  // All state declarations FIRST
  const [selectedNarrative, setSelectedNarrative] = useState<string>('');
  const [customNarrative, setCustomNarrative] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [narrativeUpdateTrigger, setNarrativeUpdateTrigger] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState('');
  const [streamingNarratives, setStreamingNarratives] = useState<Narrative[]>([]);

  // All refs SECOND
  const generatedNarrativesRef = useRef<HTMLDivElement>(null);

  // Use project from props (passed from WorkflowView), or load if not provided
  const hookResult = useStoryLabProject({ autoLoad: true, projectId: projectId || '' });

  // Always prefer hook's project if available and has data, fall back to propProject
  const project = hookResult.project?.id
    ? (hookResult.project?.aiGeneratedNarratives?.narratives?.length > 0 ? hookResult.project : (propProject || hookResult.project))
    : propProject;

  const updateNarrativePreferences = propUpdateNarrativePreferences || hookResult.updateNarrativePreferences;
  const updateAINarratives = propUpdateAINarratives || hookResult.updateAINarratives;
  const markStageCompleted = propMarkStageCompleted || hookResult.markStageCompleted;
  const advanceToNextStage = propAdvanceToNextStage || hookResult.advanceToNextStage;
  const navigateToStage = propNavigateToStage;
  const isSaving = hookResult.isSaving;

  // DEBUG: Log project state for troubleshooting
  useEffect(() => {
    console.log('Stage3Narratives project state:', {
      hasHookProject: !!hookResult.project?.id,
      hasAIGeneratedNarratives: !!project?.aiGeneratedNarratives,
      narrativesCount: project?.aiGeneratedNarratives?.narratives?.length,
      narrativeUpdateTrigger: narrativeUpdateTrigger,
    });
  }, [project?.id, project?.aiGeneratedNarratives?.narratives?.length, narrativeUpdateTrigger]);

  // Sync form with project data when loaded
  useEffect(() => {
    if (project?.narrativePreferences) {
      setCustomNarrative(project.narrativePreferences.customNarrative || '');
      setUseCustom(project.narrativePreferences.useCustomStructure || false);

      // Check if the selected narrative is from mock options
      const mockNarrativeId = narrativeOptions.find(n => n.id === project.narrativePreferences?.narrativeStyle)?.id;
      if (mockNarrativeId) {
        setSelectedNarrative(mockNarrativeId);
      }
    }

    // Also sync if there are AI-generated narratives and a selection exists
    if (project?.aiGeneratedNarratives?.narratives?.length > 0) {
      // If we have saved narrative preferences with a style, try to find it in AI narratives
      if (project.narrativePreferences?.narrativeStyle) {
        const selectedAI = project.aiGeneratedNarratives.narratives.find(
          (n: any) => n.id === project.narrativePreferences?.narrativeStyle
        );
        if (selectedAI) {
          setSelectedNarrative(selectedAI.id);
        }
      }
    }
  }, [project?.narrativePreferences, project?.aiGeneratedNarratives?.narratives]);

  // Force UI update when narratives are generated
  useEffect(() => {
    if (hookResult.project?.aiGeneratedNarratives?.narratives?.length > 0) {
      console.log('AI Generated Narratives detected:', hookResult.project.aiGeneratedNarratives.narratives.length);
      setNarrativeUpdateTrigger(prev => prev + 1);
    }
  }, [hookResult.project?.aiGeneratedNarratives?.narratives?.length]);

  const handleSelectNarrative = (id: string) => {
    setSelectedNarrative(id);
    setUseCustom(false);
    setCustomNarrative('');
  };

  const handleGenerateNarratives = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationStatus('Initializing...');
    setStreamingNarratives([]); // Clear narratives on regeneration

    try {
      if (!project) throw new Error('No project loaded. Please go back and reload the project.');

      const response = await fetch('/api/generation/narratives-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          campaignDescription: project.campaignDetails.campaignDescription || '',
          productDescription: project.campaignDetails.productDescription,
          targetAudience: project.campaignDetails.targetAudience,
          numberOfNarratives: 6,
          selectedPersonas: project?.aiGeneratedPersonas?.personas
            ?.filter((p: any) => project?.userPersonaSelection?.selectedPersonaIds?.includes(p.id))
            ?.map((p: any) => p.coreIdentity?.name || p.name || 'Unknown')
            .join(', ') || 'No personas selected',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start narrative generation');
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = '';
      let savedNarrativesData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          if (line.startsWith('event:')) {
            currentEventType = line.substring(7).trim();
          } else if (line.startsWith('data:')) {
            try {
              const data = JSON.parse(line.substring(5).trim());

              if (currentEventType === 'narrative') {
                // Narrative parsed - add to streaming narratives
                const colors = getColorForNarrative(data.narrativeNumber - 1);
                const narrative: Narrative = {
                  id: data.narrative.id,
                  title: data.narrative.title,
                  description: data.narrative.description,
                  structure: data.narrative.structure,
                  gradient: colors.gradient,
                  patternColor: colors.patternColor,
                  ringColor: colors.ringColor,
                };
                setStreamingNarratives(prev => [...prev, narrative]);
                setGenerationProgress(data.progress || 0);
              } else if (currentEventType === 'progress') {
                setGenerationStatus(data.message || '');
                setGenerationProgress(data.progress || 0);
              } else if (currentEventType === 'complete') {
                setGenerationStatus('Complete!');
                setGenerationProgress(100);
                savedNarrativesData = data;
              } else if (currentEventType === 'error') {
                throw new Error(data.message || 'Generation failed');
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError);
            }
          }
        }
      }

      // Reload project after completion
      await new Promise(resolve => setTimeout(resolve, 1500));
      const reloadedProject = await hookResult.loadProject(project.id);

      // Scroll to the generated narratives section
      setTimeout(() => {
        if (generatedNarrativesRef.current) {
          generatedNarrativesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate narratives';
      console.error('Error generating narratives:', errorMessage);
      alert(`Failed to generate narratives: ${errorMessage}`);
      setGenerationStatus('Failed');
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        setGenerationProgress(0);
        setGenerationStatus('');
      }, 2000);
    }
  };

  const handleEditPrompts = () => {
    setShowPromptEditor(true);
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      if (!project?.id) {
        throw new Error('No project loaded. Please go back and reload the project.');
      }

      // Prepare narrative preferences
      let narrativePrefs = null;
      if (useCustom && customNarrative) {
        narrativePrefs = {
          narrativeStyle: '',
          useCustomStructure: true,
          customNarrative: customNarrative,
          tone: 'custom',
        };
      } else if (selectedNarrative) {
        narrativePrefs = {
          narrativeStyle: selectedNarrative,
          useCustomStructure: false,
          tone: selectedNarrative,
        };
      }

      // Save narrative preferences and mark stage as completed in a single save
      console.log('Marking narrative stage as completed...');
      await markStageCompleted('narrative', undefined, narrativePrefs ? {
        narrativePreferences: narrativePrefs,
      } : undefined);

      console.log('Stage completed successfully. Advancing to next stage...');

      // Navigate to the next stage (Stage 4 - Storyboard)
      if (navigateToStage) {
        navigateToStage(4);
      }
    } catch (error) {
      console.error('Failed to save narrative preferences:', error);
      alert(`Failed to save narrative preferences: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = (useCustom && customNarrative.trim()) || (!useCustom && selectedNarrative);

  // Show prompt editor if requested
  if (showPromptEditor) {
    // Get selected personas for narrative generation
    const selectedPersonaIds = project?.userPersonaSelection?.selectedPersonaIds || [];
    const allPersonas = project?.aiGeneratedPersonas?.personas || [];
    const selectedPersonas = allPersonas.filter((p: any) =>
      selectedPersonaIds.includes(p.id)
    );

    // Format selected personas as a string (names and descriptions)
    const selectedPersonasText = selectedPersonas.map((p: any) => {
      const name = p.coreIdentity?.name || 'Unknown';
      const demographic = p.coreIdentity?.demographic || '';
      const bio = p.coreIdentity?.bio || '';
      return `${name} (${demographic}): ${bio}`;
    }).join('\n\n');

    return (
      <PromptTemplateEditor
        stageType="stage_3_narratives"
        projectId={project?.id}
        onBack={() => setShowPromptEditor(false)}
        stageData={{
          campaignDescription: project?.campaignDetails?.campaignDescription || '',
          productDescription: project?.campaignDetails?.productDescription || '',
          targetAudience: project?.campaignDetails?.targetAudience || '',
          selectedPersonas: selectedPersonasText || 'No personas selected',
          numberOfNarratives: '6',
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-white">Select Narrative Theme</h2>
            <p className="text-gray-400">
              Choose the overall tone and story structure for your video
            </p>
          </div>
        </div>
      </div>

      {/* Generate & Edit Buttons */}
      <div className="mb-8">
        <div className="flex gap-4">
          <Button
            onClick={handleGenerateNarratives}
            disabled={isGenerating}
            className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl"
            size="lg"
          >
            <Wand2 className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-spark-intense' : ''}`} />
            {isGenerating ? 'Generating Narratives...' : 'Generate Narratives'}
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

      {/* AI-Generated Narratives Section */}
      {(() => {
        const displayNarratives = isGenerating
          ? streamingNarratives
          : (project?.aiGeneratedNarratives?.narratives || []);

        const hasNarratives = displayNarratives.length > 0;

        if (!hasNarratives) return null;

        return (
          <>
            <div ref={generatedNarrativesRef} className="mb-8">
              <div className="flex items-center gap-2 mb-6">
                <Lightbulb className="w-5 h-5 text-purple-500" />
                <h3 className="text-white">AI-Generated Narrative Themes</h3>
                {!isGenerating && project?.aiGeneratedNarratives?.generatedAt && (
                  <span className="text-xs text-gray-500 ml-2">
                    Generated on {new Date(project.aiGeneratedNarratives.generatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {displayNarratives.map((narrative: any, index: number) => {
                const colors = getColorForNarrative(index);
                const shapes = getShapeForNarrative(index);
                const isSelected = selectedNarrative === narrative.id && !useCustom;
                const isExpanded = expandedId === narrative.id;

                return (
                  <Card
                    key={narrative.id}
                    onClick={() => handleSelectNarrative(narrative.id)}
                    className={`bg-[#151515] border-gray-800 rounded-xl overflow-hidden cursor-pointer transition-all group relative ${
                      isSelected
                        ? `ring-2 ${colors.ringColor} border-transparent`
                        : 'hover:border-gray-700'
                    }`}
                  >
                    {/* Selected Indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}

                    {/* Gradient Header */}
                    <div className="relative h-36 overflow-hidden">
                      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient}`} />

                      {/* Decorative Pattern */}
                      <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id={`pattern-generated-${narrative.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                            <circle cx="20" cy="20" r="2" fill={colors.patternColor} />
                            <circle cx="0" cy="0" r="2" fill={colors.patternColor} />
                            <circle cx="40" cy="0" r="2" fill={colors.patternColor} />
                            <circle cx="0" cy="40" r="2" fill={colors.patternColor} />
                            <circle cx="40" cy="40" r="2" fill={colors.patternColor} />
                          </pattern>
                        </defs>
                        <rect x="0" y="0" width="100%" height="100%" fill={`url(#pattern-generated-${narrative.id})`} />
                      </svg>

                      {/* Geometric Shapes */}
                      <div className={`absolute top-4 left-4 w-12 h-12 bg-white/10 backdrop-blur-sm transition-transform duration-500 ${shapes.topLeftClass} ${shapes.topLeftHoverScale}`} />
                      <div className={`absolute bottom-4 right-4 w-16 h-16 bg-white/10 backdrop-blur-sm transition-transform duration-500 ${shapes.bottomRightClass} ${shapes.bottomRightHoverRotate}`} />

                      {/* Title */}
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <h3 className="text-white text-center drop-shadow-lg">{narrative.title}</h3>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <p className="text-gray-400 leading-relaxed">
                        {narrative.description}
                      </p>

                      {/* Expandable Structure */}
                      <Collapsible
                        open={isExpanded}
                        onOpenChange={() => setExpandedId(isExpanded ? null : narrative.id)}
                      >
                        <CollapsibleTrigger
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 text-gray-500 hover:text-gray-300 mt-3 transition-colors"
                        >
                          <span>View Structure</span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-3 pt-3 border-t border-gray-800">
                          <div className="space-y-2">
                            {narrative.structure.split(' → ').map((step: string, index: number) => (
                              <div key={index} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-600 mt-2 shrink-0" />
                                <p className="text-gray-500">{step}</p>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
        );
      })()}

      {/* Show message if no narratives generated yet */}
      {!isGenerating && (!project?.aiGeneratedNarratives?.narratives || project.aiGeneratedNarratives.narratives.length === 0) && (
        <div className="mb-8 p-6 bg-blue-600/10 border border-blue-600/30 rounded-xl">
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0" />
            <div>
              <h3 className="text-white font-medium">Generate AI Narratives</h3>
              <p className="text-gray-400 text-sm mt-1">
                Click "Generate Narratives" above to create personalized narrative themes based on your campaign details and selected personas.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Separator - only show if we have generated narratives and not generating */}
      {!isGenerating && project?.aiGeneratedNarratives?.narratives && project.aiGeneratedNarratives.narratives.length > 0 && (
        <div className="relative my-8">
          <Separator className="bg-gray-800" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0a0a] px-4">
            <span className="text-gray-500">OR</span>
          </div>
        </div>
      )}

      {/* Custom Narrative */}
      <div className="mb-8">
        <h3 className="text-white mb-4">Create Custom Narrative</h3>
        <Card
          className={`bg-[#151515] border-gray-800 rounded-xl p-6 transition-all ${
            useCustom ? 'ring-2 ring-blue-500 border-blue-500' : ''
          }`}
        >
          <div className="space-y-3">
            <Label htmlFor="customNarrative" className="text-gray-300">
              Describe your unique narrative structure
            </Label>
            <Textarea
              id="customNarrative"
              value={customNarrative}
              onChange={(e) => {
                setCustomNarrative(e.target.value);
                if (e.target.value) {
                  setUseCustom(true);
                  setSelectedNarrative('');
                }
              }}
              onFocus={() => {
                setUseCustom(true);
                setSelectedNarrative('');
              }}
              placeholder="Describe your custom narrative structure, key story beats, and how you want the story to unfold..."
              className="bg-[#0a0a0a] border-gray-700 text-white rounded-lg min-h-32 focus:border-blue-500"
            />
            <p className="text-gray-500">
              Include key moments, transitions, and the emotional journey you want to create.
            </p>
          </div>
        </Card>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!canProceed || isSaving || isSubmitting}
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
              Continue with Selected Theme
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
