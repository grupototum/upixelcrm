import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

export function MessageNode({ data }: { data: { label?: string; configType?: string } }) {
  return (
    <div className="w-[250px] shadow-lg rounded-md bg-card border border-border overflow-hidden relative">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-indigo-500 border-2 border-card -ml-1.5" 
      />
      <div className="flex items-center gap-2 bg-indigo-500 text-white px-3 py-2">
        <Play className="w-4 h-4" />
        <span className="font-semibold text-sm">Enviar Mensagem</span>
      </div>
      <div className="p-4 text-sm text-foreground min-h-[60px] flex items-center">
        {data.label || 'Configurar Mensagem'}
      </div>
      <div className="absolute right-3 top-10 flex items-center text-[10px] font-semibold text-muted-foreground">
        Próximo Passo
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-indigo-500 border-2 border-card -mr-1.5" 
      />
    </div>
  );
}
