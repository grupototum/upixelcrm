import { Handle, Position } from 'reactflow';
import { Play, MessageCircle, Mail, Globe, Instagram } from 'lucide-react';

const channelBadges: Record<string, { icon: typeof Play; label: string; color: string }> = {
  message_received: { icon: MessageCircle, label: 'Qualquer Canal', color: 'bg-gray-500' },
  message_received_whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'bg-emerald-600' },
  message_received_instagram: { icon: Instagram, label: 'Instagram', color: 'bg-pink-500' },
  message_received_email: { icon: Mail, label: 'Email', color: 'bg-blue-500' },
  message_received_webchat: { icon: Globe, label: 'Webchat', color: 'bg-violet-500' },
};

export function TriggerNode({ data }: { data: { label?: string; configType?: string; keywords?: string } }) {
  const badge = data.configType ? channelBadges[data.configType] : null;
  const BadgeIcon = badge?.icon;

  return (
    <div className="w-[250px] shadow-lg rounded-md bg-card border border-border overflow-hidden">
      <div className="flex items-center gap-2 bg-emerald-500 text-white px-3 py-2">
        <Play className="w-4 h-4" />
        <span className="font-semibold text-sm">Gatilho (Trigger)</span>
      </div>
      <div className="p-4 text-sm text-foreground min-h-[60px]">
        <div>{data.label || 'Configurar Gatilho'}</div>
        {badge && BadgeIcon && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-white px-2 py-0.5 rounded-full ${badge.color}`}>
              <BadgeIcon className="w-3 h-3" />
              {badge.label}
            </span>
            {data.keywords && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[120px]" title={data.keywords}>
                "{data.keywords}"
              </span>
            )}
          </div>
        )}
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-emerald-500 border-2 border-card -mr-1.5" 
      />
    </div>
  );
}
