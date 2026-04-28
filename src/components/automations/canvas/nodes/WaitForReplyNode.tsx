import { Handle, Position } from 'reactflow';
import { MessagesSquare, Clock } from 'lucide-react';

export function WaitForReplyNode({ data }: { data: { label?: string; timeoutHours?: number; saveAs?: string } }) {
  const hasTimeout = !!data.timeoutHours && Number(data.timeoutHours) > 0;

  return (
    <div className="w-[260px] shadow-lg rounded-md bg-card border border-border overflow-hidden relative">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-cyan-500 border-2 border-card -ml-1.5"
      />
      <div className="flex items-center gap-2 bg-cyan-500 text-white px-3 py-2">
        <MessagesSquare className="w-4 h-4" />
        <span className="font-semibold text-sm">Aguardar Resposta</span>
      </div>
      <div className="p-3 text-xs text-foreground space-y-1.5">
        <p className="text-muted-foreground">
          {data.label || 'Pausa a automação até o lead responder.'}
        </p>
        {hasTimeout && (
          <div className="flex items-center gap-1 text-[10px] text-warning">
            <Clock className="w-3 h-3" />
            Timeout: {data.timeoutHours}h
          </div>
        )}
        {data.saveAs && (
          <div className="text-[10px] text-muted-foreground font-mono">
            Salvar em: <span className="text-cyan-600">{data.saveAs}</span>
          </div>
        )}
      </div>

      {/* Reply handle (caminho normal: lead respondeu) */}
      <div className="absolute right-3 top-12 flex items-center text-[10px] font-semibold text-cyan-600">
        Resposta →
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="reply"
        style={{ top: 56 }}
        className="w-3 h-3 bg-cyan-500 border-2 border-card -mr-1.5"
      />

      {/* Timeout handle (caminho alternativo: estourou tempo) */}
      {hasTimeout && (
        <>
          <div className="absolute right-3 bottom-3 flex items-center text-[10px] font-semibold text-warning">
            Timeout →
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id="timeout"
            style={{ top: 'calc(100% - 16px)' }}
            className="w-3 h-3 bg-warning border-2 border-card -mr-1.5"
          />
        </>
      )}
    </div>
  );
}
