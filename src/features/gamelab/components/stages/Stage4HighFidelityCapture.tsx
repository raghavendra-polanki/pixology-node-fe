import { useState } from 'react';
import { ArrowRight, Camera, Sparkles, Check } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { GameLabProject, GeneratedImage, CreateProjectInput } from '../../types/project.types';

interface Stage4Props {
  project: GameLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<GameLabProject | null>;
  loadProject: (projectId: string) => Promise<GameLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<GameLabProject | null>;
}

const GENERATED_IMAGES: GeneratedImage[] = [
  {
    id: '1',
    url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop',
    hasAlphaChannel: true,
    resolution: '1920x1080',
    generatedAt: new Date().toISOString()
  },
  {
    id: '2',
    url: 'https://images.unsplash.com/photo-1546525848-3ce03ca516f6?w=800&h=600&fit=crop',
    hasAlphaChannel: true,
    resolution: '1920x1080',
    generatedAt: new Date().toISOString()
  },
  {
    id: '3',
    url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop',
    hasAlphaChannel: true,
    resolution: '1920x1080',
    generatedAt: new Date().toISOString()
  },
  {
    id: '4',
    url: 'https://images.unsplash.com/photo-1578924608019-47d540a18107?w=800&h=600&fit=crop',
    hasAlphaChannel: true,
    resolution: '1920x1080',
    generatedAt: new Date().toISOString()
  },
];

export const Stage4HighFidelityCapture = ({ project, markStageCompleted, navigateToStage }: Stage4Props) => {
  const [images] = useState<GeneratedImage[]>(GENERATED_IMAGES); // Pre-populated
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | undefined>(GENERATED_IMAGES[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    if (!selectedImage) return;

    try {
      setIsSaving(true);

      const highFidelityCaptureData = {
        generatedImages: images,
        generatedAt: new Date(),
      };

      // Mark stage as completed with high-fidelity capture data
      await markStageCompleted('high-fidelity-capture', undefined, {
        highFidelityCapture: highFidelityCaptureData,
      });
      // Navigate to next stage (Stage 5 - Kinetic Activation)
      if (navigateToStage) {
        navigateToStage(5);
      }
    } catch (error) {
      console.error('[Stage4] Failed to save high-fidelity capture:', error);
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
            <Camera className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-white">Create Images</h2>
            <p className="text-gray-400">Generate and select your image</p>
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
          Generate Images
        </Button>
      </div>

      {/* Generated Images Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        {images.map(image => (
          <button
            key={image.id}
            onClick={() => setSelectedImage(image)}
            className={`rounded-xl border-2 overflow-hidden transition-all text-left bg-[#151515] ${
              selectedImage?.id === image.id
                ? 'border-green-500 ring-2 ring-green-500'
                : 'border-gray-800 hover:border-gray-700'
            }`}
          >
            {/* Image with checkerboard background for alpha transparency */}
            <div className="aspect-video relative overflow-hidden">
              {/* Checkerboard pattern */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                }}
              />

              {/* Generated image */}
              {image.url ? (
                <img
                  src={image.url}
                  alt={`Generated ${image.id}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-red-500/20 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm opacity-50">Generated Image {image.id}</p>
                  </div>
                </div>
              )}

              {selectedImage?.id === image.id && (
                <div className="absolute top-3 right-3 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shadow-lg z-10">
                  <Check className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <div className="p-3 border-t border-gray-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{image.resolution}</span>
                {image.hasAlphaChannel && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                    Alpha Channel
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={!selectedImage || isSaving}
          className="bg-gradient-to-r from-green-500 to-green-500 hover:from-green-600 hover:to-green-500 text-white rounded-xl"
          size="lg"
        >
          {isSaving ? 'Saving...' : 'Continue to Animate'}
          {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
        </Button>
      </div>
    </div>
  );
};
