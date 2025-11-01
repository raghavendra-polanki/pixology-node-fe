import { useState, useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  Lightbulb,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Separator } from '../ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';
import { useStoryLabProject } from '../../hooks/useStoryLabProject';

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
  projectId: string;
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
    gradient: 'from-purple-600 via-purple-500 to-pink-500',
    patternColor: 'rgba(255, 255, 255, 0.1)',
    ringColor: 'ring-purple-500',
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

export function Stage3Narratives({ projectId }: Stage3Props) {
  // Load project using new hook
  const { project, isSaving, updateNarrativePreferences, markStageCompleted, advanceToNextStage } =
    useStoryLabProject({ autoLoad: true, projectId });

  const [selectedNarrative, setSelectedNarrative] = useState<string>('');
  const [customNarrative, setCustomNarrative] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sync form with project data when loaded
  useEffect(() => {
    if (project?.narrativePreferences) {
      setCustomNarrative(project.narrativePreferences.customNarrative || '');
      setUseCustom(project.narrativePreferences.useCustomStructure || false);
      setSelectedNarrative(
        narrativeOptions.find(n => n.id === project.narrativePreferences?.narrativeStyle)?.id || ''
      );
    }
  }, [project?.narrativePreferences]);

  const handleSelectNarrative = (id: string) => {
    setSelectedNarrative(id);
    setUseCustom(false);
    setCustomNarrative('');
  };

  const handleSubmit = async () => {
    try {
      if (useCustom && customNarrative) {
        // Save custom narrative preferences
        await updateNarrativePreferences({
          narrativeStyle: '',
          useCustomStructure: true,
          customNarrative: customNarrative,
          tone: 'custom',
        });
      } else if (selectedNarrative) {
        // Save selected narrative preferences
        const selected = narrativeOptions.find(n => n.id === selectedNarrative);
        await updateNarrativePreferences({
          narrativeStyle: selectedNarrative,
          useCustomStructure: false,
          tone: selectedNarrative,
        });
      }
      // Mark stage as completed
      await markStageCompleted('narrative');
      // Advance to next stage
      await advanceToNextStage();
    } catch (error) {
      console.error('Failed to save narrative preferences:', error);
    }
  };

  const canProceed = (useCustom && customNarrative.trim()) || (!useCustom && selectedNarrative);

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

      {/* AI-Generated Narratives */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-6">
          <Lightbulb className="w-5 h-5 text-blue-500" />
          <h3 className="text-white">AI-Suggested Themes</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {narrativeOptions.map((narrative) => {
            const isSelected = selectedNarrative === narrative.id && !useCustom;
            const isExpanded = expandedId === narrative.id;

            return (
              <Card
                key={narrative.id}
                onClick={() => handleSelectNarrative(narrative.id)}
                className={`bg-[#151515] border-gray-800 rounded-xl overflow-hidden cursor-pointer transition-all group relative ${
                  isSelected
                    ? `ring-2 ${narrative.ringColor} border-transparent`
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
                  <div className={`absolute inset-0 bg-gradient-to-br ${narrative.gradient}`} />
                  
                  {/* Decorative Pattern */}
                  <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id={`pattern-${narrative.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                        <circle cx="20" cy="20" r="2" fill={narrative.patternColor} />
                        <circle cx="0" cy="0" r="2" fill={narrative.patternColor} />
                        <circle cx="40" cy="0" r="2" fill={narrative.patternColor} />
                        <circle cx="0" cy="40" r="2" fill={narrative.patternColor} />
                        <circle cx="40" cy="40" r="2" fill={narrative.patternColor} />
                      </pattern>
                    </defs>
                    <rect x="0" y="0" width="100%" height="100%" fill={`url(#pattern-${narrative.id})`} />
                  </svg>

                  {/* Geometric Shapes */}
                  <div className="absolute top-4 left-4 w-12 h-12 rounded-lg bg-white/10 backdrop-blur-sm rotate-12 group-hover:rotate-45 transition-transform duration-500" />
                  <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500" />
                  
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
                        {narrative.structure.split(' → ').map((step, index) => (
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

      {/* Separator */}
      <div className="relative my-8">
        <Separator className="bg-gray-800" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0a0a] px-4">
          <span className="text-gray-500">OR</span>
        </div>
      </div>

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
          disabled={!canProceed || isSaving}
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
              Continue with Selected Theme
              <ArrowRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
