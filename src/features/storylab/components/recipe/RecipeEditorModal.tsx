import React from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { ReactFlowProvider } from 'reactflow';
import RecipeEditor from './RecipeEditor';

interface RecipeEditorModalProps {
  recipe?: {
    id: string;
    name: string;
    nodes: any[];
    edges: any[];
  };
  onSave: (recipe: any) => Promise<void>;
  onClose: () => void;
}

export function RecipeEditorModal({
  recipe,
  onSave,
  onClose,
}: RecipeEditorModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] max-h-[90vh] p-0 bg-[#0a0a0a] border-gray-800 overflow-hidden">
        <ReactFlowProvider>
          <RecipeEditor recipe={recipe} onSave={onSave} onClose={onClose} />
        </ReactFlowProvider>
      </DialogContent>
    </Dialog>
  );
}

export default RecipeEditorModal;
