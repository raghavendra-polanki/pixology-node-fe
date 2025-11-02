import { useState } from 'react';
import { Trash2, Maximize2, X } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '../ui/dialog';
import { Slider } from '../ui/slider';
import { Node } from 'reactflow';

interface RecipeNodePanelProps {
  node: Node;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
}

export function RecipeNodePanel({ node, onUpdate, onDelete }: RecipeNodePanelProps) {
  const nodeData = (node.data as any)?.node || {};
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptValue, setPromptValue] = useState(nodeData.prompt || '');

  const handleFieldChange = (field: string, value: any) => {
    onUpdate({ [field]: value });
  };

  const handleAIModelChange = (field: string, value: any) => {
    onUpdate({
      aiModel: { ...nodeData.aiModel, [field]: value },
    });
  };

  const handleOpenPromptModal = () => {
    setPromptValue(nodeData.prompt || '');
    setIsPromptModalOpen(true);
  };

  const handleSavePrompt = () => {
    handleFieldChange('prompt', promptValue);
    setIsPromptModalOpen(false);
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
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium text-gray-300">Temperature</Label>
                <span className="text-xs font-semibold text-blue-400 bg-blue-600/10 px-2 py-1 rounded">
                  {(nodeData.aiModel?.temperature || 0.7).toFixed(2)}
                </span>
              </div>
              <Slider
                value={[nodeData.aiModel?.temperature || 0.7]}
                onValueChange={(value) => handleAIModelChange('temperature', value[0])}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">Lower = More focused | Higher = More creative</div>
            </div>
          </>
        )}

        {/* Prompt */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-gray-300">Prompt Template</Label>
            <Button
              onClick={handleOpenPromptModal}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-800/50"
              title="Expand to larger editor"
            >
              <Maximize2 className="w-3 h-3 mr-1" />
              <span className="text-xs">Expand</span>
            </Button>
          </div>
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

      {/* Prompt Editor Modal */}
      <Dialog open={isPromptModalOpen} onOpenChange={setIsPromptModalOpen}>
        <DialogContent className="!w-[90vw] !h-[90vh] !max-w-none !max-h-none bg-[#0a0a0a] border-gray-800 flex flex-col p-0 rounded-lg">
          {/* Modal Header */}
          <div className="border-b border-gray-800 px-8 py-6 flex items-center justify-between bg-[#151515] rounded-t-lg">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-semibold text-white">Edit Prompt Template</DialogTitle>
              <p className="text-gray-400 text-sm mt-1">Character count: {promptValue.length}</p>
            </div>
          </div>

          {/* Modal Content - Full Editor */}
          <div className="flex-1 overflow-hidden flex flex-col px-8 py-6 gap-4">
            {/* Editor Info */}
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <span>💡</span>
                <span>Use {'{placeholders}'} for variables like {'{productDescription}'}, {'{targetAudience}'}, etc.</span>
              </div>
            </div>

            {/* Large Textarea */}
            <textarea
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              className="flex-1 bg-[#0a0a0a] border border-gray-700 text-white text-base p-6 rounded-lg resize-none focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-mono leading-relaxed placeholder-gray-600"
              placeholder="Enter your prompt template here...

Use {curly_braces} for variable placeholders that will be replaced at runtime.

Example:
Create {numberOfPersonas} detailed personas for {productDescription} targeting {targetAudience}..."
              style={{ fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace', lineHeight: '1.6' }}
            />

            {/* Helper Tips */}
            <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg px-4 py-3 text-xs text-blue-200">
              <p className="font-semibold mb-1">💡 Prompt Tips:</p>
              <ul className="space-y-1 text-blue-100/80">
                <li>• Be specific and detailed for better AI responses</li>
                <li>• Use placeholders in {'{curly_braces}'} for dynamic values</li>
                <li>• Include examples or expected output format</li>
                <li>• Test your prompt with sample inputs before saving</li>
              </ul>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-gray-800 bg-[#151515] px-8 py-6 flex gap-3 justify-end">
            <DialogClose asChild>
              <Button
                variant="outline"
                className="text-gray-300 border-gray-700 hover:bg-gray-800/50 hover:text-white px-6"
              >
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={handleSavePrompt}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 font-medium"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default RecipeNodePanel;
