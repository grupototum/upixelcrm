import { logger } from "@/lib/logger";
import { useState, useCallback } from "react";
import { searchSimilarDocuments, SearchResult } from "@/services/ragSearchService";

export function useRagContext() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastContext, setLastContext] = useState<SearchResult[] | null>(null);

  const searchContext = useCallback(async (query: string): Promise<SearchResult[]> => {
    setIsLoading(true);
    try {
      const results = await searchSimilarDocuments(query);
      setLastContext(results);
      return results;
    } catch (error) {
      logger.error("RAG search error:", error);
      setLastContext([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { searchContext, isLoading, lastContext };
}
