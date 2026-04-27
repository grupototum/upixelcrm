import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Copy, ScanSearch, GitMerge, X, Phone, Mail, Building2, User,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp,
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
  onMerge,
  onDismiss,
}: {
  group: DuplicateGroup;
  onMerge: (group: DuplicateGroup, primaryId: string) => Promise<void>;
  onDismiss: (id: string) => void;
}) {
  const [primaryId, setPrimaryId] = useState(group.leads[0].id);
  const [merging, setMerging] = useState(false);
  const [expanded, setExpanded] = useState(true);

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
    <div className="bg-card ghost-border rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-card-hover transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 flex items-center gap-2 min-w-0">
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
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
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
  const { groups, scanning, scan, merge, dismiss, totalDuplicates } = useDuplicateDetection();
  const [scanned, setScanned] = useState(false);

  const handleScan = () => {
    const found = scan();
    setScanned(true);
    if (found.length === 0) {
      toast.success("Nenhum lead duplicado encontrado.");
    } else {
      toast.info(`${found.length} grupo(s) de duplicatas encontrado(s).`);
    }
  };

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
            disabled={scanning}
            className="bg-primary hover:bg-primary-hover text-primary-foreground shrink-0"
          >
            <ScanSearch className="h-4 w-4 mr-2" />
            {scanning ? "Escaneando..." : "Escanear Duplicatas"}
          </Button>
        </div>

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
                  onMerge={merge}
                  onDismiss={dismiss}
                />
              ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
