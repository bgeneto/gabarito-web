import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const DEFAULT_SITE_URL = "https://gabarito.sistema.pro.br";

function resolveSiteUrl(mode: string): string {
  const env = loadEnv(mode, process.cwd(), "");
  const raw =
    env.VITE_SITE_URL?.trim() ||
    process.env.VITE_SITE_URL?.trim() ||
    DEFAULT_SITE_URL;
  return raw.replace(/\/$/, "");
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const siteUrl = resolveSiteUrl(mode);
  const backendUrl =
    process.env.BACKEND_URL || loadEnv(mode, process.cwd(), "").BACKEND_URL || "http://localhost:3000";

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "inject-site-url",
        transformIndexHtml(html) {
          return html.replaceAll("__SITE_URL__", siteUrl);
        },
      },
    ],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      emptyOutDir: true,
    },
  };
});
