import { Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Slider } from '../ui/slider';
import { Node } from 'reactflow';

interface RecipeNodePanelProps {
  node: Node;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
}

export function RecipeNodePanel({ node, onUpdate, onDelete }: RecipeNodePanelProps) {
  const nodeData = (node.data as any)?.node || {};

  const handleFieldChange = (field: string, value: any) => {
    onUpdate({ [field]: value });
  };

  const handleAIModelChange = (field: string, value: any) => {
    onUpdate({
      aiModel: { ...nodeData.aiModel, [field]: value },
    });
  };

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 sticky top-0 bg-[#151515]">
        <h3 className="font-semibold text-white text-sm">Node Settings</h3>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Node Name */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-300">Node Name</Label>
          <Input
            value={nodeData.name || ''}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className="bg-[#0a0a0a] border-gray-700 text-white text-sm"
            placeholder="e.g., Persona Details"
          />
        </div>

        {/* Action Type */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-300">Action Type</Label>
          <Select
            value={nodeData.type || 'text_generation'}
            onValueChange={(value) => handleFieldChange('type', value)}
          >
            <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text_generation">Text Generation</SelectItem>
              <SelectItem value="image_generation">Image Generation</SelectItem>
              <SelectItem value="video_generation">Video Generation</SelectItem>
              <SelectItem value="data_processing">Data Processing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* AI Provider */}
        {nodeData.type !== 'data_processing' && (
          <>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-300">AI Provider</Label>
              <Select
                value={nodeData.aiModel?.provider || ''}
                onValueChange={(value) => handleAIModelChange('provider', value)}
              >
                <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white text-sm">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Gemini</SelectItem>
                  <SelectItem value="gpt4">GPT-4</SelectItem>
                  <SelectItem value="dall-e">DALL-E</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Model Name */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-300">Model Name</Label>
              <Input
                value={nodeData.aiModel?.modelName || ''}
                onChange={(e) => handleAIModelChange('modelName', e.target.value)}
                className="bg-[#0a0a0a] border-gray-700 text-white text-sm"
                placeholder="e.g., gemini-2.5-flash"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-300">
                Temperature: {(nodeData.aiModel?.temperature || 0.7).toFixed(1)}
              </Label>
              <Slider
                value={[nodeData.aiModel?.temperature || 0.7]}
                onValueChange={(value) => handleAIModelChange('temperature', value[0])}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>
          </>
        )}

        {/* Prompt */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-300">Prompt Template</Label>
          <Textarea
            value={nodeData.prompt || ''}
            onChange={(e) => handleFieldChange('prompt', e.target.value)}
            className="bg-[#0a0a0a] border-gray-700 text-white text-xs min-h-20 resize-none"
            placeholder="Enter prompt template..."
          />
        </div>

        {/* Output Key */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-300">Output Key</Label>
          <Input
            value={nodeData.outputKey || ''}
            onChange={(e) => handleFieldChange('outputKey', e.target.value)}
            className="bg-[#0a0a0a] border-gray-700 text-white text-sm"
            placeholder="e.g., personaDetails"
          />
        </div>

        {/* Error Handling */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-300">On Error</Label>
          <Select
            value={nodeData.errorHandling?.onError || 'fail'}
            onValueChange={(value) =>
              onUpdate({
                errorHandling: { ...nodeData.errorHandling, onError: value },
              })
            }
          >
            <SelectTrigger className="bg-[#0a0a0a] border-gray-700 text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fail">Fail Recipe</SelectItem>
              <SelectItem value="skip">Skip Node</SelectItem>
              <SelectItem value="retry">Retry</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Dependencies Info */}
        {nodeData.dependencies?.length > 0 && (
          <div className="bg-gray-900/30 border border-gray-800 rounded p-2">
            <Label className="text-xs font-medium text-gray-400">Dependencies</Label>
            <div className="text-xs text-gray-400 mt-1">
              {nodeData.dependencies.join(', ')}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 sticky bottom-0 bg-[#151515]">
        <Button
          onClick={onDelete}
          variant="destructive"
          size="sm"
          className="w-full text-xs"
        >
          <Trash2 className="w-3 h-3 mr-2" />
          Delete Node
        </Button>
      </div>
    </div>
  );
}

export default RecipeNodePanel;
