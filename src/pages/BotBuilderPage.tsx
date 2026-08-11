import { useParams, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ReactFlowProvider, useReactFlow, useStore } from 'reactflow';
import { ArrowLeft, Loader2, Play, Pause, Check, CloudUpload, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BotCanvas } from '@/components/bots/BotCanvas';
import * as automationsRepo from '@/services/automations';
import { validateBotFlow, type FlowEdge, type FlowNode } from '@/lib/bot-validation';
import { toast } from 'sonner';

interface BotRow {
  id: string;
  name: string;
  status: 'published' | 'draft';
  nodes: unknown[];
  edges: unknown[];
  draft_nodes?: unknown[] | null;
  draft_edges?: unknown[] | null;
  trigger_type: string;
  trigger_value?: string;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const AUTOSAVE_DELAY_MS = 2000;

function BuilderHeader({ bot, onSaved }: { bot: BotRow; onSaved: (b: BotRow) => void }) {
  const navigate = useNavigate();
  const { getNodes, getEdges } = useReactFlow();
  const [publishing, setPublishing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [hasDraft, setHasDraft] = useState(!!bot.draft_nodes);
  const [current, setCurrent] = useState(bot);

  useEffect(() => { setCurrent(bot); }, [bot]);

  // Autosave do RASCUNHO. O engine lê nodes/edges (publicado), então digitar
  // aqui nunca altera o bot que está atendendo clientes.
  // Identidade das coleções, não o tamanho: editar o texto de um bloco não
  // muda a contagem, mas precisa disparar o autosave do mesmo jeito.
  const nodeStore = useStore((s) => s.nodeInternals);
  const edgeStore = useStore((s) => s.edges);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const firstRunRef = useRef(true);

  const saveDraft = useCallback(async () => {
    setSaveState('saving');
    try {
      await automationsRepo.saveBotDraft(current.id, getNodes(), getEdges());
      dirtyRef.current = false;
      setHasDraft(true);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [current.id, getNodes, getEdges]);

  useEffect(() => {
    // Não salva no primeiro render (montagem do canvas com o fluxo carregado).
    if (firstRunRef.current) { firstRunRef.current = false; return; }
    dirtyRef.current = true;
    setSaveState('idle');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(saveDraft, AUTOSAVE_DELAY_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [nodeStore, edgeStore, saveDraft]);

  // Rede de segurança: o autosave tem 2s de folga, fechar a aba antes disso
  // perderia a última edição.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const handlePublish = async () => {
    const nodes = getNodes() as unknown as FlowNode[];
    const edges = getEdges() as unknown as FlowEdge[];
    const issues = validateBotFlow(nodes, edges);
    if (issues.length > 0) {
      toast.error(`${issues.length} problema(s) impedem a publicação`, {
        description: issues.slice(0, 3).map((i) => i.message).join('\n'),
        duration: 8000,
      });
      return;
    }

    setPublishing(true);
    try {
      await automationsRepo.publishBot(current.id, nodes, edges);
      dirtyRef.current = false;
      setHasDraft(false);
      setSaveState('saved');
      toast.success('Fluxo publicado — já está atendendo');
      const updated = { ...current, nodes, edges, status: 'published' as const };
      setCurrent(updated);
      onSaved(updated);
    } catch (e: any) {
      toast.error(e.message ?? 'Erro ao publicar');
    } finally {
      setPublishing(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    const next = current.status === 'published' ? 'draft' : 'published';
    try {
      await automationsRepo.updateBot(current.id, { status: next });
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

  const saveLabel = saveState === 'saving' ? 'Salvando…'
    : saveState === 'saved' ? 'Rascunho salvo'
    : saveState === 'error' ? 'Falha ao salvar'
    : hasDraft ? 'Alterações não publicadas' : '';

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
            {hasDraft && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <AlertTriangle className="h-2.5 w-2.5" />
                Não publicado
              </Badge>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">Builder de Conversa</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {saveLabel && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            {saveState === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
            {saveState === 'saved' && <Check className="h-3 w-3" />}
            {saveLabel}
          </span>
        )}
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleToggle} disabled={toggling}>
          {toggling
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : current.status === 'published'
              ? <Pause className="h-3 w-3" />
              : <Play className="h-3 w-3" />}
          {current.status === 'published' ? 'Pausar' : 'Ativar'}
        </Button>
        <Button size="sm" className="h-8 gap-1.5 text-xs" onClick={handlePublish} disabled={publishing}>
          {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CloudUpload className="h-3 w-3" />}
          Publicar
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
    if (!id) { navigate("/automations?tab=bots"); return; }
    let alive = true;
    automationsRepo.getBotFull(id)
      .then((data) => {
        if (!alive) return;
        if (!data) { toast.error('Bot não encontrado'); navigate('/automations?tab=bots'); return; }
        setBot(data as BotRow);
        setLoading(false);
      })
      .catch(() => {
        if (!alive) return;
        toast.error('Bot não encontrado');
        navigate('/automations?tab=bots');
      });
    return () => { alive = false; };
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
          {/* Abre o rascunho quando existe — é onde o trabalho não publicado vive. */}
          <BotCanvas
            initialNodes={(bot.draft_nodes ?? bot.nodes) as any[]}
            initialEdges={(bot.draft_edges ?? bot.edges) as any[]}
          />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
