import { useState } from "react";
import { Calendar, Clock, MapPin, Users, Plus, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  attendees: number;
  color: string;
  isOnline: boolean;
}

const mockEvents: CalendarEvent[] = [
  { id: "1", title: "Reunião de alinhamento — Q2", date: "Hoje", time: "09:00", duration: "1h", location: "Google Meet", attendees: 5, color: "bg-blue-500", isOnline: true },
  { id: "2", title: "Demo para Cliente XYZ", date: "Hoje", time: "14:00", duration: "45min", location: "Zoom", attendees: 3, color: "bg-primary", isOnline: true },
  { id: "3", title: "Follow-up — Proposta Enterprise", date: "Hoje", time: "16:30", duration: "30min", location: "Escritório SP", attendees: 2, color: "bg-success", isOnline: false },
  { id: "4", title: "Sprint Planning", date: "Amanhã", time: "10:00", duration: "2h", location: "Google Meet", attendees: 8, color: "bg-blue-500", isOnline: true },
  { id: "5", title: "Workshop de Produto", date: "Amanhã", time: "15:00", duration: "1h30", location: "Sala de Reunião 3", attendees: 12, color: "bg-accent", isOnline: false },
  { id: "6", title: "1:1 com Gerente", date: "Qui, 31 Mar", time: "11:00", duration: "30min", location: "Google Meet", attendees: 2, color: "bg-purple-500", isOnline: true },
];

export function CalendarTab() {
  const [createOpen, setCreateOpen] = useState(false);

  const groupedEvents = mockEvents.reduce<Record<string, CalendarEvent[]>>((acc, evt) => {
    (acc[evt.date] ??= []).push(evt);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">{mockEvents.length} eventos</Badge>
        </div>
        <Button
          size="sm"
          className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3 w-3" /> Criar evento
        </Button>
      </div>

      {/* Agenda */}
      <div className="space-y-6">
        {Object.entries(groupedEvents).map(([date, events]) => (
          <div key={date}>
            <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              {date}
            </h3>
            <div className="space-y-2">
              {events.map((evt) => (
                <button
                  key={evt.id}
                  onClick={() => toast.info(`Abrir evento: ${evt.title}`)}
                  className="w-full text-left bg-card ghost-border rounded-xl p-4 shadow-card hover:shadow-card-hover hover:border-border-hover transition-all duration-200 flex items-start gap-3"
                >
                  <div className={`w-1 h-12 rounded-full ${evt.color} shrink-0 mt-0.5`} />
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
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" /> {evt.attendees} participantes
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Novo Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Título do evento" className="text-xs h-9" />
            <div className="grid grid-cols-2 gap-3">
              <Input type="date" className="text-xs h-9" />
              <Input type="time" className="text-xs h-9" />
            </div>
            <Input placeholder="Local ou link da reunião" className="text-xs h-9" />
            <Textarea placeholder="Descrição (opcional)" className="text-xs min-h-[80px]" />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={() => { setCreateOpen(false); toast.success("Evento criado! (Demonstração)"); }}
            >
              <Plus className="h-3 w-3" /> Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
