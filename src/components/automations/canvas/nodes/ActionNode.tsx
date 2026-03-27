import { Handle, Position } from 'reactflow';
import { Zap } from 'lucide-react';

export function ActionNode({ data }: { data: { label?: string; configType?: string } }) {
  return (
    <div className="w-[250px] shadow-lg rounded-md bg-card border border-border overflow-hidden">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-blue-500 border-2 border-card -ml-1.5" 
      />
      <div className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2">
        <Zap className="w-4 h-4" />
        <span className="font-semibold text-sm">Ação (Action)</span>
      </div>
      <div className="p-4 text-sm text-foreground min-h-[60px] flex items-center">
        {data.label || 'Configurar Ação'}
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-blue-500 border-2 border-card -mr-1.5" 
      />
    </div>
  );
}
