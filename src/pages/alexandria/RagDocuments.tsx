import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, FileText, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";
import { AnalyticsPanel } from "@/components/alexandria/AnalyticsPanel";
import { RAGIntegrationStatus } from "@/components/alexandria/RAGIntegrationStatus";
import { generateDocumentEmbeddings } from "@/services/embeddingService";
import { searchSimilarDocuments, SearchResult } from "@/services/ragSearchService";

interface RagDocument {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
}

const TYPE_OPTIONS = [
  { value: "design_system", label: "🎨 Design System" },
  { value: "pops", label: "📋 POPs" },
  { value: "slas", label: "⏱️ SLAs" },
  { value: "client_info", label: "🏢 Cliente" },
  { value: "execution_history", label: "📊 Histórico" },
];

export default function RagDocumentsPage() {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newType, setNewType] = useState("client_info");
  const [embeddingStatus, setEmbeddingStatus] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});

  // Semantic search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rag_documents")
      .select("id, title, content, type, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar documentos");
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleAdd = async () => {
    if (!newTitle.trim()) return toast.error("Título obrigatório");
    setAdding(true);
    const { error } = await supabase.from("rag_documents").insert({
      title: newTitle.trim(),
      content: newContent.trim(),
      type: newType,
    });
    if (error) {
      toast.error("Erro ao adicionar documento");
    } else {
      toast.success("Documento adicionado");
      setNewTitle("");
      setNewContent("");
      setNewType("client_info");
      fetchDocuments();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("rag_documents").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Documento excluído");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
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

  const typeLabel = (type: string) =>
    TYPE_OPTIONS.find((t) => t.value === type)?.label || type;

  const embeddingIcon = (id: string) => {
    const status = embeddingStatus[id] || "idle";
    if (status === "loading") return <Loader2 className="h-4 w-4 animate-spin" />;
    if (status === "done") return <span className="text-xs">✅</span>;
    if (status === "error") return <span className="text-xs">❌</span>;
    return <Sparkles className="h-4 w-4" />;
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold">📚 Alexandria — Documentos RAG</h1>

        {/* Semantic Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔍 Busca Semântica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Digite sua pergunta para buscar documentos similares..."
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
                    <p className="text-xs text-muted-foreground">{typeLabel(r.type)}</p>
                    <p className="text-sm text-foreground/80 line-clamp-3">{r.content}</p>
                  </div>
                ))}
              </div>
            )}
            {searchResults && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                Nenhum resultado. Gere embeddings para os documentos primeiro.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Add Document */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adicionar Documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Título do documento"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <Textarea
              placeholder="Conteúdo..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
            />
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={adding}>
                {adding ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                Adicionar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentos ({documents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p>Nenhum documento cadastrado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabel(doc.type)} · {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleGenerateEmbeddings(doc.id)}
                        disabled={embeddingStatus[doc.id] === "loading"}
                        title="Gerar Embeddings"
                      >
                        {embeddingIcon(doc.id)}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Analytics Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <AnalyticsPanel />
          </CardContent>
        </Card>

        {/* Status Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔧 Status da Integração</CardTitle>
          </CardHeader>
          <CardContent>
            <RAGIntegrationStatus />
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
