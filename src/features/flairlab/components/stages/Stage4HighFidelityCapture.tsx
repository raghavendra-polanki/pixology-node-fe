import { useState } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Sparkles, Check } from 'lucide-react';
import type { Project, GeneratedImage } from '../../types';

interface Stage4Props {
  project: Project;
  onNext: () => void;
  onPrevious: () => void;
  onUpdateProject: (project: Project) => void;
}

export const Stage4HighFidelityCapture = ({ project, onNext, onPrevious, onUpdateProject }: Stage4Props) => {
  const [images, setImages] = useState<GeneratedImage[]>(
    project.data.highFidelityCapture?.generatedImages || []
  );
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | undefined>();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const mockImages: GeneratedImage[] = [
        { id: '1', url: '', hasAlphaChannel: true, resolution: '1920x1080', generatedAt: new Date().toISOString() },
        { id: '2', url: '', hasAlphaChannel: true, resolution: '1920x1080', generatedAt: new Date().toISOString() },
        { id: '3', url: '', hasAlphaChannel: true, resolution: '1920x1080', generatedAt: new Date().toISOString() },
        { id: '4', url: '', hasAlphaChannel: true, resolution: '1920x1080', generatedAt: new Date().toISOString() },
      ];
      setImages(mockImages);
      setIsGenerating(false);
    }, 2000);
  };

  const handleSelectImage = (image: GeneratedImage) => {
    setSelectedImage(image);
  };

  const handleSave = () => {
    if (selectedImage) {
      onUpdateProject({
        ...project,
        data: {
          ...project.data,
          highFidelityCapture: {
            generatedImages: images,
          },
        },
      });
      onNext();
    }
  };

  return (
    <>
      <CardHeader className="border-b border-slate-800/50">
        <CardTitle className="text-2xl text-white">Stage 4: High-Fidelity Capture</CardTitle>
        <CardDescription className="text-slate-400">
          Create the base visual assets
        </CardDescription>
      </CardHeader>

      <CardContent className="p-8 space-y-8">
        {/* Top Action Area */}
        <div className="bg-gradient-to-r from-orange-950/30 to-red-950/30 border border-orange-900/50 rounded-xl p-6">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-6 text-lg"
            size="lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {isGenerating ? 'Generating...' : 'Generate High-Fidelity Stills'}
          </Button>
        </div>

        {/* The Lightbox - Image Gallery */}
        {images.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Generated Images</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {images.map(image => (
                <div
                  key={image.id}
                  onClick={() => handleSelectImage(image)}
                  className={`cursor-pointer rounded-xl border-2 overflow-hidden transition-all ${
                    selectedImage?.id === image.id
                      ? 'border-orange-600 ring-4 ring-orange-600/20'
                      : 'border-slate-700 hover:border-orange-600/50'
                  }`}
                >
                  {/* Checkerboard background for alpha transparency */}
                  <div
                    className="aspect-video relative"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
                      backgroundSize: '20px 20px',
                      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                    }}
                  >
                    {/* Placeholder image content */}
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Sparkles className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm opacity-50">Generated Image {image.id}</p>
                      </div>
                    </div>
                    {selectedImage?.id === image.id && (
                      <div className="absolute top-2 right-2 w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="bg-slate-800/50 p-3 border-t border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{image.resolution}</span>
                      {image.hasAlphaChannel && (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                          Alpha Channel ✓
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="pt-6 border-t border-slate-800/50 flex justify-between">
          <Button onClick={onPrevious} variant="outline" className="border-slate-700 text-white">
            Previous
          </Button>
          <Button
            onClick={handleSave}
            disabled={!selectedImage}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8"
            size="lg"
          >
            Save & Proceed to Motion
          </Button>
        </div>
      </CardContent>
    </>
  );
};
