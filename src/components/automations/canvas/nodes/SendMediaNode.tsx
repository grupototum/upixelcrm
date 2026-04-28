import { Handle, Position } from 'reactflow';
import { Image as ImageIcon, Music, Video, FileText, Paperclip } from 'lucide-react';

const mediaTypeIcon: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  audio: Music,
  video: Video,
  document: FileText,
};

const mediaTypeColor: Record<string, string> = {
  image: 'bg-fuchsia-500',
  audio: 'bg-emerald-500',
  video: 'bg-rose-500',
  document: 'bg-amber-500',
};

export function SendMediaNode({ data }: { data: { label?: string; mediaType?: string; mediaUrl?: string; caption?: string } }) {
  const mediaType = data.mediaType || 'image';
  const Icon = mediaTypeIcon[mediaType] || Paperclip;
  const headerColor = mediaTypeColor[mediaType] || 'bg-fuchsia-500';

  return (
    <div className="w-[260px] shadow-lg rounded-md bg-card border border-border overflow-hidden relative">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-fuchsia-500 border-2 border-card -ml-1.5"
      />
      <div className={`flex items-center gap-2 ${headerColor} text-white px-3 py-2`}>
        <Icon className="w-4 h-4" />
        <span className="font-semibold text-sm">Enviar {mediaType === 'image' ? 'Foto' : mediaType === 'audio' ? 'Áudio' : mediaType === 'video' ? 'Vídeo' : 'Arquivo'}</span>
      </div>
      <div className="p-3 text-xs text-foreground space-y-1.5">
        {data.mediaUrl ? (
          <p className="text-[10px] text-muted-foreground truncate font-mono">
            {data.mediaUrl}
          </p>
        ) : (
          <p className="text-[10px] text-warning">
            ⚠ URL da mídia não configurada
          </p>
        )}
        {data.caption && (
          <p className="text-[11px] text-foreground line-clamp-2">{data.caption}</p>
        )}
      </div>
      <div className="absolute right-3 top-10 flex items-center text-[10px] font-semibold text-muted-foreground">
        Próximo
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-fuchsia-500 border-2 border-card -mr-1.5"
      />
    </div>
  );
}
