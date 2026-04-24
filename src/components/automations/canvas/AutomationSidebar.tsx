import { useState, useEffect } from 'react';
import { useReactFlow } from 'reactflow';
import { TerminalSquare, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TriggerConfig } from './sidebar/TriggerConfig';
import { ConditionConfig, type ConditionRule } from './sidebar/ConditionConfig';

interface SidebarProps {
  selectedNodeId: string | null;
  onDeleteNode?: () => void;
}

export function AutomationSidebar({ selectedNodeId, onDeleteNode }: SidebarProps) {
  const { getNode, setNodes } = useReactFlow();
  const [nodeName, setNodeName] = useState('');
  const [nodeConfigType, setNodeConfigType] = useState('');
  const [keywords, setKeywords] = useState('');
  const [conditions, setConditions] = useState<ConditionRule[]>([]);
  const [conditionOperator, setConditionOperator] = useState<'and' | 'or'>('and');

  const selectedNode = selectedNodeId ? getNode(selectedNodeId) : null;

  useEffect(() => {
    if (selectedNode) {
      setNodeName(selectedNode.data.label || '');
      setNodeConfigType(selectedNode.data.configType || '');
      setKeywords(selectedNode.data.keywords || '');
      setConditions(selectedNode.data.conditions || []);
      setConditionOperator(selectedNode.data.conditionOperator || 'and');
    }
  }, [selectedNodeId, selectedNode]);

  if (!selectedNodeId || !selectedNode) {
    return (
      <div className="w-[320px] bg-card border-l border-border shadow-xl p-5 flex flex-col z-10 shrink-0">
        <h3 className="text-lg font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2 text-foreground">
          <TerminalSquare className="w-5 h-5 text-muted-foreground" /> Propriedades
        </h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Selecione um módulo no canvas para editar suas configurações e parâmetros.
        </p>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm border-2 border-dashed border-border rounded-lg bg-secondary/50 p-6 text-center">
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

  const renderTypeOptions = () => {
    switch (selectedNode.type) {
      case 'trigger':
        return (
          <TriggerConfig
            configType={nodeConfigType}
            keywords={keywords}
            onConfigTypeChange={(v) => { setNodeConfigType(v); handleUpdate({ configType: v }); }}
            onKeywordsChange={(v) => { setKeywords(v); handleUpdate({ keywords: v }); }}
          />
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
            {nodeConfigType === 'add_tag' && (
              <div className="mt-4 space-y-2">
                <Label className="text-xs">Nome ou ID da Tag</Label>
                <Input 
                  className="h-8 text-sm" 
                  placeholder="Ex: cliente-vip" 
                  value={selectedNode.data.tag || ''}
                  onChange={(e) => handleUpdate({ tag: e.target.value })}
                />
              </div>
            )}
            {nodeConfigType === 'change_status' && (
              <div className="mt-4 space-y-2">
                <Label className="text-xs">ID do Pipeline/Etapa</Label>
                <Input 
                  className="h-8 text-sm" 
                  placeholder="ID da etapa..." 
                  value={selectedNode.data.status || ''}
                  onChange={(e) => handleUpdate({ status: e.target.value })}
                />
              </div>
            )}
          </>
        );
      case 'condition':
        return (
          <ConditionConfig
            conditions={conditions}
            conditionOperator={conditionOperator}
            onConditionsChange={(c) => { setConditions(c); handleUpdate({ conditions: c }); }}
            onOperatorChange={(op) => { setConditionOperator(op); handleUpdate({ conditionOperator: op }); }}
          />
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
                 <div className="mt-4 space-y-2 border-t border-border pt-4">
                    <Label className="text-xs">Texto da Mensagem</Label>
                    <Textarea 
                       value={selectedNode.data.text || ''}
                       onChange={(e) => handleUpdate({ text: e.target.value })}
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
                  value={selectedNode.data.method || 'post'} 
                  onValueChange={(v) => handleUpdate({ method: v })}
                >
                  <SelectTrigger><SelectValue placeholder="GET / POST" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="post">POST (Enviar Dados)</SelectItem>
                    <SelectItem value="get">GET (Buscar Dados)</SelectItem>
                    <SelectItem value="put">PUT</SelectItem>
                    <SelectItem value="patch">PATCH</SelectItem>
                  </SelectContent>
              </Select>
              <div className="mt-4 space-y-2">
                 <Label className="text-xs">URL Específica (Endpoint)</Label>
                 <Input 
                   className="text-xs font-mono" 
                   placeholder="https://hook.integromat.com/..." 
                   value={selectedNode.data.url || ''}
                   onChange={(e) => handleUpdate({ url: e.target.value })}
                 />
              </div>
           </>
         );
      case 'randomizer':
         const pA = selectedNode.data.percentageA || 50;
         const pB = 100 - pA;
         return (
           <>
             <Label>Distribuição de Tráfego (%)</Label>
             <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-secondary px-2 py-1 rounded w-20 text-center font-medium text-foreground">Lado A</span>
                  <Input 
                    type="number" 
                    value={pA} 
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 0 && val <= 100) {
                        handleUpdate({ percentageA: val });
                      }
                    }}
                    className="w-16 h-8 text-center text-xs" 
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-secondary px-2 py-1 rounded w-20 text-center font-medium text-foreground">Lado B</span>
                  <Input type="number" value={pB} disabled className="w-16 h-8 text-center text-xs bg-muted" />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
             </div>
           </>
         );
      case 'ai_assistant':
         return (
           <>
              <Label>Prompt da Inteligência Artificial</Label>
              <div className="mt-2 space-y-2">
                 <Textarea 
                   value={selectedNode.data.prompt || ''}
                   onChange={(e) => handleUpdate({ prompt: e.target.value })}
                   placeholder="Analise o perfil e sugira uma abordagem..." 
                   className="h-32 resize-none text-xs"
                 />
                 <p className="text-[10px] text-muted-foreground">Você pode usar variáveis como {'{{lead.custom.slug}}'}</p>
              </div>
              <div className="mt-4 space-y-2 border-t border-border pt-4">
                 <Label className="text-xs">Salvar resposta no campo (slug)</Label>
                 <Input 
                   value={selectedNode.data.outputField || ''}
                   onChange={(e) => handleUpdate({ outputField: e.target.value })}
                   placeholder="Ex: resumo_ia" 
                   className="h-8 text-xs font-mono"
                 />
                 <p className="text-[10px] text-muted-foreground">O resultado da IA será salvo neste custom field.</p>
              </div>
           </>
         );
      default:
        return null;
    }
  };

  const injectVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    toast.success(`Variável ${variable} copiada! Cole (Ctrl+V) onde desejar.`);
  };

  return (
    <div className="w-[320px] bg-card border-l border-border shadow-xl flex flex-col z-10 shrink-0 h-full">
      <div className="p-5 overflow-y-auto flex-1">
        <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <TerminalSquare className="w-4 h-4 text-primary" /> Configurar Módulo
          </h3>
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
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

          <div className="space-y-2 pt-2 border-t border-border mt-4">
            {renderTypeOptions()}
          </div>

          {['action', 'message', 'webhook', 'ai_assistant'].includes(selectedNode.type as string) && (
            <div className="space-y-2 pt-4 mt-4 border-t border-border">
              <Label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Variáveis Dinâmicas</Label>
              <div className="flex gap-2 flex-wrap">
                <span 
                  onClick={() => injectVariable('{{lead.name}}')}
                  className="text-[10px] bg-primary/10 border-primary/20 border text-primary rounded px-1.5 py-0.5 cursor-pointer hover:bg-primary/20 transition-colors"
                >
                  {'{'}{'{'}lead.name{'}'}{'}'}
                </span>
                <span 
                  onClick={() => injectVariable('{{lead.phone}}')}
                  className="text-[10px] bg-primary/10 border-primary/20 border text-primary rounded px-1.5 py-0.5 cursor-pointer hover:bg-primary/20 transition-colors"
                >
                  {'{'}{'{'}lead.phone{'}'}{'}'}
                </span>
                <span 
                  onClick={() => injectVariable('{{lead.custom.slug}}')}
                  className="text-[10px] bg-primary/10 border-primary/20 border text-primary rounded px-1.5 py-0.5 cursor-pointer hover:bg-primary/20 transition-colors"
                >
                  {'{'}{'{'}lead.custom.slug{'}'}{'}'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="p-4 border-t border-border bg-secondary shrink-0">
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
