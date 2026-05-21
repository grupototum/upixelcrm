import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

interface SelectionContextValue {
  /** Modo de seleção múltipla ativo? Quando true, cards mostram checkbox e DnD é desabilitado. */
  selectionMode: boolean;
  /** Conjunto de IDs selecionados (Set pra O(1) lookup em cada lead card). */
  selectedIds: Set<string>;
  /** Contagem (memoizada). */
  selectedCount: number;

  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  toggleSelectionMode: () => void;

  toggleLead: (id: string) => void;
  selectMany: (ids: string[]) => void;
  deselectMany: (ids: string[]) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;

  isSelected: (id: string) => boolean;
}

const SelectionContext = createContext<SelectionContextValue | null>(null);

/**
 * Provider de seleção múltipla pra ações em massa no CRM (mover, excluir, taggear).
 * Mantido escopo enxuto: 1 estado de modo + 1 Set de IDs. Tudo derivado é memoizado.
 *
 * Pattern: o Provider envolve <CRMPage> só (não a app inteira) pra evitar re-renders
 * em features não relacionadas. Sai do contexto = clearSelection automático via unmount.
 */
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const enterSelectionMode = useCallback(() => setSelectionMode(true), []);
  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);
  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((m) => {
      if (m) setSelectedIds(new Set());
      return !m;
    });
  }, []);

  const toggleLead = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectMany = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const deselectMany = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const value = useMemo<SelectionContextValue>(
    () => ({
      selectionMode,
      selectedIds,
      selectedCount: selectedIds.size,
      enterSelectionMode,
      exitSelectionMode,
      toggleSelectionMode,
      toggleLead,
      selectMany,
      deselectMany,
      selectAll,
      clearSelection,
      isSelected: (id: string) => selectedIds.has(id),
    }),
    [selectionMode, selectedIds, enterSelectionMode, exitSelectionMode, toggleSelectionMode, toggleLead, selectMany, deselectMany, selectAll, clearSelection],
  );

  return <SelectionContext.Provider value={value}>{children}</SelectionContext.Provider>;
}

export function useSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("useSelection must be used inside <SelectionProvider>");
  return ctx;
}
