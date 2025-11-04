import React, { useCallback, useEffect, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Plus, Save, X, Play, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import ActionNode from './ActionNode';
import RecipeNodePanel from './RecipeNodePanel';
import RecipeTestPanel from './RecipeTestPanel';
import ExecutionResultsPanel from './ExecutionResultsPanel';
import NodeExecutionResultDialog from './NodeExecutionResultDialog';
import './RecipeEditor.css';

const nodeTypes = {
  action: ActionNode,
};

interface RecipeEditorProps {
  recipe?: {
    id: string;
    name: string;
    nodes: any[];
    edges: any[];
  };
  previousStageOutput?: any;
  onSave: (recipe: any) => Promise<void>;
  onClose: () => void;
}

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

export function RecipeEditor({ recipe, previousStageOutput, onSave, onClose }: RecipeEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingNode, setIsTestingNode] = useState(false);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [executionResults, setExecutionResults] = useState<Map<string, ExecutionResult>>(new Map());
  const [showDependencyModal, setShowDependencyModal] = useState(false);
  const [pendingNodeTest, setPendingNodeTest] = useState<{ nodeId: string; testData: any } | null>(null);
  const [currentTestData, setCurrentTestData] = useState<any>({});
  const [executionOutputs, setExecutionOutputs] = useState<Map<string, any>>(new Map());
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [selectedResultNodeId, setSelectedResultNodeId] = useState<string | null>(null);
  const [showResultsPanel, setShowResultsPanel] = useState(true);
  const { getNodes, getEdges } = useReactFlow();

  // Initialize from recipe
  useEffect(() => {
    if (recipe?.nodes) {
      const rfNodes: Node[] = recipe.nodes.map((node, index) => ({
        id: node.id,
        data: {
          label: node.name,
          node,
        },
        position: { x: index * 300, y: 100 },
        type: 'action',
      }));

      const rfEdges: Edge[] = (recipe.edges || []).map((edge) => ({
        id: `${edge.from}-${edge.to}`,
        source: edge.from,
        target: edge.to,
        animated: true,
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    }
  }, [recipe, setNodes, setEdges]);

  // Initialize test data from previous stage output
  useEffect(() => {
    if (previousStageOutput && Object.keys(previousStageOutput).length > 0) {
      setCurrentTestData(previousStageOutput);
    }
  }, [previousStageOutput]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
    },
    [setEdges]
  );

  const handleAddNode = () => {
    const newNodeId = `action_${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      data: {
        label: 'New Action',
        node: {
          id: newNodeId,
          name: 'New Action',
          type: 'text_generation',
          inputMapping: {},
          outputKey: '',
          aiModel: { provider: '', modelName: '' },
          prompt: '',
          parameters: {},
          dependencies: [],
          errorHandling: { onError: 'fail' },
        },
      },
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      type: 'action',
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) =>
      eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
    );
    setSelectedNode(null);
  };

  const handleUpdateNode = (nodeId: string, updates: any) => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              node: { ...n.data.node, ...updates },
            },
          };
        }
        return n;
      })
    );
  };

  const handleSave = async () => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      'This will update the recipe for all Stage 2 generations.\n\nContinue?'
    );
    if (!confirmed) return;

    try {
      setIsSaving(true);
      const currentNodes = getNodes();
      const currentEdges = getEdges();

      const recipeData = {
        ...recipe,
        nodes: currentNodes.map((n: any) => n.data.node),
        edges: currentEdges.map((e: any) => ({
          from: e.source,
          to: e.target,
        })),
      };

      await onSave(recipeData);
      onClose();
    } catch (error) {
      console.error('Error saving recipe:', error);
      alert(`Failed to save recipe: ${error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunFullRecipe = async (testData: any) => {
    try {
      setIsTestingNode(true);
      setExecutionResult(null);
      const outputsMap = new Map<string, any>();
      const allResults: ExecutionResult[] = [];

      // Execute the entire recipe with test data
      const currentNodes = getNodes();

      // Execute nodes in order
      for (const node of currentNodes) {
        const nodeData = node.data.node;
        const nodeInput = resolveInputs(nodeData.inputMapping, outputsMap, testData);

        try {
          // Call test-node endpoint for each node
          const response = await fetch(`/api/recipes/${recipe?.id}/test-node`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
            },
            body: JSON.stringify({
              nodeId: node.id,
              externalInput: testData,
              executeDependencies: false,
              mockOutputs: Object.fromEntries(outputsMap),
            }),
          });

          if (!response.ok) throw new Error(`Failed to execute node ${node.id}`);

          const data = await response.json();
          allResults.push(data.result);

          if (data.result.success && nodeData.outputKey) {
            // Store output by outputKey for next nodes to use
            outputsMap.set(nodeData.outputKey, data.result.output);
            setExecutionResult(data.result);
          } else if (!data.result.success) {
            setExecutionResult(data.result);
            break; // Stop on error
          }
        } catch (error) {
          console.error(`Error executing node ${node.id}:`, error);
          const errorResult = {
            success: false,
            nodeId: node.id,
            nodeName: nodeData.name,
            nodeType: nodeData.type,
            input: nodeInput,
            output: null,
            duration: 0,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            error: {
              message: error instanceof Error ? error.message : 'Unknown error',
              code: 'EXECUTION_ERROR',
            },
          };
          allResults.push(errorResult);
          setExecutionResult(errorResult);
          break;
        }
      }

      // Save all results and outputs map for reuse in single node tests
      setExecutionResults((prev) => {
        const newMap = new Map(prev);
        allResults.forEach((result) => {
          newMap.set(result.nodeId, result);
        });
        return newMap;
      });
      setExecutionOutputs(outputsMap);
      setShowResultsPanel(true);
    } finally {
      setIsTestingNode(false);
    }
  };

  const handleTestSingleNode = async (nodeId: string, testData?: any) => {
    // Get ancestor node IDs to check if outputs are available
    const currentNodes = getNodes();

    const nodeIndex = currentNodes.findIndex((n: any) => n.id === nodeId);
    const ancestorNodeIds = currentNodes
      .slice(0, nodeIndex)
      .map((n: any) => n.id);

    // Check if all ancestor outputs are available
    const targetNode = currentNodes.find((n: any) => n.id === nodeId)?.data.node;
    if (!targetNode) return;

    const mockOutputs = Object.fromEntries(executionOutputs);
    const allOutputsAvailable = ancestorNodeIds.length === 0 || ancestorNodeIds.every((id: string) => {
      const ancestor = currentNodes.find((n: any) => n.id === id)?.data.node;
      return ancestor && mockOutputs.hasOwnProperty(ancestor.outputKey);
    });

    // Prefer non-empty data sources in order: testData, currentTestData, previousStageOutput
    const hasKeys = (obj: any) => obj && Object.keys(obj).length > 0;
    const data = (hasKeys(testData) ? testData : null)
              || (hasKeys(currentTestData) ? currentTestData : null)
              || previousStageOutput
              || {};

    // If we have all outputs, execute immediately with dependencies=false
    if (allOutputsAvailable && (executionOutputs.size > 0 || ancestorNodeIds.length === 0)) {
      // Execute directly without modal
      try {
        setIsTestingNode(true);
        setExecutionResult(null);

        const response = await fetch(`/api/recipes/${recipe?.id}/test-node`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            nodeId,
            externalInput: data,
            executeDependencies: false,
            mockOutputs,
          }),
        });

        if (!response.ok) throw new Error('Failed to test node');

        const result = await response.json();
        setExecutionResult(result.result);

        // Add result to results map for display (preserve previous results)
        setExecutionResults((prev) => {
          const newMap = new Map(prev);
          newMap.set(result.result.nodeId, result.result);
          return newMap;
        });
        setShowResultsPanel(true);

        // Update outputs map if successful
        if (result.result.success && targetNode.outputKey) {
          const newOutputs = new Map(executionOutputs);
          newOutputs.set(targetNode.outputKey, result.result.output);
          setExecutionOutputs(newOutputs);
        }
      } catch (error) {
        console.error('Error testing node:', error);
        alert(`Failed to test node: ${error}`);
      } finally {
        setIsTestingNode(false);
      }
    } else {
      // Show modal to choose dependency execution mode
      setPendingNodeTest({ nodeId, testData: data });
      setShowDependencyModal(true);
    }
  };

  const handleExecuteTestNode = async (executeDependencies: boolean, mockOutputs: any = {}) => {
    if (!pendingNodeTest) return;

    try {
      setIsTestingNode(true);
      setShowDependencyModal(false);
      setExecutionResult(null);

      const response = await fetch(`/api/recipes/${recipe?.id}/test-node`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          nodeId: pendingNodeTest.nodeId,
          externalInput: pendingNodeTest.testData,
          executeDependencies,
          mockOutputs,
        }),
      });

      if (!response.ok) throw new Error('Failed to test node');

      const data = await response.json();
      setExecutionResult(data.result);

      // Add all results to results map (dependencies + target node)
      setExecutionResults((prev) => {
        const newMap = new Map(prev);

        // Add dependency node results
        if (data.dependencyResults && data.dependencyResults.length > 0) {
          data.dependencyResults.forEach((result: any) => {
            newMap.set(result.nodeId, result);
          });
        }

        // Add target node result
        newMap.set(data.result.nodeId, data.result);
        return newMap;
      });
      setShowResultsPanel(true);

      // Update outputs map if successful
      const currentNodes = getNodes();
      const node = currentNodes.find((n: any) => n.id === pendingNodeTest.nodeId)?.data.node;
      if (data.result.success && node?.outputKey) {
        const newOutputs = new Map(executionOutputs);
        newOutputs.set(node.outputKey, data.result.output);
        setExecutionOutputs(newOutputs);
      }
    } catch (error) {
      console.error('Error testing node:', error);
      alert(`Failed to test node: ${error}`);
    } finally {
      setIsTestingNode(false);
      setPendingNodeTest(null);
    }
  };

  const resolveInputs = (inputMapping: any, nodeOutputs: any, externalInput: any) => {
    const resolved: any = {};
    Object.entries(inputMapping || {}).forEach(([key, inputDef]: [string, any]) => {
      let sourceString = '';

      // Handle both old string format and new object format with metadata
      if (typeof inputDef === 'string') {
        // Old format: inputMapping: { field: 'external_input.fieldName' }
        sourceString = inputDef;
      } else if (typeof inputDef === 'object' && inputDef !== null && inputDef.source) {
        // New format: inputMapping: { field: { source: 'external_input.fieldName', description: '...', ... } }
        sourceString = inputDef.source;
      }

      if (sourceString.startsWith('external_input.')) {
        const fieldName = sourceString.replace('external_input.', '');
        resolved[key] = externalInput[fieldName];
      } else if (sourceString.startsWith('node_')) {
        resolved[key] = nodeOutputs[sourceString];
      } else if (sourceString) {
        resolved[key] = sourceString;
      } else {
        // Fallback for undefined sourceString
        resolved[key] = inputDef;
      }
    });
    return resolved;
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
      {/* Top Toolbar */}
      <div className="border-b border-gray-800 bg-[#0a0a0a] p-4 flex items-center justify-between flex-shrink-0">
        <h2 className="text-xl font-semibold text-white">
          {recipe?.name ? `Edit: ${recipe.name}` : 'Create New Recipe'}
        </h2>
        <div className="flex gap-3">
          <Button onClick={handleAddNode} variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Node
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
            size="sm"
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Recipe
              </>
            )}
          </Button>
          <Button onClick={onClose} variant="outline" size="sm">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Test Panel */}
          {recipe && (
            <RecipeTestPanel
              recipe={recipe}
              previousStageOutput={previousStageOutput}
              onRunFullRecipe={handleRunFullRecipe}
              isLoading={isTestingNode}
            />
          )}

          {/* React Flow Canvas */}
          <div className="flex-1 relative" onContextMenu={(e) => {
            // Allow context menu on nodes via right-click
            const target = e.target as HTMLElement;
            if (target.closest('.react-flow__node')) {
              e.preventDefault();
            }
          }}>
            <ReactFlow
              nodes={nodes.map((node) => {
                const nodeResult = executionResults.get(node.id);
                return {
                  ...node,
                  data: {
                    ...node.data,
                    onTest: () => handleTestSingleNode(node.id),
                    onViewResult: () => {
                      setSelectedResultNodeId(node.id);
                      setShowResultDialog(true);
                    },
                    hasResult: !!nodeResult,
                  },
                };
              })}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(event, node) => setSelectedNode(node)}
              onNodeContextMenu={(event, node) => {
                event.preventDefault();
                // Show context menu or trigger test
                handleTestSingleNode(node.id);
              }}
              fitView
            >
              <Background color="#1a1a1a" gap={16} />
            </ReactFlow>
          </div>

          {/* Loading Indicator or Results Panel */}
          {isTestingNode && (
            <div className="border-t border-gray-800 bg-[#0a0a0a] p-3 flex items-center gap-3 flex-shrink-0">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
              <span className="text-xs text-gray-300">Testing node...</span>
            </div>
          )}

          {/* Results Panel - Click on nodes to view details */}
          {executionResults.size > 0 && !isTestingNode && showResultsPanel && (
            <ExecutionResultsPanel
              results={Array.from(executionResults.values())}
              isLoading={false}
              onClose={() => {
                setShowResultsPanel(false);
              }}
              onNodeClick={(nodeId) => {
                setSelectedResultNodeId(nodeId);
                setShowResultDialog(true);
              }}
            />
          )}
        </div>

        {/* Right Panel: Node Properties */}
        {selectedNode && (
          <div className="w-80 border-l border-gray-800 bg-[#151515] flex flex-col flex-shrink-0 overflow-hidden">
            <RecipeNodePanel
              node={selectedNode}
              onUpdate={(updates) => handleUpdateNode(selectedNode.id, updates)}
              onDelete={() => handleDeleteNode(selectedNode.id)}
            />
          </div>
        )}
      </div>

      {/* Dependency Selection Modal */}
      <Dialog open={showDependencyModal} onOpenChange={setShowDependencyModal}>
        <DialogContent className="bg-[#151515] border border-gray-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              How to test this node?
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Choose how to handle dependency nodes:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            <Button
              onClick={() => handleExecuteTestNode(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white justify-start"
            >
              <Play className="w-4 h-4 mr-2" />
              Run with dependencies (slower, realistic)
            </Button>
            <Button
              onClick={() => handleExecuteTestNode(false)}
              variant="outline"
              className="w-full text-gray-300 border-gray-700 hover:bg-gray-800/50 justify-start"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Skip dependencies (provide mock data)
            </Button>
          </div>

          <p className="text-xs text-gray-500 border-t border-gray-800 pt-3">
            Running with dependencies will execute all upstream nodes first. Skipping is faster for testing individual node logic.
          </p>
        </DialogContent>
      </Dialog>

      {/* Node Execution Result Dialog */}
      <NodeExecutionResultDialog
        open={showResultDialog}
        results={Array.from(executionResults.values())}
        initialNodeId={selectedResultNodeId || undefined}
        onClose={() => setShowResultDialog(false)}
      />
    </div>
  );
}

export default RecipeEditor;
