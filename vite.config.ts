import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vueDevTools from 'vite-plugin-vue-devtools'

interface ExtensionEntry {
  cssFileName?: string
  entry: string
  fileName: string
  name: string
}

const extensionEntries: Record<string, ExtensionEntry> = {
  background: {
    entry: 'src/entries/service-worker.ts',
    fileName: 'background/service-worker.js',
    name: 'DanmakuEchoBackground',
  },
  shared: {
    entry: 'src/core/shared.ts',
    fileName: 'src/shared.js',
    name: 'DanmakuEchoShared',
  },
  content: {
    cssFileName: 'src/content',
    entry: 'src/entries/content.ts',
    fileName: 'src/content.js',
    name: 'DanmakuEchoContent',
  },
  'bilibili-page-hook': {
    entry: 'src/entries/bilibili-page-hook.ts',
    fileName: 'src/bilibili-page-hook.js',
    name: 'DanmakuEchoBilibiliPageHook',
  },
  'douyin-bootstrap': {
    entry: 'src/entries/douyin-bootstrap.ts',
    fileName: 'src/douyin-bootstrap.js',
    name: 'DanmakuEchoDouyinBootstrap',
  },
  'douyin-content': {
    cssFileName: 'src/douyin-content',
    entry: 'src/entries/douyin-content.ts',
    fileName: 'src/douyin-content.js',
    name: 'DanmakuEchoDouyinContent',
  },
  'douyin-page-hook': {
    entry: 'src/entries/douyin-page-hook.ts',
    fileName: 'src/douyin-page-hook.js',
    name: 'DanmakuEchoDouyinPageHook',
  },
}

const sharedConfig = {
  base: './',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __VUE_OPTIONS_API__: 'false',
    __VUE_PROD_DEVTOOLS__: 'false',
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
}

export default defineConfig(({ command, mode }) => {
  const plugins = [
    vue({ template: { transformAssetUrls: false } }),
    ...(command === 'serve' ? [vueDevTools()] : []),
  ]

  if (command === 'serve' || mode === 'popup') {
    return {
      ...sharedConfig,
      define: {
        ...sharedConfig.define,
        'process.env.NODE_ENV': JSON.stringify(command === 'serve' ? 'development' : 'production'),
        __VUE_PROD_DEVTOOLS__: command === 'serve' ? 'true' : 'false',
      },
      plugins,
      publicDir: 'public',
      server: {
        host: '127.0.0.1',
        port: 5173,
      },
      build: {
        emptyOutDir: true,
        minify: false,
        outDir: 'build/extension',
        sourcemap: false,
        target: 'chrome110',
      },
    }
  }

  const entry = extensionEntries[mode]
  if (!entry) {
    throw new Error(`Unknown extension build mode: ${mode}`)
  }

  return {
    ...sharedConfig,
    plugins,
    publicDir: false,
    build: {
      emptyOutDir: false,
      lib: {
        cssFileName: entry.cssFileName,
        entry: fileURLToPath(new URL(entry.entry, import.meta.url)),
        fileName: () => entry.fileName,
        formats: ['iife'],
        name: entry.name,
      },
      minify: false,
      outDir: 'build/extension',
      sourcemap: false,
      target: 'chrome110',
    },
  }
})
