import { Search } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Botão que abre o Command Palette. Dispara o evento global
 * `upixel:open-command-palette` que o CommandPalette escuta, e mostra o atalho
 * ⌘K / Ctrl+K conforme a plataforma.
 *
 * `fullWidth` é o modo sidebar: ocupa a largura toda e mostra o rótulo em
 * qualquer breakpoint. Sem ele mantém o comportamento antigo de header, que
 * some abaixo de `sm` e esconde o rótulo abaixo de `md`.
 */
export function CommandPaletteTrigger({ fullWidth = false }: { fullWidth?: boolean }) {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setIsMac(/Mac|iPhone|iPod|iPad/i.test(navigator.platform));
    }
  }, []);

  const handleClick = () => {
    window.dispatchEvent(new Event("upixel:open-command-palette"));
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Abrir busca rápida"
      className={
        fullWidth
          ? "flex w-full items-center gap-2 h-9 px-3 rounded-lg border border-sidebar-border bg-sidebar-accent/40 hover:bg-sidebar-accent text-xs text-muted-foreground hover:text-foreground transition-colors"
          : "hidden sm:inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-background hover:bg-secondary/50 text-xs text-muted-foreground hover:text-foreground transition-colors"
      }
    >
      <Search className="h-3.5 w-3.5 shrink-0" />
      <span className={fullWidth ? "flex-1 text-left" : "hidden md:inline"}>Buscar…</span>
      <kbd className="ml-1 inline-flex items-center gap-0.5 rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[9px] font-mono shrink-0">
        {isMac ? "⌘" : "Ctrl"}K
      </kbd>
    </button>
  );
}
