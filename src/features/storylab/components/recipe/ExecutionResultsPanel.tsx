import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Copy, Download, AlertCircle, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface ExecutionResult {
  success: boolean;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  input: any;
  output: any;
  duration: number;
  startedAt: string;
  completedAt: string;
  error?: {
    message: string;
    code: string;
  };
}

interface ExecutionResultsPanelProps {
  results?: ExecutionResult[];
  result?: ExecutionResult | null;
  isLoading?: boolean;
  onClose?: () => void;
  onNodeClick?: (nodeId: string) => void;
}

export function ExecutionResultsPanel({ results, result, isLoading = false, onClose, onNodeClick }: ExecutionResultsPanelProps) {
  const [expandedSection, setExpandedSection] = useState<'input' | 'output' | null>('output');
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Use results array if provided, otherwise fall back to single result
  const allResults = results && results.length > 0 ? results : (result ? [result] : []);
  const currentResult = allResults[selectedResultIndex];

  if (!currentResult && !isLoading) {
    return (
      <div className="border-t border-gray-800 bg-[#0a0a0a] p-4 text-center text-gray-500">
        No execution results yet. Run a node to see results here.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border-t border-gray-800 bg-[#0a0a0a] p-4 flex items-center justify-center gap-3">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
        <span className="text-sm text-gray-300">Executing node...</span>
      </div>
    );
  }

  if (!currentResult) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadJSON = (data: any, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Memoize JSON formatting with size limit
  const formatJSON = useMemo(() => {
    return (obj: any, maxSize = 50000) => {
      try {
        const json = JSON.stringify(obj, null, 2);
        if (json.length > maxSize) {
          return json.substring(0, maxSize) + `\n\n... (truncated, total size: ${(json.length / 1024).toFixed(1)}KB)`;
        }
        return json;
      } catch {
        return '[Error: Failed to serialize data]';
      }
    };
  }, []);

  // Memoize current result formatting
  const formattedInput = useMemo(() => {
    if (!currentResult?.input) return '';
    return formatJSON(currentResult.input);
  }, [currentResult?.input, formatJSON]);

  const formattedOutput = useMemo(() => {
    if (!currentResult?.output) return '';
    return formatJSON(currentResult.output);
  }, [currentResult?.output, formatJSON]);

  // Collapsed view - minimal header only
  if (isCollapsed) {
    return (
      <div className="border-t border-gray-800 bg-[#0a0a0a] p-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          {currentResult.success ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
          <span className="text-sm text-gray-300">{currentResult.nodeName}</span>
          <span className="text-xs text-gray-500">({allResults.length} results)</span>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCollapsed(false)}
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
          >
            <ChevronUp className="w-3 h-3" />
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-800 bg-[#0a0a0a] overflow-hidden flex flex-col max-h-80">
      {/* Header */}
      <div className="p-4 border-b border-gray-800 bg-[#151515] flex-shrink-0">
        {/* Navigation Bar */}
        {allResults.length > 1 && (
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
            <div className="text-xs text-gray-400">
              Node {selectedResultIndex + 1} of {allResults.length}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setSelectedResultIndex(Math.max(0, selectedResultIndex - 1))}
                disabled={selectedResultIndex === 0}
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setSelectedResultIndex(Math.min(allResults.length - 1, selectedResultIndex + 1))}
                disabled={selectedResultIndex === allResults.length - 1}
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              {onNodeClick && (
                <Button
                  onClick={() => onNodeClick(currentResult.nodeId)}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs"
                >
                  Full View
                </Button>
              )}
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  size="sm"
                  className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-800/50"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Node Info */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {currentResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <h3 className="font-semibold text-white">{currentResult.nodeName}</h3>
              <p className="text-xs text-gray-400">
                {currentResult.nodeType} • {formatDuration(currentResult.duration)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onNodeClick && (
              <Button
                onClick={() => onNodeClick(currentResult.nodeId)}
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
              >
                Full View
              </Button>
            )}
            <Button
              onClick={() => setIsCollapsed(true)}
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              title="Collapse to see nodes"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
            {onClose && (
              <Button
                onClick={onClose}
                variant="outline"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </Button>
            )}
            <div className="text-right text-xs text-gray-500 ml-auto">
              <p>{new Date(currentResult.completedAt).toLocaleTimeString()}</p>
            </div>
          </div>
        </div>

        {currentResult.error && (
          <div className="bg-red-600/10 border border-red-600/30 rounded px-3 py-2 text-xs text-red-200">
            <p className="font-semibold mb-1">Error: {currentResult.error.code}</p>
            <p>{currentResult.error.message}</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-2 p-4">
        {/* Input Section */}
        {currentResult.input && (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() =>
                setExpandedSection(expandedSection === 'input' ? null : 'input')
              }
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-900/50 transition-colors bg-gray-900/20"
            >
              <span className="font-medium text-sm text-gray-300">Input</span>
              {expandedSection === 'input' ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedSection === 'input' && (
              <div className="p-3 bg-[#0a0a0a] border-t border-gray-800">
                <pre className="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-words">
                  {formattedInput}
                </pre>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => copyToClipboard(formattedInput)}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-800/50 text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Output Section */}
        {currentResult.output && (
          <div className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              onClick={() =>
                setExpandedSection(expandedSection === 'output' ? null : 'output')
              }
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-900/50 transition-colors bg-gray-900/20"
            >
              <span className="font-medium text-sm text-gray-300">Output</span>
              {expandedSection === 'output' ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedSection === 'output' && (
              <div className="p-3 bg-[#0a0a0a] border-t border-gray-800">
                <pre className="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-words max-h-60">
                  {formattedOutput}
                </pre>
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={() => copyToClipboard(formattedOutput)}
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-800/50 text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    onClick={() =>
                      downloadJSON(currentResult.output, `${currentResult.nodeId}-output.json`)
                    }
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-800/50 text-xs"
                  >
                    <Download className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ExecutionResultsPanel;
