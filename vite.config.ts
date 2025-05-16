import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      ignored: ["./specstory/**"],
    },
    proxy: {
      "/api/anthropic": {
        target: "https://api.anthropic.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/anthropic/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", function (proxyReq, req) {
            // Make sure the dangerous-direct-browser-access header gets passed through
            if (req.headers["anthropic-dangerous-direct-browser-access"]) {
              proxyReq.setHeader(
                "anthropic-dangerous-direct-browser-access",
                req.headers["anthropic-dangerous-direct-browser-access"]
              );
            }
          });
        },
        headers: {
          Accept: "application/json",
          "anthropic-version": "2023-06-01",
        },
      },
      "/api/openai": {
        target: "https://api.openai.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split UI framework dependencies
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Split charting libraries
          "vendor-charts": ["recharts"],
          // Split data/API libraries
          "vendor-data": ["octokit", "zustand"],
          // Split UI component libraries
          "vendor-ui": [
            "framer-motion",
            "lucide-react",
            "sonner",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-label",
          ],
        },
      },
    },
    // Reduce chunk size to improve loading performance
    chunkSizeWarningLimit: 800,
    // Optimize/minify output
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
