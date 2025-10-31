import { Beaker } from 'lucide-react';

export function PoweredBy() {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-900/50 border border-gray-800 rounded-lg">
      <Beaker className="w-3.5 h-3.5 text-blue-500" />
      <span className="text-xs text-gray-500">
        Powered by <span className="text-blue-500">StoryLab</span>
      </span>
    </div>
  );
}
