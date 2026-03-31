import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            "/ollama": {
                target: "http://127.0.0.1:11434",
                changeOrigin: true,
                rewrite: function (path) { return path.replace(/^\/ollama/, ""); },
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
