import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ReactFlowProvider, useReactFlow } from 'reactflow';
import { ArrowLeft, Save, Loader2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BotCanvas } from '@/components/bots/BotCanvas';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BotRow {
  id: string;
  name: string;
  status: 'published' | 'draft';
  nodes: unknown[];
  edges: unknown[];
  trigger_type: string;
  trigger_value?: string;
}

function BuilderInner({ bot, onSaved }: { bot: BotRow; onSaved: (b: BotRow) => void }) {
  const { getNodes, getEdges } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase.from as any)('bots').update({
        nodes: getNodes(),
        edges: getEdges(),
      }).eq('id', bot.id);
      if (error) throw error;
      toast.success('Fluxo salvo');
      onSaved({ ...bot, nodes: getNodes(), edges: getEdges() });
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    const next = bot.status === 'published' ? 'draft' : 'published';
    try {
      const { error } = await (supabase.from as any)('bots').update({ status: next }).eq('id', bot.id);
      if (error) throw error;
      toast.success(next === 'published' ? 'Bot ativado' : 'Bot pausado');
      onSaved({ ...bot, status: next });
    } catch (e: any) {
      toast.error(e.message ?? 'Erro');
    } finally {
      setToggling(false);
    }
  };

  return (
    <BotCanvas
      initialNodes={bot.nodes as any[]}
      initialEdges={bot.edges as any[]}
      onNodesChange={() => {}}
      onEdgesChange={() => {}}
    />
  );

  // We only use the inner canvas but expose save/toggle via the outer header.
  // The actual save reads from ReactFlow context, so header must be inside ReactFlowProvider.
  void handleSave; void handleToggle;
}

function BuilderHeader({ bot, onSaved }: { bot: BotRow; onSaved: (b: BotRow) => void }) {
  const navigate = useNavigate();
  const { getNodes, getEdges } = useReactFlow();
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [current, setCurrent] = useState(bot);

  useEffect(() => { setCurrent(bot); }, [bot]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await (supabase.from as any)('bots').update({
        nodes: getNodes(),
        edges: getEdges(),
      }).eq('id', current.id);
      if (error) throw error;
      toast.success('Fluxo salvo');
      const updated = { ...current, nodes: getNodes(), edges: getEdges() };
      setCurrent(updated);
      onSaved(updated);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    const next = current.status === 'published' ? 'draft' : 'published';
    try {
      const { error } = await (supabase.from as any)('bots').update({ status: next }).eq('id', current.id);
      if (error) throw error;
      toast.success(next === 'published' ? 'Bot ativado — receberá mensagens' : 'Bot pausado');
      const updated = { ...current, status: next as 'published' | 'draft' };
      setCurrent(updated);
      onSaved(updated);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro');
    } finally {
      setToggling(false);
    }
  };

  return (
    <header className="h-14 shrink-0 bg-card border-b border-[hsl(var(--border-strong))] px-4 flex items-center justify-between z-20">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => navigate('/automations?tab=bots')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-foreground">{current.name}</h1>
            <Badge variant={current.status === 'published' ? 'success' : 'secondary'} className="text-[10px]">
              {current.status === 'published' ? 'Ativo' : 'Rascunho'}
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground">Builder de Conversa</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleToggle} disabled={toggling}>
          {toggling
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : current.status === 'published'
              ? <Pause className="h-3 w-3" />
              : <Play className="h-3 w-3" />}
          {current.status === 'published' ? 'Pausar' : 'Ativar'}
        </Button>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
          Salvar
        </Button>
      </div>
    </header>
  );
}

export default function BotBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bot, setBot] = useState<BotRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (supabase.from as any)('bots')
      .select('id, name, status, nodes, edges, trigger_type, trigger_value')
      .eq('id', id)
      .single()
      .then(({ data, error }: any) => {
        if (error || !data) { toast.error('Bot não encontrado'); navigate('/automations?tab=bots'); return; }
        setBot(data as BotRow);
        setLoading(false);
      });
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!bot) return null;

  return (
    <ReactFlowProvider>
      <div className="w-full h-screen flex flex-col bg-background overflow-hidden">
        <BuilderHeader bot={bot} onSaved={setBot} />
        <div className="flex-1 bg-secondary relative overflow-hidden">
          <BotCanvas
            initialNodes={bot.nodes as any[]}
            initialEdges={bot.edges as any[]}
          />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
