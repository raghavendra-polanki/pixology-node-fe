import { useState } from 'react';
import { Sparkles, Download, ThumbsUp, ThumbsDown, AlertCircle, Play, Volume2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import type { Project } from '../../types';

interface Stage6Props {
  project: Project;
  onComplete: (data: any) => void;
}

export function Stage6GenerateVideo({ project, onComplete }: Stage6Props) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'complete'>(
    project.data.video?.status || 'idle'
  );
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<'good' | 'needs-edit' | null>(null);

  const handleGenerate = () => {
    setStatus('generating');
    setProgress(0);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('complete');
          onComplete({ video: { status: 'complete', url: 'mock-video-url' } });
          return 100;
        }
        return prev + 5;
      });
    }, 300);
  };

  const handleFeedback = (type: 'good' | 'needs-edit') => {
    setFeedback(type);
  };

  const handleDownload = () => {
    // Simulate download
    console.log('Downloading video...');
  };

  return (
    <div className="max-w-5xl mx-auto p-8 lg:p-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white">Generate Video</h2>
            <p className="text-gray-400">
              Initiate final video assembly and review the result
            </p>
          </div>
        </div>
      </div>

      {/* Idle State - Generate Button */}
      {status === 'idle' && (
        <div className="space-y-6">
          <Alert className="bg-blue-950/20 border-blue-900/50 rounded-xl">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <AlertDescription className="text-blue-200">
              <strong>Important:</strong> Video generation typically takes 5-10 minutes depending on complexity. 
              You'll be notified when it's ready. Make sure all previous steps are finalized before proceeding.
            </AlertDescription>
          </Alert>

          <Card className="bg-[#151515] border-gray-800 rounded-xl p-8">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center mx-auto">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div>
                <h3 className="text-white mb-2">Ready to Generate Your Video</h3>
                <p className="text-gray-400 max-w-md mx-auto">
                  Our AI will combine your campaign details, personas, narrative, storyboard, and screenplay 
                  into a professional marketing video.
                </p>
              </div>
              <Button
                onClick={handleGenerate}
                className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl px-8"
                size="lg"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate Video
              </Button>
            </div>
          </Card>

          {/* Summary */}
          <Card className="bg-[#151515] border-gray-800 rounded-xl p-6">
            <h3 className="text-white mb-4">Campaign Summary</h3>
            <div className="space-y-3 text-gray-400">
              <div className="flex items-center justify-between">
                <span>Campaign Name:</span>
                <span className="text-gray-300">{project.data.campaignDetails?.campaignName || 'Not set'}</span>
              </div>
              <Separator className="bg-gray-800" />
              <div className="flex items-center justify-between">
                <span>Video Length:</span>
                <span className="text-gray-300">{project.data.campaignDetails?.videoLength || 'Not set'}</span>
              </div>
              <Separator className="bg-gray-800" />
              <div className="flex items-center justify-between">
                <span>Selected Personas:</span>
                <span className="text-gray-300">{project.data.personas?.length || 0} personas</span>
              </div>
              <Separator className="bg-gray-800" />
              <div className="flex items-center justify-between">
                <span>Storyboard Scenes:</span>
                <span className="text-gray-300">{project.data.storyboard?.length || 0} scenes</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Generating State */}
      {status === 'generating' && (
        <Card className="bg-[#151515] border-gray-800 rounded-xl p-8">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center mx-auto">
              <Sparkles className="w-10 h-10 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-white mb-2">Generating Your Video</h3>
              <p className="text-gray-400">
                AI is assembling your campaign video. This may take a few minutes...
              </p>
            </div>
            
            {/* Progress Bar */}
            <div className="max-w-md mx-auto space-y-3">
              <Progress value={progress} className="h-3 bg-gray-800 [&>div]:bg-gradient-to-r [&>div]:from-blue-600 [&>div]:to-blue-500" />
              <div className="flex items-center justify-between text-gray-400">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
            </div>

            {/* Status Messages */}
            <div className="text-gray-500 space-y-2">
              {progress < 30 && <p>Analyzing screenplay and storyboard...</p>}
              {progress >= 30 && progress < 60 && <p>Rendering scenes and transitions...</p>}
              {progress >= 60 && progress < 90 && <p>Adding audio and voiceover...</p>}
              {progress >= 90 && <p>Finalizing video...</p>}
            </div>
          </div>
        </Card>
      )}

      {/* Complete State */}
      {status === 'complete' && (
        <div className="space-y-6">
          {/* Video Player */}
          <Card className="bg-[#151515] border-gray-800 rounded-xl overflow-hidden">
            <div className="bg-[#0a0a0a] aspect-video flex items-center justify-center relative group">
              {/* Placeholder for video player */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-blue-600/20 backdrop-blur flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600/30 transition-all cursor-pointer">
                    <Play className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-gray-400">Video Preview</p>
                  <p className="text-gray-600">Click to play</p>
                </div>
              </div>

              {/* StoryLab Watermark */}
              <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                <p className="text-white text-xs">
                  Story<span className="text-blue-500">Lab</span>
                </p>
              </div>
              
              {/* Video Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-all">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="sm" className="text-white hover:text-blue-400">
                    <Play className="w-5 h-5" />
                  </Button>
                  <div className="flex-1 h-1 bg-gray-700 rounded-full">
                    <div className="w-1/3 h-full bg-blue-500 rounded-full"></div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-white hover:text-blue-400">
                    <Volume2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Video Info */}
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white mb-1">{project.data.campaignDetails?.campaignName}</h3>
                  <p className="text-gray-400">Duration: {project.data.campaignDetails?.videoLength || '30s'}</p>
                </div>
                <Button
                  onClick={handleDownload}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </Card>

          {/* Feedback Section */}
          <Card className="bg-[#151515] border-gray-800 rounded-xl p-6">
            <h3 className="text-white mb-4">How does it look?</h3>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => handleFeedback('good')}
                variant={feedback === 'good' ? 'default' : 'outline'}
                className={`rounded-lg flex-1 ${
                  feedback === 'good'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <ThumbsUp className="w-5 h-5 mr-2" />
                Looks Great!
              </Button>
              <Button
                onClick={() => handleFeedback('needs-edit')}
                variant={feedback === 'needs-edit' ? 'default' : 'outline'}
                className={`rounded-lg flex-1 ${
                  feedback === 'needs-edit'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'border-gray-700 text-gray-300 hover:bg-gray-800'
                }`}
              >
                <ThumbsDown className="w-5 h-5 mr-2" />
                Needs Edits
              </Button>
            </div>
            {feedback === 'needs-edit' && (
              <p className="text-gray-400 mt-4">
                You can go back to previous stages to make adjustments and regenerate the video.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
