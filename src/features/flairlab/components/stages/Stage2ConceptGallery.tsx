import { useState } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Sparkles } from 'lucide-react';
import type { Project, StyleCard } from '../../types';

interface Stage2Props {
  project: Project;
  onNext: () => void;
  onPrevious: () => void;
  onUpdateProject: (project: Project) => void;
}

const MOCK_STYLES: StyleCard[] = [
  { id: '1', name: 'Gladiator', description: 'Epic warrior theme with dramatic lighting', tags: ['intense', 'dramatic'] },
  { id: '2', name: 'Neon City', description: 'Futuristic cyberpunk aesthetic', tags: ['modern', 'vibrant'] },
  { id: '3', name: 'Vintage Film', description: 'Classic cinema look with film grain', tags: ['retro', 'nostalgic'] },
  { id: '4', name: 'Fire & Ice', description: 'Contrasting elements with bold colors', tags: ['dynamic', 'bold'] },
  { id: '5', name: 'Championship Gold', description: 'Premium metallic finish', tags: ['luxurious', 'professional'] },
  { id: '6', name: 'Storm Surge', description: 'Weather-inspired intensity', tags: ['dramatic', 'intense'] },
];

export const Stage2ConceptGallery = ({ project, onNext, onPrevious, onUpdateProject }: Stage2Props) => {
  const [styles, setStyles] = useState<StyleCard[]>(project.data.conceptGallery?.availableStyles || []);
  const [selectedStyle, setSelectedStyle] = useState<StyleCard | undefined>(
    project.data.conceptGallery?.selectedStyle
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateConcepts = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setStyles(MOCK_STYLES);
      setIsGenerating(false);
    }, 1500);
  };

  const handleSelectStyle = (style: StyleCard) => {
    setSelectedStyle(style);
  };

  const handleSaveAndProceed = () => {
    if (selectedStyle) {
      onUpdateProject({
        ...project,
        data: {
          ...project.data,
          conceptGallery: {
            selectedStyle,
            availableStyles: styles,
          },
        },
      });
      onNext();
    }
  };

  return (
    <>
      <CardHeader className="border-b border-slate-800/50">
        <CardTitle className="text-2xl text-white">Stage 2: Concept Gallery</CardTitle>
        <CardDescription className="text-slate-400">
          Generate and select the visual theme
        </CardDescription>
      </CardHeader>

      <CardContent className="p-8 space-y-8">
        {/* Top Action Area - The Brain */}
        <div className="bg-gradient-to-r from-orange-950/30 to-red-950/30 border border-orange-900/50 rounded-xl p-6">
          <Button
            onClick={handleGenerateConcepts}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold py-6 text-lg"
            size="lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            {isGenerating ? 'Analyzing...' : 'Analyze & Suggest Concepts'}
          </Button>
          <p className="text-sm text-slate-400 mt-3 text-center">
            AI will analyze team colors, history, and current weather context
          </p>
        </div>

        {/* Results Grid */}
        {styles.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {styles.map(style => (
              <div
                key={style.id}
                onClick={() => handleSelectStyle(style)}
                className={`cursor-pointer p-6 rounded-xl border-2 transition-all ${
                  selectedStyle?.id === style.id
                    ? 'border-orange-600 bg-orange-950/30'
                    : 'border-slate-700 bg-slate-800/30 hover:border-orange-600/50'
                }`}
              >
                <div className="aspect-video bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg mb-4 flex items-center justify-center">
                  <span className="text-4xl">🎨</span>
                </div>
                <h3 className="font-semibold text-white mb-2">{style.name}</h3>
                <p className="text-sm text-slate-400 mb-3">{style.description}</p>
                <div className="flex flex-wrap gap-2">
                  {style.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="pt-6 border-t border-slate-800/50 flex justify-between">
          <Button onClick={onPrevious} variant="outline" className="border-slate-700 text-white">
            Previous
          </Button>
          <Button
            onClick={handleSaveAndProceed}
            disabled={!selectedStyle}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8"
            size="lg"
          >
            Save & Proceed
          </Button>
        </div>
      </CardContent>
    </>
  );
};
