import { Bell, Check, Clock, UserPlus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

const mockNotifications = [
  {
    id: "1",
    title: "Novo Lead",
    description: "Um novo lead vindo do WhatsApp acabou de entrar.",
    time: "2 min atrás",
    type: "new_lead",
    unread: true,
  },
  {
    id: "2",
    title: "Tarefa Vencendo",
    description: "A tarefa 'Retornar para João Marcos' vence em 1 hora.",
    time: "45 min atrás",
    type: "task_warning",
    unread: true,
  },
  {
    id: "3",
    title: "Mensagem não respondida",
    description: "Maria Silva enviou uma mensagem há 3 horas e não foi respondida.",
    time: "3 horas atrás",
    type: "unread_message",
    unread: false,
  },
  {
    id: "4",
    title: "Automação Concluída",
    description: "O fluxo 'Boas Vindas' foi concluído para 5 novos leads.",
    time: "5 horas atrás",
    type: "automation",
    unread: false,
  },
];

export function NotificationPopover() {
  const unreadCount = mockNotifications.filter((n) => n.unread).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "new_lead":
        return <UserPlus className="h-4 w-4 text-primary" />;
      case "task_warning":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "unread_message":
        return <Clock className="h-4 w-4 text-accent" />;
      default:
        return <Check className="h-4 w-4 text-success" />;
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground rounded-full relative"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-2xl border-none" align="end">
        <div className="flex items-center justify-between p-4 ghost-border border-b bg-card/50 backdrop-blur-md">
          <h4 className="text-sm font-bold tracking-tight">Notificações</h4>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {unreadCount} novas
            </Badge>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          <div className="flex flex-col">
            {mockNotifications.map((n) => (
              <button
                key={n.id}
                className={`flex items-start gap-3 p-4 text-left transition-colors hover:bg-secondary/50 ghost-border border-b last:border-b-0 ${
                  n.unread ? "bg-primary/5" : ""
                }`}
              >
                <div className="mt-0.5 h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className={`text-xs font-semibold ${n.unread ? "text-foreground" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {n.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {n.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="p-2 ghost-border border-t bg-card/30">
          <Button variant="ghost" size="sm" className="w-full text-[10px] font-medium h-8">
            Ver todas as notificações
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
