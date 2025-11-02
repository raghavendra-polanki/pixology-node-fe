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
import { Plus, Save, X } from 'lucide-react';
import { Button } from '../ui/button';
import ActionNode from './ActionNode';
import RecipeNodePanel from './RecipeNodePanel';
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
  onSave: (recipe: any) => Promise<void>;
  onClose: () => void;
}

export function RecipeEditor({ recipe, onSave, onClose }: RecipeEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);
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

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex">
      {/* Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="border-b border-gray-800 bg-[#0a0a0a] p-4 flex items-center justify-between">
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

        {/* React Flow Canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(event, node) => setSelectedNode(node)}
            fitView
          >
            <Background color="#1a1a1a" gap={16} />
          </ReactFlow>
        </div>
      </div>

      {/* Right Panel: Node Properties */}
      {selectedNode && (
        <div className="w-80 border-l border-gray-800 bg-[#151515] flex flex-col">
          <RecipeNodePanel
            node={selectedNode}
            onUpdate={(updates) => handleUpdateNode(selectedNode.id, updates)}
            onDelete={() => handleDeleteNode(selectedNode.id)}
          />
        </div>
      )}
    </div>
  );
}

export default RecipeEditor;
