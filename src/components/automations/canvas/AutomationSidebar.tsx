import { useState, useEffect } from 'react';
import { useReactFlow, Node } from 'reactflow';
import { TerminalSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function AutomationSidebar({ selectedNodeId }: { selectedNodeId: string | null }) {
  const { getNode, setNodes } = useReactFlow();
  const [nodeName, setNodeName] = useState('');
  const [nodeConfigType, setNodeConfigType] = useState('');

  const selectedNode = selectedNodeId ? getNode(selectedNodeId) : null;

  useEffect(() => {
    if (selectedNode) {
      setNodeName(selectedNode.data.label || '');
      setNodeConfigType(selectedNode.data.type || '');
    }
  }, [selectedNodeId, selectedNode]);

  if (!selectedNodeId || !selectedNode) {
    return (
      <div className="w-[320px] bg-white border-l shadow-xl p-5 flex flex-col z-10 shrink-0">
        <h3 className="text-lg font-semibold mb-4 border-b pb-2 flex items-center gap-2">
          <TerminalSquare className="w-5 h-5 text-slate-500" /> Propriedades
        </h3>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Selecione um nó no canvas para editar suas configurações e parâmetros.
        </p>
        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50 p-6 text-center">
          Nenhum nó selecionado
        </div>
      </div>
    );
  }

  const handleUpdate = (updates: any) => {
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
            <Label>Tipo de Gatilho</Label>
            <Select 
              value={nodeConfigType} 
              onValueChange={(v) => {
                setNodeConfigType(v);
                handleUpdate({ type: v });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_lead">Novo Lead</SelectItem>
                <SelectItem value="status_change">Mudança de Etapa</SelectItem>
                <SelectItem value="tag_added">Tag Adicionada</SelectItem>
              </SelectContent>
            </Select>
          </>
        );
      case 'action':
        return (
          <>
            <Label>Tipo de Ação</Label>
            <Select 
              value={nodeConfigType} 
              onValueChange={(v) => {
                setNodeConfigType(v);
                handleUpdate({ type: v });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="send_whatsapp">Enviar WhatsApp</SelectItem>
                <SelectItem value="send_email">Enviar Email</SelectItem>
                <SelectItem value="add_tag">Adicionar Tag</SelectItem>
                <SelectItem value="assign_user">Atribuir Usuário</SelectItem>
              </SelectContent>
            </Select>
          </>
        );
      case 'condition':
        return (
          <>
            <Label>Regra da Condição</Label>
            <Select 
              value={nodeConfigType} 
              onValueChange={(v) => {
                setNodeConfigType(v);
                handleUpdate({ type: v });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="check_phone">Possui Celular Válido?</SelectItem>
                <SelectItem value="check_email">Possui Email Válido?</SelectItem>
                <SelectItem value="has_tag">Possui Tag Específica?</SelectItem>
              </SelectContent>
            </Select>
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
    <div className="w-[320px] bg-white border-l shadow-xl p-5 flex flex-col z-10 shrink-0 overflow-y-auto">
      <div className="flex items-center justify-between border-b pb-2 mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TerminalSquare className="w-5 h-5 text-slate-500" /> Propriedades
        </h3>
        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">
          {selectedNode.type?.toUpperCase()}
        </span>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Rótulo do Nó</Label>
          <Input 
            value={nodeName} 
            onChange={(e) => {
              setNodeName(e.target.value);
              handleUpdate({ label: e.target.value });
            }}
            placeholder="Ex: Novo Lead no Funil"
          />
        </div>

        {['action'].includes(selectedNode.type as string) && (
          <div className="space-y-2">
            <Label className="text-xs text-slate-500">Variáveis Dinâmicas</Label>
            <div className="flex gap-2 flex-wrap">
              <span 
                onClick={() => injectVariable(' {{lead.name}}')}
                className="text-xs border rounded px-2 py-1 cursor-pointer hover:bg-slate-50 text-indigo-600"
              >
                {'{'}{'{'}lead.name{'}'}{'}'}
              </span>
              <span 
                onClick={() => injectVariable(' {{order.value}}')}
                className="text-xs border rounded px-2 py-1 cursor-pointer hover:bg-slate-50 text-indigo-600"
              >
                {'{'}{'{'}order.value{'}'}{'}'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Clique para inserir no Texto da Mensagem (ou Rótulo).</p>
          </div>
        )}

        <div className="space-y-2 pt-4 border-t">
          <TypeOptions />
        </div>
        
        {nodeConfigType === 'send_whatsapp' && (
          <div className="space-y-2 pt-4 border-t">
             <Label>Template de Mensagem</Label>
             <Select>
               <SelectTrigger>
                 <SelectValue placeholder="Selecione template..." />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="welcome_1">Boas Vindas Padrão</SelectItem>
                 <SelectItem value="promo_2">Promoção Especial</SelectItem>
               </SelectContent>
             </Select>
          </div>
        )}
      </div>
    </div>
  );
}
