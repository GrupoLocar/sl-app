// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/sl-app/", // importante p/ rodar em http://localhost:5173/sl-app/ e no GitHub Pages
  plugins: [react()],
  server: {
    proxy: {
      // ajuste a porta do seu backend aqui
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        // se sua API usa cookies/sessão, ative:
        // secure: false,
      },
    },
  },
});
