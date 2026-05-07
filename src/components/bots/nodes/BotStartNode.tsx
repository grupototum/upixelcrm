import { Handle, Position } from 'reactflow';
import { Zap } from 'lucide-react';

const triggerLabels: Record<string, string> = {
  manual: 'Acionamento Manual',
  keyword: 'Palavra-chave',
  new_lead: 'Novo Lead',
};

export function BotStartNode({ data }: { data: { label?: string; trigger?: string; keyword?: string } }) {
  const trigger = data.trigger || 'manual';
  return (
    <div className="w-[220px] rounded-lg bg-[#ff4f00] text-white overflow-hidden shadow-none border-2 border-[#ff4f00]">
      <div className="flex items-center gap-2 px-3 py-2">
        <Zap className="w-4 h-4 shrink-0" />
        <span className="font-bold text-sm">Início</span>
      </div>
      <div className="bg-white/10 px-3 py-2 text-xs">
        <p className="font-medium">{triggerLabels[trigger] ?? trigger}</p>
        {trigger === 'keyword' && data.keyword && (
          <p className="opacity-80 mt-0.5 font-mono">"{data.keyword}"</p>
        )}
        {data.label && <p className="opacity-70 mt-0.5 truncate">{data.label}</p>}
      </div>
      <Handle type="source" position={Position.Right}
        className="w-3 h-3 bg-white border-2 border-[#ff4f00] -mr-1.5" />
    </div>
  );
}
