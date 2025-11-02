import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { RecipeEditor } from './RecipeEditor';
import './RecipeEditorPage.css';

interface RecipeEditorPageProps {
  recipe?: {
    id: string;
    name: string;
    nodes: any[];
    edges: any[];
  };
  onSave: (recipe: any) => Promise<void>;
  onBack: () => void;
  title?: string;
}

export function RecipeEditorPage({
  recipe,
  onSave,
  onBack,
  title = 'Recipe Editor',
}: RecipeEditorPageProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const handleSave = async (updatedRecipe: any) => {
    try {
      setIsSaving(true);
      setError(null);
      setSaveMessage(null);

      await onSave(updatedRecipe);

      setSaveMessage('Recipe saved successfully!');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err) {
      console.error('Error saving recipe:', err);
      setError(err instanceof Error ? err.message : 'Failed to save recipe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackClick = () => {
    if (isSaving) {
      alert('Please wait for the save operation to complete');
      return;
    }
    onBack();
  };

  return (
    <div className="recipe-editor-page">
      {/* Header */}
      <div className="recipe-editor-header">
        <div className="recipe-editor-header-content">
          <button
            className="recipe-editor-back-button"
            onClick={handleBackClick}
            disabled={isSaving}
            title="Go back to previous page"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          <div className="recipe-editor-title-section">
            <h1 className="recipe-editor-page-title">{title}</h1>
            {recipe && (
              <p className="recipe-editor-page-subtitle">
                {recipe.name} <span className="recipe-editor-recipe-id">#{recipe.id}</span>
              </p>
            )}
          </div>

          <div className="recipe-editor-status-section">
            {error && (
              <div className="recipe-editor-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}
            {saveMessage && (
              <div className="recipe-editor-success">
                <span>✓ {saveMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="recipe-editor-container">
        <ReactFlowProvider>
          <RecipeEditor
            recipe={recipe}
            onSave={handleSave}
            onClose={onBack}
          />
        </ReactFlowProvider>
      </div>

      {/* Footer Help Text */}
      <div className="recipe-editor-footer-help">
        <p>💡 Tip: Drag to move, click to select nodes, use the panel to edit properties</p>
      </div>
    </div>
  );
}

export default RecipeEditorPage;
