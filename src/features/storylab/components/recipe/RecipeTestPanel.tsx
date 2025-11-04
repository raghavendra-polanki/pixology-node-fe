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

    const fieldsMap: any = {};

    // Scan ALL nodes to find external_input references
    recipe.nodes.forEach((node: any) => {
      if (node?.inputMapping) {
        Object.entries(node.inputMapping).forEach(([fieldKey, inputDef]: [string, any]) => {
          let sourceString = '';
          let metadata: any = { required: false, type: 'string', description: '', sampleData: null };

          // Handle both old string format and new object format with metadata
          if (typeof inputDef === 'string') {
            // Old format: inputMapping: { field: 'external_input.fieldName' }
            sourceString = inputDef;
          } else if (typeof inputDef === 'object' && inputDef !== null && inputDef.source) {
            // New format: inputMapping: { field: { source: 'external_input.fieldName', description: '...', ... } }
            sourceString = inputDef.source;
            // Extract metadata from the object
            metadata = {
              required: inputDef.required ?? false,
              type: inputDef.type ?? 'string',
              description: inputDef.description ?? '',
              sampleData: inputDef.sampleData ?? null,
              format: inputDef.format ?? undefined,
              pattern: inputDef.pattern ?? undefined,
            };
          }

          if (sourceString.startsWith('external_input.')) {
            const fieldName = sourceString.replace('external_input.', '');
            // Store metadata keyed by fieldName
            fieldsMap[fieldName] = metadata;
          }
        });
      }
    });

    const sortedFields = Object.keys(fieldsMap).sort();
    console.log('RecipeTestPanel - Extracted external input fields:', sortedFields);
    console.log('RecipeTestPanel - Fields metadata:', fieldsMap);
    console.log('RecipeTestPanel - Recipe nodes:', recipe?.nodes?.map((n: any) => ({ id: n.id, inputMapping: n.inputMapping })));

    return { fieldNames: sortedFields, fieldsMetadata: fieldsMap };
  }, [recipe?.nodes]);

  // Auto-populate from previous stage output
  useEffect(() => {
    if (previousStageOutput) {
      const newTestData: any = {};
      externalInputFields.fieldNames?.forEach((field) => {
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
      externalInputFields.fieldNames?.forEach((field) => {
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
            {externalInputFields.fieldNames?.length ?? 0} input variable{(externalInputFields.fieldNames?.length ?? 0) !== 1 ? 's' : ''}
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
          {(externalInputFields.fieldNames?.length ?? 0) > 0 ? (
            <div className="space-y-4">
              {externalInputFields.fieldNames?.map((field) => {
                const value = testData[field];
                const metadata = externalInputFields.fieldsMetadata?.[field] || {};
                const isJsonLike =
                  typeof value === 'object' && value !== null && Object.keys(value).length > 0;

                return (
                  <div key={field} className="space-y-2 p-3 bg-gray-900/30 rounded border border-gray-800">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium text-gray-300 capitalize">
                        {field.replace(/([A-Z])/g, ' $1').trim()}
                        {metadata.required && <span className="text-red-400 ml-1">*</span>}
                      </Label>
                      {metadata.type && (
                        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                          {metadata.type}
                        </span>
                      )}
                    </div>

                    {metadata.description && (
                      <p className="text-xs text-gray-400">{metadata.description}</p>
                    )}

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
                        placeholder={metadata.sampleData ? JSON.stringify(metadata.sampleData, null, 2) : `Enter ${field}...`}
                      />
                    ) : (
                      <Input
                        value={value || ''}
                        onChange={(e) => handleTestDataChange(field, e.target.value)}
                        className="bg-[#1a1a1a] border-gray-700 text-white text-sm"
                        placeholder={metadata.sampleData ? String(metadata.sampleData) : `Enter ${field}...`}
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
              disabled={isLoading || (externalInputFields.fieldNames?.length ?? 0) === 0}
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
