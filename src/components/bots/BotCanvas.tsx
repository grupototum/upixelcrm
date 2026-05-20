import { useCallback, useRef, useState, DragEvent } from 'react';
import ReactFlow, {
  Background, Controls, MiniMap, Panel,
  addEdge, useNodesState, useEdgesState,
  Connection, Edge, Node, NodeTypes, MarkerType,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { LayoutGrid, Trash2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

import { BotStartNode } from './nodes/BotStartNode';
import { BotMessageNode } from './nodes/BotMessageNode';
import { BotQuestionNode } from './nodes/BotQuestionNode';
import { BotConditionNode } from './nodes/BotConditionNode';
import { BotActionNode } from './nodes/BotActionNode';

const nodeTypes: NodeTypes = {
  bot_start:     BotStartNode,
  bot_message:   BotMessageNode,
  bot_question:  BotQuestionNode,
  bot_condition: BotConditionNode,
  bot_action:    BotActionNode,
};

const defaultStartNode: Node = {
  id: '1',
  type: 'bot_start',
  position: { x: 80, y: 200 },
  data: { trigger: 'manual', label: 'Início' },
};

// ─── Palette ───────────────────────────────────────────────────
const PALETTE_ITEMS = [
  { type: 'bot_message',   label: 'Mensagem',  color: '#201515', desc: 'Envia texto ao lead' },
  { type: 'bot_question',  label: 'Pergunta',  color: '#3b82f6', desc: 'Envia e aguarda resposta' },
  { type: 'bot_condition', label: 'Condição',  color: '#f59e0b', desc: 'Ramifica o fluxo' },
  { type: 'bot_action',    label: 'Ação',      color: '#10b981', desc: 'Tag, estágio, agente' },
];

function Palette() {
  const onDragStart = (e: DragEvent, type: string, label: string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.setData('application/reactflow-label', label);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-52 shrink-0 bg-card border-r border-[hsl(var(--border-strong))] flex flex-col z-10">
      <div className="px-4 py-3 border-b border-[hsl(var(--border-strong))]">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Blocos</p>
      </div>
      <div className="p-3 space-y-2 overflow-y-auto flex-1">
        {PALETTE_ITEMS.map((item) => (
          <div
            key={item.type}
            draggable
            onDragStart={(e) => onDragStart(e, item.type, item.label)}
            className="flex items-center gap-3 p-2.5 rounded-lg border border-[hsl(var(--border-strong))] bg-background cursor-grab active:cursor-grabbing hover:border-[#ff4f00]/40 hover:bg-secondary transition-all"
          >
            <div className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 text-white text-xs font-bold"
              style={{ backgroundColor: item.color }}>
              {item.label[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
            </div>
          </div>
        ))}
        <div className="pt-2 border-t border-[hsl(var(--border-strong))]">
          <p className="text-[9px] text-muted-foreground text-center">Arraste para o canvas</p>
        </div>
      </div>
    </div>
  );
}

// ─── Config Panel ──────────────────────────────────────────────
function ConfigPanel({ nodeId, onDelete }: { nodeId: string | null; onDelete: () => void }) {
  const { getNode, setNodes } = useReactFlow();
  const node = nodeId ? getNode(nodeId) : null;

  const update = (patch: Record<string, unknown>) =>
    setNodes((ns) => ns.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n));

  if (!node) {
    return (
      <div className="w-64 shrink-0 bg-card border-l border-[hsl(var(--border-strong))] flex flex-col items-center justify-center p-6 text-center z-10">
        <Settings2 className="h-8 w-8 text-muted-foreground/30 mb-3" />
        <p className="text-xs text-muted-foreground">Selecione um bloco para configurar</p>
      </div>
    );
  }

  const d = node.data as Record<string, unknown>;
  const type = node.type;

  return (
    <div className="w-64 shrink-0 bg-card border-l border-[hsl(var(--border-strong))] flex flex-col z-10 overflow-y-auto">
      <div className="px-4 py-3 border-b border-[hsl(var(--border-strong))] flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">Configurar bloco</p>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="p-4 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Rótulo</Label>
          <Input className="h-8 text-xs" value={(d.label as string) ?? ''}
            onChange={(e) => update({ label: e.target.value })} placeholder="Nome do bloco" />
        </div>

        {type === 'bot_start' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Gatilho</Label>
              <Select value={(d.trigger as string) ?? 'manual'}
                onValueChange={(v) => update({ trigger: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                  <SelectItem value="keyword" className="text-xs">Palavra-chave</SelectItem>
                  <SelectItem value="new_lead" className="text-xs">Novo Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {d.trigger === 'keyword' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">Palavra-chave</Label>
                <Input className="h-8 text-xs" value={(d.keyword as string) ?? ''}
                  onChange={(e) => update({ keyword: e.target.value })} placeholder="Ex: oi, olá, menu" />
              </div>
            )}
          </>
        )}

        {type === 'bot_message' && (
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase text-muted-foreground">Mensagem</Label>
            <Textarea className="text-xs resize-none min-h-[100px]" value={(d.text as string) ?? ''}
              onChange={(e) => update({ text: e.target.value })}
              placeholder={`Olá {{lead.name}}, tudo bem?`} />
            <p className="text-[9px] text-muted-foreground">Use {`{{lead.name}}`}, {`{{lead.phone}}`}</p>
          </div>
        )}

        {type === 'bot_question' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Pergunta</Label>
              <Textarea className="text-xs resize-none min-h-[80px]" value={(d.text as string) ?? ''}
                onChange={(e) => update({ text: e.target.value })}
                placeholder="Qual o seu interesse?" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Salvar resposta em</Label>
              <Input className="h-8 text-xs font-mono" value={(d.variable as string) ?? ''}
                onChange={(e) => update({ variable: e.target.value })} placeholder="interesse" />
              <p className="text-[9px] text-muted-foreground">Use {`{{interesse}}`} nos blocos seguintes</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Timeout (horas)</Label>
              <Input className="h-8 text-xs" type="number" min={0} value={(d.timeout as string) ?? '24'}
                onChange={(e) => update({ timeout: e.target.value })} placeholder="24" />
            </div>
          </>
        )}

        {type === 'bot_condition' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Variável</Label>
              <Input className="h-8 text-xs font-mono" value={(d.variable as string) ?? ''}
                onChange={(e) => update({ variable: e.target.value })} placeholder="interesse" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Operador</Label>
              <Select value={(d.operator as string) ?? 'equals'}
                onValueChange={(v) => update({ operator: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals" className="text-xs">igual a</SelectItem>
                  <SelectItem value="contains" className="text-xs">contém</SelectItem>
                  <SelectItem value="starts_with" className="text-xs">começa com</SelectItem>
                  <SelectItem value="not_equals" className="text-xs">diferente de</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Valor</Label>
              <Input className="h-8 text-xs" value={(d.value as string) ?? ''}
                onChange={(e) => update({ value: e.target.value })} placeholder="sim" />
            </div>
          </>
        )}

        {type === 'bot_action' && (
          <>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground">Ação</Label>
              <Select value={(d.action as string) ?? 'end'}
                onValueChange={(v) => update({ action: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tag" className="text-xs">Adicionar Tag</SelectItem>
                  <SelectItem value="move_stage" className="text-xs">Mover no Funil</SelectItem>
                  <SelectItem value="assign_agent" className="text-xs">Atribuir Agente</SelectItem>
                  <SelectItem value="end" className="text-xs">Encerrar Bot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {d.action && d.action !== 'end' && (
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                  {d.action === 'tag' ? 'Nome da tag' : d.action === 'move_stage' ? 'ID da etapa' : 'ID do agente'}
                </Label>
                <Input className="h-8 text-xs" value={(d.value as string) ?? ''}
                  onChange={(e) => update({ value: e.target.value })}
                  placeholder={d.action === 'tag' ? 'qualificado' : 'id-da-etapa'} />
              </div>
            )}
          </>
        )}

        {/* Variáveis rápidas */}
        {(type === 'bot_message' || type === 'bot_question') && (
          <div className="pt-2 border-t border-[hsl(var(--border-strong))]">
            <p className="text-[9px] font-bold uppercase text-muted-foreground mb-2">Variáveis</p>
            <div className="flex flex-wrap gap-1">
              {['{{lead.name}}', '{{lead.phone}}', '{{lead.email}}'].map((v) => (
                <button key={v} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-dashed border-[hsl(var(--border-strong))] hover:border-[#ff4f00] hover:text-[#ff4f00] transition-colors"
                  onClick={() => {
                    const field = type === 'bot_message' ? 'text' : 'text';
                    update({ [field]: ((d[field] as string) ?? '') + v });
                  }}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Canvas ───────────────────────────────────────────────
interface BotCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
}

export function BotCanvas({ initialNodes, initialEdges, onNodesChange, onEdgesChange }: BotCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(
    initialNodes?.length ? initialNodes : [defaultStartNode]
  );
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges ?? []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, deleteElements, getNode } = useReactFlow();

  const handleNodesChange: typeof onNodesChangeInternal = useCallback((changes) => {
    onNodesChangeInternal(changes);
  }, [onNodesChangeInternal]);

  const handleEdgesChange: typeof onEdgesChangeInternal = useCallback((changes) => {
    onEdgesChangeInternal(changes);
  }, [onEdgesChangeInternal]);

  // Propagate changes upward for saving
  const getUpdatedNodes = useCallback(() => nodes, [nodes]);
  const getUpdatedEdges = useCallback(() => edges, [edges]);
  // Expose via ref hack not needed — parent reads via useReactFlow
  void getUpdatedNodes; void getUpdatedEdges;

  const onConnect = useCallback((params: Connection | Edge) => {
    if (params.source === params.target) return;
    setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed }, animated: true, style: { strokeWidth: 2 } }, eds));
  }, [setEdges]);

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/reactflow');
    const label = e.dataTransfer.getData('application/reactflow-label');
    if (!type) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newNode: Node = {
      id: crypto.randomUUID(),
      type,
      position,
      data: { label: label || type },
    };
    setNodes((ns) => [...ns, newNode]);
    toast.info(`Bloco "${label}" adicionado`);
  }, [screenToFlowPosition, setNodes]);

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedNodeId) return;
    const n = getNode(selectedNodeId);
    if (!n) return;
    deleteElements({ nodes: [n] });
    setSelectedNodeId(null);
    toast.success('Bloco removido');
  }, [selectedNodeId, getNode, deleteElements]);

  return (
    <div className="flex w-full h-full" ref={wrapperRef}>
      <Palette />
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onSelectionChange={(p) => setSelectedNodeId(p.nodes[0]?.id ?? null)}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { strokeWidth: 2 } }}
        >
          <Background color="hsl(var(--muted-foreground) / 0.2)" gap={16} size={1} />
          <Controls />
          <MiniMap style={{ borderRadius: 8, overflow: 'hidden' }} zoomable pannable />
          <Panel position="top-center" className="flex gap-2 bg-card p-1.5 rounded-full border border-[hsl(var(--border-strong))]">
            <Button variant="secondary" size="sm" className="gap-2 rounded-full px-4 text-xs h-8"
              onClick={() => { onNodesChange?.(nodes); onEdgesChange?.(edges); }}>
              <LayoutGrid className="w-3.5 h-3.5" />
              Auto-organizar
            </Button>
          </Panel>
        </ReactFlow>
      </div>
      <ConfigPanel nodeId={selectedNodeId} onDelete={handleDelete} />
    </div>
  );
}
