import { useState, useEffect, useCallback } from "react";
import { Bot, Plus, Settings, Zap, MessageSquare, ShieldCheck, Loader2, Power, Trash2, X, Save, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AIAgent {
  id: string;
  name: string;
  description: string;
  model: string;
  system_prompt: string;
  status: "active" | "inactive";
  icon: string;
  created_at: string;
}

const ICON_MAP: Record<string, typeof Bot> = {
  Zap: Zap,
  ShieldCheck: ShieldCheck,
  MessageSquare: MessageSquare,
  Bot: Bot,
  Brain: Brain,
};

const MODEL_OPTIONS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
];

const ICON_OPTIONS = [
  { value: "Bot", label: "🤖 Bot" },
  { value: "Zap", label: "⚡ Qualificador" },
  { value: "ShieldCheck", label: "🛡️ Suporte" },
  { value: "MessageSquare", label: "💬 Vendas" },
  { value: "Brain", label: "🧠 Inteligência" },
];

const DEFAULT_PROMPTS: Record<string, string> = {
  qualificador: "Você é um agente qualificador de leads. Faça perguntas estratégicas para entender o perfil do lead, orçamento, timeline de compra e nível de interesse. Sempre seja cordial e objetivo.",
  suporte: "Você é um agente de suporte ao cliente. Responda dúvidas frequentes com base na base de conhecimento disponível. Se não souber a resposta, encaminhe para um atendente humano.",
  vendas: "Você é um agente comercial. Conduza conversas de vendas de forma consultiva, identifique necessidades, apresente soluções e agende reuniões quando apropriado.",
};

export function AgentsTab() {
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formModel, setFormModel] = useState("gemini-2.5-flash");
  const [formPrompt, setFormPrompt] = useState("");
  const [formIcon, setFormIcon] = useState("Bot");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("inactive");

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from as any)("integrations")
        .select("*")
        .eq("provider", "ai_agent")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const parsed: AIAgent[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.config?.name || "Agente",
        description: row.config?.description || "",
        model: row.config?.model || "gemini-2.5-flash",
        system_prompt: row.config?.system_prompt || "",
        status: row.status === "connected" ? "active" : "inactive",
        icon: row.config?.icon || "Bot",
        created_at: row.created_at,
      }));

      setAgents(parsed);
    } catch (err) {
      console.error("Error loading agents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const openNewAgent = () => {
    setIsNew(true);
    setFormName("");
    setFormDescription("");
    setFormModel("gemini-2.5-flash");
    setFormPrompt("");
    setFormIcon("Bot");
    setFormStatus("inactive");
    setEditingAgent({} as AIAgent);
  };

  const openEditAgent = (agent: AIAgent) => {
    setIsNew(false);
    setFormName(agent.name);
    setFormDescription(agent.description);
    setFormModel(agent.model);
    setFormPrompt(agent.system_prompt);
    setFormIcon(agent.icon);
    setFormStatus(agent.status);
    setEditingAgent(agent);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error("Nome do agente é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const config = {
        name: formName.trim(),
        description: formDescription.trim(),
        model: formModel,
        system_prompt: formPrompt.trim(),
        icon: formIcon,
      };

      if (isNew) {
        const { data: userData } = await supabase.auth.getUser();
        const clientId = userData.user?.user_metadata?.client_id || "c1";

        const { error } = await (supabase.from as any)("integrations").insert({
          client_id: clientId,
          provider: "ai_agent",
          status: formStatus === "active" ? "connected" : "disconnected",
          config,
        });

        if (error) throw error;
        toast.success("Agente criado com sucesso!");
      } else {
        const { error } = await (supabase.from as any)("integrations")
          .update({
            status: formStatus === "active" ? "connected" : "disconnected",
            config,
          })
          .eq("id", editingAgent!.id);

        if (error) throw error;
        toast.success("Agente atualizado!");
      }

      setEditingAgent(null);
      await fetchAgents();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar agente");
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = async (agent: AIAgent) => {
    const newStatus = agent.status === "active" ? "disconnected" : "connected";
    const { error } = await (supabase.from as any)("integrations")
      .update({ status: newStatus })
      .eq("id", agent.id);

    if (error) {
      toast.error("Erro ao alternar status");
      return;
    }

    setAgents(prev => prev.map(a =>
      a.id === agent.id
        ? { ...a, status: newStatus === "connected" ? "active" : "inactive" }
        : a
    ));
    toast.success(`Agente ${newStatus === "connected" ? "ativado" : "desativado"}`);
  };

  const deleteAgent = async (id: string) => {
    if (!confirm("Deseja realmente excluir este agente?")) return;
    const { error } = await (supabase.from as any)("integrations").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir agente");
      return;
    }
    setAgents(prev => prev.filter(a => a.id !== id));
    toast.success("Agente removido");
  };

  const applyTemplate = (template: string) => {
    setFormPrompt(DEFAULT_PROMPTS[template] || "");
    toast.info("Template de prompt aplicado");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Configure agentes de IA especializados para automatizar interações.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            {agents.filter(a => a.status === "active").length} ativo(s) de {agents.length} agente(s)
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={openNewAgent}>
          <Plus className="h-4 w-4" /> Novo Agente
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-card ghost-border rounded-xl p-12 text-center">
          <Bot className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
          <h3 className="text-sm font-semibold text-foreground mb-1">Nenhum agente configurado</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Crie agentes de IA para qualificar leads, dar suporte ou conduzir vendas automaticamente.
          </p>
          <Button size="sm" variant="outline" onClick={openNewAgent}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Criar primeiro agente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((agent) => {
            const IconComp = ICON_MAP[agent.icon] || Bot;
            return (
              <div key={agent.id} className="bg-card ghost-border rounded-xl p-5 space-y-3 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <IconComp className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge
                      className={`text-[9px] px-2 py-0 h-5 border-none font-bold ${
                        agent.status === "active"
                          ? "bg-success/20 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {agent.status === "active" ? "Ativo" : "Inativo"}
                    </Badge>
                    <Switch
                      checked={agent.status === "active"}
                      onCheckedChange={() => toggleAgent(agent)}
                      className="scale-75"
                    />
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{agent.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{agent.description}</p>
                </div>
                <div className="flex items-center justify-between pt-2 ghost-border border-t">
                  <span className="text-[10px] text-muted-foreground">
                    Modelo: {MODEL_OPTIONS.find(m => m.value === agent.model)?.label || agent.model}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditAgent(agent)}>
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAgent(agent.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit/Create Modal */}
      <Dialog open={!!editingAgent} onOpenChange={(v) => { if (!v) setEditingAgent(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              {isNew ? "Novo Agente IA" : `Editar: ${formName}`}
            </DialogTitle>
            <DialogDescription>
              Configure o comportamento e personalidade do agente.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nome</Label>
                <Input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: Qualificador"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Ícone</Label>
                <Select value={formIcon} onValueChange={setFormIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                placeholder="Descreva o papel deste agente..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Modelo de IA</Label>
                <Select value={formModel} onValueChange={setFormModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input">
                  <Switch
                    checked={formStatus === "active"}
                    onCheckedChange={(v) => setFormStatus(v ? "active" : "inactive")}
                  />
                  <span className="text-sm">{formStatus === "active" ? "Ativo" : "Inativo"}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">System Prompt</Label>
                <div className="flex gap-1">
                  {Object.keys(DEFAULT_PROMPTS).map(key => (
                    <button
                      key={key}
                      onClick={() => applyTemplate(key)}
                      className="text-[9px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors capitalize"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                className="min-h-[120px] text-xs"
                value={formPrompt}
                onChange={e => setFormPrompt(e.target.value)}
                placeholder="Defina a personalidade e instruções para o agente..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setEditingAgent(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                {isNew ? "Criar Agente" : "Salvar Alterações"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
