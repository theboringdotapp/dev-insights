import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
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
});
