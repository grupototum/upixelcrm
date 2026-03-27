import { DragEvent } from 'react';
import { Play, Zap, GitBranch, Clock, Shuffle, Globe } from 'lucide-react';

const nodeTypes = [
  { type: 'trigger', label: 'Gatilho Inicial', icon: Play, desc: 'Ponto de partida do fluxo', color: 'bg-emerald-500' },
  { type: 'action', label: 'Ação CRM', icon: Zap, desc: 'Adicionar Tag, Mudar Estágio', color: 'bg-blue-500' },
  { type: 'message', label: 'Mensagem', icon: Play, desc: 'Enviar WhatsApp/Email', color: 'bg-indigo-500' },
  { type: 'condition', label: 'Condição (If)', icon: GitBranch, desc: 'Roteamento Sim/Não', color: 'bg-orange-500' },
  { type: 'delay', label: 'Espera (Delay)', icon: Clock, desc: 'Pausa a execução', color: 'bg-muted-foreground' },
  { type: 'randomizer', label: 'Teste A/B', icon: Shuffle, desc: 'Divide o tráfego', color: 'bg-purple-500' },
  { type: 'webhook', label: 'Webhook HTTP', icon: Globe, desc: 'Requisição externa', color: 'bg-pink-500' },
];

export function NodesPalette() {
  const onDragStart = (event: DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-[280px] bg-card border-r border-border shadow-sm p-4 flex flex-col z-10 shrink-0 h-full overflow-y-auto">
      <h3 className="text-sm font-bold text-foreground mb-4 px-1 uppercase tracking-wider">
        Módulos (Arraste)
      </h3>
      <p className="text-[11px] text-muted-foreground mb-4 leading-relaxed px-1">
        Clique e arraste os nós abaixo para o Canvas para desenhar o fluxo de automação.
      </p>

      <div className="space-y-3">
        {nodeTypes.map((node) => {
          const Icon = node.icon;
          return (
            <div
              key={node.type}
              className="flex items-center gap-3 p-3 border border-border rounded-lg bg-secondary/50 cursor-grab active:cursor-grabbing hover:bg-secondary hover:border-border-hover transition-colors shadow-sm"
              onDragStart={(event) => onDragStart(event, node.type, node.label)}
              draggable
            >
              <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center text-white ${node.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-foreground">{node.label}</span>
                <span className="block text-[10px] text-muted-foreground">{node.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
