import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
    // Add proxy for API requests to backend
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Add this section for WebSocket proxying
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },

    // Allow Vite dev server to serve files from the workspace root
    // and one level up (needed for CSS imported from node_modules in workspaces)
    fs: {
      allow: [
        // search up for workspace root
        '..',
        // allow serving files from workspace root explicitly
        '/Users/marmikpandya/Desktop/ada',
      ],
    },
  },
}));
