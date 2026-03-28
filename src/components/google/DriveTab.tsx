import { useState } from "react";
import { FileText, Image, Sheet, Presentation, FolderOpen, ExternalLink, Search, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DriveFile {
  id: string;
  name: string;
  type: "doc" | "sheet" | "slide" | "image" | "pdf" | "folder";
  size: string;
  modified: string;
  owner: string;
}

const fileIcons: Record<DriveFile["type"], { icon: typeof FileText; color: string }> = {
  doc: { icon: FileText, color: "text-blue-500" },
  sheet: { icon: Sheet, color: "text-success" },
  slide: { icon: Presentation, color: "text-amber-500" },
  image: { icon: Image, color: "text-pink-500" },
  pdf: { icon: FileText, color: "text-destructive" },
  folder: { icon: FolderOpen, color: "text-muted-foreground" },
};

const typeLabels: Record<DriveFile["type"], string> = {
  doc: "Documento",
  sheet: "Planilha",
  slide: "Apresentação",
  image: "Imagem",
  pdf: "PDF",
  folder: "Pasta",
};

const mockFiles: DriveFile[] = [
  { id: "1", name: "Proposta Comercial — Q2 2026", type: "doc", size: "245 KB", modified: "Hoje, 10:30", owner: "Você" },
  { id: "2", name: "Pipeline de Vendas", type: "sheet", size: "1.2 MB", modified: "Hoje, 08:15", owner: "Você" },
  { id: "3", name: "Apresentação Institucional", type: "slide", size: "8.7 MB", modified: "Ontem", owner: "Carlos Silva" },
  { id: "4", name: "Relatório Mensal — Março", type: "pdf", size: "3.1 MB", modified: "25 Mar", owner: "Ana Beatriz" },
  { id: "5", name: "Logo uPixel — versão final", type: "image", size: "520 KB", modified: "24 Mar", owner: "Você" },
  { id: "6", name: "Contratos Clientes", type: "folder", size: "—", modified: "22 Mar", owner: "Você" },
  { id: "7", name: "Métricas de Campanha", type: "sheet", size: "890 KB", modified: "20 Mar", owner: "Roberto Mendes" },
  { id: "8", name: "Briefing Evento 2026", type: "doc", size: "178 KB", modified: "18 Mar", owner: "Fernanda Costa" },
];

export function DriveTab() {
  const [search, setSearch] = useState("");

  const filtered = mockFiles.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar arquivos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <Button
          size="sm"
          className="text-xs gap-1 bg-primary hover:bg-primary-hover text-primary-foreground"
          onClick={() => toast.info("Upload de arquivo — em breve")}
        >
          <Upload className="h-3.5 w-3.5" /> Upload
        </Button>
      </div>

      <Badge variant="outline" className="text-[10px]">{filtered.length} arquivos</Badge>

      {/* File grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filtered.map((file) => {
          const { icon: Icon, color } = fileIcons[file.type];
          return (
            <button
              key={file.id}
              onClick={() => toast.info(`Abrir: ${file.name}`)}
              className="text-left bg-card ghost-border rounded-xl p-4 shadow-card hover:shadow-card-hover hover:border-border-hover transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs font-semibold text-foreground truncate mb-1">{file.name}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0">{typeLabels[file.type]}</Badge>
                <span className="text-[10px] text-muted-foreground">{file.size}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">{file.modified} · {file.owner}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
