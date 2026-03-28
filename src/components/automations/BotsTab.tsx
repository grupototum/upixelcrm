import { useState } from "react";
import { Bot, Copy, FolderOpen, Folder, Plus, Settings, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface BotItem {
  id: string;
  name: string;
  folder: string;
  status: "published" | "draft";
  embedUrl: string;
  updatedAt: string;
}

const mockBots: BotItem[] = [
  {
    id: "bot1",
    name: "Qualificação Inicial",
    folder: "Vendas",
    status: "published",
    embedUrl: "https://viewer.typebot.io/my-typebot-rnfu9ky",
    updatedAt: "2026-03-25",
  },
  {
    id: "bot2",
    name: "Suporte Básico",
    folder: "Suporte",
    status: "draft",
    embedUrl: "https://viewer.typebot.io/my-typebot-rnfu9ky",
    updatedAt: "2026-03-22",
  },
  {
    id: "bot3",
    name: "Agendamento",
    folder: "Vendas",
    status: "published",
    embedUrl: "https://viewer.typebot.io/my-typebot-rnfu9ky",
    updatedAt: "2026-03-20",
  },
  {
    id: "bot4",
    name: "FAQ Produto",
    folder: "Suporte",
    status: "draft",
    embedUrl: "https://viewer.typebot.io/my-typebot-rnfu9ky",
    updatedAt: "2026-03-18",
  },
];

const folders = ["Todos", "Vendas", "Suporte"];

export function BotsTab() {
  const [selectedFolder, setSelectedFolder] = useState("Todos");
  const [selectedBot, setSelectedBot] = useState<BotItem | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);

  const filtered = mockBots.filter(
    (b) => selectedFolder === "Todos" || b.folder === selectedFolder
  );

  const handleSelectBot = (bot: BotItem) => {
    if (selectedBot?.id === bot.id) return;
    setIframeLoading(true);
    setSelectedBot(bot);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      {/* Sidebar */}
      <div className="w-64 shrink-0 flex flex-col bg-card ghost-border rounded-xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-border/40 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-foreground">Bots</h3>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => toast.info("Criar novo bot — em breve")}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Folders */}
        <div className="px-2 pt-2 pb-1 space-y-0.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 px-2">
            Pastas
          </p>
          {folders.map((folder) => (
            <button
              key={folder}
              onClick={() => setSelectedFolder(folder)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                selectedFolder === folder
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {selectedFolder === folder ? (
                <FolderOpen className="h-3.5 w-3.5" />
              ) : (
                <Folder className="h-3.5 w-3.5" />
              )}
              {folder}
              <Badge variant="outline" className="text-[10px] ml-auto h-4 px-1.5">
                {folder === "Todos"
                  ? mockBots.length
                  : mockBots.filter((b) => b.folder === folder).length}
              </Badge>
            </button>
          ))}
        </div>

        {/* Bot list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {filtered.map((bot) => {
            const isActive = selectedBot?.id === bot.id;
            return (
              <button
                key={bot.id}
                onClick={() => handleSelectBot(bot)}
                className={`w-full text-left rounded-lg p-3 transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-secondary ghost-border"
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? "bg-primary/20" : "bg-accent/10"
                    }`}
                  >
                    <Bot
                      className={`h-4 w-4 ${isActive ? "text-primary" : "text-accent"}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {bot.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {bot.folder} · {bot.updatedAt}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] shrink-0 ${
                      bot.status === "published"
                        ? "border-success/40 text-success"
                        : "border-warning/40 text-warning"
                    }`}
                  >
                    {bot.status === "published" ? "Ativo" : "Rascunho"}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col bg-card ghost-border rounded-xl shadow-card overflow-hidden">
        {selectedBot ? (
          <>
            {/* Bot toolbar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {selectedBot.name}
                </h3>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    selectedBot.status === "published"
                      ? "border-success/40 text-success"
                      : "border-warning/40 text-warning"
                  }`}
                >
                  {selectedBot.status === "published" ? "Ativo" : "Rascunho"}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs gap-1 h-7"
                  onClick={() => toast.info("Duplicar bot — em breve")}
                >
                  <Copy className="h-3 w-3" /> Duplicar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs gap-1 h-7"
                  onClick={() => toast.info("Configurações do bot — em breve")}
                >
                  <Settings className="h-3 w-3" /> Configurações
                </Button>
              </div>
            </div>

            {/* Embed area */}
            <div className="flex-1 relative">
              {iframeLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
              <iframe
                key={selectedBot.id}
                src={selectedBot.embedUrl}
                className="w-full h-full border-0"
                allow="microphone; camera"
                onLoad={() => setIframeLoading(false)}
                title={`Bot: ${selectedBot.name}`}
              />
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              Selecione um bot
            </h3>
            <p className="text-xs text-muted-foreground max-w-xs">
              Escolha um bot na lista ao lado para visualizar e interagir com ele em
              tempo real.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
