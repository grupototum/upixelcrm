import { useState, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, Clock, MapPin, Users, Video, Loader2, CalendarX, Search, RefreshCw, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CalendarTabProps {
  fetchCalendarList: () => Promise<any>;
}

interface ParsedEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  dateLabel: string;
  time: string;
  duration: string;
  location: string;
  attendees: number;
  isOnline: boolean;
  rawDate: string;
  htmlLink: string;
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
      start,
      end,
      dateLabel,
      time: evt.start?.dateTime ? start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Dia inteiro",
      duration,
      location: location || "Sem local",
      attendees: (evt.attendees || []).length,
      isOnline,
      rawDate: start.toDateString(),
      htmlLink: evt.htmlLink || "https://calendar.google.com",
    };
  }).sort((a, b) => a.start.getTime() - b.start.getTime());
}

const colors = ["bg-blue-500", "bg-primary", "bg-success", "bg-purple-500", "bg-accent", "bg-amber-500"];

export function CalendarTab({ fetchCalendarList }: CalendarTabProps) {
  const [events, setEvents] = useState<ParsedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const handleOpenEvent = (link: string) => {
    window.open(link, "_blank");
  };

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

  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      const matchesSearch = evt.title.toLowerCase().includes(search.toLowerCase()) || 
                           evt.location.toLowerCase().includes(search.toLowerCase());
      const matchesDate = selectedDate ? evt.rawDate === selectedDate.toDateString() : true;
      return matchesSearch && matchesDate;
    });
  }, [events, search, selectedDate]);

  const groupedEvents = useMemo(() => {
    // If filtering by specific date, we don't need grouping headings as much, but we'll keep the structure
    return filteredEvents.reduce<Record<string, ParsedEvent[]>>((acc, evt) => {
      (acc[evt.dateLabel] ??= []).push(evt);
      return acc;
    }, {});
  }, [filteredEvents]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input 
            placeholder="Buscar eventos ou locais..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9 h-10 shadow-sm border-border/40 bg-card rounded-xl text-xs" 
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal h-10 px-4 rounded-xl border-border/40 bg-card shadow-sm text-xs gap-2 shrink-0",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Filtrar por data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl border-none shadow-2xl bg-card" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
                locale={ptBR}
                className="rounded-2xl"
              />
              <div className="p-3 border-t border-border/20 flex justify-end">
                <Button variant="ghost" size="sm" className="text-[10px] h-7 rounded-lg" onClick={() => setSelectedDate(undefined)}>Limpar Filtro</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button size="icon" variant="outline" className="h-10 w-10 shrink-0 rounded-xl border-border/40 bg-card shadow-sm hover:text-primary transition-colors" onClick={load} title="Sincronizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-none">
            {filteredEvents.length} {filteredEvents.length === 1 ? "evento" : "eventos"}
          </Badge>
          {selectedDate && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-border/40 bg-secondary/20">
              {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </Badge>
          )}
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-2xl border-2 border-dashed border-border/30 bg-secondary/5">
          <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
            <CalendarX className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Nenhum evento encontrado</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
            {selectedDate 
              ? `Não há eventos agendados para este dia.` 
              : "Não encontramos eventos com os critérios da busca."}
          </p>
          {selectedDate && (
            <Button variant="link" className="text-primary text-xs mt-2" onClick={() => setSelectedDate(undefined)}>
              Ver todos os eventos
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {Object.entries(groupedEvents).map(([date, evts]) => (
            <div key={date} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-3 mb-4 sticky top-0 bg-background/80 backdrop-blur-md py-2 z-10">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                </div>
                <h3 className="text-[13px] font-bold text-foreground tracking-tight">
                  {date}
                </h3>
                <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evts.map((evt, idx) => (
                  <div
                    key={evt.id}
                    className="group relative h-full flex flex-col bg-card border border-border/40 rounded-2xl p-5 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${idx % 2 === 0 ? 'from-blue-500/20 to-blue-500/5' : 'from-primary/20 to-primary/5'} flex items-center justify-center`}>
                        {evt.isOnline ? <Video className="h-5 w-5 text-blue-500" /> : <Clock className="h-5 w-5 text-primary" />}
                      </div>
                      <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold bg-secondary/10 border-border/20 text-muted-foreground">
                        {evt.time}
                      </Badge>
                    </div>

                    <h4 className="text-[14px] font-bold text-foreground leading-snug mb-3 group-hover:text-primary transition-colors">
                      {evt.title}
                    </h4>

                    <div className="mt-auto space-y-2.5">
                      <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground/80 transition-colors">
                        <div className="h-5 w-5 rounded-lg bg-muted flex items-center justify-center">
                          <MapPin className="h-3 w-3" />
                        </div>
                        <span className="text-[11px] truncate">{evt.location}</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="h-5 w-5 rounded-lg bg-muted flex items-center justify-center">
                            <Clock className="h-3 w-3" />
                          </div>
                          <span className="text-[11px]">{evt.duration}</span>
                        </div>
                        
                        {evt.attendees > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-secondary/30 text-muted-foreground text-[10px] font-medium border border-border/20">
                            <Users className="h-2.5 w-2.5" />
                            {evt.attendees}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <button className="absolute bottom-4 right-4 h-8 w-8 rounded-full bg-primary/0 group-hover:bg-primary/10 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <ChevronRight className="h-4 w-4" />
                    </button>
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
