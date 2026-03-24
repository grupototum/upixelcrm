import { BookOpen, Upload, FileText, File, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ComingSoonOverlay, ComingSoonBadge } from "@/components/ui/coming-soon";

const mockFiles = [
  { name: "Manual de Vendas 2024.pdf", type: "PDF", size: "2.4 MB", date: "12/03/2024" },
  { name: "FAQ - Perguntas Frequentes.docx", type: "DOCX", size: "840 KB", date: "08/03/2024" },
  { name: "Script de Objeções.txt", type: "TXT", size: "120 KB", date: "01/03/2024" },
];

export function KnowledgeBaseTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Faça upload de documentos para treinar os agentes de IA.
        </p>
        <Button size="sm" disabled className="gap-2">
          <Upload className="h-4 w-4" /> Upload de Arquivo <ComingSoonBadge />
        </Button>
      </div>

      <ComingSoonOverlay label="Base de Conhecimento">
        <div className="space-y-4">
          {/* Upload area */}
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center bg-card">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Arraste arquivos ou clique para enviar</h3>
            <p className="text-xs text-muted-foreground">PDF, DOCX, TXT — máx. 10MB por arquivo</p>
          </div>

          {/* File list */}
          <div className="bg-card border border-border rounded-lg divide-y divide-border">
            {mockFiles.map((file) => (
              <div key={file.name} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.type} · {file.size} · {file.date}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </ComingSoonOverlay>
    </div>
  );
}
