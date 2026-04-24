import { Handle, Position } from 'reactflow';
import { Sparkles } from 'lucide-react';

export function AIAssistantNode({ data }: { data: { label?: string; prompt?: string; outputField?: string } }) {
  return (
    <div className="w-[250px] shadow-lg rounded-md bg-card border border-border overflow-hidden relative">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-amber-500 border-2 border-card -ml-1.5" 
      />
      <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-2">
        <Sparkles className="w-4 h-4" />
        <span className="font-semibold text-sm">Integração IA</span>
      </div>
      <div className="p-4 text-sm text-foreground min-h-[60px] flex items-center justify-center text-center">
        {data.label || 'Gerar com IA'}
      </div>
      <div className="bg-secondary/50 p-2 text-[10px] text-muted-foreground text-center border-t border-border">
        {data.outputField ? `Salvar em: ${data.outputField}` : 'Nenhum campo de saída'}
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-amber-500 border-2 border-card -mr-1.5" 
      />
    </div>
  );
}
