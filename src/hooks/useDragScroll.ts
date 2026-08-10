import { useEffect, type RefObject } from "react";

/**
 * 2.4 — arrastar a área vazia do board rola horizontalmente.
 *
 * Convive com o drag-and-drop de cards do @dnd-kit: o mousedown só inicia o
 * pan quando o alvo NÃO está dentro de um card, coluna arrastável ou controle
 * interativo. Sem esse filtro, arrastar um card moveria o board junto.
 */
const IGNORE_SELECTOR = [
  "[data-dnd-card]",
  "[role='button']",
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "[contenteditable='true']",
].join(",");

export function useDragScroll(ref: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    const onDown = (e: MouseEvent) => {
      // Só botão esquerdo — botão do meio já é auto-scroll do navegador.
      if (e.button !== 0) return;
      const target = e.target as Element | null;
      if (target?.closest(IGNORE_SELECTOR)) return;

      isDown = true;
      startX = e.pageX;
      startScroll = el.scrollLeft;
      el.classList.add("is-dragging");
    };

    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      el.scrollLeft = startScroll - (e.pageX - startX);
    };

    const stop = () => {
      if (!isDown) return;
      isDown = false;
      el.classList.remove("is-dragging");
    };

    el.addEventListener("mousedown", onDown);
    // move/up no window: o ponteiro costuma sair do elemento durante o arrasto.
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stop);

    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [ref]);
}
