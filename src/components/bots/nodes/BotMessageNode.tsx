import { Handle, Position } from 'reactflow';
import { MessageSquare } from 'lucide-react';

export function BotMessageNode({ data }: { data: { label?: string; text?: string } }) {
  return (
    <div className="w-[240px] rounded-lg bg-card border border-[hsl(var(--border-strong))] overflow-hidden">
      <Handle type="target" position={Position.Left}
        className="w-3 h-3 bg-[#201515] border-2 border-card -ml-1.5" />
      <div className="flex items-center gap-2 bg-[#201515] text-white px-3 py-2">
        <MessageSquare className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm">Mensagem</span>
      </div>
      <div className="px-3 py-2.5 text-xs text-foreground min-h-[44px]">
        {data.text
          ? <p className="line-clamp-3 leading-relaxed">{data.text}</p>
          : <p className="text-muted-foreground italic">Configurar mensagem...</p>}
      </div>
      <Handle type="source" position={Position.Right}
        className="w-3 h-3 bg-[#201515] border-2 border-card -mr-1.5" />
    </div>
  );
}
