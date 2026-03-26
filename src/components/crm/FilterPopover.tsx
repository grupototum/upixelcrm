import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

export interface CRMFilters {
  origins: string[];
  tags: string[];
  minValue: string;
  maxValue: string;
}

const EMPTY_FILTERS: CRMFilters = { origins: [], tags: [], minValue: "", maxValue: "" };

const ORIGIN_OPTIONS = ["Meta Ads", "Google Ads", "Website", "Indicação", "Evento", "Outbound", "Manual"];

interface FilterPopoverProps {
  filters: CRMFilters;
  onFiltersChange: (f: CRMFilters) => void;
  availableTags: string[];
}

export function FilterPopover({ filters, onFiltersChange, availableTags }: FilterPopoverProps) {
  const [open, setOpen] = useState(false);

  const activeCount =
    filters.origins.length +
    filters.tags.length +
    (filters.minValue ? 1 : 0) +
    (filters.maxValue ? 1 : 0);

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
      <PopoverContent align="end" className="w-72 p-4 space-y-4">
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
      </PopoverContent>
    </Popover>
  );
}

export { EMPTY_FILTERS };
