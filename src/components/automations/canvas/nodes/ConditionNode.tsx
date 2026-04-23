import { Handle, Position } from 'reactflow';
import { GitBranch } from 'lucide-react';

interface ConditionRule {
  type: string;
  operator?: string;
  value?: string;
}

interface ConditionNodeData {
  label?: string;
  configType?: string;
  conditions?: ConditionRule[];
  conditionOperator?: 'and' | 'or';
}

const typeLabels: Record<string, string> = {
  has_phone: 'Tem celular',
  has_email: 'Tem email',
  has_tag: 'Tem tag',
  message_contains: 'Msg contém',
  message_equals: 'Msg igual a',
  message_starts_with: 'Msg começa com',
  message_channel: 'Canal =',
};

function summarizeConditions(data: ConditionNodeData): string | null {
  if (!data.conditions?.length) return null;
  const joiner = data.conditionOperator === 'or' ? ' OU ' : ' E ';
  return data.conditions
    .map((c) => {
      const label = typeLabels[c.type] || c.type;
      return c.value ? `${label} "${c.value}"` : label;
    })
    .join(joiner);
}

export function ConditionNode({ data }: { data: ConditionNodeData }) {
  const summary = summarizeConditions(data);

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
        <div className="mb-1">{data.label || 'Definir Condição'}</div>
        {summary && (
          <p className="text-[10px] text-muted-foreground leading-snug line-clamp-3" title={summary}>
            {summary}
          </p>
        )}
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
