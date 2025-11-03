import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Copy, Download, AlertCircle, CheckCircle, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

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

interface NodeExecutionResultDialogProps {
  open: boolean;
  results: ExecutionResult[];
  initialNodeId?: string;
  onClose: () => void;
}

export function NodeExecutionResultDialog({
  open,
  results,
  initialNodeId,
  onClose,
}: NodeExecutionResultDialogProps) {
  // Early return before hooks - must be before any hook calls
  if (!open || results.length === 0) return null;

  const [expandedSection, setExpandedSection] = useState<'input' | 'output' | 'images' | 'input-images' | null>('output');
  const [selectedResultIndex, setSelectedResultIndex] = useState(() => {
    if (!initialNodeId || results.length === 0) return 0;
    const index = results.findIndex(r => r.nodeId === initialNodeId);
    return index >= 0 ? index : 0;
  });

  const currentResult = results[selectedResultIndex];

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

  // Detect and extract image data from output
  const extractImages = (data: any): string[] => {
    const images: string[] = [];
    const seen = new Set<any>(); // Prevent infinite loops

    const traverse = (obj: any) => {
      if (!obj || seen.has(obj)) return;
      if (typeof obj === 'object') {
        seen.add(obj);
      }

      // Check if it's a Buffer object serialized as JSON
      if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
        try {
          // Convert array to Uint8Array (works in browser, unlike Buffer.from)
          const uint8Array = new Uint8Array(obj.data);
          const blob = new Blob([uint8Array], { type: 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          images.push(url);
          return; // Don't traverse into Buffer object
        } catch (e) {
          console.error('Failed to process buffer:', e);
          // Not a valid image buffer - continue traversing
        }
      }

      // Check if it's a base64 image string (with or without prefix)
      if (typeof obj === 'string') {
        // Full data URI format
        if (obj.startsWith('data:image/')) {
          images.push(obj);
          return;
        }

        // Check if it's an image URL
        if ((obj.startsWith('http') || obj.startsWith('/')) &&
            /\.(jpg|jpeg|png|gif|webp)$/i.test(obj)) {
          images.push(obj);
          return;
        }

        // Check if it's a base64 string (looks like base64)
        if (obj.length > 100 && /^[A-Za-z0-9+/=]+$/.test(obj)) {
          try {
            // Try to decode and check if it could be an image
            const binaryString = atob(obj);
            // Check for common image file signatures
            const firstBytes = binaryString.charCodeAt(0).toString(16) +
                               binaryString.charCodeAt(1).toString(16) +
                               binaryString.charCodeAt(2).toString(16);
            // JPEG: FFD8FF, PNG: 89504E, GIF: 474946, WebP: 52494646
            if (['ffd8ff', '89504e', '474946', '52494646'].some(sig => firstBytes.startsWith(sig))) {
              const blob = new Blob([Uint8Array.from(binaryString, c => c.charCodeAt(0))], { type: 'image/jpeg' });
              const url = URL.createObjectURL(blob);
              images.push(url);
              return;
            }
          } catch (e) {
            // Not valid base64 or not an image
          }
        }
      }

      // Recurse through array first (before object check)
      if (Array.isArray(obj)) {
        obj.forEach((item) => traverse(item));
        return;
      }

      // Recurse through object
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            traverse(obj[key]);
          }
        }
      }
    };

    traverse(data);
    return images;
  };

  const outputImages = useMemo(() => extractImages(currentResult?.output), [currentResult?.output]);
  const inputImages = useMemo(() => extractImages(currentResult?.input), [currentResult?.input]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

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

  const formattedInput = useMemo(() => {
    if (!currentResult?.input) return '';
    return formatJSON(currentResult.input);
  }, [currentResult?.input, formatJSON]);

  const formattedOutput = useMemo(() => {
    if (!currentResult?.output) return '';
    return formatJSON(currentResult.output);
  }, [currentResult?.output, formatJSON]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="bg-[#151515] border border-gray-800 flex flex-col p-0 overflow-hidden"
        style={{
          width: '95vw',
          height: '90vh',
          maxHeight: '90vh',
          maxWidth: '95vw',
        }}
      >
        {/* Header */}
        <DialogHeader className="p-4 border-b border-gray-800 bg-[#0a0a0a] flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="text-white flex items-center gap-3 mb-2">
                {currentResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-400" />
                )}
                <span>{currentResult.nodeName}</span>
              </DialogTitle>
              <p className="text-xs text-gray-400">
                {currentResult.nodeType} • {formatDuration(currentResult.duration)}
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Navigation and Error Info */}
        <div className="p-4 border-b border-gray-800 bg-[#0a0a0a] flex-shrink-0 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            Node {selectedResultIndex + 1} of {results.length}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setSelectedResultIndex(Math.max(0, selectedResultIndex - 1))}
              disabled={selectedResultIndex === 0}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
            >
              <ChevronLeft className="w-3 h-3 mr-1" />
              Previous
            </Button>
            <Button
              onClick={() => setSelectedResultIndex(Math.min(results.length - 1, selectedResultIndex + 1))}
              disabled={selectedResultIndex === results.length - 1}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
            >
              Next
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {currentResult.error && (
          <div className="px-4 py-3 bg-red-600/10 border-b border-red-600/30">
            <p className="font-semibold text-sm text-red-200 mb-1">
              Error: {currentResult.error.code}
            </p>
            <p className="text-xs text-red-200">{currentResult.error.message}</p>
          </div>
        )}

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto space-y-3 p-4">
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
                <div className="p-4 bg-[#0a0a0a] border-t border-gray-800">
                  <pre className="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-words bg-black/30 p-3 rounded max-h-80 overflow-y-auto">
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
                <div className="p-4 bg-[#0a0a0a] border-t border-gray-800">
                  <pre className="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap break-words bg-black/30 p-3 rounded max-h-80 overflow-y-auto">
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

          {/* Output Images Section */}
          {outputImages.length > 0 && (
            <div className="border border-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedSection(expandedSection === 'images' ? null : 'images')
                }
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-900/50 transition-colors bg-gray-900/20"
              >
                <span className="font-medium text-sm text-gray-300">Output Images ({outputImages.length})</span>
                {expandedSection === 'images' ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {expandedSection === 'images' && (
                <div className="p-4 bg-[#0a0a0a] border-t border-gray-800">
                  <div className="grid grid-cols-2 gap-3">
                    {outputImages.map((imageUrl, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border border-gray-700 bg-black/30">
                        <img
                          src={imageUrl}
                          alt={`Output image ${idx + 1}`}
                          className="w-full h-auto max-h-64 object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input Images Section */}
          {inputImages.length > 0 && (
            <div className="border border-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() =>
                  setExpandedSection(expandedSection === 'input-images' ? null : 'input-images')
                }
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-900/50 transition-colors bg-gray-900/20"
              >
                <span className="font-medium text-sm text-gray-300">Input Images ({inputImages.length})</span>
                {expandedSection === 'input-images' ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>

              {expandedSection === 'input-images' && (
                <div className="p-4 bg-[#0a0a0a] border-t border-gray-800">
                  <div className="grid grid-cols-2 gap-3">
                    {inputImages.map((imageUrl, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden border border-gray-700 bg-black/30">
                        <img
                          src={imageUrl}
                          alt={`Input image ${idx + 1}`}
                          className="w-full h-auto max-h-64 object-contain"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NodeExecutionResultDialog;
