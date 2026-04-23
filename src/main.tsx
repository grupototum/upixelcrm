import { logger } from "@/lib/logger";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
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
