import { useState } from 'react';
import { ArrowRight, Play, Zap } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Slider } from '../ui/slider';
import type { GameLabProject, MotionPreset, CreateProjectInput } from '../../types/project.types';

interface Stage5Props {
  project: GameLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<GameLabProject | null>;
  loadProject: (projectId: string) => Promise<GameLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<GameLabProject | null>;
}

const MOTION_PRESETS: MotionPreset[] = ['Loop', 'Slow Zoom', 'Action Pan'];

export const Stage5KineticActivation = ({ project, markStageCompleted, navigateToStage }: Stage5Props) => {
  const [selectedMotion, setSelectedMotion] = useState<MotionPreset>('Loop'); // Pre-selected
  const [speed, setSpeed] = useState(1.0);
  const [intensity, setIntensity] = useState(50);
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    try {
      setIsSaving(true);

      const kineticActivationData = {
        selectedMotion,
        speed,
        intensity,
        previewUrl: 'mock-preview-url',
        appliedAt: new Date(),
      };

      // Mark stage as completed with kinetic activation data
      await markStageCompleted('kinetic-activation', undefined, {
        kineticActivation: kineticActivationData,
      });
      // Navigate to next stage (Stage 6 - Polish & Download)
      if (navigateToStage) {
        navigateToStage(6);
      }
    } catch (error) {
      console.error('[Stage5] Failed to save kinetic activation:', error);
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
            <Zap className="w-6 h-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-white">Animate Videos</h2>
            <p className="text-gray-400">Add motion to bring your image to life</p>
          </div>
        </div>
      </div>

      {/* Motion Presets */}
      <div className="mb-8">
        <h3 className="text-white mb-4">Motion Presets</h3>
        <div className="grid grid-cols-3 gap-4">
          {MOTION_PRESETS.map(preset => (
            <button
              key={preset}
              onClick={() => setSelectedMotion(preset)}
              className={`p-6 rounded-xl border-2 transition-all text-center ${
                selectedMotion === preset
                  ? 'border-green-500 bg-orange-950/30'
                  : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
              }`}
            >
              <div className="text-lg font-semibold text-white">{preset}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Render Preview Button */}
      <div className="mb-8">
        <Button
          className="bg-gradient-to-r from-green-500 to-green-500 hover:from-green-600 hover:to-green-500 text-white rounded-xl"
          size="lg"
        >
          <Play className="w-5 h-5 mr-2" />
          Generate Video Preview
        </Button>
      </div>

      {/* Preview Player - Pre-populated */}
      <div className="mb-8">
        <h3 className="text-white mb-4">Preview</h3>
        <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border-2 border-slate-700 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-red-500/10 animate-pulse" />
          <div className="relative text-center text-white">
            <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-semibold">Motion Preview</p>
            <p className="text-sm text-slate-400 mt-2">{selectedMotion}</p>
          </div>
        </div>
      </div>

      {/* Fine Tune Controls */}
      <div className="mb-8">
        <h3 className="text-white mb-4">Fine Tune</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/30 rounded-xl p-6 border border-slate-800">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-white">Speed</label>
              <span className="text-sm text-lime-400 font-mono">{speed.toFixed(1)}x</span>
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
              <span className="text-sm text-lime-400 font-mono">{intensity}%</span>
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

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleContinue}
          disabled={isSaving}
          className="bg-gradient-to-r from-green-500 to-green-500 hover:from-green-600 hover:to-green-500 text-white rounded-xl"
          size="lg"
        >
          {isSaving ? 'Saving...' : 'Continue to Export'}
          {!isSaving && <ArrowRight className="w-5 h-5 ml-2" />}
        </Button>
      </div>
    </div>
  );
};
