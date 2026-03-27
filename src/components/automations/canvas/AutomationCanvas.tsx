import { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  NodeTypes,
  Panel,
  MarkerType,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

import { TriggerNode } from './nodes/TriggerNode';
import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { AutomationSidebar } from './AutomationSidebar';
import { Save, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Definição dos tipos de nós customizados
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
};

// Nós iniciais de exemplo
const initialNodes = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 50, y: 150 },
    data: { label: 'Novo Lead no Funil', type: 'new_lead' },
  },
  {
    id: '2',
    type: 'condition',
    position: { x: 400, y: 120 },
    data: { label: 'Possui Celular Válido?', type: 'check_phone' },
  },
  {
    id: '3',
    type: 'action',
    position: { x: 750, y: 50 },
    data: { label: 'Enviar WhatsApp (Boas Vindas)', type: 'send_whatsapp' },
  },
  {
    id: '4',
    type: 'action',
    position: { x: 750, y: 250 },
    data: { label: 'Enviar Email (Fallback)', type: 'send_email' },
  },
];

const initialEdges = [
  { 
    id: 'e1-2', 
    source: '1', 
    target: '2',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  { 
    id: 'e2-3', 
    source: '2', 
    target: '3', 
    sourceHandle: 'true',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  { 
    id: 'e2-4', 
    source: '2', 
    target: '4', 
    sourceHandle: 'false',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
];

// Instância do Dagre para Auto-layout
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const getLayoutedElements = (nodes: any[], edges: any[], direction = 'LR') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    // Definimos tamanho padrão aproximado dos cards criados
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
        x: nodeWithPosition.x - 130, // x - width / 2
        y: nodeWithPosition.y - 70,  // y - height / 2
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// Componente Wrapper para injetar hooks do ReactFlow no escopo correto
function CanvasFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      // Evitar loops em si mesmo
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
      'LR' // Da esquerda para a direita (Left->Right)
    );
    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
  }, [nodes, edges, setNodes, setEdges]);

  const onSelectionChange = useCallback((params: any) => {
    if (params.nodes.length > 0) {
      setSelectedNodeId(params.nodes[0].id);
    } else {
      setSelectedNodeId(null);
    }
  }, []);

  const exportJSON = () => {
    const schema = {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
      }))
    };
    console.log("JSON Schema Exportado:", JSON.stringify(schema, null, 2));
    alert("Fluxo exportado e impresso no Console!");
  };

  return (
    <div className="flex w-full h-full">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[20, 20]} // Mantém alinhamento no drag manual
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
            style: { strokeWidth: 2 }
          }}
        >
          <Background color="#cbd5e1" gap={20} size={1.5} />
          <Controls />
          
          <Panel position="top-right" className="flex gap-2">
            <Button onClick={organizeLayout} variant="secondary" size="sm" className="gap-2 shadow-sm font-medium">
              <LayoutGrid className="w-4 h-4" />
              Auto-Layout
            </Button>
            <Button onClick={exportJSON} size="sm" className="gap-2 shadow-sm bg-indigo-600 hover:bg-indigo-700 font-medium">
              <Save className="w-4 h-4" />
              Salvar Fluxo
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      <AutomationSidebar selectedNodeId={selectedNodeId} />
    </div>
  );
}

export function AutomationCanvas() {
  return (
    <div className="w-full h-[800px] border border-slate-200 rounded-lg overflow-hidden bg-slate-50 relative flex shadow-sm">
      <ReactFlowProvider>
        <CanvasFlow />
      </ReactFlowProvider>
    </div>
  );
}

export default AutomationCanvas;
