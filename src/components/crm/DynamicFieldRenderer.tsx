import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar, Link as LinkIcon, Edit3, Check, X } from "lucide-react";
import type { CustomFieldDefinition } from "@/types";

interface DynamicFieldRendererProps {
  definition: CustomFieldDefinition;
  value: unknown;
  onChange: (slug: string, value: unknown) => void;
  readOnly?: boolean;
}

export function DynamicFieldRenderer({ definition, value, onChange, readOnly }: DynamicFieldRendererProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<unknown>(value);

  const commit = () => {
    onChange(definition.slug, draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const renderDisplay = () => {
    const displayValue = value as string | number | boolean | string[] | undefined;

    if (displayValue === undefined || displayValue === null || displayValue === "") {
      return <span className="text-muted-foreground italic text-xs">—</span>;
    }

    if (definition.field_type === "checkbox") {
      return (
        <Badge variant={displayValue ? "default" : "outline"} className="text-[10px]">
          {displayValue ? "Sim" : "Não"}
        </Badge>
      );
    }

    if (definition.field_type === "multi_select" && Array.isArray(displayValue)) {
      return (
        <div className="flex flex-wrap gap-1">
          {displayValue.map((v) => (
            <Badge key={v} variant="secondary" className="text-[10px]">{v}</Badge>
          ))}
        </div>
      );
    }

    if (definition.field_type === "link") {
      return (
        <a href={String(displayValue)} target="_blank" rel="noreferrer"
          className="text-primary text-xs hover:underline flex items-center gap-1 truncate">
          <LinkIcon className="h-3 w-3 shrink-0" />
          {String(displayValue)}
        </a>
      );
    }

    if (definition.field_type === "date" || definition.field_type === "datetime") {
      try {
        const d = new Date(String(displayValue));
        return (
          <span className="text-sm text-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {d.toLocaleDateString("pt-BR", {
              day: "2-digit", month: "short", year: "numeric",
              ...(definition.field_type === "datetime" ? { hour: "2-digit", minute: "2-digit" } : {}),
            })}
          </span>
        );
      } catch {
        return <span className="text-sm text-foreground">{String(displayValue)}</span>;
      }
    }

    return <span className="text-sm text-foreground truncate">{String(displayValue)}</span>;
  };

  const renderEditor = () => {
    switch (definition.field_type) {
      case "text":
      case "link":
        return (
          <Input autoFocus value={String(draft ?? "")} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
            className="h-7 text-xs" placeholder={definition.name} />
        );
      case "textarea":
        return (
          <Textarea autoFocus value={String(draft ?? "")} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") cancel(); }}
            className="text-xs min-h-[60px] resize-none" placeholder={definition.name} />
        );
      case "number":
        return (
          <Input autoFocus type="number" value={String(draft ?? "")} onChange={(e) => setDraft(e.target.valueAsNumber || "")}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
            className="h-7 text-xs" />
        );
      case "date":
        return (
          <Input autoFocus type="date" value={String(draft ?? "")} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
            className="h-7 text-xs" />
        );
      case "datetime":
        return (
          <Input autoFocus type="datetime-local" value={String(draft ?? "")} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") cancel(); }}
            className="h-7 text-xs" />
        );
      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox checked={!!draft} onCheckedChange={(checked) => { setDraft(!!checked); }} />
            <span className="text-xs text-muted-foreground">{draft ? "Sim" : "Não"}</span>
          </div>
        );
      case "select":
      case "radio":
        return (
          <Select value={String(draft ?? "")} onValueChange={(v) => setDraft(v)}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {(definition.options || []).map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "multi_select": {
        const selected = Array.isArray(draft) ? (draft as string[]) : [];
        return (
          <div className="flex flex-wrap gap-1.5">
            {(definition.options || []).map((opt) => {
              const isActive = selected.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setDraft(isActive ? selected.filter((v) => v !== opt.value) : [...selected, opt.value]);
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                    isActive ? "bg-primary text-white border-primary" : "bg-muted border-border text-muted-foreground hover:border-[hsl(var(--border-strong))]"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        );
      }
      default:
        return (
          <Input autoFocus value={String(draft ?? "")} onChange={(e) => setDraft(e.target.value)}
            className="h-7 text-xs" />
        );
    }
  };

  // Checkbox commits immediately
  if (definition.field_type === "checkbox" && !readOnly) {
    return (
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 min-w-0">
          <Label className="text-[10px] text-muted-foreground">{definition.name}</Label>
          <div className="flex items-center gap-2 mt-0.5">
            <Checkbox
              checked={!!value}
              onCheckedChange={(checked) => onChange(definition.slug, !!checked)}
            />
            <span className="text-xs text-foreground">{value ? "Sim" : "Não"}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 group py-1">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Label className="text-[10px] text-muted-foreground">{definition.name}</Label>
          {definition.is_required && (
            <span className="text-[9px] text-destructive font-bold">*</span>
          )}
        </div>
        <div className="mt-0.5">
          {editing ? (
            <div className="flex items-center gap-1.5">
              <div className="flex-1">{renderEditor()}</div>
              {definition.field_type !== "checkbox" && (
                <>
                  <button onClick={commit} className="h-6 w-6 rounded bg-primary text-white flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3" />
                  </button>
                  <button onClick={cancel} className="h-6 w-6 rounded bg-muted text-muted-foreground flex items-center justify-center shrink-0">
                    <X className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ) : (
            renderDisplay()
          )}
        </div>
      </div>
      {!readOnly && !editing && (
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity mt-3"
          onClick={() => { setDraft(value); setEditing(true); }}
        >
          <Edit3 className="h-3 w-3 text-muted-foreground hover:text-primary" />
        </button>
      )}
    </div>
  );
}
