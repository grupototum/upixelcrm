import { useState, useEffect, useRef, useCallback } from 'react';
import { useReactFlow, Node } from 'reactflow';
import { TerminalSquare, Trash2, Sparkles, Zap, MessageSquare, Clock, Globe, GitBranch, Variable } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { TriggerConfig } from './sidebar/TriggerConfig';
import { ConditionConfig, type ConditionRule } from './sidebar/ConditionConfig';
import { toast } from 'sonner';

interface SidebarProps {
  selectedNodeId: string | null;
  onDeleteNode?: () => void;
}

export function AutomationSidebar({ selectedNodeId, onDeleteNode }: SidebarProps) {
  const { getNode, setNodes } = useReactFlow();
  const [localData, setLocalData] = useState<Record<string, any>>({});
  const lastFocusedRef = useRef<{ element: HTMLInputElement | HTMLTextAreaElement | null; start: number; end: number }>({
    element: null,
    start: 0,
    end: 0
  });

  const selectedNode = selectedNodeId ? getNode(selectedNodeId) : null;

  // Sync local data when node selection changes
  useEffect(() => {
    if (selectedNode) {
      setLocalData(selectedNode.data || {});
    } else {
      setLocalData({});
    }
  }, [selectedNodeId]);

  if (!selectedNodeId || !selectedNode) {
    return (
      <div className="w-[320px] bg-card border-l border-border shadow-xl p-5 flex flex-col z-10 shrink-0">
        <h3 className="text-sm font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2 text-foreground">
          <TerminalSquare className="w-4 h-4 text-primary" /> Propriedades
        </h3>
        <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
          Selecione um módulo no canvas para editar suas configurações e parâmetros.
        </p>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs border-2 border-dashed border-border rounded-lg bg-secondary/30 p-6 text-center">
          Nenhum módulo selecionado
        </div>
      </div>
    );
  }

  const handleUpdate = (updates: Record<string, any>) => {
    const newData = { ...localData, ...updates };
    setLocalData(newData);
    
    // Update React Flow state
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return { ...node, data: { ...node.data, ...updates } };
        }
        return node;
      })
    );
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    lastFocusedRef.current = {
      element: e.target,
      start: e.target.selectionStart || 0,
      end: e.target.selectionEnd || 0
    };
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Save selection range on blur so we can insert variables even after focus is lost
    lastFocusedRef.current.start = e.target.selectionStart || 0;
    lastFocusedRef.current.end = e.target.selectionEnd || 0;
  };

  const injectVariable = (variable: string) => {
    const { element, start, end } = lastFocusedRef.current;
    
    if (element) {
      const field = element.name || element.getAttribute('data-field');
      if (!field) return;

      const currentValue = localData[field] || '';
      const newValue = currentValue.substring(0, start) + variable + currentValue.substring(end);
      
      handleUpdate({ [field]: newValue });
      
      // Attempt to restore focus and set cursor position
      setTimeout(() => {
        element.focus();
        const newPos = start + variable.length;
        element.setSelectionRange(newPos, newPos);
        lastFocusedRef.current.start = newPos;
        lastFocusedRef.current.end = newPos;
      }, 0);
      
      toast.success(`Variável inserida!`);
    } else {
      navigator.clipboard.writeText(variable);
      toast.info(`Variável ${variable} copiada! (Foque um campo primeiro)`);
    }
  };

  const renderTypeOptions = () => {
    switch (selectedNode.type) {
      case 'trigger':
        return (
          <TriggerConfig
            configType={localData.configType || ''}
            keywords={localData.keywords || ''}
            onConfigTypeChange={(v) => handleUpdate({ configType: v })}
            onKeywordsChange={(v) => handleUpdate({ keywords: v })}
          />
        );
      case 'action':
        return (
          <div className="space-y-4">
            <Label className="text-xs font-semibold">Ação no CRM</Label>
            <Select 
               value={localData.configType || ''} 
               onValueChange={(v) => handleUpdate({ configType: v })}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add_tag">Adicionar Tag</SelectItem>
                <SelectItem value="change_status">Mudar Estágio de Pipeline</SelectItem>
                <SelectItem value="assign_user">Transferir Atendente</SelectItem>
                <SelectItem value="leave_note">Adicionar Nota</SelectItem>
              </SelectContent>
            </Select>
            {localData.configType === 'add_tag' && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome da Tag</Label>
                <Input 
                  name="tag"
                  className="h-8 text-sm" 
                  placeholder="Ex: cliente-vip" 
                  onFocus={onFocus}
                  onBlur={onBlur}
                  value={localData.tag || ''}
                  onChange={(e) => handleUpdate({ tag: e.target.value })}
                />
              </div>
            )}
            {localData.configType === 'change_status' && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">ID da Etapa</Label>
                <Input 
                  name="status"
                  className="h-8 text-sm" 
                  placeholder="ID da etapa..." 
                  onFocus={onFocus}
                  onBlur={onBlur}
                  value={localData.status || ''}
                  onChange={(e) => handleUpdate({ status: e.target.value })}
                />
              </div>
            )}
            {localData.configType === 'leave_note' && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Conteúdo da Nota</Label>
                <Textarea 
                  name="note"
                  className="text-sm resize-none" 
                  placeholder="Escreva a nota..." 
                  onFocus={onFocus}
                  onBlur={onBlur}
                  value={localData.note || ''}
                  onChange={(e) => handleUpdate({ note: e.target.value })}
                />
              </div>
            )}
          </div>
        );
      case 'condition':
        return (
          <ConditionConfig
            conditions={localData.conditions || []}
            conditionOperator={localData.conditionOperator || 'and'}
            onConditionsChange={(c) => handleUpdate({ conditions: c })}
            onOperatorChange={(op) => handleUpdate({ conditionOperator: op })}
          />
        );
      case 'delay':
        return (
          <div className="space-y-4">
             <Label className="text-xs font-semibold">Configurar Espera</Label>
             <Select 
                value={localData.delayType || 'fixed'} 
                onValueChange={(v) => handleUpdate({ delayType: v })}
             >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="fixed">Tempo Fixo</SelectItem>
                   <SelectItem value="dynamic">Data Dinâmica (Campo)</SelectItem>
                </SelectContent>
             </Select>

             {localData.delayType === 'dynamic' ? (
                <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground">Campo de Data</Label>
                   <Input 
                      name="dynamicDate"
                      placeholder="{{lead.custom.agendamento}}" 
                      onFocus={onFocus}
                      onBlur={onBlur}
                      value={localData.dynamicDate || ''}
                      onChange={(e) => handleUpdate({ dynamicDate: e.target.value })}
                      className="h-8 text-xs font-mono"
                   />
                </div>
             ) : (
                <div className="flex items-center gap-2">
                   <Input 
                     name="amount"
                     type="number" min="1" placeholder="1" className="w-20 h-8" 
                     onFocus={onFocus}
                     onBlur={onBlur}
                     value={localData.amount || ''}
                     onChange={(e) => handleUpdate({ amount: e.target.value })}
                   />
                   <Select 
                     value={localData.unit || 'days'} 
                     onValueChange={(v) => handleUpdate({ unit: v })}
                   >
                     <SelectTrigger className="flex-1 h-8"><SelectValue /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="minutes">Minutos</SelectItem>
                       <SelectItem value="hours">Horas</SelectItem>
                       <SelectItem value="days">Dias</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
             )}
          </div>
        );
      case 'message':
        return (
          <div className="space-y-4">
             <Label className="text-xs font-semibold">Canal de Envio</Label>
             <Select 
                value={localData.configType || 'whatsapp'} 
                onValueChange={(v) => handleUpdate({ configType: v })}
             >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="whatsapp">WhatsApp Base (API)</SelectItem>
                   <SelectItem value="whatsapp_official">WhatsApp Official</SelectItem>
                   <SelectItem value="email">E-mail (SMTP)</SelectItem>
                </SelectContent>
             </Select>
             
             <Label className="text-xs font-semibold">Mensagem</Label>
             <Textarea 
                name="text"
                placeholder="Olá {{lead.name}}, tudo bem?" 
                className="min-h-[120px] text-sm resize-none"
                onFocus={onFocus}
                onBlur={onBlur}
                value={localData.text || ''}
                onChange={(e) => handleUpdate({ text: e.target.value })}
             />
          </div>
        );
      case 'webhook':
        return (
          <div className="space-y-4">
             <Label className="text-xs font-semibold">Endpoint Webhook</Label>
             <Input 
                name="url"
                placeholder="https://api.exemplo.com/hook" 
                onFocus={onFocus}
                onBlur={onBlur}
                value={localData.url || ''}
                onChange={(e) => handleUpdate({ url: e.target.value })}
                className="h-8 text-xs font-mono"
             />
             
             <Label className="text-xs font-semibold">Método HTTP</Label>
             <Select value={localData.method || 'POST'} onValueChange={(v) => handleUpdate({ method: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="GET">GET</SelectItem>
                   <SelectItem value="POST">POST</SelectItem>
                   <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
             </Select>

             <Label className="text-xs font-semibold">Corpo (JSON)</Label>
             <Textarea 
                name="body"
                placeholder='{"name": "{{lead.name}}"}' 
                onFocus={onFocus}
                onBlur={onBlur}
                value={localData.body || ''}
                onChange={(e) => handleUpdate({ body: e.target.value })}
                className="text-xs font-mono min-h-[100px]"
             />
          </div>
        );
      case 'randomizer':
        return (
          <div className="space-y-4">
             <Label className="text-xs font-semibold">Distribuição de Tráfego</Label>
             <div className="flex items-center gap-4">
                <div className="flex-1 text-center">
                   <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Caminho A (%)</div>
                   <Input 
                      name="percentageA"
                      type="number" max="100" min="0" 
                      onFocus={onFocus}
                      onBlur={onBlur}
                      value={localData.percentageA || '50'}
                      onChange={(e) => handleUpdate({ percentageA: e.target.value })}
                      className="h-8 text-center"
                   />
                </div>
                <div className="flex-1 text-center">
                   <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Caminho B (%)</div>
                   <Input 
                      disabled 
                      value={100 - (Number(localData.percentageA) || 50)} 
                      className="h-8 text-center bg-muted"
                   />
                </div>
             </div>
          </div>
        );
      case 'ai_assistant':
        return (
          <div className="space-y-4">
             <Label className="text-xs font-semibold">Prompt da IA</Label>
             <Textarea 
                name="prompt"
                placeholder="Você é um assistente... Use {{lead.name}}" 
                className="min-h-[150px] text-sm resize-none"
                onFocus={onFocus}
                onBlur={onBlur}
                value={localData.prompt || ''}
                onChange={(e) => handleUpdate({ prompt: e.target.value })}
             />
             
             <div className="space-y-2 border-t border-border pt-4">
               <Label className="text-[10px] uppercase font-bold text-muted-foreground">Salvar Resposta Em</Label>
               <Input 
                  name="outputField"
                  placeholder="slug_do_campo (ex: resumo)" 
                  onFocus={onFocus}
                  onBlur={onBlur}
                  value={localData.outputField || ''}
                  onChange={(e) => handleUpdate({ outputField: e.target.value })}
                  className="h-8 text-xs font-mono"
               />
               <p className="text-[9px] text-muted-foreground italic">
                  * A resposta será salva neste campo customizado do lead.
               </p>
             </div>
          </div>
        );
      default:
        return <p className="text-xs text-muted-foreground">Este tipo de módulo não possui configurações extras.</p>;
    }
  };

  return (
    <div className="w-[320px] bg-card border-l border-border shadow-xl flex flex-col z-10 shrink-0 h-full">
      <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
               <TerminalSquare className="w-4 h-4 text-primary" />
            </div>
            <div>
               <h3 className="text-xs font-bold text-foreground leading-none">Módulo</h3>
               <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest leading-none">
                 {selectedNode.type}
               </span>
            </div>
          </div>
          <p className="text-[9px] font-mono text-muted-foreground opacity-50">
            #{selectedNode.id.slice(0, 5)}
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Rótulo no Canvas</Label>
            <Input 
              name="label"
              value={localData.label || ''} 
              onFocus={onFocus}
              onBlur={onBlur}
              onChange={(e) => handleUpdate({ label: e.target.value })}
              placeholder="Digite um nome..."
              className="h-9 text-sm border-muted-foreground/20 focus:border-primary"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            {renderTypeOptions()}
          </div>

          {/* Variable Inserter */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
               <Variable className="w-3 h-3 text-muted-foreground" />
               <Label className="text-[10px] uppercase font-bold text-muted-foreground block">Variáveis Dinâmicas</Label>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Nome', val: '{{lead.name}}' },
                { label: 'Telefone', val: '{{lead.phone}}' },
                { label: 'Email', val: '{{lead.email}}' },
                { label: 'Cidade', val: '{{lead.city}}' },
                { label: 'Empresa', val: '{{lead.company}}' },
                { label: 'Mensagem', val: '{{message}}' }
              ].map(v => (
                <Button 
                  key={v.val}
                  variant="outline" 
                  size="sm" 
                  className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary border-dashed"
                  onClick={() => injectVariable(v.val)}
                >
                  {v.label}
                </Button>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground italic leading-tight mt-2">
              * Clique para inserir no campo focado.
            </p>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-border space-y-3">
          <div className="flex items-center justify-between px-1">
             <span className="text-xs font-medium">Status do Módulo</span>
             <Button 
               variant={localData.status === 'active' ? 'default' : 'secondary'} 
               size="sm" 
               className="h-7 text-[10px] rounded-full"
               onClick={() => {
                 const newStatus = localData.status === 'active' ? 'disabled' : 'active';
                 handleUpdate({ status: newStatus });
               }}
             >
               {localData.status === 'active' ? 'Ligado' : 'Desligado'}
             </Button>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-9 text-xs font-semibold gap-2 transition-colors rounded-lg"
            onClick={onDeleteNode}
          >
            <Trash2 className="w-3.5 h-3.5" /> Excluir Módulo
          </Button>
        </div>
      </div>
    </div>
  );
}
