import { useState, useEffect, useMemo } from "react";
import { FileText, Image, Sheet, Presentation, FolderOpen, ExternalLink, Search, Loader2, FolderX, LayoutGrid, List, Filter, MoreVertical, Download, Trash2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DriveTabProps {
  fetchDriveList: () => Promise<any>;
}

type FileType = "doc" | "sheet" | "slide" | "image" | "pdf" | "folder" | "other";

interface ParsedFile {
  id: string;
  name: string;
  type: FileType;
  size: string;
  modified: string;
  owner: string;
  icon: any;
  color: string;
  webViewLink?: string;
}

const mimeMap: Record<string, FileType> = {
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/vnd.google-apps.folder": "folder",
  "application/pdf": "pdf",
};

const fileIcons: Record<FileType, { icon: typeof FileText; color: string; bgColor: string }> = {
  doc: { icon: FileText, color: "text-blue-500", bgColor: "bg-blue-500/10" },
  sheet: { icon: Sheet, color: "text-emerald-500", bgColor: "bg-emerald-500/10" },
  slide: { icon: Presentation, color: "text-amber-500", bgColor: "bg-amber-500/10" },
  image: { icon: Image, color: "text-pink-500", bgColor: "bg-pink-500/10" },
  pdf: { icon: FileText, color: "text-rose-500", bgColor: "bg-rose-500/10" },
  folder: { icon: FolderOpen, color: "text-muted-foreground", bgColor: "bg-muted" },
  other: { icon: FileText, color: "text-muted-foreground", bgColor: "bg-muted" },
};

const typeLabels: Record<FileType | "all", string> = {
  all: "Todos", doc: "Documentos", sheet: "Planilhas", slide: "Apresentações",
  image: "Imagens", pdf: "PDFs", folder: "Pastas", other: "Outros",
};

function getFileType(mimeType: string): FileType {
  if (mimeMap[mimeType]) return mimeMap[mimeType];
  if (mimeType.startsWith("image/")) return "image";
  return "other";
}

function formatSize(bytes?: string): string {
  if (!bytes) return "—";
  const n = parseInt(bytes, 10);
  if (isNaN(n) || n === 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function parseFiles(files: any[]): ParsedFile[] {
  return (files || []).map((f) => {
    const modified = f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "";
    const owner = f.owners?.[0]?.displayName || "";
    const type = getFileType(f.mimeType || "");
    return {
      id: f.id,
      name: f.name || "(sem nome)",
      type: type,
      size: formatSize(f.size),
      modified,
      owner,
      icon: fileIcons[type].icon,
      color: fileIcons[type].color,
      webViewLink: f.webViewLink || "https://drive.google.com",
    };
  });
}

export function DriveTab({ fetchDriveList }: DriveTabProps) {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeType, setActiveType] = useState<FileType | "all">("all");

  const handleOpenFile = (link: string) => {
    window.open(link, "_blank");
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchDriveList();
      setFiles(parseFiles(data.files || []));
    } catch (err: any) {
      toast.error(`Erro ao carregar arquivos: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return files.filter((f) => {
      const matchesSearch = f.name.toLowerCase().includes(search.toLowerCase());
      const matchesType = activeType === "all" ? true : f.type === activeType;
      return matchesSearch && matchesType;
    });
  }, [files, search, activeType]);

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar no Drive..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-9 h-10 shadow-sm border-[hsl(var(--border-strong))] bg-card rounded-xl text-xs" 
          />
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none w-full md:w-auto">
          <div className="flex items-center gap-1 bg-card border border-[hsl(var(--border-strong))] p-1 rounded-xl shrink-0">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-lg"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border/40 mx-1 shrink-0" />

          <Tabs value={activeType} onValueChange={(v) => setActiveType(v as any)} className="w-auto shrink-0">
            <TabsList className="bg-card border border-[hsl(var(--border-strong))] p-1 rounded-xl h-10">
              {Object.entries(typeLabels).map(([val, label]) => (
                <TabsTrigger 
                  key={val} 
                  value={val} 
                  className="text-[10px] font-bold uppercase rounded-lg px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="flex items-center justify-between px-1">
        <Badge variant="secondary" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-none">
          {filtered.length} {filtered.length === 1 ? "arquivo" : "arquivos"}
        </Badge>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-card border-2 border-dashed border-[hsl(var(--border-strong))] bg-secondary/5">
          <div className="h-16 w-16 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
            <FolderX className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Nenhum arquivo encontrado</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
            Tente ajustar os filtros ou procure por outro nome.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
          {filtered.map((file) => {
            const Icon = file.icon;
            const bgColor = fileIcons[file.type].bgColor;
            return (
              <div
                key={file.id}
                onClick={() => handleOpenFile(file.webViewLink)}
                className="group relative bg-card border border-[hsl(var(--border-strong))] rounded-card p-5 shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:border-[hsl(var(--border-strong))] transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center", bgColor)}>
                    <Icon className={cn("h-6 w-6", file.color)} />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border border-[hsl(var(--border-strong))] bg-card">
                      <DropdownMenuItem className="text-xs gap-2 rounded-lg">
                        <Download className="h-3.5 w-3.5" /> Baixar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2 rounded-lg">
                        <ExternalLink className="h-3.5 w-3.5" /> Abrir no Google
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-xs gap-2 rounded-lg text-destructive focus:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <h4 className="text-[14px] font-bold text-foreground mb-1 group-hover:text-primary transition-colors truncate">
                  {file.name}
                </h4>
                
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider truncate">
                    {file.owner || "Desconhecido"}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[hsl(var(--border-strong))]">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
                    <Calendar className="h-3 w-3" />
                    {file.modified}
                  </div>
                  <Badge variant="outline" className="text-[9px] font-bold px-1.5 bg-secondary/20 border-none text-muted-foreground">
                    {file.size}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-[hsl(var(--border-strong))] rounded-card shadow-sm overflow-hidden animate-in fade-in duration-500">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/20 border-b border-[hsl(var(--border-strong))]">
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nome</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Proprietário</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Modificado</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tamanho</th>
                <th className="px-6 py-3 text-[10px] font-bold text-muted-foreground uppercase tracking-widest w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filtered.map((file) => {
                const Icon = file.icon;
                return (
                  <tr 
                    key={file.id} 
                    onClick={() => handleOpenFile(file.webViewLink)}
                    className="group hover:bg-secondary/40 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", fileIcons[file.type].bgColor)}>
                          <Icon className={cn("h-4 w-4", file.color)} />
                        </div>
                        <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[200px]">
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{file.owner}</td>
                    <td className="px-6 py-4 text-xs text-muted-foreground">{file.modified}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="text-[10px] font-bold bg-secondary/10 border-none text-muted-foreground">
                        {file.size}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
