import { useEffect, useRef } from "react";
import { useRagContext } from "@/hooks/useRagContext";
import { injectContextIntoPrompt } from "@/services/ragSearchService";
import { Loader2, BookOpen } from "lucide-react";

interface Props {
  query: string;
  onContextReady: (context: string) => void;
}

export function RagContextInjector({ query, onContextReady }: Props) {
  const { searchContext, isLoading, lastContext } = useRagContext();
  const lastQuery = useRef("");

  useEffect(() => {
    if (!query || query === lastQuery.current) return;
    lastQuery.current = query;

    searchContext(query).then((results) => {
      const enriched = injectContextIntoPrompt(query, results);
      onContextReady(enriched);
    });
  }, [query, searchContext, onContextReady]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Buscando contexto RAG...
      </div>
    );
  }

  if (lastContext && lastContext.length > 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-primary/70 py-1">
        <BookOpen className="h-3 w-3" />
        {lastContext.length} documento(s) encontrado(s)
      </div>
    );
  }

  return null;
}
