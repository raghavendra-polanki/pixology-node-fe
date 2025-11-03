import { useState, useEffect, useMemo } from 'react';
import { Play, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';

interface RecipeTestPanelProps {
  recipe?: {
    id: string;
    nodes: any[];
  };
  previousStageOutput?: any;
  onRunFullRecipe: (testData: any) => Promise<void>;
  isLoading?: boolean;
}

export function RecipeTestPanel({
  recipe,
  previousStageOutput,
  onRunFullRecipe,
  isLoading = false,
}: RecipeTestPanelProps) {
  const [testData, setTestData] = useState<any>({});
  const [isExpanded, setIsExpanded] = useState(true);

  // Memoize external_input fields extraction to prevent infinite loops
  const externalInputFields = useMemo(() => {
    if (!recipe?.nodes || recipe.nodes.length === 0) return [];

    const fields = new Set<string>();

    // Scan ALL nodes to find external_input references
    recipe.nodes.forEach((node: any) => {
      if (node?.inputMapping) {
        Object.values(node.inputMapping).forEach((source: any) => {
          if (typeof source === 'string' && source.startsWith('external_input.')) {
            const fieldName = source.replace('external_input.', '');
            fields.add(fieldName);
          }
        });
      }
    });

    const sortedFields = Array.from(fields).sort();
    console.log('RecipeTestPanel - Extracted external input fields:', sortedFields);
    console.log('RecipeTestPanel - Recipe nodes:', recipe?.nodes?.map((n: any) => ({ id: n.id, inputMapping: n.inputMapping })));

    return sortedFields;
  }, [recipe?.nodes]);

  // Auto-populate from previous stage output
  useEffect(() => {
    if (previousStageOutput) {
      const newTestData: any = {};
      externalInputFields.forEach((field) => {
        if (previousStageOutput.hasOwnProperty(field)) {
          newTestData[field] = previousStageOutput[field];
        }
      });
      setTestData(newTestData);
    }
  }, [previousStageOutput, externalInputFields]);

  const handleTestDataChange = (field: string, value: any) => {
    setTestData((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleReset = () => {
    setTestData({});
    if (previousStageOutput) {
      const newTestData: any = {};
      externalInputFields.forEach((field) => {
        if (previousStageOutput.hasOwnProperty(field)) {
          newTestData[field] = previousStageOutput[field];
        }
      });
      setTestData(newTestData);
    }
  };

  const handleRunFullRecipe = async () => {
    await onRunFullRecipe(testData);
  };

  return (
    <div className="border-b border-gray-800 bg-[#0a0a0a]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-600/20 flex items-center justify-center">
            <Play className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="font-semibold text-white">Test Recipe</h3>
          <span className="text-xs text-gray-500">
            {externalInputFields.length} input variable{externalInputFields.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="text-gray-400">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4 bg-[#0a0a0a]">
          {/* Info Message */}
          {previousStageOutput && (
            <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg px-3 py-2 text-xs text-blue-200">
              ℹ️ Test data auto-loaded from Stage 1 execution
            </div>
          )}

          {/* Input Fields */}
          {externalInputFields.length > 0 ? (
            <div className="space-y-3">
              {externalInputFields.map((field) => {
                const value = testData[field];
                const isJsonLike =
                  typeof value === 'object' && value !== null && Object.keys(value).length > 0;

                return (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs font-medium text-gray-300 capitalize">
                      {field.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    {isJsonLike ? (
                      <Textarea
                        value={JSON.stringify(value, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value);
                            handleTestDataChange(field, parsed);
                          } catch {
                            // Keep as string if not valid JSON
                            handleTestDataChange(field, e.target.value);
                          }
                        }}
                        className="bg-[#1a1a1a] border-gray-700 text-white text-xs min-h-20 font-mono resize-none"
                        placeholder={`Enter ${field}...`}
                      />
                    ) : (
                      <Input
                        value={value || ''}
                        onChange={(e) => handleTestDataChange(field, e.target.value)}
                        className="bg-[#1a1a1a] border-gray-700 text-white text-sm"
                        placeholder={`Enter ${field}...`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">
              No external input variables found in recipe
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleRunFullRecipe}
              disabled={isLoading || externalInputFields.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              {isLoading ? 'Running...' : 'Run Full Recipe'}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              className="text-gray-300 border-gray-700 hover:bg-gray-800/50"
              size="sm"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-xs text-gray-500 border-t border-gray-800 pt-2">
            💡 Enter test data and click "Run Full Recipe" to execute all nodes sequentially
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipeTestPanel;
