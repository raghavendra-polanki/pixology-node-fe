import { useState } from 'react';
import { Download, FileVideo, CheckCircle2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '../ui/progress';
import type { FlairLabProject, ExportFormat, CreateProjectInput } from '../../types/project.types';

interface Stage6Props {
  project: FlairLabProject;
  navigateToStage: (stage: number) => void;
  createProject: (input: CreateProjectInput) => Promise<FlairLabProject | null>;
  loadProject: (projectId: string) => Promise<FlairLabProject | null>;
  markStageCompleted: (stageName: string, data?: any, additionalUpdates?: any) => Promise<FlairLabProject | null>;
}

export const Stage6PolishDownload = ({ project, markStageCompleted }: Stage6Props) => {
  const [format, setFormat] = useState<ExportFormat>('ProRes 4444'); // Pre-selected
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready'>('idle');
  const [progress, setProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleProcessAsset = () => {
    setStatus('processing');
    setProgress(0);

    // Simulate encoding progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('ready');
          return 100;
        }
        return prev + 5;
      });
    }, 200);
  };

  const handleDownload = async () => {
    try {
      setIsSaving(true);

      const polishDownloadData = {
        format,
        metadata: {
          player: project.castingCall?.selectedPlayers[0]?.name || 'Player',
          team: project.contextBrief?.homeTeam.name || 'Team',
          action: project.kineticActivation?.selectedMotion || 'Motion',
        },
        status: 'ready' as const,
        progress: 100,
        downloadUrl: 'mock-download-url',
        exportedAt: new Date(),
      };

      // Mark stage as completed and project as complete
      await markStageCompleted('polish-download', undefined, {
        polishDownload: polishDownloadData,
        status: 'complete',
      });

      alert('Download started! Project marked as complete.');
    } catch (error) {
      console.error('[Stage6] Failed to save polish download:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Extract metadata for display
  const playerName = project.castingCall?.selectedPlayers[0]?.name || 'Connor McDavid';
  const teamName = project.contextBrief?.homeTeam.name || 'Colorado';
  const action = project.kineticActivation?.selectedMotion || 'Loop';

  return (
    <div className="max-w-6xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-orange-600/20 flex items-center justify-center">
            <Download className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-white">Export</h2>
            <p className="text-gray-400">Download your final video</p>
          </div>
        </div>
      </div>

      {/* Export Format */}
      <div className="mb-8">
        <h3 className="text-white mb-4">Export Format</h3>
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setFormat('ProRes 4444')}
            className={`p-6 rounded-xl border-2 transition-all text-center ${
              format === 'ProRes 4444'
                ? 'border-orange-600 bg-orange-950/30'
                : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
            }`}
          >
            <FileVideo className="w-8 h-8 mx-auto mb-2 text-white" />
            <div className="text-lg font-semibold text-white">ProRes 4444</div>
            <div className="text-xs text-slate-400 mt-1">Highest quality, alpha channel</div>
          </button>
          <button
            onClick={() => setFormat('H.264 MP4')}
            className={`p-6 rounded-xl border-2 transition-all text-center ${
              format === 'H.264 MP4'
                ? 'border-orange-600 bg-orange-950/30'
                : 'border-slate-800 bg-slate-900/30 hover:border-slate-700'
            }`}
          >
            <FileVideo className="w-8 h-8 mx-auto mb-2 text-white" />
            <div className="text-lg font-semibold text-white">H.264 MP4</div>
            <div className="text-xs text-slate-400 mt-1">Optimized for web and social</div>
          </button>
        </div>
      </div>

      {/* Asset Metadata */}
      <div className="mb-8">
        <h3 className="text-white mb-4">Asset Metadata</h3>
        <div className="bg-slate-900/30 rounded-xl p-6 border border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="text-sm text-slate-400">Player</div>
              <div className="text-white font-semibold">{playerName}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-400">Team</div>
              <div className="text-white font-semibold">{teamName}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-400">Motion</div>
              <div className="text-white font-semibold">{action}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Process Button */}
      {status === 'idle' && (
        <div className="mb-8">
          <Button
            onClick={handleProcessAsset}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl"
            size="lg"
          >
            <FileVideo className="w-5 h-5 mr-2" />
            Process Final Asset
          </Button>
        </div>
      )}

      {/* Status Bar - Processing */}
      {status === 'processing' && (
        <div className="mb-8">
          <div className="bg-slate-900/30 rounded-xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">
                {progress < 50 ? 'Encoding...' : 'Adding Metadata...'}
              </span>
              <span className="text-sm text-orange-400 font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </div>
      )}

      {/* Download Ready */}
      {status === 'ready' && (
        <div className="mb-8 space-y-6">
          <div className="bg-green-950/30 border border-green-900/50 rounded-xl p-6 flex items-center gap-4">
            <CheckCircle2 className="w-12 h-12 text-green-400 flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-white">Asset Ready!</h3>
              <p className="text-sm text-slate-400">
                Your {format} file is ready for download
              </p>
            </div>
          </div>

          <Button
            onClick={handleDownload}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white rounded-xl"
            size="lg"
          >
            <Download className="w-5 h-5 mr-2" />
            {isSaving ? 'Saving...' : 'Download & Finish Project'}
          </Button>
        </div>
      )}
    </div>
  );
};
