import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sparkles, Search, LayoutGrid, List, Inbox, Rocket, Wrench, Bug,
} from "lucide-react";
import changelogRaw from "../../CHANGELOG.md?raw";
import {
  parseChangelog, flattenChangelog, GROUP_LABELS,
  type ChangelogGroup,
} from "@/lib/changelog";

const GROUP_ICONS: Record<ChangelogGroup, typeof Rocket> = {
  feature: Rocket,
  improvement: Wrench,
  fix: Bug,
};

const GROUP_BADGE_CLASS: Record<ChangelogGroup, string> = {
  feature: "bg-primary/10 text-primary",
  improvement: "bg-accent/10 text-accent",
  fix: "bg-success/10 text-success",
};

function formatSessionDate(date: string): string {
  if (!date) return "";
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

export default function NovidadesPage() {
  const sessions = useMemo(() => parseChangelog(changelogRaw), []);
  const allItems = useMemo(() => flattenChangelog(sessions), [sessions]);

  const [search, setSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState<ChangelogGroup | "all">("all");
  const [sessionFilter, setSessionFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");

  // Itens filtrados só por busca+sessão — alimenta a contagem dos cards de
  // tipo (mesmo padrão do TasksPage: o card mostra "quantos bateriam" mesmo
  // sem o filtro de tipo aplicado ainda).
  const searchedItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter((item) => {
      const matchesSearch = !q || item.text.toLowerCase().includes(q);
      const matchesSession = sessionFilter === "all" || item.sessionDate === sessionFilter;
      return matchesSearch && matchesSession;
    });
  }, [allItems, search, sessionFilter]);

  const counts = useMemo(() => {
    const c: Record<ChangelogGroup | "all", number> = { all: searchedItems.length, feature: 0, improvement: 0, fix: 0 };
    for (const item of searchedItems) c[item.group]++;
    return c;
  }, [searchedItems]);

  const filteredItems = useMemo(
    () => searchedItems.filter((item) => groupFilter === "all" || item.group === groupFilter),
    [searchedItems, groupFilter]
  );

  // Sessões visíveis no modo card: reaplica os mesmos 3 filtros direto na
  // árvore original (sessions), já que os objetos "achatados" de filteredItems
  // são cópias — comparar por identidade contra eles não funcionaria.
  const visibleSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions
      .map((session) => {
        if (sessionFilter !== "all" && session.date !== sessionFilter) return { ...session, categories: [] };
        return {
          ...session,
          categories: session.categories
            .map((cat) => ({
              ...cat,
              items: cat.items.filter((item) => {
                const matchesSearch = !q || item.text.toLowerCase().includes(q);
                const matchesGroup = groupFilter === "all" || item.group === groupFilter;
                return matchesSearch && matchesGroup;
              }),
            }))
            .filter((cat) => cat.items.length > 0),
        };
      })
      .filter((session) => session.categories.length > 0);
  }, [sessions, search, sessionFilter, groupFilter]);

  const groupCards: Array<{ key: ChangelogGroup | "all"; label: string; icon: typeof Inbox }> = [
    { key: "all", label: "Todas", icon: Inbox },
    { key: "feature", label: GROUP_LABELS.feature, icon: Rocket },
    { key: "improvement", label: GROUP_LABELS.improvement, icon: Wrench },
    { key: "fix", label: GROUP_LABELS.fix, icon: Bug },
  ];

  const emptyState = (
    <div className="p-12 text-center rounded-xl border-2 border-dashed border-border">
      <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">Nenhuma novidade encontrada com esses filtros.</p>
    </div>
  );

  return (
    <AppLayout title="Novidades" subtitle="O que mudou no sistema">
      <div className="p-8 animate-fade-in space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {groupCards.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setGroupFilter(key)}
              className={`rounded-xl ghost-border p-4 text-left transition-all duration-200 ${
                groupFilter === key ? "border-primary bg-primary/5 shadow-md" : "bg-card hover:bg-card-hover"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
                <Icon className={`h-4 w-4 ${groupFilter === key ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <p className={`text-2xl font-extrabold tracking-tight ${groupFilter === key ? "text-primary" : "text-foreground"}`}>
                {counts[key]}
              </p>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Buscar novidade..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs rounded-lg" />
          </div>
          <Select value={sessionFilter} onValueChange={setSessionFilter}>
            <SelectTrigger className="w-44 h-9 text-xs rounded-lg"><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os períodos</SelectItem>
              {sessions.map((s) => (
                <SelectItem key={s.date} value={s.date} className="text-xs">
                  {formatSessionDate(s.date)} — {s.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs text-muted-foreground shrink-0 rounded-lg">
            {filteredItems.length} novidade{filteredItems.length !== 1 ? "s" : ""}
          </Badge>
          <div className="flex items-center gap-1 bg-card border border-[hsl(var(--border-strong))] p-1 rounded-xl ml-auto">
            <Button variant={viewMode === "card" ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg" onClick={() => setViewMode("card")}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg" onClick={() => setViewMode("list")}>
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {filteredItems.length === 0 ? emptyState : viewMode === "card" ? (
          <div className="space-y-4">
            {visibleSessions.map((session) => (
              <div key={session.date || session.title} className="bg-card border border-border rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{session.title}</h3>
                  {session.date && <span className="text-[11px] text-muted-foreground">{formatSessionDate(session.date)}</span>}
                </div>
                <div className="space-y-3">
                  {session.categories.map((cat) => (
                    <div key={cat.label}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                        {cat.emoji} {cat.label}
                      </p>
                      <ul className="space-y-1.5">
                        {cat.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <Badge className={`shrink-0 mt-0.5 text-[9px] border-none ${GROUP_BADGE_CLASS[item.group]}`}>
                              {GROUP_LABELS[item.group]}
                            </Badge>
                            <span>{item.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item, i) => {
              const Icon = GROUP_ICONS[item.group];
              return (
                <div key={i} className="flex items-start gap-3 bg-card border border-border rounded-lg p-3">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{item.text}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatSessionDate(item.sessionDate)} · {item.sessionTitle}
                    </p>
                  </div>
                  <Badge className={`shrink-0 text-[9px] border-none ${GROUP_BADGE_CLASS[item.group]}`}>
                    {GROUP_LABELS[item.group]}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
