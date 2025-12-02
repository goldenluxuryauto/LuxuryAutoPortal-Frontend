import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react({
      // Enable Fast Refresh
      fastRefresh: true,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  css: {
    postcss: "./postcss.config.cjs",
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 5000, // Use port 5000 to show in Replit Preview (maps to external port 80)
    host: true, // Listen on all network interfaces
    open: false, // Don't auto-open browser
    strictPort: false, // Allow port fallback if busy
    // Allow all hosts for Replit (hostnames are dynamic like *.replit.dev)
    // This is safe because:
    // 1. It only affects the dev server (not production builds)
    // 2. Replit provides secure isolation between projects
    // 3. Dynamic hostnames make it impractical to whitelist specific hosts
    allowedHosts: (host: string) => {
      // Allow localhost and local IPs
      if (
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "0.0.0.0" ||
        host.startsWith("127.") ||
        host.startsWith("192.168.") ||
        host.startsWith("10.")
      ) {
        return true;
      }
      // Allow any Replit domain (*.replit.dev or *.repl.co)
      if (host.includes("replit.dev") || host.includes("repl.co") || host.includes("kirk.replit.dev")) {
        return true;
      }
      // In development mode, allow all hosts (Replit uses UUID-based dynamic hostnames)
      // This ensures compatibility with Replit's dynamic hostname system
      if (process.env.NODE_ENV !== "production") {
        return true;
      }
      return false;
    },
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/contracts": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
      "/signed-contracts": {
        target: "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
