import { Search } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Botão visível no header que abre o Command Palette.
 * Dispara o evento global `upixel:open-command-palette` que o CommandPalette
 * escuta. Mostra o atalho ⌘K / Ctrl+K dependendo da plataforma.
 */
export function CommandPaletteTrigger() {
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
      className="hidden sm:inline-flex items-center gap-2 h-8 px-3 rounded-md border border-border bg-background hover:bg-secondary/50 text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      <Search className="h-3.5 w-3.5" />
      <span className="hidden md:inline">Buscar…</span>
      <kbd className="ml-1 inline-flex items-center gap-0.5 rounded border border-border/60 bg-secondary/40 px-1.5 py-0.5 text-[9px] font-mono">
        {isMac ? "⌘" : "Ctrl"}K
      </kbd>
    </button>
  );
}
