import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockAutomations, mockColumns } from "@/lib/mock-data";
import {
  Plus, Zap, Settings, Target, Cog, AlertTriangle,
  Bot, MessageSquare, Folder, FolderOpen, MoreHorizontal,
  Copy, Trash2, Play, Pause, Search, Filter,
  GitBranch, Workflow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ─── Labels ─── */
const triggerLabels: Record<string, string> = {
  card_entered: "Entrada no card",
  time_in_column: "Tempo na coluna",
  stage_changed: "Mudança de estágio",
};

const actionLabels: Record<string, string> = {
  add_tag: "Adicionar tag",
  remove_tag: "Remover tag",
  move_column: "Mover de coluna",
  create_task: "Criar tarefa",
  send_message: "Enviar mensagem",
  send_template: "Enviar template",
  add_ai_agent: "Adicionar agente IA",
};

/* ─── Mock sequences ─── */
const mockSequences = [
  { id: "seq1", name: "Boas-vindas WhatsApp", steps: 3, active: true, channel: "whatsapp" },
  { id: "seq2", name: "Follow-up pós-proposta", steps: 5, active: true, channel: "email" },
  { id: "seq3", name: "Reengajamento 7 dias", steps: 4, active: false, channel: "whatsapp" },
];

/* ─── Mock bots ─── */
const mockBots = [
  { id: "bot1", name: "Qualificação Inicial", folder: "Vendas", status: "published" },
  { id: "bot2", name: "Suporte Básico", folder: "Suporte", status: "draft" },
  { id: "bot3", name: "Agendamento", folder: "Vendas", status: "published" },
];

const botFolders = ["Todos", "Vendas", "Suporte"];

export default function AutomationsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("rules");
  const [selectedBotFolder, setSelectedBotFolder] = useState("Todos");

  const filteredAutomations = useMemo(
    () => mockAutomations.filter((a) => a.name.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const filteredBots = useMemo(
    () => mockBots.filter((b) => selectedBotFolder === "Todos" || b.folder === selectedBotFolder),
    [selectedBotFolder]
  );

  return (
    <AppLayout
      title="Automações"
      subtitle="Regras, sequências e bots"
      actions={
        <Button size="sm" className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground">
          <Plus className="h-3 w-3" />
          {activeTab === "rules" ? "Nova Automação" : activeTab === "sequences" ? "Nova Sequência" : activeTab === "bots" ? "Novo Bot" : "Novo Fluxo"}
        </Button>
      }
    >
      <div className="p-6 animate-fade-in">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="rules" className="text-xs gap-1.5">
              <Zap className="h-3 w-3" /> Regras e Automações
            </TabsTrigger>
            <TabsTrigger value="sequences" className="text-xs gap-1.5">
              <MessageSquare className="h-3 w-3" /> Mensagens e Sequências
            </TabsTrigger>
            <TabsTrigger value="bots" className="text-xs gap-1.5">
              <Bot className="h-3 w-3" /> Bots <ComingSoonBadge />
            </TabsTrigger>
            <TabsTrigger value="complex" className="text-xs gap-1.5">
              <Workflow className="h-3 w-3" /> Automações Complexas <ComingSoonBadge />
            </TabsTrigger>
          </TabsList>

          {/* ─── Rules & Automations ─── */}
          <TabsContent value="rules" className="space-y-4">
            {/* Search bar */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar automação..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {filteredAutomations.length} automação{filteredAutomations.length !== 1 ? "ões" : ""}
              </Badge>
            </div>

            {filteredAutomations.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma automação encontrada</p>
              </div>
            ) : (
              filteredAutomations.map((auto) => {
                const col = mockColumns.find((c) => c.id === auto.column_id);
                return (
                  <div
                    key={auto.id}
                    className="bg-card border border-border rounded-lg p-5 hover:border-border-hover transition-colors"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                            auto.active ? "bg-primary/10" : "bg-secondary"
                          }`}
                        >
                          <Zap className={`h-4 w-4 ${auto.active ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{auto.name}</h3>
                          {auto.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{auto.description}</p>
                          )}
                          {col && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: col.color }}
                              />
                              <span className="text-[10px] text-muted-foreground">{col.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={auto.active} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem className="text-xs gap-2">
                              <Settings className="h-3 w-3" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs gap-2">
                              <Copy className="h-3 w-3" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs gap-2 text-destructive">
                              <Trash2 className="h-3 w-3" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Trigger / Actions / Exceptions grid */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* Trigger */}
                      <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                        <p className="text-[10px] font-semibold text-success uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Target className="h-3 w-3" /> Gatilho
                        </p>
                        <p className="text-xs text-foreground">{triggerLabels[auto.trigger.type]}</p>
                        {auto.trigger.type === "time_in_column" && auto.trigger.config?.hours && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {String(auto.trigger.config.hours)}h na coluna
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                        <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <Cog className="h-3 w-3" /> Ações
                        </p>
                        <div className="space-y-1">
                          {auto.actions.map((a, i) => (
                            <p key={i} className="text-xs text-foreground flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                              {actionLabels[a.type]}
                              {a.comingSoon && <ComingSoonBadge />}
                            </p>
                          ))}
                        </div>
                      </div>

                      {/* Exceptions */}
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                        <p className="text-[10px] font-semibold text-destructive uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Exceções
                        </p>
                        {auto.exceptions.length > 0 ? (
                          auto.exceptions.map((e, i) => (
                            <p key={i} className="text-xs text-foreground flex items-center gap-1.5">
                              <span className="h-1 w-1 rounded-full bg-destructive shrink-0" />
                              Tag: {(e.config as Record<string, unknown>)?.tag as string}
                            </p>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Nenhuma</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* ─── Sequences ─── */}
          <TabsContent value="sequences" className="space-y-4">
            <div className="grid gap-3">
              {mockSequences.map((seq) => (
                <div
                  key={seq.id}
                  className="bg-card border border-border rounded-lg p-4 flex items-center justify-between hover:border-border-hover transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center">
                      <MessageSquare className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{seq.name}</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {seq.steps} etapas · {seq.channel === "whatsapp" ? "WhatsApp" : "E-mail"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={seq.active} />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1"
            >
              <Plus className="h-3 w-3" /> Nova Sequência
            </Button>
          </TabsContent>

          {/* ─── Bots (Typebot) ─── */}
          <TabsContent value="bots" className="space-y-4">
            {/* Folders sidebar + grid */}
            <div className="flex gap-4">
              {/* Folder list */}
              <div className="w-48 shrink-0 space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  Pastas
                </p>
                {botFolders.map((folder) => (
                  <button
                    key={folder}
                    onClick={() => setSelectedBotFolder(folder)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                      selectedBotFolder === folder
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {selectedBotFolder === folder ? (
                      <FolderOpen className="h-3.5 w-3.5" />
                    ) : (
                      <Folder className="h-3.5 w-3.5" />
                    )}
                    {folder}
                  </button>
                ))}
              </div>

              {/* Bot grid */}
              <div className="flex-1 grid grid-cols-3 gap-3">
                {filteredBots.map((bot) => (
                  <div
                    key={bot.id}
                    className="bg-card border border-border rounded-lg p-5 hover:border-border-hover transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Bot className="h-5 w-5 text-accent" />
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          bot.status === "published"
                            ? "border-success/40 text-success"
                            : "border-warning/40 text-warning"
                        }`}
                      >
                        {bot.status === "published" ? "Publicado" : "Rascunho"}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground">{bot.name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">{bot.folder}</p>
                  </div>
                ))}

                {/* Add bot card */}
                <div className="border border-dashed border-border rounded-lg p-5 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
                  <Plus className="h-6 w-6 mb-1" />
                  <span className="text-xs">Novo Bot</span>
                </div>
              </div>
            </div>
            <div className="text-center pt-2">
              <ComingSoonBadge />
              <p className="text-xs text-muted-foreground mt-2">
                Editor visual de bots com Typebot será integrado em breve.
              </p>
            </div>
          </TabsContent>

          {/* ─── Complex Automations (React Flow) ─── */}
          <TabsContent value="complex" className="space-y-4">
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {/* Canvas placeholder */}
              <div className="h-96 relative bg-secondary/30 flex flex-col items-center justify-center">
                {/* Grid pattern */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, hsl(var(--muted-foreground) / 0.3) 1px, transparent 1px)",
                    backgroundSize: "24px 24px",
                  }}
                />
                <div className="relative z-10 text-center">
                  <div className="h-14 w-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <GitBranch className="h-7 w-7 text-accent" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">
                    Automações Complexas
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                    Canvas visual com nodes e conexões para criar fluxos avançados estilo n8n.
                  </p>
                  <ComingSoonBadge />
                </div>

                {/* Decorative nodes */}
                <div className="absolute top-12 left-16 h-10 w-28 bg-card border border-border rounded-lg flex items-center gap-2 px-3 opacity-40">
                  <Zap className="h-3 w-3 text-success" />
                  <span className="text-[10px] text-foreground">Gatilho</span>
                </div>
                <div className="absolute top-32 left-56 h-10 w-28 bg-card border border-border rounded-lg flex items-center gap-2 px-3 opacity-40">
                  <Cog className="h-3 w-3 text-primary" />
                  <span className="text-[10px] text-foreground">Ação</span>
                </div>
                <div className="absolute bottom-20 right-24 h-10 w-28 bg-card border border-border rounded-lg flex items-center gap-2 px-3 opacity-40">
                  <MessageSquare className="h-3 w-3 text-accent" />
                  <span className="text-[10px] text-foreground">Mensagem</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
