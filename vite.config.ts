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
          if (id.includes("react-dom") || id.includes("scheduler") || /node_modules\/react\//.test(id)) return "vendor-react";
          if (id.includes("react-router") || id.includes("@remix-run/router")) return "vendor-router";
          if (id.includes("@supabase")) return "vendor-supabase";
          if (id.includes("@tanstack/react-query")) return "vendor-query";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("reactflow") || id.includes("@reactflow")) return "vendor-reactflow";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("date-fns") || id.includes("react-day-picker")) return "vendor-dates";
          if (id.includes("react-hook-form") || id.includes("zod") || id.includes("@hookform")) return "vendor-forms";
          if (id.includes("@dnd-kit")) return "vendor-dnd";
          if (id.includes("@e965/xlsx") || /\/xlsx[/-]/.test(id)) return "vendor-xlsx";
          return "vendor";
        },
      },
    },
  },
}));
