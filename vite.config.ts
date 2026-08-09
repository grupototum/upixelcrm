import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    allowedHosts: ["upixel-api", "upixel.app", ".upixel.app", "localhost", "127.0.0.1"],
  },
  preview: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true, // nginx faz controle de acesso externamente
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;

          // Heavy + lazy-loadable libraries — code-split aggressively.
          // These are only used by specific routes (Reports, Automations, Import)
          // and don't share React-using surface with the rest of the bundle.
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("reactflow") || id.includes("@reactflow")) return "vendor-reactflow";
          if (id.includes("@e965/xlsx") || /\/xlsx[/-]/.test(id)) return "vendor-xlsx";

          // Standalone helpers (no React dep, no transitive React).
          if (id.includes("@supabase")) return "vendor-supabase";

          // EVERYTHING ELSE — React + ecosystem — goes into a SINGLE chunk.
          //
          // Why not split Radix/router/forms/icons from React: when Rollup
          // splits chunks that depend on React's namespace import
          // (`import * as React from "react"`), the resulting ES modules can
          // load in an order where Radix tries to call `React.forwardRef`
          // before React's module body has finished evaluating. Browsers
          // observed: "Cannot read properties of undefined (reading
          // 'forwardRef')" inside vendor-radix at startup.
          //
          // Keeping React + Radix + Router + Forms + Icons + Dates + DnD +
          // Query in one chunk avoids the cross-chunk import race entirely.
          // Caching cost is real but small — these libs only change when we
          // bump deps, and they ship together anyway.
          return "vendor";
        },
      },
    },
  },
}));
