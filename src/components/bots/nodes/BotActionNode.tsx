import { Handle, Position } from 'reactflow';
import { Tag, ArrowRightLeft, UserCheck, XCircle } from 'lucide-react';

const actionMeta: Record<string, { label: string; Icon: React.FC<{ className?: string }>; color: string }> = {
  tag:          { label: 'Adicionar Tag',     Icon: Tag,           color: '#10b981' },
  move_stage:   { label: 'Mover no Pipeline', Icon: ArrowRightLeft, color: '#8b5cf6' },
  assign_agent: { label: 'Atribuir Agente',   Icon: UserCheck,     color: '#3b82f6' },
  end:          { label: 'Encerrar Bot',      Icon: XCircle,       color: '#64748b' },
};

export function BotActionNode({ data }: { data: { label?: string; action?: string; value?: string } }) {
  const meta = actionMeta[data.action ?? 'end'] ?? actionMeta.end;
  const { label, Icon, color } = meta;
  const isEnd = data.action === 'end';

  return (
    <div className="w-[220px] rounded-lg bg-card border border-[hsl(var(--border-strong))] overflow-hidden">
      <Handle type="target" position={Position.Left}
        className="w-3 h-3 border-2 border-card -ml-1.5" style={{ backgroundColor: color }} />
      <div className="flex items-center gap-2 px-3 py-2 text-white" style={{ backgroundColor: color }}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <div className="px-3 py-2.5 text-xs text-foreground min-h-[36px]">
        {data.value
          ? <p className="font-medium">{data.value}</p>
          : <p className="text-muted-foreground italic">{isEnd ? 'Fim do fluxo' : 'Configurar...'}</p>}
      </div>
      {!isEnd && (
        <Handle type="source" position={Position.Right}
          className="w-3 h-3 border-2 border-card -mr-1.5" style={{ backgroundColor: color }} />
      )}
    </div>
  );
}
