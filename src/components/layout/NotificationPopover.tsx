import { useEffect } from "react";
import { Bell, Check, Clock, UserPlus, AlertTriangle } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  created_at: string;
};

function getIcon(type: string) {
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
}

export function NotificationPopover() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery<NotificationRow[]>({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase.from as any)("notifications")
        .select("id, title, body, type, read, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data ?? []) as NotificationRow[];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Realtime: invalida cache quando chega nova notificação
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    if (!user?.id || unreadCount === 0) return;
    await (supabase.from as any)("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  }

  async function markRead(id: string) {
    queryClient.setQueryData<NotificationRow[]>(["notifications", user?.id], (prev) =>
      prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? []
    );
    await (supabase.from as any)("notifications").update({ read: true }).eq("id", id);
  }

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
        <div className="flex items-center justify-between p-4 ghost-border border-b bg-card">
          <h4 className="text-sm font-bold tracking-tight">Notificações</h4>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {unreadCount} novas
            </Badge>
          )}
        </div>
        <ScrollArea className="h-[350px]">
          <div className="flex flex-col">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Bell className="h-6 w-6 mb-2 opacity-30" />
                <p className="text-xs">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`flex items-start gap-3 p-4 text-left transition-colors hover:bg-secondary/50 ghost-border border-b last:border-b-0 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="mt-0.5 h-8 w-8 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className={`text-xs font-semibold ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {n.body}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-2 ghost-border border-t bg-card">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-[10px] font-medium h-8"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Marcar todas como lidas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
