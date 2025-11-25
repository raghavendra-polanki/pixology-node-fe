import { useState } from 'react';
import { ArrowRight, Sparkles, Palette, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { GameLabProject, StyleCard, CreateProjectInput } from '../../types/project.types';

interface Stage2Props {
  project: GameLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<GameLabProject | null>;
  loadProject: (projectId: string) => Promise<GameLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<GameLabProject | null>;
}

interface ConceptWithGradient extends StyleCard {
  gradient: string;
  previewImage?: string;
}

const CONCEPTS: ConceptWithGradient[] = [
  {
    id: '1',
    name: 'Gladiator Arena',
    description: 'Epic warrior theme with dramatic lighting and battle-ready intensity',
    tags: ['intense', 'dramatic', 'cinematic'],
    gradient: 'from-green-500 via-red-500 to-green-500',
    previewImage: 'https://images.unsplash.com/photo-1516450137517-162bfbeb8dba?w=600&h=400&fit=crop'
  },
  {
    id: '2',
    name: 'Neon Cyber',
    description: 'Futuristic cyberpunk aesthetic with vibrant electric colors',
    tags: ['modern', 'vibrant', 'tech'],
    gradient: 'from-cyan-600 via-blue-500 to-indigo-600',
    previewImage: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop'
  },
  {
    id: '3',
    name: 'Vintage Film',
    description: 'Classic cinema look with nostalgic film grain',
    tags: ['retro', 'classic', 'timeless'],
    gradient: 'from-purple-600 via-purple-500 to-pink-500',
    previewImage: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&h=400&fit=crop'
  },
  {
    id: '4',
    name: 'Fire & Ice',
    description: 'Contrasting elements with bold color dynamics',
    tags: ['dynamic', 'bold', 'elemental'],
    gradient: 'from-green-500 via-green-500 to-yellow-500',
    previewImage: 'https://images.unsplash.com/photo-1516339901601-2e1b62dc0c45?w=600&h=400&fit=crop'
  },
  {
    id: '5',
    name: 'Championship Gold',
    description: 'Premium metallic finish with luxury appeal',
    tags: ['luxurious', 'professional', 'elite'],
    gradient: 'from-yellow-600 via-amber-500 to-green-500',
    previewImage: 'https://images.unsplash.com/photo-1563291074-2bf8677ac0e5?w=600&h=400&fit=crop'
  },
  {
    id: '6',
    name: 'Storm Surge',
    description: 'Weather-inspired intensity with dramatic atmosphere',
    tags: ['dramatic', 'powerful', 'intense'],
    gradient: 'from-blue-600 via-blue-500 to-cyan-500',
    previewImage: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=600&h=400&fit=crop'
  },
];

export const Stage2ConceptGallery = ({ project, markStageCompleted, navigateToStage }: Stage2Props) => {
  const [concepts] = useState<ConceptWithGradient[]>(CONCEPTS); // Pre-populated
  const [selectedConcept, setSelectedConcept] = useState<ConceptWithGradient | undefined>(CONCEPTS[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (!selectedConcept) return;

    try {
      setIsSaving(true);

      const conceptGalleryData = {
        selectedStyle: selectedConcept,
        availableStyles: concepts,
        selectedAt: new Date(),
      };

      // Mark stage as completed with concept gallery data
      await markStageCompleted('concept-gallery', undefined, {
        conceptGallery: conceptGalleryData,
      });
      // Navigate to next stage (Stage 3 - Casting Call)
      if (navigateToStage) {
        navigateToStage(3);
      }
    } catch (error) {
      console.error('[Stage2] Failed to save concept gallery:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
            <Palette className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-white">Generate Themes</h2>
            <p className="text-gray-400">Select the visual style for your clip</p>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="mb-8">
        <Button
          className="bg-gradient-to-r from-green-500 to-green-500 hover:from-green-600 hover:to-green-500 text-white rounded-xl"
          size="lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Generate Themes
        </Button>
      </div>

      {/* Concepts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {concepts.map((concept) => {
          const conceptWithGradient = concept as ConceptWithGradient;
          return (
            <button
              key={concept.id}
              onClick={() => setSelectedConcept(concept)}
              className={`group rounded-xl border-2 transition-all text-left overflow-hidden relative ${
                selectedConcept?.id === concept.id
                  ? 'border-green-500 ring-4 ring-green-500/20'
                  : 'border-gray-700 hover:border-green-500/50'
              }`}
            >
              {/* Image/Gradient top section */}
              <div className={`aspect-video relative flex items-center justify-center overflow-hidden bg-slate-900`}>
                {conceptWithGradient.previewImage ? (
                  <img
                    src={conceptWithGradient.previewImage}
                    alt={concept.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br ${conceptWithGradient.gradient}`} />
                )}

                {/* Check mark for selected */}
                {selectedConcept?.id === concept.id && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg z-10">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>

              {/* Dark bottom section with content */}
              <div className="bg-[#151515] p-5 border-t border-gray-800">
                <h3 className="text-white mb-2">{concept.name}</h3>
                <p className="text-gray-400 leading-relaxed mb-3">{concept.description}</p>
                <div className="flex flex-wrap gap-2">
                  {concept.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-gray-800 text-gray-400 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!selectedConcept || isSaving}
          className="bg-gradient-to-r from-green-500 to-green-500 hover:from-green-600 hover:to-green-500 text-white rounded-xl"
          size="lg"
        >
          {isSaving ? 'Saving...' : 'Continue to Players'}
          {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
        </Button>
      </div>
    </div>
  );
};
