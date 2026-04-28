import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Copy, ScanSearch, GitMerge, X, Phone, Mail, Building2,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Loader2, Zap,
} from "lucide-react";
import { useDuplicateDetection, DuplicateGroup } from "@/hooks/useDuplicateDetection";
import { Lead } from "@/types";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const reasonLabel: Record<string, string> = {
  phone: "Telefone idêntico",
  email: "E-mail idêntico",
  name_company: "Nome + empresa iguais",
};

const confidenceConfig = {
  alta: { label: "Alta", className: "bg-destructive/10 text-destructive border-destructive/30" },
  media: { label: "Média", className: "bg-warning/10 text-warning border-warning/30" },
};

function LeadCard({ lead, selected, onSelect }: { lead: Lead; selected: boolean; onSelect: () => void }) {
  return (
    <div
      className={`rounded-xl border p-4 cursor-pointer transition-colors ${selected ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-card-hover"}`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <RadioGroupItem value={lead.id} id={`radio-${lead.id}`} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground truncate">{lead.name}</span>
            {lead.tags?.includes("whatsapp-auto") && (
              <Badge variant="outline" className="text-[10px] shrink-0">WhatsApp</Badge>
            )}
          </div>
          <div className="space-y-0.5">
            {lead.phone && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="h-3 w-3 shrink-0" />
                <span className="truncate">{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.company && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{lead.company}</span>
              </div>
            )}
          </div>
          {lead.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {lead.tags.slice(0, 3).map((t) => (
                <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">{t}</Badge>
              ))}
            </div>
          )}
        </div>
        <Link
          to={`/leads/${lead.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-xs text-primary hover:underline shrink-0"
        >
          Ver
        </Link>
      </div>
    </div>
  );
}

function DuplicateGroupCard({
  group,
  selected,
  onToggleSelect,
  onMerge,
  onDismiss,
  defaultPrimaryId,
}: {
  group: DuplicateGroup;
  selected: boolean;
  onToggleSelect: () => void;
  onMerge: (group: DuplicateGroup, primaryId: string) => Promise<void>;
  onDismiss: (id: string) => void;
  defaultPrimaryId: string;
}) {
  const [primaryId, setPrimaryId] = useState(defaultPrimaryId);
  const [merging, setMerging] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const conf = confidenceConfig[group.confidence];

  const handleMerge = async () => {
    setMerging(true);
    try {
      await onMerge(group, primaryId);
      toast.success("Leads mesclados com sucesso.");
    } catch {
      toast.error("Erro ao mesclar leads.");
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className={`bg-card ghost-border rounded-xl overflow-hidden ${selected ? "ring-2 ring-primary" : ""}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-card-hover transition-colors">
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} aria-label="Selecionar grupo" />
        </div>
        <div
          className="flex-1 flex items-center gap-2 min-w-0 cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
        >
          <Copy className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {group.leads.length} leads · {reasonLabel[group.reason]}
          </span>
          <span className="text-xs text-muted-foreground truncate hidden sm:inline">
            "{group.matchValue}"
          </span>
        </div>
        <Badge variant="outline" className={`text-[10px] shrink-0 ${conf.className}`}>
          Confiança {conf.label}
        </Badge>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0" />
          )}
        </button>
      </div>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Selecione o lead <strong>principal</strong> que será mantido. Os outros serão mesclados nele.
          </p>
          <RadioGroup value={primaryId} onValueChange={setPrimaryId}>
            <div className="grid gap-2 sm:grid-cols-2">
              {group.leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  selected={primaryId === lead.id}
                  onSelect={() => setPrimaryId(lead.id)}
                />
              ))}
            </div>
          </RadioGroup>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => onDismiss(group.id)}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Ignorar
            </Button>
            <Button
              size="sm"
              className="text-xs bg-primary hover:bg-primary-hover text-primary-foreground"
              onClick={handleMerge}
              disabled={merging}
            >
              <GitMerge className="h-3.5 w-3.5 mr-1" />
              {merging ? "Mesclando..." : "Mesclar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DuplicatesPage() {
  const { groups, scanning, scan, merge, mergeMany, dismiss, totalDuplicates, pickPrimary } = useDuplicateDetection();
  const [scanned, setScanned] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMerging, setBulkMerging] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<null | "selected" | "all-high">(null);

  const handleScan = () => {
    const found = scan();
    setScanned(true);
    setSelectedIds(new Set());
    if (found.length === 0) {
      toast.success("Nenhum lead duplicado encontrado.");
    } else {
      toast.info(`${found.length} grupo(s) de duplicatas encontrado(s).`);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(groups.map((g) => g.id)));
  };

  const selectAllHigh = () => {
    setSelectedIds(new Set(groups.filter((g) => g.confidence === "alta").map((g) => g.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const runBulkMerge = async (mode: "selected" | "all-high") => {
    const targets = mode === "all-high"
      ? groups.filter((g) => g.confidence === "alta")
      : groups.filter((g) => selectedIds.has(g.id));

    if (targets.length === 0) {
      toast.error("Nenhum grupo selecionado.");
      return;
    }

    setBulkMerging(true);
    setBulkProgress({ done: 0, total: targets.length });

    const { merged, failed } = await mergeMany(targets, (done, total) => {
      setBulkProgress({ done, total });
    });

    setBulkMerging(false);
    setBulkProgress(null);
    setSelectedIds(new Set());
    setConfirmBulk(null);

    if (failed > 0) {
      toast.error(`${merged} grupo(s) mesclado(s), ${failed} falha(s). Verifique o console.`);
    } else {
      toast.success(`${merged} grupo(s) mesclado(s) com sucesso!`);
    }
  };

  const selectedCount = selectedIds.size;
  const highCount = groups.filter((g) => g.confidence === "alta").length;
  const totalLeadsInSelection = groups
    .filter((g) => selectedIds.has(g.id))
    .reduce((sum, g) => sum + g.leads.length - 1, 0);

  return (
    <AppLayout title="Duplicatas" subtitle="Detecte e mescle leads duplicados automaticamente">
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card ghost-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{groups.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Grupos encontrados</p>
          </div>
          <div className="bg-card ghost-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{totalDuplicates}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Leads duplicados</p>
          </div>
          <div className="bg-card ghost-border rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {groups.filter((g) => g.confidence === "alta").length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Alta confiança</p>
          </div>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {!scanned
              ? "Clique em 'Escanear' para buscar duplicatas na base de leads."
              : groups.length === 0
              ? "Nenhuma duplicata encontrada. Sua base está limpa!"
              : `${groups.length} grupo(s) de possíveis duplicatas para revisar.`}
          </div>
          <Button
            onClick={handleScan}
            disabled={scanning || bulkMerging}
            className="bg-primary hover:bg-primary-hover text-primary-foreground shrink-0"
          >
            <ScanSearch className="h-4 w-4 mr-2" />
            {scanning ? "Escaneando..." : "Escanear Duplicatas"}
          </Button>
        </div>

        {/* Bulk action bar */}
        {scanned && groups.length > 0 && (
          <div className="bg-card ghost-border rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={selectAll}
                disabled={bulkMerging}
              >
                Selecionar todos ({groups.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={selectAllHigh}
                disabled={bulkMerging || highCount === 0}
              >
                Só alta confiança ({highCount})
              </Button>
              {selectedCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={clearSelection}
                  disabled={bulkMerging}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Limpar seleção
                </Button>
              )}

              <div className="flex-1" />

              {highCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setConfirmBulk("all-high")}
                  disabled={bulkMerging}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Mesclar todos de alta confiança
                </Button>
              )}
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary-hover text-primary-foreground"
                onClick={() => setConfirmBulk("selected")}
                disabled={bulkMerging || selectedCount === 0}
              >
                {bulkMerging ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Mesclando...</>
                ) : (
                  <><GitMerge className="h-3.5 w-3.5" /> Mesclar selecionados ({selectedCount})</>
                )}
              </Button>
            </div>

            {selectedCount > 0 && (
              <p className="text-[11px] text-muted-foreground">
                {totalLeadsInSelection} lead(s) duplicado(s) serão removidos. O lead "principal"
                de cada grupo é escolhido automaticamente (mais campos preenchidos + mais recente).
              </p>
            )}

            {bulkProgress && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Mesclando grupos...</span>
                  <span className="tabular-nums">{bulkProgress.done} / {bulkProgress.total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        {scanned && groups.length > 0 && (
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              Alta confiança: mesmo telefone ou e-mail
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-warning" />
              Média confiança: mesmo nome + empresa
            </div>
          </div>
        )}

        {/* Groups */}
        {scanned && groups.length === 0 && (
          <div className="bg-card ghost-border rounded-xl p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-foreground mb-1">Base de leads limpa!</h3>
            <p className="text-xs text-muted-foreground">Nenhum lead duplicado encontrado.</p>
          </div>
        )}

        {groups.length > 0 && (
          <div className="space-y-3">
            {/* Alta confiança primeiro */}
            {groups
              .slice()
              .sort((a, b) => (a.confidence === "alta" ? -1 : 1))
              .map((group) => (
                <DuplicateGroupCard
                  key={group.id}
                  group={group}
                  selected={selectedIds.has(group.id)}
                  onToggleSelect={() => toggleSelect(group.id)}
                  defaultPrimaryId={pickPrimary(group.leads)}
                  onMerge={merge}
                  onDismiss={dismiss}
                />
              ))}
          </div>
        )}

        {/* Confirmação de bulk merge */}
        <AlertDialog open={confirmBulk !== null} onOpenChange={(o) => !o && setConfirmBulk(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Mesclar grupos em lote?</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmBulk === "all-high"
                  ? `Você vai mesclar ${highCount} grupo(s) de alta confiança automaticamente. ` +
                    `Para cada grupo, o lead com mais campos preenchidos será mantido como principal e os duplicados serão excluídos.`
                  : `Você vai mesclar ${selectedCount} grupo(s) selecionado(s). ` +
                    `${totalLeadsInSelection} lead(s) duplicado(s) serão excluídos permanentemente.`}
                <br /><br />
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={bulkMerging}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  if (confirmBulk) runBulkMerge(confirmBulk);
                }}
                disabled={bulkMerging}
                className="bg-primary hover:bg-primary-hover text-primary-foreground"
              >
                {bulkMerging ? "Mesclando..." : "Confirmar mesclagem"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
