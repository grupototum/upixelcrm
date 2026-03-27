import { useState, useMemo } from "react";
import { Bot, Folder, FolderOpen, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ComingSoonBadge } from "@/components/ui/coming-soon";

const mockBots = [
  { id: "bot1", name: "Qualificação Inicial", folder: "Vendas", status: "published" },
  { id: "bot2", name: "Suporte Básico", folder: "Suporte", status: "draft" },
  { id: "bot3", name: "Agendamento", folder: "Vendas", status: "published" },
  { id: "bot4", name: "FAQ Produto", folder: "Suporte", status: "draft" },
];

const botFolders = ["Todos", "Vendas", "Suporte"];

export function BotsTab() {
  const [selectedFolder, setSelectedFolder] = useState("Todos");

  const filtered = useMemo(
    () => mockBots.filter((b) => selectedFolder === "Todos" || b.folder === selectedFolder),
    [selectedFolder]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        {/* Folders */}
        <div className="w-48 shrink-0 space-y-1">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Pastas</p>
          {botFolders.map((folder) => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs transition-colors ${
                selectedFolder === folder
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {selectedFolder === folder ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
              {folder}
              <Badge variant="outline" className="text-[10px] ml-auto">
                {folder === "Todos" ? mockBots.length : mockBots.filter((b) => b.folder === folder).length}
              </Badge>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((bot) => (
            <div
              key={bot.id}
              className="bg-card ghost-border rounded-xl p-5 hover:border-border-hover transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-accent" />
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    bot.status === "published" ? "border-success/40 text-success" : "border-warning/40 text-warning"
                  }`}
                >
                  {bot.status === "published" ? "Publicado" : "Rascunho"}
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-foreground">{bot.name}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">{bot.folder}</p>
            </div>
          ))}

          {/* Add bot */}
          <div className="border border-dashed border-border rounded-xl p-5 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer">
            <Plus className="h-6 w-6 mb-1" />
            <span className="text-xs">Novo Bot</span>
          </div>
        </div>
      </div>

      <div className="text-center pt-2">
        <ComingSoonBadge />
        <p className="text-xs text-muted-foreground mt-2">
          Editor visual de bots com Typebot será integrado em breve.
        </p>
      </div>
    </div>
  );
}
