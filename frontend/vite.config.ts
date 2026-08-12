import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "아공노 모바일회원증",
        short_name: "아공노 회원증",
        description: "아산시공무원노동조합 모바일 회원증",
        lang: "ko",
        start_url: "/member/card",
        scope: "/",
        display: "standalone",
        background_color: "#f3f4f6",
        theme_color: "#1e3a8a",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // 개인정보(회원증 API 응답, 사진)는 오프라인 캐시 대상에서 완전히 제외한다 (PRD 31).
        // 정적 자산(JS/CSS/아이콘)만 사전 캐시하고, /api/* 요청은 서비스워커가 가로채지 않는다.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: "NetworkOnly",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
