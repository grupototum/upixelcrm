import { useState, useEffect } from 'react';
import { useReactFlow } from 'reactflow';
import { TerminalSquare, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface SidebarProps {
  selectedNodeId: string | null;
  onDeleteNode?: () => void;
}

export function AutomationSidebar({ selectedNodeId, onDeleteNode }: SidebarProps) {
  const { getNode, setNodes } = useReactFlow();
  const [nodeName, setNodeName] = useState('');
  const [nodeConfigType, setNodeConfigType] = useState('');

  const selectedNode = selectedNodeId ? getNode(selectedNodeId) : null;

  useEffect(() => {
    if (selectedNode) {
      setNodeName(selectedNode.data.label || '');
      setNodeConfigType(selectedNode.data.configType || '');
    }
  }, [selectedNodeId, selectedNode]);

  if (!selectedNodeId || !selectedNode) {
    return (
      <div className="w-[320px] bg-white border-l shadow-xl p-5 flex flex-col z-10 shrink-0">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
          <TerminalSquare className="w-5 h-5 text-slate-500" /> Propriedades
        </h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Selecione um módulo no canvas para editar suas configurações e parâmetros.
        </p>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50 p-6 text-center">
          Nenhum módulo selecionado
        </div>
      </div>
    );
  }

  const handleUpdate = (updates: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          node.data = { ...node.data, ...updates };
        }
        return node;
      })
    );
  };

  const TypeOptions = () => {
    switch (selectedNode.type) {
      case 'trigger':
        return (
          <>
            <Label>Tipo de Gatilho (Trigger)</Label>
            <Select 
               value={nodeConfigType} 
               onValueChange={(v) => { setNodeConfigType(v); handleUpdate({ configType: v }); }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new_lead">Novo Lead Cadastrado</SelectItem>
                <SelectItem value="status_change">Mudança de Etapa de Funil</SelectItem>
                <SelectItem value="tag_added">Tag Adicionada ao Cliente</SelectItem>
              </SelectContent>
            </Select>
          </>
        );
      case 'action':
        return (
          <>
            <Label>Ação no CRM</Label>
            <Select 
               value={nodeConfigType} 
               onValueChange={(v) => { setNodeConfigType(v); handleUpdate({ configType: v }); }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add_tag">Adicionar Tag Específica</SelectItem>
                <SelectItem value="change_status">Mudar Estágio de Pipeline</SelectItem>
                <SelectItem value="assign_user">Transferir para outro Atendente</SelectItem>
                <SelectItem value="leave_note">Adicionar Nota (Histórico)</SelectItem>
              </SelectContent>
            </Select>
          </>
        );
      case 'condition':
        return (
          <>
            <Label>Verificação Binária (Sim/Não)</Label>
            <Select 
               value={nodeConfigType} 
               onValueChange={(v) => { setNodeConfigType(v); handleUpdate({ configType: v }); }}
            >
              <SelectTrigger><SelectValue placeholder="Verificar..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="has_phone">Lead possui Celular Cadastrado?</SelectItem>
                <SelectItem value="has_email">Lead possui Email?</SelectItem>
                <SelectItem value="has_tag">Lead possui a Tag X?</SelectItem>
              </SelectContent>
            </Select>
          </>
        );
      case 'delay':
        return (
          <>
             <Label>Tempo de Espera</Label>
             <div className="flex items-center gap-2">
                <Input type="number" min="0" placeholder="1" className="w-16" />
                <Select 
                   value={nodeConfigType} 
                   onValueChange={(v) => { setNodeConfigType(v); handleUpdate({ configType: v }); }}
                >
                  <SelectTrigger><SelectValue placeholder="Unidade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutes">Minutos</SelectItem>
                    <SelectItem value="hours">Horas</SelectItem>
                    <SelectItem value="days">Dias</SelectItem>
                  </SelectContent>
                </Select>
             </div>
             <p className="text-[10px] text-muted-foreground mt-1">
               A execução vai congelar neste passo até o tempo acabar.
             </p>
          </>
        );
      case 'message':
        return (
           <>
              <Label>Canal de Envio</Label>
              <Select 
                  value={nodeConfigType} 
                  onValueChange={(v) => { setNodeConfigType(v); handleUpdate({ configType: v }); }}
                >
                  <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp Base (API)</SelectItem>
                    <SelectItem value="email">Email Dedicado</SelectItem>
                  </SelectContent>
              </Select>
              {nodeConfigType === 'whatsapp' && (
                 <div className="mt-4 space-y-2 border-t pt-4">
                    <Label className="text-xs">Texto da Mensagem</Label>
                    <Textarea 
                       placeholder="Olá {{lead.name}}..." 
                       className="h-24 resize-none"
                    />
                 </div>
              )}
           </>
        );
      case 'webhook':
         return (
           <>
              <Label>Método HTTP</Label>
              <Select 
                  value={nodeConfigType} 
                  onValueChange={(v) => { setNodeConfigType(v); handleUpdate({ configType: v }); }}
                >
                  <SelectTrigger><SelectValue placeholder="GET / POST" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">POST (Enviar Dados)</SelectItem>
                    <SelectItem value="get">GET (Buscar Dados)</SelectItem>
                  </SelectContent>
              </Select>
              <div className="mt-4 space-y-2">
                 <Label className="text-xs">URL Específica (Endpoint)</Label>
                 <Input className="text-xs font-mono" placeholder="https://hook.integromat.com/..." />
              </div>
           </>
         );
      case 'randomizer':
         return (
           <>
             <Label>Distribuição de Tráfego (%)</Label>
             <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded w-20 text-center font-medium">Lado A</span>
                  <Input type="number" defaultValue="50" className="w-16 h-8 text-center text-xs" />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded w-20 text-center font-medium">Lado B</span>
                  <Input type="number" defaultValue="50" className="w-16 h-8 text-center text-xs" />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
             </div>
           </>
         );
      default:
        return null;
    }
  };

  const injectVariable = (variable: string) => {
    const newValue = nodeName + variable;
    setNodeName(newValue);
    handleUpdate({ label: newValue });
  };

  return (
    <div className="w-[320px] bg-white border-l shadow-xl flex flex-col z-10 shrink-0 h-full">
      <div className="p-5 overflow-y-auto flex-1">
        <div className="flex items-center justify-between border-b pb-2 mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-800">
            <TerminalSquare className="w-4 h-4 text-primary" /> Configurar Módulo
          </h3>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            {selectedNode.type}
          </span>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Nome de Exibição (Canvas)</Label>
            <Input 
              value={nodeName} 
              onChange={(e) => {
                setNodeName(e.target.value);
                handleUpdate({ label: e.target.value });
              }}
              placeholder="Digite um rótulo..."
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-2 pt-2 border-t mt-4">
            <TypeOptions />
          </div>

          {['action', 'message', 'webhook'].includes(selectedNode.type as string) && (
            <div className="space-y-2 pt-4 mt-4 border-t">
              <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Variáveis Dinâmicas</Label>
              <div className="flex gap-2 flex-wrap">
                <span 
                  onClick={() => injectVariable(' {{lead.name}}')}
                  className="text-[10px] bg-indigo-50 border-indigo-100 border text-indigo-700 rounded px-1.5 py-0.5 cursor-pointer hover:bg-indigo-100 transition-colors"
                >
                  {'{'}{'{'}lead.name{'}'}{'}'}
                </span>
                <span 
                  onClick={() => injectVariable(' {{lead.phone}}')}
                  className="text-[10px] bg-indigo-50 border-indigo-100 border text-indigo-700 rounded px-1.5 py-0.5 cursor-pointer hover:bg-indigo-100 transition-colors"
                >
                  {'{'}{'{'}lead.phone{'}'}{'}'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Botões Bottom */}
      <div className="p-4 border-t bg-slate-50 shrink-0">
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={onDeleteNode}
          className="w-full gap-2 shadow-sm text-xs"
        >
           <Trash2 className="w-3.5 h-3.5" /> Remover Módulo
        </Button>
      </div>
    </div>
  );
}
