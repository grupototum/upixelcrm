import { Handle, Position } from 'reactflow';
import { HelpCircle } from 'lucide-react';

export function BotQuestionNode({ data }: { data: { label?: string; text?: string; variable?: string } }) {
  return (
    <div className="w-[240px] rounded-lg bg-card border border-[hsl(var(--border-strong))] overflow-hidden">
      <Handle type="target" position={Position.Left}
        className="w-3 h-3 bg-blue-500 border-2 border-card -ml-1.5" />
      <div className="flex items-center gap-2 bg-blue-500 text-white px-3 py-2">
        <HelpCircle className="w-4 h-4 shrink-0" />
        <span className="font-semibold text-sm">Pergunta</span>
      </div>
      <div className="px-3 py-2.5 text-xs text-foreground min-h-[44px]">
        {data.text
          ? <p className="line-clamp-2 leading-relaxed">{data.text}</p>
          : <p className="text-muted-foreground italic">Configurar pergunta...</p>}
        {data.variable && (
          <p className="mt-1.5 font-mono text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 rounded px-1.5 py-0.5 inline-block">
            → {`{{${data.variable}}}`}
          </p>
        )}
      </div>
      {/* Saída: resposta recebida */}
      <div className="absolute right-[-60px] top-[2.8rem] text-[10px] font-semibold text-blue-500 pointer-events-none select-none">
        Resposta
      </div>
      <Handle type="source" position={Position.Right} id="reply"
        className="w-3 h-3 bg-blue-500 border-2 border-card -mr-1.5" style={{ top: '3rem' }} />
      {/* Saída: timeout */}
      <div className="absolute right-[-56px] top-[4.4rem] text-[10px] font-semibold text-muted-foreground pointer-events-none select-none">
        Timeout
      </div>
      <Handle type="source" position={Position.Right} id="timeout"
        className="w-3 h-3 bg-muted-foreground border-2 border-card -mr-1.5" style={{ top: '4.6rem' }} />
    </div>
  );
}
