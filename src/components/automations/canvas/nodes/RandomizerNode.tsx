import { Handle, Position } from 'reactflow';
import { Shuffle } from 'lucide-react';

export function RandomizerNode({ data }: { data: { label?: string; configType?: string; percentageA?: number } }) {
  const pA = data.percentageA || 50;
  const pB = 100 - pA;
  
  return (
    <div className="w-[200px] shadow-lg rounded-md bg-card border border-border overflow-hidden relative">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-purple-500 border-2 border-card -ml-1.5" 
      />
      
      <div className="flex items-center gap-2 bg-purple-500 text-white px-3 py-2 justify-center">
        <Shuffle className="w-4 h-4" />
        <span className="font-semibold text-sm">Teste A/B</span>
      </div>
      
      <div className="p-4 text-sm text-foreground font-medium pb-8 border-b border-border">
        {data.label || `Distribuição (${pA}/${pB})`}
      </div>

      <div className="absolute right-3 top-20 flex items-center text-xs font-semibold text-muted-foreground">
        Caminho A ({pA}%)
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="a" 
        style={{ top: '5.5rem' }}
        className="w-3 h-3 bg-muted-foreground border-2 border-card -mr-1.5" 
      />

      <div className="absolute right-3 top-[7.5rem] flex items-center text-xs font-semibold text-muted-foreground">
        Caminho B ({pB}%)
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="b" 
        style={{ top: '8rem' }}
        className="w-3 h-3 bg-muted-foreground border-2 border-card -mr-1.5" 
      />
    </div>
  );
}
