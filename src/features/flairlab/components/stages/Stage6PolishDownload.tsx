import { useState } from 'react';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Progress } from '../ui/progress';
import { Download, FileVideo, CheckCircle2 } from 'lucide-react';
import type { Project, ExportFormat } from '../../types';

interface Stage6Props {
  project: Project;
  onNext: () => void;
  onPrevious: () => void;
  onUpdateProject: (project: Project) => void;
}

export const Stage6PolishDownload = ({ project, onPrevious, onUpdateProject }: Stage6Props) => {
  const [format, setFormat] = useState<ExportFormat>(
    project.data.polish?.format || 'ProRes 4444'
  );
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready'>(
    project.data.polish?.status === 'ready' ? 'ready' : 'idle'
  );
  const [progress, setProgress] = useState(0);

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

  const handleDownload = () => {
    onUpdateProject({
      ...project,
      status: 'complete',
      data: {
        ...project.data,
        polish: {
          format,
          metadata: {
            player: project.data.castingCall?.selectedPlayers[0]?.name || 'Player',
            team: project.data.contextBrief?.homeTeam.name || 'Team',
            action: project.data.kineticActivation?.selectedMotion || 'Motion',
          },
          status: 'ready',
          progress: 100,
          downloadUrl: 'mock-download-url',
        },
      },
    });
    alert('Download started! Project marked as complete.');
  };

  // Extract metadata for display
  const playerName = project.data.castingCall?.selectedPlayers[0]?.name || 'N/A';
  const teamName = project.data.contextBrief?.homeTeam.name || 'N/A';
  const action = project.data.kineticActivation?.selectedMotion || 'N/A';

  return (
    <>
      <CardHeader className="border-b border-slate-800/50">
        <CardTitle className="text-2xl text-white">Stage 6: Polish & Download</CardTitle>
        <CardDescription className="text-slate-400">
          Formatting and final handoff
        </CardDescription>
      </CardHeader>

      <CardContent className="p-8 space-y-8">
        {/* Format Toggles */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Export Format</h3>
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => setFormat('ProRes 4444')}
              variant={format === 'ProRes 4444' ? 'default' : 'outline'}
              className={`py-6 text-lg ${
                format === 'ProRes 4444'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white'
                  : 'border-slate-700 text-white hover:border-orange-600/50'
              }`}
            >
              <FileVideo className="w-5 h-5 mr-2" />
              ProRes 4444
            </Button>
            <Button
              onClick={() => setFormat('H.264 MP4')}
              variant={format === 'H.264 MP4' ? 'default' : 'outline'}
              className={`py-6 text-lg ${
                format === 'H.264 MP4'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white'
                  : 'border-slate-700 text-white hover:border-orange-600/50'
              }`}
            >
              <FileVideo className="w-5 h-5 mr-2" />
              H.264 MP4
            </Button>
          </div>
        </div>

        {/* Metadata View */}
        <div className="bg-slate-800/30 rounded-lg p-6 border border-slate-700 space-y-4">
          <h3 className="text-lg font-semibold text-white mb-4">Asset Metadata</h3>
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
              <div className="text-sm text-slate-400">Action</div>
              <div className="text-white font-semibold">{action}</div>
            </div>
          </div>
        </div>

        {/* Process Button */}
        {status === 'idle' && (
          <div className="bg-gradient-to-r from-orange-950/30 to-red-950/30 border border-orange-900/50 rounded-xl p-6">
            <Button
              onClick={handleProcessAsset}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-6 text-lg"
              size="lg"
            >
              <FileVideo className="w-5 h-5 mr-2" />
              Process Final Asset
            </Button>
          </div>
        )}

        {/* Status Bar - Processing */}
        {status === 'processing' && (
          <div className="space-y-4 bg-slate-800/30 rounded-lg p-6 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-white">
                {progress < 50 ? 'Encoding...' : 'Adding Metadata...'}
              </span>
              <span className="text-sm text-orange-400 font-mono">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        )}

        {/* Download Ready */}
        {status === 'ready' && (
          <div className="space-y-6">
            <div className="bg-green-950/30 border border-green-900/50 rounded-xl p-6 flex items-center gap-4">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-white">Asset Ready!</h3>
                <p className="text-sm text-slate-400">
                  Your {format} file is ready for download
                </p>
              </div>
            </div>

            <Button
              onClick={handleDownload}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold py-6 text-lg"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Download & Finish Project
            </Button>
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="pt-6 border-t border-slate-800/50 flex justify-between">
          <Button onClick={onPrevious} variant="outline" className="border-slate-700 text-white">
            Previous
          </Button>
        </div>
      </CardContent>
    </>
  );
};
