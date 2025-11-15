interface GenerationProgressIndicatorProps {
  isGenerating: boolean;
  progress: number;
  status: string;
}

export function GenerationProgressIndicator({
  isGenerating,
  progress,
  status,
}: GenerationProgressIndicatorProps) {
  if (!isGenerating) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span
          className="gradient-shimmer-text animate-status-fade font-medium"
          key={status}
        >
          {status}
        </span>
        <span className="text-blue-400 font-medium animate-pulse-subtle">
          {progress}%
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer-progress" />
        </div>
      </div>

      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .gradient-shimmer-text {
          background: linear-gradient(
            90deg,
            #60a5fa 0%,
            #93c5fd 25%,
            #dbeafe 50%,
            #93c5fd 75%,
            #60a5fa 100%
          );
          background-size: 200% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientShift 3s ease-in-out infinite;
        }
        @keyframes shimmerProgress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer-progress {
          animation: shimmerProgress 2s infinite;
        }
        @keyframes statusFade {
          from { opacity: 0; transform: translateY(-2px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-status-fade {
          animation: statusFade 0.3s ease-out;
        }
        @keyframes pulseSubtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-subtle {
          animation: pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}
