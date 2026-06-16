import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
var root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
    plugins: [react()],
    build: {
        rollupOptions: {
            input: {
                dashboard: "".concat(root, "index.html"),
                app: "".concat(root, "app.html"),
            },
        },
    },
});
