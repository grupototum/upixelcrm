import { useCallback, useEffect, useState } from "react";

/**
 * Observa a largura/altura reais de um elemento via ResizeObserver.
 * Usa uma callback ref, então funciona com elementos montados condicionalmente.
 *
 * Uso:
 *   const { ref, width } = useElementSize<HTMLDivElement>();
 *   <div ref={ref} /> // width reflete a largura de conteúdo do elemento
 */
export function useElementSize<T extends HTMLElement>() {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  const ref = useCallback((el: T | null) => setNode(el), []);

  useEffect(() => {
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return { ref, width: size.width, height: size.height };
}
