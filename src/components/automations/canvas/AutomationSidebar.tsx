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
  const [lastFocusedElement, setLastFocusedElement] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (selectedNode) {
      setNodeName(selectedNode.data.label || '');
      setNodeConfigType(selectedNode.data.configType || '');
      setKeywords(selectedNode.data.keywords || '');
      setConditions(selectedNode.data.conditions || []);
      setConditionOperator(selectedNode.data.conditionOperator || 'and');
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

  const handleUpdate = (updates: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return { ...node, data: { ...node.data, ...updates } };
        }
        return node;
      })
    );
  };

  const injectVariable = (variable: string) => {
    if (lastFocusedElement) {
      const start = lastFocusedElement.selectionStart || 0;
      const end = lastFocusedElement.selectionEnd || 0;
      const value = lastFocusedElement.value;
      const newValue = value.substring(0, start) + variable + value.substring(end);
      
      lastFocusedElement.value = newValue;
      lastFocusedElement.dispatchEvent(new Event('input', { bubbles: true }));
      lastFocusedElement.focus();
      
      // Update state manually since we bypassed React's onChange slightly
      if (lastFocusedElement.name === 'nodeName') {
        setNodeName(newValue);
        handleUpdate({ label: newValue });
      } else {
        // For other fields, we need to know which field it is.
        // We can use the data-field attribute.
        const field = lastFocusedElement.getAttribute('data-field');
        if (field) handleUpdate({ [field]: newValue });
      }
      
      toast.success(`Variável inserida!`);
    } else {
      navigator.clipboard.writeText(variable);
      toast.info(`Variável ${variable} copiada! (Nenhum campo focado)`);
    }
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLastFocusedElement(e.target);
   const renderTypeOptions = () => {
    switch (selectedNode.type) {
      case 'trigger':
        return (
          <TriggerConfig
            configType={nodeConfigType}
            keywords={keywords}
            onFocus={onFocus}
            onConfigTypeChange={(v) => { setNodeConfigType(v); handleUpdate({ configType: v }); }}
            onKeywordsChange={(v) => { setKeywords(v); handleUpdate({ keywords: v }); }}
          />
        );
      case 'action':
        return (
          <div className="space-y-4">
            <Label className="text-xs font-semibold">Ação no CRM</Label>
            <Select 
               value={nodeConfigType} 
               onValueChange={(v) => { setNodeConfigType(v); handleUpdate({ configType: v }); }}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add_tag">Adicionar Tag</SelectItem>
                <SelectItem value="change_status">Mudar Estágio de Pipeline</SelectItem>
                <SelectItem value="assign_user">Transferir Atendente</SelectItem>
                <SelectItem value="leave_note">Adicionar Nota</SelectItem>
              </SelectContent>
            </Select>
            {nodeConfigType === 'add_tag' && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nome da Tag</Label>
                <Input 
                  className="h-8 text-sm" 
                  placeholder="Ex: cliente-vip" 
                  data-field="tag"
                  onFocus={onFocus}
                  value={selectedNode.data.tag || ''}
                  onChange={(e) => handleUpdate({ tag: e.target.value })}
                />
              </div>
            )}
            {nodeConfigType === 'change_status' && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">ID da Etapa</Label>
                <Input 
                  className="h-8 text-sm" 
                  placeholder="ID da etapa..." 
                  data-field="status"
                  onFocus={onFocus}
                  value={selectedNode.data.status || ''}
                  onChange={(e) => handleUpdate({ status: e.target.value })}
                />
              </div>
            )}
            {nodeConfigType === 'assign_user' && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">ID do Usuário</Label>
                <Input 
                  className="h-8 text-sm" 
                  placeholder="ID do atendente..." 
                  data-field="userId"
                  onFocus={onFocus}
                  value={selectedNode.data.userId || ''}
                  onChange={(e) => handleUpdate({ userId: e.target.value })}
                />
              </div>
            )}
            {nodeConfigType === 'leave_note' && (
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Conteúdo da Nota</Label>
                <Textarea 
                  className="text-sm resize-none" 
                  placeholder="Escreva a nota..." 
                  data-field="note"
                  onFocus={onFocus}
                  value={selectedNode.data.note || ''}
                  onChange={(e) => handleUpdate({ note: e.target.value })}
                />
              </div>
            )}
          </div>
        );
      case 'condition':
        return (
          <ConditionConfig
            conditions={conditions}
            conditionOperator={conditionOperator}
            onFocus={onFocus}
            onConditionsChange={(c) => { setConditions(c); handleUpdate({ conditions: c }); }}
            onOperatorChange={(op) => { setConditionOperator(op); handleUpdate({ conditionOperator: op }); }}
          />
        );
      case 'delay':
        return (
          <div className="space-y-4">
             <Label className="text-xs font-semibold">Configurar Espera</Label>
             <Select 
                value={selectedNode.data.delayType || 'fixed'} 
                onValueChange={(v) => handleUpdate({ delayType: v })}
             >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="fixed">Tempo Fixo</SelectItem>
                   <SelectItem value="dynamic">Data Dinâmica (Campo)</SelectItem>
                </SelectContent>
             </Select>

             {selectedNode.data.delayType === 'dynamic' ? (
                <div className="space-y-2">
                   <Label className="text-[10px] uppercase font-bold text-muted-foreground">Campo de Data</Label>
                   <Input 
                      placeholder="{{lead.custom.agendamento}}" 
                      data-field="dynamicDate" onFocus={onFocus}
                      value={selectedNode.data.dynamicDate || ''}
                      onChange={(e) => handleUpdate({ dynamicDate: e.target.value })}
                      className="h-8 text-xs font-mono"
                   />
                </div>
             ) : (
                <div className="flex items-center gap-2">
                   <Input 
                     type="number" min="1" placeholder="1" className="w-20 h-8" 
                     data-field="amount" onFocus={onFocus}
                     value={selectedNode.data.amount || ''}
                     onChange={(e) => handleUpdate({ amount: e.target.value })}
                   />
                   <Select 
                     value={selectedNode.data.unit || 'days'} 
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
                value={nodeConfigType || 'whatsapp'} 
                onValueChange={(v) => { setNodeConfigType(v); handleUpdate({ configType: v }); }}
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
                placeholder="Olá {{lead.name}}, tudo bem?" 
                className="min-h-[120px] text-sm resize-none"
                data-field="text"
                onFocus={onFocus}
                value={selectedNode.data.text || ''}
                onChange={(e) => handleUpdate({ text: e.target.value })}
             />
          </div>
        );
      case 'webhook':
        return (
          <div className="space-y-4">
             <Label className="text-xs font-semibold">Endpoint Webhook</Label>
             <Input 
                placeholder="https://api.exemplo.com/hook" 
                data-field="url" onFocus={onFocus}
                value={selectedNode.data.url || ''}
                onChange={(e) => handleUpdate({ url: e.target.value })}
                className="h-8 text-xs font-mono"
             />
             
             <Label className="text-xs font-semibold">Método HTTP</Label>
             <Select value={selectedNode.data.method || 'POST'} onValueChange={(v) => handleUpdate({ method: v })}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                   <SelectItem value="GET">GET</SelectItem>
                   <SelectItem value="POST">POST</SelectItem>
                   <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
             </Select>

             <Label className="text-xs font-semibold">Corpo (JSON)</Label>
             <Textarea 
                placeholder='{"name": "{{lead.name}}"}' 
                data-field="body" onFocus={onFocus}
                value={selectedNode.data.body || ''}
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
                      type="number" max="100" min="0" 
                      data-field="percentageA" onFocus={onFocus}
                      value={selectedNode.data.percentageA || '50'}
                      onChange={(e) => handleUpdate({ percentageA: e.target.value })}
                      className="h-8 text-center"
                   />
                </div>
                <div className="flex-1 text-center">
                   <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Caminho B (%)</div>
                   <Input 
                      disabled 
                      value={100 - (Number(selectedNode.data.percentageA) || 50)} 
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
                placeholder="Você é um assistente... Use {{lead.name}}" 
                className="min-h-[150px] text-sm resize-none"
                data-field="prompt"
                onFocus={onFocus}
                value={selectedNode.data.prompt || ''}
                onChange={(e) => handleUpdate({ prompt: e.target.value })}
             />
             
             <div className="space-y-2 border-t border-border pt-4">
               <Label className="text-[10px] uppercase font-bold text-muted-foreground">Salvar Resposta Em</Label>
               <Input 
                  placeholder="slug_do_campo (ex: resumo)" 
                  data-field="outputField"
                  onFocus={onFocus}
                  value={selectedNode.data.outputField || ''}
                  onChange={(e) => handleUpdate({ outputField: e.target.value })}
                  className="h-8 text-xs font-mono"
               />
               <p className="text-[9px] text-muted-foreground italic">
                  * A resposta será salva neste campo customizado do lead.
               </p>
             </div>
          </div>
        );
    }
  };

  const injectVariable = (variable: string) => {
    if (lastFocusedElement) {
      const start = lastFocusedElement.selectionStart || 0;
      const end = lastFocusedElement.selectionEnd || 0;
      const value = lastFocusedElement.value;
      const newValue = value.substring(0, start) + variable + value.substring(end);
      
      // Update element value
      lastFocusedElement.value = newValue;
      
      // Trigger update logic
      if (lastFocusedElement.name === 'nodeName') {
        setNodeName(newValue);
        handleUpdate({ label: newValue });
      } else {
        const field = lastFocusedElement.getAttribute('data-field');
        if (field) handleUpdate({ [field]: newValue });
      }
      
      // Set cursor after the inserted variable
      setTimeout(() => {
        lastFocusedElement.focus();
        lastFocusedElement.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
      
      toast.success(`Variável inserida!`);
    } else {
      navigator.clipboard.writeText(variable);
      toast.info(`Variável ${variable} copiada! (Nenhum campo focado)`);
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
              name="nodeName"
              value={nodeName} 
              onFocus={onFocus}
              onChange={(e) => {
                setNodeName(e.target.value);
                handleUpdate({ label: e.target.value });
              }}
              placeholder="Digite um nome..."
              className="h-9 text-sm border-muted-foreground/20 focus:border-primary"
            />
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            {renderTypeOptions()}
          </div>

          <div className="space-y-3 pt-6 border-t border-border mt-8">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Variáveis Úteis</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Nome', '{{lead.name}}'],
                ['Telefone', '{{lead.phone}}'],
                ['Mensagem', '{{message}}'],
                ['E-mail', '{{lead.email}}'],
                ['Empresa', '{{lead.company}}'],
                ['Campo', '{{lead.custom.slug}}'],
              ].map(([label, variable]) => (
                <Button
                  key={variable}
                  variant="outline"
                  size="sm"
                  className="text-[10px] h-7 px-2 justify-start border-muted-foreground/10 hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary"
                  onClick={() => injectVariable(variable)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="text-[9px] text-muted-foreground italic leading-tight">
              * Clique para inserir na posição do cursor do campo focado.
            </p>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-border bg-secondary/30 shrink-0">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDeleteNode}
          className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 text-xs transition-colors"
        >
           <Trash2 className="w-3.5 h-3.5" /> Excluir Módulo
        </Button>
      </div>
    </div>
  );
}
