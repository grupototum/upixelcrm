// Loader idempotente do Facebook JS SDK. Tanto WhatsApp Cloud Embedded Signup
// quanto Instagram Embedded Signup compartilham o mesmo SDK — esse módulo
// garante que ele só carrega uma vez e expõe uma promise singleton.

const SDK_SRC = "https://connect.facebook.net/en_US/sdk.js";
const SDK_VERSION = "v22.0";
const SDK_SCRIPT_ID = "facebook-jssdk";

declare global {
  interface Window {
    FB?: {
      init(opts: Record<string, unknown>): void;
      login(
        cb: (response: FBLoginResponse) => void,
        opts: Record<string, unknown>,
      ): void;
      logout?(cb: (response: unknown) => void): void;
      AppEvents?: { logPageView(): void };
    };
    fbAsyncInit?: () => void;
  }
}

export interface FBLoginResponse {
  authResponse?: {
    code?: string;
    accessToken?: string;
    userID?: string;
    expiresIn?: number;
    grantedScopes?: string;
  } | null;
  status?: "connected" | "not_authorized" | "unknown" | string;
}

let sdkLoadingPromise: Promise<void> | null = null;
let initializedAppId: string | null = null;

/**
 * Garante que o SDK do Facebook está carregado e inicializado com o `appId`
 * fornecido. Pode ser chamado várias vezes — só dispara load 1×.
 *
 * Se for chamado com appId diferente do que já inicializou, devolve erro
 * (FB SDK não suporta re-init com appId diferente sem reload da página).
 */
export function ensureFbSdkLoaded(appId: string): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window não disponível"));
  }

  if (sdkLoadingPromise) {
    if (initializedAppId && initializedAppId !== appId) {
      return Promise.reject(new Error(
        `Facebook SDK já foi inicializado com appId ${initializedAppId}. Recarregue a página.`,
      ));
    }
    return sdkLoadingPromise;
  }

  sdkLoadingPromise = new Promise((resolve, reject) => {
    if (window.FB) {
      // Já carregado por algum outro componente — só precisa ter inicializado.
      if (!initializedAppId) {
        window.FB.init({
          appId,
          cookie: true,
          xfbml: false,
          version: SDK_VERSION,
        });
        initializedAppId = appId;
      }
      resolve();
      return;
    }

    if (document.getElementById(SDK_SCRIPT_ID)) {
      // Script tag injetada mas FB ainda não disponível: aguarda fbAsyncInit
      const interval = setInterval(() => {
        if (window.FB) {
          clearInterval(interval);
          resolve();
        }
      }, 80);
      setTimeout(() => {
        clearInterval(interval);
        if (!window.FB) reject(new Error("Timeout carregando Facebook SDK"));
      }, 8000);
      return;
    }

    window.fbAsyncInit = () => {
      window.FB?.init({
        appId,
        cookie: true,
        xfbml: false,
        version: SDK_VERSION,
      });
      initializedAppId = appId;
      resolve();
    };

    const script = document.createElement("script");
    script.id = SDK_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = SDK_SRC;
    script.onerror = () => reject(new Error("Falha carregando Facebook SDK"));
    document.body.appendChild(script);
  });

  return sdkLoadingPromise;
}

/** Origens da Meta que podem mandar postMessage durante Embedded Signup. */
export const META_MESSAGE_ORIGINS = new Set([
  "https://www.facebook.com",
  "https://web.facebook.com",
  "https://m.facebook.com",
]);

export function isMetaOrigin(origin: string): boolean {
  return META_MESSAGE_ORIGINS.has(origin);
}
