/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useCustomFields } from "@/hooks/useCustomFields";

export interface CRMFilters {
  origins: string[];
  tags: string[];
  minValue: string;
  maxValue: string;
  customFields: Record<string, string>;
  status: string[];
  priority: string[];
  dateRange: string;
}

const EMPTY_FILTERS: CRMFilters = {
  origins: [],
  tags: [],
  minValue: "",
  maxValue: "",
  customFields: {},
  status: [],
  priority: [],
  dateRange: "",
};

const ORIGIN_OPTIONS = ["Meta Ads", "Google Ads", "Website", "Indicação", "Evento", "Outbound", "Manual"];
const STATUS_OPTIONS = ["Novo", "Em andamento", "Qualificado", "Proposta", "Negociação", "Ganho", "Perdido"];
const PRIORITY_OPTIONS = ["Baixa", "Média", "Alta", "Crítica"];
const DATE_RANGE_OPTIONS = [
  { value: "7d", label: "Últimos 7 dias" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "all", label: "Todos" },
];

interface FilterPopoverProps {
  filters: CRMFilters;
  onFiltersChange: (f: CRMFilters) => void;
  availableTags: string[];
}

export function FilterPopover({ filters, onFiltersChange, availableTags }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const { definitions } = useCustomFields();

  const cfFilters = filters.customFields ?? {};
  const cfActiveCount = Object.values(cfFilters).filter(Boolean).length;

  const activeCount =
    filters.origins.length +
    filters.tags.length +
    (filters.minValue ? 1 : 0) +
    (filters.maxValue ? 1 : 0) +
    cfActiveCount +
    filters.status.length +
    filters.priority.length +
    (filters.dateRange ? 1 : 0);

  const toggleOrigin = (o: string) => {
    const next = filters.origins.includes(o)
      ? filters.origins.filter((x) => x !== o)
      : [...filters.origins, o];
    onFiltersChange({ ...filters, origins: next });
  };

  const toggleTag = (t: string) => {
    const next = filters.tags.includes(t)
      ? filters.tags.filter((x) => x !== t)
      : [...filters.tags, t];
    onFiltersChange({ ...filters, tags: next });
  };

  const toggleStatus = (s: string) => {
    const next = filters.status.includes(s)
      ? filters.status.filter((x) => x !== s)
      : [...filters.status, s];
    onFiltersChange({ ...filters, status: next });
  };

  const togglePriority = (p: string) => {
    const next = filters.priority.includes(p)
      ? filters.priority.filter((x) => x !== p)
      : [...filters.priority, p];
    onFiltersChange({ ...filters, priority: next });
  };

  const setCustomField = (slug: string, value: string) => {
    const next = { ...cfFilters, [slug]: value };
    if (!value) delete next[slug];
    onFiltersChange({ ...filters, customFields: next });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs gap-1 h-8 relative">
          <Filter className="h-3 w-3" /> Filtrar
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-4 min-w-[16px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-1">
              {activeCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold">Filtros</p>
          {activeCount > 0 && (
            <button
              onClick={() => onFiltersChange(EMPTY_FILTERS)}
              className="text-[10px] text-destructive hover:underline"
            >
              Limpar tudo
            </button>
          )}
        </div>

        {/* Origem */}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Fonte / Origem</Label>
          <div className="flex flex-wrap gap-1">
            {ORIGIN_OPTIONS.map((o) => (
              <button
                key={o}
                onClick={() => toggleOrigin(o)}
                className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  filters.origins.includes(o)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        {availableTags.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tags</Label>
            <div className="flex flex-wrap gap-1">
              {availableTags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    filters.tags.includes(t)
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Valor */}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Valor (R$)</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Mín"
              value={filters.minValue}
              onChange={(e) => onFiltersChange({ ...filters, minValue: e.target.value })}
              className="h-7 text-xs"
            />
            <Input
              type="number"
              placeholder="Máx"
              value={filters.maxValue}
              onChange={(e) => onFiltersChange({ ...filters, maxValue: e.target.value })}
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label>
          <div className="flex flex-wrap gap-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => toggleStatus(s)}
                className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  filters.status.includes(s)
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Prioridade */}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Prioridade</Label>
          <div className="flex flex-wrap gap-1">
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => togglePriority(p)}
                className={`px-2 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  filters.priority.includes(p)
                    ? "bg-orange-500 text-white"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Data de Criação */}
        <div className="space-y-1.5">
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Período</Label>
          <Select value={filters.dateRange || "all"} onValueChange={(v) => onFiltersChange({ ...filters, dateRange: v === "all" ? "" : v })}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Fields */}
        {definitions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Campos Personalizados</Label>
            {definitions.map((def) => (
              <div key={def.id} className="space-y-1">
                <p className="text-[10px] text-muted-foreground">{def.name}</p>
                {def.field_type === "select" && Array.isArray(def.options) && def.options.length > 0 ? (
                  <Select
                    value={cfFilters[def.slug] || "__all__"}
                    onValueChange={(v) => setCustomField(def.slug, v === "__all__" ? "" : v)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Qualquer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Qualquer</SelectItem>
                      {(def.options as string[]).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={cfFilters[def.slug] || ""}
                    onChange={(e) => setCustomField(def.slug, e.target.value)}
                    placeholder={`Filtrar ${def.name}...`}
                    className="h-7 text-xs"
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export { EMPTY_FILTERS };
