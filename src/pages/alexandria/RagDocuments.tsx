import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, Plus, Trash2, FileText, Sparkles, Search,
  Globe, Lock, BookOpen, FileCode2,
} from "lucide-react";
import { toast } from "sonner";
import { AnalyticsPanel } from "@/components/alexandria/AnalyticsPanel";
import { RAGIntegrationStatus } from "@/components/alexandria/RAGIntegrationStatus";
import { generateDocumentEmbeddings } from "@/services/embeddingService";
import { searchSimilarDocuments, SearchResult } from "@/services/ragSearchService";
import { useAuth } from "@/contexts/AuthContext";

interface LibraryDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  partition: string;
  created_at: string;
  is_global: boolean;
}

const WIKI_TYPE_OPTIONS = [
  { value: "artigo", label: "📄 Artigo" },
  { value: "processo", label: "📋 Processo" },
  { value: "politica", label: "🏛️ Política" },
  { value: "tutorial", label: "🎓 Tutorial" },
  { value: "referencia", label: "🔗 Referência" },
  { value: "outro", label: "📁 Outro" },
];

const RAG_TYPE_OPTIONS = [
  { value: "design_system", label: "🎨 Design System" },
  { value: "pops", label: "📋 POPs" },
  { value: "slas", label: "⏱️ SLAs" },
  { value: "client_info", label: "🏢 Cliente" },
  { value: "execution_history", label: "📊 Histórico" },
];

function typeLabel(type: string, partition: string) {
  const opts = partition === "wiki" ? WIKI_TYPE_OPTIONS : RAG_TYPE_OPTIONS;
  return opts.find((t) => t.value === type)?.label || type;
}

export default function BibliotecaPage() {
  const { user } = useAuth();
  const isMaster = user?.role === "master";

  const [allDocs, setAllDocs] = useState<LibraryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [embeddingStatus, setEmbeddingStatus] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});

  // Add form state — shared, reset on tab change
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("artigo");
  const [newIsGlobal, setNewIsGlobal] = useState(false);
  const [adding, setAdding] = useState(false);

  // Search (RAG tab only)
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rag_documents")
      .select("id, title, content, type, partition, created_at, is_global")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar documentos");
    } else {
      setAllDocs((data || []) as LibraryDocument[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleAdd = async (partition: "wiki" | "rag") => {
    if (!newTitle.trim()) return toast.error("Título obrigatório");
    if (partition === "rag" && !newContent.trim()) return toast.error("Conteúdo obrigatório para documentos RAG");
    if (newIsGlobal && !isMaster) return toast.error("Apenas master pode criar documentos globais");
    setAdding(true);
    const { error } = await supabase.from("rag_documents").insert({
      title: newTitle.trim(),
      content: newContent.trim(),
      type: newType,
      partition,
      is_global: newIsGlobal,
    });
    if (error) {
      toast.error("Erro ao adicionar documento");
    } else {
      toast.success("Documento adicionado");
      setNewTitle("");
      setNewContent("");
      setNewType(partition === "wiki" ? "artigo" : "client_info");
      setNewIsGlobal(false);
      fetchDocuments();
    }
    setAdding(false);
  };

  const handleDelete = async (doc: LibraryDocument) => {
    if (doc.is_global && !isMaster) return toast.error("Apenas master pode excluir documentos globais");
    const { error } = await supabase.from("rag_documents").delete().eq("id", doc.id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Documento excluído");
      setAllDocs((prev) => prev.filter((d) => d.id !== doc.id));
    }
  };

  const handleGenerateEmbeddings = async (id: string) => {
    setEmbeddingStatus((prev) => ({ ...prev, [id]: "loading" }));
    try {
      const result = await generateDocumentEmbeddings(id);
      setEmbeddingStatus((prev) => ({ ...prev, [id]: "done" }));
      toast.success(`Embeddings gerados: ${result.chunks} chunk(s)`);
    } catch (err: any) {
      setEmbeddingStatus((prev) => ({ ...prev, [id]: "error" }));
      toast.error(err.message || "Erro ao gerar embeddings");
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const results = await searchSimilarDocuments(searchQuery.trim());
      setSearchResults(results);
      if (results.length === 0) toast.info("Nenhum resultado encontrado");
    } catch (err: any) {
      toast.error(err.message || "Erro na busca semântica");
    }
    setSearching(false);
  };

  const embeddingIcon = (id: string) => {
    const status = embeddingStatus[id] || "idle";
    if (status === "loading") return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status === "done") return <span className="text-xs">✅</span>;
    if (status === "error") return <span className="text-xs">❌</span>;
    return <Sparkles className="h-4 w-4" />;
  };

  const wikiDocs = allDocs.filter((d) => d.partition === "wiki");
  const ragDocs = allDocs.filter((d) => d.partition === "rag" || !d.partition);

  function DocList({ docs, partition }: { docs: LibraryDocument[]; partition: "wiki" | "rag" }) {
    if (loading) return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
    if (docs.length === 0) return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p>Nenhum documento cadastrado</p>
      </div>
    );
    return (
      <div className="space-y-2">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className={`flex items-center justify-between rounded-lg border px-4 py-3 ${
              doc.is_global ? "border-primary/20 bg-primary/5" : "border-border/50"
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{doc.title}</p>
                {doc.is_global && (
                  <Badge variant="outline" className="text-xs shrink-0">
                    <Globe className="h-3 w-3 mr-1" />Global
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {typeLabel(doc.type, doc.partition)} · {new Date(doc.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {partition === "rag" && (doc.is_global ? isMaster : true) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleGenerateEmbeddings(doc.id)}
                  disabled={embeddingStatus[doc.id] === "loading"}
                  title="Gerar Embeddings"
                >
                  {embeddingIcon(doc.id)}
                </Button>
              )}
              {(doc.is_global ? isMaster : true) ? (
                <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              ) : (
                <Lock className="h-4 w-4 text-muted-foreground mx-2" />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function AddForm({ partition }: { partition: "wiki" | "rag" }) {
    const typeOptions = partition === "wiki" ? WIKI_TYPE_OPTIONS : RAG_TYPE_OPTIONS;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {partition === "wiki" ? "Adicionar Artigo" : "Adicionar Documento .MD"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            placeholder="Título"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Textarea
            placeholder={
              partition === "wiki"
                ? "Conteúdo do artigo..."
                : "Cole o conteúdo Markdown aqui..."
            }
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={5}
            className={partition === "rag" ? "font-mono text-sm" : ""}
          />
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[180px]">
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOptions.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isMaster && (
              <div className="flex items-center gap-2">
                <Switch checked={newIsGlobal} onCheckedChange={setNewIsGlobal} id={`global-${partition}`} />
                <label htmlFor={`global-${partition}`} className="text-sm flex items-center gap-1 cursor-pointer">
                  <Globe className="h-3.5 w-3.5" />Global
                </label>
              </div>
            )}
            <Button onClick={() => handleAdd(partition)} disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Biblioteca
        </h1>

        <Tabs defaultValue="wiki">
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="wiki" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Wiki
            </TabsTrigger>
            <TabsTrigger value="rag" className="flex items-center gap-1.5">
              <FileCode2 className="h-4 w-4" />
              RAG (.md)
            </TabsTrigger>
          </TabsList>

          {/* ─── WIKI TAB ─── */}
          <TabsContent value="wiki" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Artigos e arquivos gerais para referência da equipe. Não são indexados para busca semântica.
            </p>
            <AddForm partition="wiki" />
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Artigos ({wikiDocs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocList docs={wikiDocs} partition="wiki" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── RAG TAB ─── */}
          <TabsContent value="rag" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Documentos Markdown indexados para busca semântica. O assistente de IA usa este conteúdo para responder perguntas.
            </p>

            {/* Semantic Search */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">🔍 Busca Semântica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Pergunta para buscar documentos similares..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
                {searchResults && searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((r, i) => (
                      <div key={i} className="rounded-lg border border-border/50 p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{r.title}</p>
                          <span className="text-xs text-primary font-mono">
                            {(r.similarity * 100).toFixed(1)}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{typeLabel(r.type, "rag")}</p>
                        <p className="text-sm text-foreground/80 line-clamp-3">{r.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                {searchResults?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum resultado. Gere embeddings para os documentos primeiro.
                  </p>
                )}
              </CardContent>
            </Card>

            <AddForm partition="rag" />

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Documentos RAG ({ragDocs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <DocList docs={ragDocs} partition="rag" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">📊 Analytics</CardTitle></CardHeader>
              <CardContent><AnalyticsPanel /></CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">🔧 Status da Integração</CardTitle></CardHeader>
              <CardContent><RAGIntegrationStatus /></CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
