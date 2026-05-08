import { useState } from "react";
import { Bot, Copy, FolderOpen, Folder, Plus, Settings, Loader2, Trash2, ExternalLink, Zap } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface BotRow {
  id: string;
  name: string;
  folder: string;
  status: "published" | "draft";
  trigger_type: string;
  created_at: string;
}

const ALL_FOLDER = "Todos";

const triggerLabels: Record<string, string> = {
  manual: "Manual",
  keyword: "Palavra-chave",
  new_lead: "Novo Lead",
};

function BotFormDialog({
  open,
  onOpenChange,
  initial,
  clientId,
  existingFolders,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: BotRow | null;
  clientId: string;
  existingFolders: string[];
  onSaved: (id?: string) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [folder, setFolder] = useState(initial?.folder ?? "Geral");
  const [status, setStatus] = useState<"published" | "draft">(initial?.status ?? "draft");
  const [saving, setSaving] = useState(false);

  const isNew = !initial;

  async function handleSave() {
    if (!name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSaving(true);
    try {
      if (isNew) {
        const { data, error } = await supabase.from("bots").insert({
          client_id: clientId,
          name: name.trim(),
          folder: folder.trim() || "Geral",
          status,
          embed_url: "",
          nodes: [],
          edges: [],
          trigger_type: "manual",
        }).select("id").single();
        if (error) throw error;
        toast.success("Bot criado!");
        onSaved(data?.id);
      } else {
        const { error } = await supabase.from("bots").update({
          name: name.trim(),
          folder: folder.trim() || "Geral",
          status,
        }).eq("id", initial.id);
        if (error) throw error;
        toast.success("Bot atualizado");
        onSaved();
      }
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar bot");
    } finally {
      setSaving(false);
    }
  }

  const folders = Array.from(new Set(["Geral", ...existingFolders]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold">
            {isNew ? "Novo Bot" : "Editar Bot"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Qualificação Inicial" className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Pasta</Label>
            <Input value={folder} onChange={(e) => setFolder(e.target.value)}
              placeholder="Ex: Vendas" list="folder-suggestions" className="h-8 text-xs" />
            <datalist id="folder-suggestions">
              {folders.map((f) => <option key={f} value={f} />)}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status inicial</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "published" | "draft")}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft" className="text-xs">Rascunho</SelectItem>
                <SelectItem value="published" className="text-xs">Ativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" className="text-xs" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
            {isNew ? "Criar e Abrir Builder" : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BotsTab() {
  const { user } = useAuth();
  const clientId = user?.client_id ?? "";
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedFolder, setSelectedFolder] = useState(ALL_FOLDER);
  const [selectedBot, setSelectedBot] = useState<BotRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BotRow | null>(null);

  const { data: bots = [], isLoading } = useQuery<BotRow[]>({
    queryKey: ["bots", clientId],
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase.from("bots")
        .select("id, name, folder, status, trigger_type, created_at")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BotRow[];
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });

  const folders = [ALL_FOLDER, ...Array.from(new Set(bots.map((b) => b.folder)))];
  const filtered = bots.filter((b) => selectedFolder === ALL_FOLDER || b.folder === selectedFolder);
  const existingFolders = Array.from(new Set(bots.map((b) => b.folder)));

  function refresh() { queryClient.invalidateQueries({ queryKey: ["bots", clientId] }); }

  async function handleDuplicate(bot: BotRow) {
    const { data: src } = await supabase.from("bots")
      .select("nodes, edges, trigger_type, trigger_value")
      .eq("id", bot.id).single();
    const { error } = await supabase.from("bots").insert({
      client_id: clientId,
      name: `${bot.name} (cópia)`,
      folder: bot.folder,
      status: "draft",
      embed_url: "",
      nodes: src?.nodes ?? [],
      edges: src?.edges ?? [],
      trigger_type: src?.trigger_type ?? "manual",
      trigger_value: src?.trigger_value,
    });
    if (error) { toast.error("Erro ao duplicar"); return; }
    toast.success("Bot duplicado");
    refresh();
  }

  async function handleDelete(bot: BotRow) {
    const { error } = await supabase.from("bots").delete().eq("id", bot.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    if (selectedBot?.id === bot.id) setSelectedBot(null);
    toast.success("Bot excluído");
    refresh();
  }

  function handleFormSaved(newId?: string) {
    refresh();
    if (newId) navigate(`/bots/${newId}`);
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col bg-card border border-[hsl(var(--border-strong))] rounded-card overflow-hidden">
        <div className="p-3 border-b border-[hsl(var(--border-strong))] flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground">Bots</h3>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Folders */}
        <div className="px-2 pt-2 pb-1 space-y-0.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-2">Pastas</p>
          {folders.map((folder) => (
            <button key={folder} onClick={() => setSelectedFolder(folder)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                selectedFolder === folder ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-secondary"
              }`}>
              {selectedFolder === folder ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
              {folder}
              <Badge variant="outline" className="text-[10px] ml-auto h-4 px-1.5">
                {folder === ALL_FOLDER ? bots.length : bots.filter((b) => b.folder === folder).length}
              </Badge>
            </button>
          ))}
        </div>

        {/* Bot list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bot className="h-6 w-6 mb-2 opacity-30" />
              <p className="text-[10px]">Nenhum bot</p>
            </div>
          ) : (
            filtered.map((bot) => {
              const isActive = selectedBot?.id === bot.id;
              return (
                <button key={bot.id} onClick={() => setSelectedBot(bot)}
                  className={`w-full text-left rounded-lg p-3 transition-all duration-200 border ${
                    isActive
                      ? "bg-primary/10 border-[hsl(var(--border-strong))]"
                      : "hover:bg-secondary border-transparent"
                  }`}>
                  <div className="flex items-start gap-2">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "bg-primary/20" : "bg-accent/10"}`}>
                      <Bot className={`h-4 w-4 ${isActive ? "text-primary" : "text-accent"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{bot.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Zap className="h-2.5 w-2.5 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">{triggerLabels[bot.trigger_type] ?? bot.trigger_type}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[9px] shrink-0 ${
                      bot.status === "published" ? "border-success/40 text-success" : "border-warning/40 text-warning"
                    }`}>
                      {bot.status === "published" ? "Ativo" : "Rascunho"}
                    </Badge>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col bg-card border border-[hsl(var(--border-strong))] rounded-card overflow-hidden">
        {selectedBot ? (
          <>
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[hsl(var(--border-strong))]">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{selectedBot.name}</h3>
                <Badge variant="outline" className={`text-[10px] ${
                  selectedBot.status === "published" ? "border-success/40 text-success" : "border-warning/40 text-warning"
                }`}>
                  {selectedBot.status === "published" ? "Ativo" : "Rascunho"}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="text-xs gap-1 h-7" onClick={() => handleDuplicate(selectedBot)}>
                  <Copy className="h-3 w-3" /> Duplicar
                </Button>
                <Button size="sm" variant="ghost" className="text-xs gap-1 h-7"
                  onClick={() => { setEditing(selectedBot); setFormOpen(true); }}>
                  <Settings className="h-3 w-3" /> Renomear
                </Button>
                <Button size="sm" variant="ghost" className="text-xs gap-1.5 h-7 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(selectedBot)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Preview / Open builder */}
            <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 bg-secondary/30">
              <div className="h-16 w-16 rounded-card bg-primary/10 flex items-center justify-center">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="text-sm font-semibold text-foreground mb-1">{selectedBot.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Gatilho: {triggerLabels[selectedBot.trigger_type] ?? selectedBot.trigger_type}
                </p>
              </div>
              <Button className="gap-2" onClick={() => navigate(`/bots/${selectedBot.id}`)}>
                <ExternalLink className="h-4 w-4" /> Abrir Builder
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Edite o fluxo de conversa no builder visual
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-16 w-16 rounded-card bg-accent/10 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Selecione um bot</h3>
            <p className="text-xs text-muted-foreground max-w-xs mb-4">
              Escolha um bot na lista ou crie um novo para construir seu fluxo de conversa.
            </p>
            <Button size="sm" className="text-xs gap-1.5"
              onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-3.5 w-3.5" /> Criar Bot
            </Button>
          </div>
        )}
      </div>

      <BotFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        clientId={clientId}
        existingFolders={existingFolders}
        onSaved={handleFormSaved}
      />
    </div>
  );
}
