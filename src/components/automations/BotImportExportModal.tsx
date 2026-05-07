import { useState, useRef } from "react";
import { Upload, Download, FileJson, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  kommoBotToNodes,
  nodesToKommoBot,
  readJsonFile,
  downloadJson,
  isKommoBot,
  type KommoBot,
} from "@/lib/kommo-bot-converter";
import { useAppState } from "@/contexts/AppContext";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Quando definido, exporta apenas essa automação. Senão mostra picker. */
  preselectAutomationId?: string;
}

export function BotImportExportModal({ open, onOpenChange, preselectAutomationId }: Props) {
  const navigate = useNavigate();
  const { complexAutomations, createAutomation, updateAutomationNodes } = useAppState();

  const [tab, setTab] = useState<"import" | "export">(preselectAutomationId ? "export" : "import");
  const [importedBot, setImportedBot] = useState<KommoBot | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [importing, setImporting] = useState(false);
  const [selectedAutoId, setSelectedAutoId] = useState<string>(preselectAutomationId ?? "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const json = await readJsonFile(file);
      if (!isKommoBot(json)) {
        toast.error("JSON inválido: estrutura não corresponde a um bot Kommo/uPixel.");
        return;
      }
      setImportedBot(json as KommoBot);
      setNewName((json as KommoBot).name || file.name.replace(/\.json$/i, ""));
      const { warnings } = kommoBotToNodes(json as KommoBot);
      setImportWarnings(warnings);
    } catch (err: any) {
      toast.error("Erro ao ler arquivo: " + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmImport = async () => {
    if (!importedBot) return;
    setImporting(true);
    try {
      const { nodes, edges } = kommoBotToNodes(importedBot);
      if (nodes.length === 0) {
        toast.error("Nenhum nó encontrado no JSON.");
        return;
      }

      const newId = await createAutomation(newName.trim() || importedBot.name || "Bot importado");
      if (!newId) {
        toast.error("Falha ao criar automação.");
        return;
      }
      await updateAutomationNodes(newId, nodes, edges);
      toast.success(`Bot importado: ${nodes.length} nós, ${edges.length} conexões.`);
      onOpenChange(false);
      navigate(`/automations/builder/${newId}`);
    } catch (err: any) {
      toast.error("Erro no import: " + err.message);
    } finally {
      setImporting(false);
      setImportedBot(null);
      setImportWarnings([]);
    }
  };

  const handleExport = () => {
    const auto = complexAutomations.find((a) => a.id === selectedAutoId);
    if (!auto) {
      toast.error("Selecione uma automação para exportar.");
      return;
    }
    const nodes = (auto.nodes ?? []) as any[];
    const edges = (auto.edges ?? []) as any[];
    if (nodes.length === 0) {
      toast.error("Esta automação está vazia.");
      return;
    }
    const bot = nodesToKommoBot(auto.name, nodes, edges);
    const slug = auto.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").substring(0, 40);
    downloadJson(bot, `bot-${slug}-${Date.now()}.json`);
    toast.success("Bot exportado!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileJson className="h-4 w-4 text-primary" />
            Importar / Exportar Bot
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="bg-secondary w-full justify-start">
            <TabsTrigger value="import" className="text-xs gap-1.5">
              <Upload className="h-3 w-3" /> Importar JSON
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs gap-1.5">
              <Download className="h-3 w-3" /> Exportar JSON
            </TabsTrigger>
          </TabsList>

          {/* IMPORT */}
          <TabsContent value="import" className="space-y-4 mt-4">
            {!importedBot ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-[hsl(var(--border-strong))] hover:bg-primary/5 transition-colors"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-3" />
                <p className="text-sm font-semibold text-foreground mb-1">
                  Clique para selecionar um arquivo .json
                </p>
                <p className="text-[11px] text-muted-foreground text-center">
                  Aceita formato Kommo Salesbot ou exportado pelo uPixel.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-success/10 ghost-border rounded-lg p-3 flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground">
                      {importedBot.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {importedBot.scenario.length} steps · schema: {importedBot.schema_version ?? "kommo"}
                      {importedBot.source && ` · origem: ${importedBot.source}`}
                    </p>
                  </div>
                </div>

                {importWarnings.length > 0 && (
                  <div className="bg-warning/10 ghost-border rounded-lg p-3">
                    <div className="flex items-start gap-2 mb-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                      <p className="text-xs font-semibold text-warning">
                        {importWarnings.length} aviso{importWarnings.length !== 1 ? "s" : ""} de compatibilidade
                      </p>
                    </div>
                    <ul className="text-[10px] text-muted-foreground space-y-0.5 ml-5 list-disc">
                      {importWarnings.slice(0, 5).map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                      {importWarnings.length > 5 && (
                        <li className="italic">...e mais {importWarnings.length - 5}.</li>
                      )}
                    </ul>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Nome da nova automação</Label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Ex: Bot importado do Kommo"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleConfirmImport}
                    disabled={importing || !newName.trim()}
                    className="gap-1.5"
                  >
                    {importing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    Importar como nova automação
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setImportedBot(null);
                      setImportWarnings([]);
                    }}
                    disabled={importing}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                <strong>Compatibilidade Kommo:</strong> os tipos <code className="bg-secondary px-1 rounded">send_message</code>,{" "}
                <code className="bg-secondary px-1 rounded">conditions</code>, <code className="bg-secondary px-1 rounded">pause</code>,{" "}
                <code className="bg-secondary px-1 rounded">tags</code>, <code className="bg-secondary px-1 rounded">set_status</code>,{" "}
                <code className="bg-secondary px-1 rounded">webhook</code> e <code className="bg-secondary px-1 rounded">handoff</code> são
                mapeados automaticamente. Tipos não suportados viram nó "ação custom" para edição manual.
              </p>
            </div>
          </TabsContent>

          {/* EXPORT */}
          <TabsContent value="export" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs">Selecione a automação</Label>
              <select
                value={selectedAutoId}
                onChange={(e) => setSelectedAutoId(e.target.value)}
                className="mt-1 w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">— Escolha —</option>
                {complexAutomations.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({Array.isArray(a.nodes) ? a.nodes.length : 0} nós)
                  </option>
                ))}
              </select>
            </div>

            {selectedAutoId && (() => {
              const auto = complexAutomations.find((a) => a.id === selectedAutoId);
              const n = Array.isArray(auto?.nodes) ? auto.nodes.length : 0;
              const e = Array.isArray(auto?.edges) ? auto.edges.length : 0;
              return (
                <div className="bg-secondary/40 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-semibold">{auto?.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{n} nós</Badge>
                    <Badge variant="outline" className="text-[10px]">{e} conexões</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {auto?.status === "active" ? "Ativo" : "Rascunho"}
                    </Badge>
                  </div>
                </div>
              );
            })()}

            <Button onClick={handleExport} disabled={!selectedAutoId} className="gap-1.5">
              <Download className="h-3 w-3" />
              Baixar JSON
            </Button>

            <div className="border-t border-border pt-3">
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                O JSON exportado é compatível com o formato Kommo Salesbot e contém metadata extra do uPixel
                (em <code className="bg-secondary px-1 rounded">_upixel</code>) para round-trip exato. Outros
                sistemas que aceitam Kommo Bot conseguem importar ignorando essa chave.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
