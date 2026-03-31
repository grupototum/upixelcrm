import { useState, useEffect } from "react";
import { Calendar, Clock, MapPin, Users, Plus, Video, Loader2, CalendarX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CalendarTabProps {
  fetchCalendarList: () => Promise<any>;
}

interface ParsedEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  attendees: number;
  isOnline: boolean;
}

function parseEvents(items: any[]): ParsedEvent[] {
  return (items || []).map((evt) => {
    const start = evt.start?.dateTime ? new Date(evt.start.dateTime) : evt.start?.date ? new Date(evt.start.date) : new Date();
    const end = evt.end?.dateTime ? new Date(evt.end.dateTime) : start;
    const diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
    const duration = diffMin >= 60 ? `${Math.floor(diffMin / 60)}h${diffMin % 60 ? diffMin % 60 + "min" : ""}` : `${diffMin}min`;

    const today = new Date();
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    let dateLabel = start.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
    if (start.toDateString() === today.toDateString()) dateLabel = "Hoje";
    else if (start.toDateString() === tomorrow.toDateString()) dateLabel = "Amanhã";

    const location = evt.location || (evt.hangoutLink ? "Google Meet" : "");
    const isOnline = !!(evt.hangoutLink || evt.conferenceData || location.toLowerCase().includes("meet") || location.toLowerCase().includes("zoom"));

    return {
      id: evt.id,
      title: evt.summary || "(Sem título)",
      date: dateLabel,
      time: evt.start?.dateTime ? start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Dia inteiro",
      duration,
      location: location || "Sem local",
      attendees: (evt.attendees || []).length,
      isOnline,
    };
  });
}

const colors = ["bg-blue-500", "bg-primary", "bg-success", "bg-purple-500", "bg-accent", "bg-amber-500"];

export function CalendarTab({ fetchCalendarList }: CalendarTabProps) {
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCalendarList();
      setEvents(parseEvents(data.items || []));
    } catch (err: any) {
      toast.error(`Erro ao carregar eventos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const groupedEvents = events.reduce<Record<string, ParsedEvent[]>>((acc, evt) => {
    (acc[evt.date] ??= []).push(evt);
    return acc;
  }, {});

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">{events.length} eventos</Badge>
        <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={load}>
          <Calendar className="h-3 w-3" /> Atualizar
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarX className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Nenhum evento próximo</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([date, evts]) => (
            <div key={date}>
              <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                {date}
              </h3>
              <div className="space-y-2">
                {evts.map((evt, idx) => (
                  <div
                    key={evt.id}
                    className="w-full text-left bg-card ghost-border rounded-xl p-4 shadow-card hover:shadow-card-hover hover:border-border-hover transition-all duration-200 flex items-start gap-3"
                  >
                    <div className={`w-1 h-12 rounded-full ${colors[idx % colors.length]} shrink-0 mt-0.5`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{evt.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {evt.time} · {evt.duration}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {evt.isOnline ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                          {evt.location}
                        </span>
                        {evt.attendees > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Users className="h-3 w-3" /> {evt.attendees} participantes
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
