import { Handle, Position } from 'reactflow';
import { Play } from 'lucide-react';

export function TriggerNode({ data }: { data: any }) {
  return (
    <div className="w-[250px] shadow-lg rounded-md bg-white border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-2">
        <Play className="w-4 h-4" />
        <span className="font-semibold text-sm">Gatilho (Trigger)</span>
      </div>
      <div className="p-4 text-sm text-slate-700 min-h-[60px] flex items-center">
        {data.label || 'Configurar Gatilho'}
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-emerald-500 border-2 border-white -mr-1.5" 
      />
    </div>
  );
}
