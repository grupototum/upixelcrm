import { useCallback, useState, useRef, DragEvent, useEffect } from 'react';
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
import { AIAssistantNode } from './nodes/AIAssistantNode';
import { WaitForReplyNode } from './nodes/WaitForReplyNode';
import { SendMediaNode } from './nodes/SendMediaNode';

import { AutomationSidebar } from './AutomationSidebar';
import { NodesPalette } from './NodesPalette';
import { LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAppState } from '@/contexts/AppContext';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  message: MessageNode,
  delay: DelayNode,
  randomizer: RandomizerNode,
  webhook: WebhookNode,
  ai_assistant: AIAssistantNode,
  wait_for_reply: WaitForReplyNode,
  send_media: SendMediaNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 250, y: 150 },
    data: { label: 'Início do Fluxo', type: 'new_lead' },
  }
];

const initialEdges: Edge[] = [];

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'LR') => {
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

export function AutomationCanvas({ automationId }: { automationId: string }) {
  const { complexAutomations } = useAppState();
  const auto = complexAutomations.find((a) => a.id === automationId);

  const [nodes, setNodes, onNodesChange] = useNodesState(auto?.nodes?.length ? auto.nodes : initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(auto?.edges?.length ? auto.edges : initialEdges);
  
  useEffect(() => {
    if (auto) {
      setNodes(auto.nodes.length ? auto.nodes : initialNodes);
      setEdges(auto.edges.length ? auto.edges : initialEdges);
    }
  }, [auto, setNodes, setEdges]); // Sync state if auto changes
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNode, deleteElements } = useReactFlow();

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
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, 'LR');
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
      if (typeof type === 'undefined' || !type) return;

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
    if (nodeToRemove) {
      deleteElements({ nodes: [nodeToRemove] });
      setSelectedNodeId(null);
      toast.success("Módulo excluído.");
    }
  }, [getNode, deleteElements]);

  return (
    <div className="flex w-full h-full bg-secondary" ref={reactFlowWrapper}>
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
          <Background color="hsl(var(--muted-foreground) / 0.3)" gap={20} size={1.5} />
          <Controls />
          <MiniMap style={{ borderRadius: 8, overflow: 'hidden' }} zoomable pannable />
          
          <Panel position="top-center" className="flex gap-2 bg-card/50 p-1.5 rounded-full backdrop-blur-md shadow-sm border border-border">
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

export default AutomationCanvas;
