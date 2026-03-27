import { Handle, Position } from 'reactflow';
import { Globe } from 'lucide-react';

export function WebhookNode({ data }: { data: { label?: string; configType?: string } }) {
  return (
    <div className="w-[200px] shadow-lg rounded-md bg-card border border-border overflow-hidden relative">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-pink-500 border-2 border-card -ml-1.5" 
      />
      
      <div className="flex items-center gap-2 bg-pink-500 text-white px-3 py-2 justify-center">
        <Globe className="w-4 h-4" />
        <span className="font-semibold text-sm">HTTP Request</span>
      </div>
      
      <div className="p-4 text-xs text-muted-foreground truncate bg-secondary/50">
        <span className="font-bold text-pink-600 dark:text-pink-400 mr-1">POST</span> 
        {data.label || 'https://api...'}
      </div>
      
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-pink-500 border-2 border-card -mr-1.5" 
      />
    </div>
  );
}
