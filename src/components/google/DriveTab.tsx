import { useState, useEffect } from "react";
import { FileText, Image, Sheet, Presentation, FolderOpen, ExternalLink, Search, Loader2, FolderX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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
}

const mimeMap: Record<string, FileType> = {
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/vnd.google-apps.folder": "folder",
  "application/pdf": "pdf",
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

const fileIcons: Record<FileType, { icon: typeof FileText; color: string }> = {
  doc: { icon: FileText, color: "text-blue-500" },
  sheet: { icon: Sheet, color: "text-success" },
  slide: { icon: Presentation, color: "text-amber-500" },
  image: { icon: Image, color: "text-pink-500" },
  pdf: { icon: FileText, color: "text-destructive" },
  folder: { icon: FolderOpen, color: "text-muted-foreground" },
  other: { icon: FileText, color: "text-muted-foreground" },
};

const typeLabels: Record<FileType, string> = {
  doc: "Documento", sheet: "Planilha", slide: "Apresentação",
  image: "Imagem", pdf: "PDF", folder: "Pasta", other: "Arquivo",
};

function parseFiles(files: any[]): ParsedFile[] {
  return (files || []).map((f) => {
    const modified = f.modifiedTime ? new Date(f.modifiedTime).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "";
    const owner = f.owners?.[0]?.displayName || "";
    return {
      id: f.id,
      name: f.name || "(sem nome)",
      type: getFileType(f.mimeType || ""),
      size: formatSize(f.size),
      modified,
      owner,
    };
  });
}

export function DriveTab({ fetchDriveList }: DriveTabProps) {
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const filtered = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Buscar arquivos..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-xs" />
        </div>
      </div>

      <Badge variant="outline" className="text-[10px]">{filtered.length} arquivos</Badge>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <FolderX className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">Nenhum arquivo encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map((file) => {
            const { icon: Icon, color } = fileIcons[file.type];
            return (
              <div
                key={file.id}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
