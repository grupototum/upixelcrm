import { useState, useEffect, useCallback, useRef } from "react";
import { BookOpen, Upload, FileText, Trash2, Loader2, Sparkles, Search, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateDocumentEmbeddings } from "@/services/embeddingService";

interface RagDoc {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
  is_global: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  design_system: "🎨 Design System",
  pops: "📋 POPs",
  slas: "⏱️ SLAs",
  client_info: "🏢 Cliente",
  execution_history: "📊 Histórico",
  uploaded_file: "📎 Arquivo",
};

export function KnowledgeBaseTab() {
  const [documents, setDocuments] = useState<RagDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [embeddingStatus, setEmbeddingStatus] = useState<Record<string, "idle" | "loading" | "done" | "error">>({});
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rag_documents")
      .select("id, title, content, type, created_at, is_global")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setDocuments(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const processFile = async (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error(`Arquivo "${file.name}" excede o limite de 10MB.`);
      return;
    }

    const validTypes = [
      "text/plain",
      "text/markdown",
      "text/csv",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const validExts = [".txt", ".md", ".csv", ".pdf", ".docx"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      toast.error(`Tipo de arquivo não suportado: ${file.name}`);
      return;
    }

    setUploading(true);
    try {
      let content = "";

      // For text-based files, read content directly
      if (file.type === "text/plain" || file.type === "text/markdown" || file.type === "text/csv" || ext === ".txt" || ext === ".md" || ext === ".csv") {
        content = await file.text();
      } else {
        // For PDF/DOCX, upload to storage and extract text placeholder
        const filePath = `rag-uploads/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(filePath, file);

        if (uploadError) {
          toast.error(`Erro no upload: ${uploadError.message}`);
          return;
        }

        const { data: urlData } = supabase.storage
          .from("media")
          .getPublicUrl(filePath);

        content = `[Arquivo carregado: ${file.name}]\nURL: ${urlData.publicUrl}\n\n[O conteúdo deste arquivo pode ser extraído manualmente ou via processamento futuro. Copie e cole o conteúdo do documento aqui para gerar embeddings de alta qualidade.]`;
      }

      // Insert into rag_documents
      const { error: insertError } = await supabase.from("rag_documents").insert({
        title: file.name.replace(/\.[^.]+$/, ""),
        content: content.slice(0, 50000), // Limit to 50k chars
        type: "uploaded_file",
        is_global: false,
      });

      if (insertError) {
        toast.error(`Erro ao salvar documento: ${insertError.message}`);
        return;
      }

      toast.success(`"${file.name}" adicionado com sucesso!`);
      await fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || "Erro no processamento do arquivo");
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await processFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    for (const file of Array.from(files)) {
      await processFile(file);
    }
  };

  const handleDelete = async (doc: RagDoc) => {
    const { error } = await supabase.from("rag_documents").delete().eq("id", doc.id);
    if (error) {
      toast.error("Erro ao excluir documento");
    } else {
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      toast.success("Documento excluído");
    }
  };

  const handleGenerateEmbeddings = async (id: string) => {
    setEmbeddingStatus(prev => ({ ...prev, [id]: "loading" }));
    try {
      const result = await generateDocumentEmbeddings(id);
      setEmbeddingStatus(prev => ({ ...prev, [id]: "done" }));
      toast.success(`Embeddings gerados: ${result.chunks} chunk(s)`);
    } catch (err: any) {
      setEmbeddingStatus(prev => ({ ...prev, [id]: "error" }));
      toast.error(err.message || "Erro ao gerar embeddings");
    }
  };

  const filteredDocs = searchQuery.trim()
    ? documents.filter(d =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : documents;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Faça upload de documentos para treinar os agentes de IA e enriquecer o assistente com RAG.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {documents.length} documento(s) na base de conhecimento
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload de Arquivo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.csv,.pdf,.docx"
          multiple
          onChange={handleFileSelect}
        />
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center bg-card cursor-pointer transition-all duration-300 ${
          dragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border hover:border-primary/40 hover:bg-secondary/30"
        }`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-medium text-foreground">Processando arquivo...</p>
          </div>
        ) : (
          <>
            <BookOpen className={`h-10 w-10 mx-auto mb-3 transition-colors ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
            <h3 className="text-sm font-semibold text-foreground mb-1">
              {dragOver ? "Solte aqui para fazer upload" : "Arraste arquivos ou clique para enviar"}
            </h3>
            <p className="text-xs text-muted-foreground">TXT, MD, CSV, PDF, DOCX — máx. 10MB por arquivo</p>
          </>
        )}
      </div>

      {/* Search */}
      {documents.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
            placeholder="Buscar documentos..."
          />
        </div>
      )}

      {/* File list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="bg-card ghost-border rounded-xl py-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "Nenhum resultado encontrado" : "Nenhum documento na base de conhecimento"}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Faça upload de arquivos para começar
          </p>
        </div>
      ) : (
        <div className="bg-card ghost-border rounded-xl divide-y divide-border overflow-hidden">
          {filteredDocs.map((doc) => {
            const status = embeddingStatus[doc.id] || "idle";
            return (
              <div key={doc.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {TYPE_LABELS[doc.type] || doc.type}
                      </span>
                      <span className="text-xs text-muted-foreground/50">·</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="text-xs text-muted-foreground/50">·</span>
                      <span className="text-xs text-muted-foreground">
                        {doc.content.length > 1000 ? `${(doc.content.length / 1000).toFixed(1)}k chars` : `${doc.content.length} chars`}
                      </span>
                      {doc.is_global && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Global</Badge>
                      )}
                      {status === "done" && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-success/20 text-success border-none">Embeddings ✓</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleGenerateEmbeddings(doc.id)}
                    disabled={status === "loading"}
                    title="Gerar Embeddings"
                  >
                    {status === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : status === "done" ? (
                      <span className="text-xs">✅</span>
                    ) : status === "error" ? (
                      <span className="text-xs">❌</span>
                    ) : (
                      <Sparkles className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(doc)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Link to full Alexandria */}
      <div className="flex justify-center">
        <a
          href="/alexandria/rag"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          Gerenciar documentos completos no Alexandria
        </a>
      </div>
    </div>
  );
}
