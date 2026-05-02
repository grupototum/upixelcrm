const isDev = import.meta.env.DEV;

function sendError(args: any[]) {
  try {
    const message = args
      .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
      .join(" ");
    import("@/integrations/supabase/client").then(({ supabase }) => {
      (supabase.from as any)("error_logs").insert({ message }).then(() => {});
    });
  } catch {}
}

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: any[]) => {
    if (isDev) { console.error(...args); return; }
    sendError(args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  debug: (...args: any[]) => {
    if (isDev) console.debug(...args);
  },
};
