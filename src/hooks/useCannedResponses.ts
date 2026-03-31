import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface CannedResponse {
  id: string;
  short_code: string;
  title: string;
  content: string;
  created_at: string;
}

// In-memory canned responses until the table is created
const defaultResponses: CannedResponse[] = [
  { id: "1", short_code: "ola", title: "Saudação", content: "Olá! Como posso ajudá-lo hoje?", created_at: new Date().toISOString() },
  { id: "2", short_code: "obrigado", title: "Agradecimento", content: "Obrigado pelo seu contato! Estamos à disposição.", created_at: new Date().toISOString() },
];

export function useCannedResponses() {
  const [responses, setResponses] = useState<CannedResponse[]>(defaultResponses);
  const [loading] = useState(false);

  const create = useCallback(async (shortCode: string, title: string, content: string) => {
    const newResp: CannedResponse = {
      id: crypto.randomUUID(),
      short_code: shortCode,
      title,
      content,
      created_at: new Date().toISOString(),
    };
    setResponses(prev => [...prev, newResp]);
    toast.success("Resposta rápida criada!");
    return true;
  }, []);

  const update = useCallback(async (id: string, data: Partial<CannedResponse>) => {
    setResponses(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    return true;
  }, []);

  const remove = useCallback(async (id: string) => {
    setResponses(prev => prev.filter(r => r.id !== id));
    toast.success("Resposta rápida removida");
    return true;
  }, []);

  const search = useCallback((query: string) => {
    if (!query) return responses;
    const q = query.toLowerCase();
    return responses.filter(
      r => r.short_code.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)
    );
  }, [responses]);

  const resolveVariables = useCallback((template: string, vars: Record<string, string>) => {
    return template.replace(/\{\{(\w+)\.(\w+)\}\}/g, (match, group, key) => {
      const fullKey = `${group}.${key}`;
      return vars[fullKey] || match;
    });
  }, []);

  return { responses, loading, create, update, remove, search, resolveVariables, refresh: () => {} };
}
