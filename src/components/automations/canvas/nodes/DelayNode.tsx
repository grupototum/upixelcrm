import { Handle, Position } from 'reactflow';
import { Clock } from 'lucide-react';

export function DelayNode({ data }: { data: { label?: string; configType?: string; delayType?: 'fixed'|'dynamic'; amount?: number; unit?: string; dynamicDate?: string } }) {
  return (
    <div className="w-[200px] shadow-lg rounded-md bg-card border border-border overflow-hidden relative">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-muted-foreground border-2 border-card -ml-1.5" 
      />
      
      <div className="flex items-center gap-2 bg-muted-foreground text-card px-3 py-2 justify-center">
        <Clock className="w-4 h-4" />
        <span className="font-semibold text-sm">Aguardar (Delay)</span>
      </div>
      
      <div className="p-4 text-center font-bold text-foreground text-sm">
        {data.delayType === 'dynamic' 
          ? `Até: {{${data.dynamicDate || 'custom.data'}}}` 
          : (data.label || `${data.amount || 1} ${data.unit || 'dias'}`)}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-muted-foreground border-2 border-card -mr-1.5" 
      />
    </div>
  );
}
