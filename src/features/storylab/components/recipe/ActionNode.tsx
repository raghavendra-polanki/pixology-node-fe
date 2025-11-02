import { Handle, Position } from 'reactflow';
import { Trash2 } from 'lucide-react';

interface ActionNodeProps {
  data: {
    label: string;
    node: {
      id: string;
      name: string;
      type: string;
    };
  };
  isConnecting?: boolean;
  selected?: boolean;
  id: string;
  onDelete?: (id: string) => void;
}

export function ActionNode({ data, selected, id, onDelete }: ActionNodeProps) {
  const typeColors: Record<string, string> = {
    text_generation: 'from-blue-600 to-blue-700',
    image_generation: 'from-cyan-600 to-cyan-700',
    video_generation: 'from-pink-600 to-pink-700',
    data_processing: 'from-green-600 to-green-700',
  };

  const colorClass = typeColors[data.node.type] || 'from-gray-600 to-gray-700';

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-max shadow-lg
        transition-all duration-200
        ${selected
          ? `border-blue-400 shadow-lg shadow-blue-500/30 bg-gradient-to-r ${colorClass}`
          : `border-gray-700 hover:border-gray-600 bg-gradient-to-r ${colorClass}`
        }
      `}
    >
      <Handle type="target" position={Position.Top} />

      <div className="text-center">
        <div className="text-sm font-semibold text-white truncate max-w-xs">
          {data.label}
        </div>
        <div className="text-xs text-gray-200 mt-1 opacity-90">
          {data.node.type.replace(/_/g, ' ')}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />

      {/* Delete button appears on selection */}
      {selected && onDelete && (
        <button
          className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white shadow-lg hover:shadow-red-600/50 transition-all"
          onClick={() => onDelete(id)}
          title="Delete node"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default ActionNode;
