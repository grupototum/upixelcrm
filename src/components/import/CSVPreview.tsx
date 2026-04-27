import { AlertCircle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PreviewRow {
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  city?: string;
  position?: string;
  origin?: string;
  tags: string[];
  errors: string[];
}

interface CSVPreviewProps {
  csvHeaders: string[];
  csvRows: string[][];
  mapping: Record<string, string>;
  previewCount?: number;
}

function getValue(row: string[], headers: string[], csvCol: string | undefined): string | null {
  if (!csvCol || csvCol === "__skip") return null;
  const idx = headers.indexOf(csvCol);
  return idx >= 0 && row[idx] ? row[idx].trim() : null;
}

export function CSVPreview({ csvHeaders, csvRows, mapping, previewCount = 3 }: CSVPreviewProps) {
  const previews: PreviewRow[] = [];

  for (const row of csvRows.slice(0, previewCount)) {
    const name = getValue(row, csvHeaders, mapping.name);
    const errors: string[] = [];

    if (!name) {
      errors.push("Nome é obrigatório");
    }

    const phone = getValue(row, csvHeaders, mapping.phone);
    const email = getValue(row, csvHeaders, mapping.email);
    const company = getValue(row, csvHeaders, mapping.company);
    const city = getValue(row, csvHeaders, mapping.city);
    const position = getValue(row, csvHeaders, mapping.position);
    const origin = getValue(row, csvHeaders, mapping.origin);

    const tagsRaw = getValue(row, csvHeaders, mapping.tags);
    const tags = tagsRaw
      ? tagsRaw.split(";").map((t) => t.trim()).filter(Boolean)
      : [];

    previews.push({
      name: name || "[Sem nome]",
      phone: phone || undefined,
      email: email || undefined,
      company: company || undefined,
      city: city || undefined,
      position: position || undefined,
      origin: origin,
      tags,
      errors,
    });
  }

  const allValid = previews.every((p) => p.errors.length === 0);
  const totalErrors = previews.reduce((sum, p) => sum + p.errors.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Preview dos leads no CRM</span>
        </div>
        {!allValid && (
          <Badge variant="outline" className="text-[10px] text-destructive border-destructive/50 bg-destructive/5">
            {totalErrors} erro(s)
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {previews.map((preview, idx) => (
          <div
            key={idx}
            className={`rounded-lg border p-4 transition-colors ${
              preview.errors.length > 0
                ? "border-destructive/30 bg-destructive/5"
                : "border-border bg-card hover:bg-card-hover"
            }`}
          >
            {/* Header: Name + Origin */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <h4
                  className={`text-sm font-semibold truncate ${
                    preview.errors.length > 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {preview.name}
                </h4>
              </div>
              {preview.origin && (
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {preview.origin}
                </Badge>
              )}
            </div>

            {/* Contact info grid */}
            <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
              {preview.phone && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Telefone: </span>
                  <span className="font-medium text-foreground">{preview.phone}</span>
                </div>
              )}
              {preview.email && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Email: </span>
                  <span className="font-medium text-foreground truncate">{preview.email}</span>
                </div>
              )}
              {preview.company && (
                <div>
                  <span className="text-muted-foreground">Empresa: </span>
                  <span className="font-medium text-foreground">{preview.company}</span>
                </div>
              )}
              {preview.city && (
                <div>
                  <span className="text-muted-foreground">Cidade: </span>
                  <span className="font-medium text-foreground">{preview.city}</span>
                </div>
              )}
              {preview.position && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Cargo: </span>
                  <span className="font-medium text-foreground">{preview.position}</span>
                </div>
              )}
            </div>

            {/* Tags */}
            {preview.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {preview.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Errors */}
            {preview.errors.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-destructive/20">
                {preview.errors.map((error) => (
                  <div key={error} className="flex items-center gap-1.5 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>{error}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground">
        Mostrando {previews.length} de {csvRows.length} registros
      </p>
    </div>
  );
}
