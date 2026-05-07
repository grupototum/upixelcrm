import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

const opLabels: Record<string, string> = {
  equals: '=',
  contains: 'contém',
  starts_with: 'começa com',
  not_equals: '≠',
};

export function BotConditionNode({ data }: { data: { label?: string; variable?: string; operator?: string; value?: string } }) {
  const summary = data.variable
    ? `{{${data.variable}}} ${opLabels[data.operator ?? 'equals'] ?? data.operator} "${data.value ?? ''}"`
    : null;

  return (
    <div className="w-[240px] rounded-lg bg-card border border-[hsl(var(--border-strong))] overflow-hidden relative">
      <Handle type="target" position={Position.Left}
        className="w-3 h-3 bg-amber-500 border-2 border-card -ml-1.5" />
      <div className="flex items-center gap-2 bg-amber-500 text-white px-3 py-2">
        <GitBranch className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm">Condição</span>
      </div>
      <div className="px-3 py-2.5 text-xs text-foreground min-h-[56px]">
        {summary
          ? <p className="font-mono text-[10px] leading-snug break-all">{summary}</p>
          : <p className="text-muted-foreground italic">Configurar condição...</p>}
        {data.label && <p className="text-muted-foreground mt-1 truncate">{data.label}</p>}
      </div>
      <div className="absolute right-[-28px] text-[10px] font-bold text-emerald-600 pointer-events-none select-none" style={{ top: '2.8rem' }}>
        Sim
      </div>
      <Handle type="source" position={Position.Right} id="true"
        className="w-3 h-3 bg-emerald-500 border-2 border-card -mr-1.5" style={{ top: '3rem' }} />
      <div className="absolute right-[-26px] text-[10px] font-bold text-rose-500 pointer-events-none select-none" style={{ top: '4.4rem' }}>
        Não
      </div>
      <Handle type="source" position={Position.Right} id="false"
        className="w-3 h-3 bg-rose-500 border-2 border-card -mr-1.5" style={{ top: '4.6rem' }} />
    </div>
  );
}
