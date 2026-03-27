import { useCallback, useState, useRef, DragEvent } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Panel,
  MarkerType,
  MiniMap,
  useReactFlow,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

import { TriggerNode } from './nodes/TriggerNode';
import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { MessageNode } from './nodes/MessageNode';
import { DelayNode } from './nodes/DelayNode';
import { RandomizerNode } from './nodes/RandomizerNode';
import { WebhookNode } from './nodes/WebhookNode';

import { AutomationSidebar } from './AutomationSidebar';
import { NodesPalette } from './NodesPalette';
import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// Mapeamento Extendido
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  message: MessageNode,
  delay: DelayNode,
  randomizer: RandomizerNode,
  webhook: WebhookNode,
};

// Limpo para o Drag & Drop Test
const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 250, y: 150 },
    data: { label: 'Início do Fluxo', type: 'new_lead' },
  }
];

const initialEdges: Edge[] = [];

// Instância do Dagre para Auto-layout
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 260, height: 140 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 130,
        y: nodeWithPosition.y - 70,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

function CanvasFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNode, getNodes, deleteElements } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      if (params.source === params.target) return;
      setEdges((eds) => addEdge({
        ...params, 
        markerEnd: { type: MarkerType.ArrowClosed },
      }, eds));
    },
    [setEdges]
  );

  const organizeLayout = useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'LR'
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    toast.success("Fluxo organizado automaticamente!");
  }, [nodes, edges, setNodes, setEdges]);

  const onSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    if (params.nodes.length > 0) {
      setSelectedNodeId(params.nodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  }, []);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const label = event.dataTransfer.getData('application/reactflow-label');

      // Verifica se o tipo lançado é válido
      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNode: Node = {
        id: crypto.randomUUID(),
        type,
        position,
        data: { label: label || 'Novo Módulo' },
      };

      setNodes((nds) => nds.concat(newNode));
      toast.info(`Módulo '${label}' adicionado. Conecte-o!`);
    },
    [screenToFlowPosition, setNodes]
  );
  
  const handleKeyboardDelete = useCallback((nodeId: string) => {
      const nodeToRemove = getNode(nodeId);
      if(nodeToRemove) {
          deleteElements({ nodes: [nodeToRemove] });
          setSelectedNodeId(null);
          toast.success("Módulo excluído.");
      }
  }, [getNode, deleteElements]);

  return (
    <div className="flex w-full h-full bg-slate-100" ref={reactFlowWrapper}>
      <NodesPalette />
      
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[20, 20]}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 }
          }}
        >
          <Background color="#cbd5e1" gap={20} size={1.5} />
          <Controls />
          <MiniMap style={{ borderRadius: 8, overflow: 'hidden' }} zoomable pannable />
          
          <Panel position="top-center" className="flex gap-2 bg-white/50 p-1.5 rounded-full backdrop-blur-md shadow-sm border border-white/60">
            <Button onClick={organizeLayout} variant="secondary" size="sm" className="gap-2 shadow-sm font-medium rounded-full px-4 text-xs h-8">
              <LayoutGrid className="w-3.5 h-3.5" />
              Auto-Mágica
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      <AutomationSidebar 
         selectedNodeId={selectedNodeId} 
         onDeleteNode={() => selectedNodeId && handleKeyboardDelete(selectedNodeId)}
      />
    </div>
  );
}

export function AutomationCanvas() {
  return (
    <div className="w-full h-full overflow-hidden flex relative">
      <ReactFlowProvider>
        <CanvasFlow />
      </ReactFlowProvider>
    </div>
  );
}

export default AutomationCanvas;
