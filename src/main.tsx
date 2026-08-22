import { logger } from "@/lib/logger";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import "./index.css";

// Recuperação de chunk obsoleto após deploy.
//
// As rotas são carregadas com lazy(() => import(...)), e o nome de cada chunk
// carrega um hash do conteúdo. Quando sobe um build novo, os hashes mudam e os
// arquivos antigos somem do CDN — mas uma aba já aberta continua com o HTML
// anterior em memória, apontando para os nomes velhos. Navegar para /inbox
// nessa aba dispara um import() de um arquivo que não existe mais, e o usuário
// vê o ErrorBoundary ("Algo deu errado") sem nada de errado no app.
//
// O Vite emite `vite:preloadError` exatamente nesse caso. Recarregar resolve:
// a navegação busca o HTML novo (a Vercel serve index.html com max-age=0,
// must-revalidate, e o service worker é network-first em navegação), que já
// aponta para os hashes atuais.
//
// A trava não é opcional: sem ela, um import() que falha por qualquer outro
// motivo — rede instável, build realmente quebrado — recarrega a página em loop
// infinito.
//
// A trava é por tempo, não por sessão. Uma trava permanente na sessão impediria
// a recuperação no segundo deploy da mesma aba (hoje saem vários no mesmo dia);
// uma trava que se limpa no load seguinte não trava nada, porque o próprio
// reload dispara o load. A janela resolve os dois: recupera de deploys
// sucessivos, mas um chunk que falha de verdade não recarrega mais de uma vez
// a cada 10 minutos — na segunda falha dentro da janela o ErrorBoundary aparece,
// que é o comportamento honesto.
const PRELOAD_RELOAD_KEY = "upixel:chunk-reload-at";
const PRELOAD_RELOAD_WINDOW_MS = 10 * 60 * 1000;

window.addEventListener("vite:preloadError", (event) => {
  const last = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY) ?? 0);
  if (Date.now() - last < PRELOAD_RELOAD_WINDOW_MS) {
    // Já recarregamos há pouco e o chunk continua falhando: não é build
    // obsoleto. Deixa o erro subir para o ErrorBoundary.
    return;
  }
  event.preventDefault();
  sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()));
  logger.warn("Chunk obsoleto detectado após deploy — recarregando para pegar o build novo.");
  window.location.reload();
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

// PWA Service Worker Registration
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (!isPreviewHost && !isInIframe && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        logger.log("SW registered:", registration.scope);

        // Check for updates periodically
        setInterval(() => registration.update(), 60 * 60 * 1000);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                // New version available — auto-activate
                newWorker.postMessage({ type: "SKIP_WAITING" });
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((err) => logger.warn("SW registration failed:", err));
  });
} else if (isPreviewHost || isInIframe) {
  // Unregister any existing SW in preview/iframe
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}
