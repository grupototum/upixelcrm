import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

export function ConditionNode({ data }: { data: { label?: string; configType?: string } }) {
  return (
    <div className="w-[250px] shadow-lg rounded-md bg-card border border-border overflow-hidden relative">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-orange-500 border-2 border-card -ml-1.5" 
      />
      
      <div className="flex items-center gap-2 bg-orange-500 text-white px-3 py-2">
        <GitBranch className="w-4 h-4" />
        <span className="font-semibold text-sm">Condição (Filtro)</span>
      </div>
      
      <div className="p-4 text-sm text-foreground min-h-[80px]">
        <div className="mb-2">{data.label || 'Definir Condição'}</div>
      </div>
      
      <div className="absolute right-3 top-12 flex items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        Sim
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="true" 
        style={{ top: '3.5rem' }}
        className="w-3 h-3 bg-emerald-500 border-2 border-card -mr-1.5" 
      />

      <div className="absolute right-3 top-[4.5rem] flex items-center text-xs font-semibold text-rose-600 dark:text-rose-400 mt-2">
        Não
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="false" 
        style={{ top: '5.5rem' }}
        className="w-3 h-3 bg-rose-500 border-2 border-card -mr-1.5" 
      />
    </div>
  );
}
