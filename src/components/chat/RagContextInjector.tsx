import { useState, useRef, useEffect } from 'react';
import { searchSimilarDocuments, SearchResult } from '@/services/ragSearchService';
import { Card } from '@/components/ui/card';
import { Zap } from 'lucide-react';

interface RagContextInjectorProps {
  userQuery: string;
  onContextReady: (context: string, documents: SearchResult[]) => void;
  isSearching?: boolean;
}

export function RagContextInjector({
  userQuery,
  onContextReady,
  isSearching = false,
}: RagContextInjectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const onContextReadyRef = useRef(onContextReady);
  const lastQueryRef = useRef('');

  useEffect(() => {
    onContextReadyRef.current = onContextReady;
  }, [onContextReady]);

  useEffect(() => {
    if (!userQuery?.trim() || userQuery === lastQueryRef.current) return;
    lastQueryRef.current = userQuery;

    const fetchContext = async () => {
      setIsLoading(true);
      try {
        const results = await searchSimilarDocuments(userQuery);
        if (results && results.length > 0) {
          const context = results
            .map((doc, i) => `[${i + 1}] (${doc.type}) ${doc.title}: ${doc.content}`)
            .join('\n\n');
          onContextReadyRef.current(context, results);
        }
      } catch (err) {
        console.error('Erro ao buscar contexto RAG:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContext();
  }, [userQuery]);

  if (isLoading || isSearching) {
    return (
      <Card className="p-3 bg-accent/10 border-accent/20 flex gap-2 items-center text-sm">
        <Zap className="h-4 w-4 text-accent animate-pulse" />
        <span className="text-accent">Buscando contexto RAG...</span>
      </Card>
    );
  }

  return null;
}
