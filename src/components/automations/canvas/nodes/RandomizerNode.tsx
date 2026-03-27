import { Handle, Position } from 'reactflow';
import { Shuffle } from 'lucide-react';

export function RandomizerNode({ data }: { data: any }) {
  return (
    <div className="w-[200px] shadow-lg rounded-md bg-white border border-slate-200 overflow-hidden relative">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-purple-500 border-2 border-white -ml-1.5" 
      />
      
      <div className="flex items-center gap-2 bg-purple-500 text-white px-3 py-2 justify-center">
        <Shuffle className="w-4 h-4" />
        <span className="font-semibold text-sm">Teste A/B</span>
      </div>
      
      <div className="p-4 text-sm text-slate-700 font-medium pb-8 border-b border-slate-100">
        {data.label || 'Distribuição (50/50)'}
      </div>

      {/* Lado A */}
      <div className="absolute right-3 top-20 flex items-center text-xs font-semibold text-slate-500">
        Caminho A (50%)
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="a" 
        style={{ top: '5.5rem' }}
        className="w-3 h-3 bg-slate-400 border-2 border-white -mr-1.5" 
      />

      {/* Lado B */}
      <div className="absolute right-3 top-[7.5rem] flex items-center text-xs font-semibold text-slate-500">
        Caminho B (50%)
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        id="b" 
        style={{ top: '8rem' }}
        className="w-3 h-3 bg-slate-400 border-2 border-white -mr-1.5" 
      />
    </div>
  );
}
