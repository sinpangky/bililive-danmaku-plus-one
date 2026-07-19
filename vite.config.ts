import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("development"),
    __VUE_OPTIONS_API__: "false",
    __VUE_PROD_DEVTOOLS__: "true",
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false"
  },
  plugins: [vue({ template: { transformAssetUrls: false } })],
  publicDir: false,
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});
