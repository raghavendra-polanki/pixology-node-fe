import { useState } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Slider } from '../ui/slider';
import { Play } from 'lucide-react';
import type { Project, MotionPreset } from '../../types';

interface Stage5Props {
  project: Project;
  onNext: () => void;
  onPrevious: () => void;
  onUpdateProject: (project: Project) => void;
}

const MOTION_PRESETS: MotionPreset[] = ['Loop', 'Slow Zoom', 'Action Pan'];

export const Stage5KineticActivation = ({ project, onNext, onPrevious, onUpdateProject }: Stage5Props) => {
  const [selectedMotion, setSelectedMotion] = useState<MotionPreset>(
    project.data.kineticActivation?.selectedMotion || 'Loop'
  );
  const [speed, setSpeed] = useState(project.data.kineticActivation?.speed || 1.0);
  const [intensity, setIntensity] = useState(project.data.kineticActivation?.intensity || 50);
  const [hasPreview, setHasPreview] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  const handleRenderPreview = () => {
    setIsRendering(true);
    setTimeout(() => {
      setHasPreview(true);
      setIsRendering(false);
    }, 1500);
  };

  const handleSave = () => {
    onUpdateProject({
      ...project,
      data: {
        ...project.data,
        kineticActivation: {
          selectedMotion,
          speed,
          intensity,
          previewUrl: 'mock-preview-url',
        },
      },
    });
    onNext();
  };

  return (
    <>
      <CardHeader className="border-b border-slate-800/50">
        <CardTitle className="text-2xl text-white">Stage 5: Kinetic Activation</CardTitle>
        <CardDescription className="text-slate-400">
          Animate the selected still
        </CardDescription>
      </CardHeader>

      <CardContent className="p-8 space-y-8">
        {/* Motion Selectors */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Motion Presets</h3>
          <div className="flex gap-4">
            {MOTION_PRESETS.map(preset => (
              <Button
                key={preset}
                onClick={() => setSelectedMotion(preset)}
                variant={selectedMotion === preset ? 'default' : 'outline'}
                className={`flex-1 ${
                  selectedMotion === preset
                    ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white'
                    : 'border-slate-700 text-white hover:border-orange-600/50'
                }`}
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>

        {/* Primary Button */}
        <div className="bg-gradient-to-r from-orange-950/30 to-red-950/30 border border-orange-900/50 rounded-xl p-6">
          <Button
            onClick={handleRenderPreview}
            disabled={isRendering}
            className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-6 text-lg"
            size="lg"
          >
            <Play className="w-5 h-5 mr-2" />
            {isRendering ? 'Rendering...' : 'Render Motion Preview'}
          </Button>
        </div>

        {/* The Player */}
        {hasPreview && (
          <div className="space-y-6">
            <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border-2 border-slate-700 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 animate-pulse" />
              <div className="relative text-center text-white">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-semibold">Motion Preview</p>
                <p className="text-sm text-slate-400 mt-2">{selectedMotion}</p>
              </div>
            </div>

            {/* Fine Tune Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-800/30 rounded-lg p-6 border border-slate-700">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">Speed</label>
                  <span className="text-sm text-orange-400 font-mono">{speed.toFixed(1)}x</span>
                </div>
                <Slider
                  value={[speed]}
                  onValueChange={([val]) => setSpeed(val)}
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  className="w-full"
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-white">Intensity</label>
                  <span className="text-sm text-orange-400 font-mono">{intensity}%</span>
                </div>
                <Slider
                  value={[intensity]}
                  onValueChange={([val]) => setIntensity(val)}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>
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
            disabled={!hasPreview}
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8"
            size="lg"
          >
            Confirm & Move to Export
          </Button>
        </div>
      </CardContent>
    </>
  );
};
