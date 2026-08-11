import { useMemo } from "react";
import { marked } from "marked";
import { Sparkles } from "lucide-react";
import changelogRaw from "../../CHANGELOG.md?raw";

export default function NovidadesPage() {
  const html = useMemo(() => marked.parse(changelogRaw, { async: false }), []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Novidades</h1>
      </div>
      <div
        className="prose dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground prose-code:text-primary prose-blockquote:text-muted-foreground prose-hr:border-border"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
