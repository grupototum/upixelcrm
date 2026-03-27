import { Handle, Position } from 'reactflow';
import { Clock } from 'lucide-react';

export function DelayNode({ data }: { data: any }) {
  return (
    <div className="w-[200px] shadow-lg rounded-md bg-white border border-slate-200 overflow-hidden relative">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-slate-500 border-2 border-white -ml-1.5" 
      />
      
      <div className="flex items-center gap-2 bg-slate-500 text-white px-3 py-2 justify-center">
        <Clock className="w-4 h-4" />
        <span className="font-semibold text-sm">Aguardar (Delay)</span>
      </div>
      
      <div className="p-4 text-center font-bold text-slate-800 text-lg">
        {data.label || '1 Dia'}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-slate-500 border-2 border-white -mr-1.5" 
      />
    </div>
  );
}
