import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  Clock,
  UserPlus,
  AlertTriangle,
  Zap,
  ArrowRightCircle,
  MessageCircle,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  useNotifications,
  formatRelative,
  type AppNotification,
} from "@/hooks/useNotifications";

function getIcon(type: AppNotification["type"]) {
  switch (type) {
    case "new_lead":
      return <UserPlus className="h-4 w-4 text-primary" />;
    case "task_warning":
      return <Clock className="h-4 w-4 text-warning" />;
    case "task_overdue":
      return <AlertTriangle className="h-4 w-4 text-destructive" />;
    case "unread_message":
      return <MessageCircle className="h-4 w-4 text-accent" />;
    case "automation":
      return <Zap className="h-4 w-4 text-warning" />;
    case "stage_change":
      return <ArrowRightCircle className="h-4 w-4 text-success" />;
    default:
      return <Check className="h-4 w-4 text-success" />;
  }
}

export function NotificationPopover() {
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const handleClick = (n: AppNotification) => {
    markAsRead(n.id);
    if (n.href) navigate(n.href);
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
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {unreadCount} novas
              </Badge>
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <CheckCheck className="h-3 w-3" /> Marcar todas
              </button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[350px]">
          <div className="flex flex-col">
            {notifications.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-2">
                <Bell className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">
                  Nenhuma notificação no momento.
                </p>
              </div>
            )}
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
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
                      {formatRelative(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                    {n.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
        <div className="p-2 ghost-border border-t bg-card/30">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[10px] font-medium h-8"
            onClick={() => navigate("/")}
          >
            Ir para o painel
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
