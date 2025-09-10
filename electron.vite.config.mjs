import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    watch: {
      // Enable watching for main process files
      ignored: ['!**/*.js', '!**/*.mjs']
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    watch: {
      // Enable watching for preload files
      ignored: ['!**/*.js', '!**/*.mjs']
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()],
    server: {
      // Enable HMR (Hot Module Replacement)
      hmr: true,
      // Watch for all file changes
      watch: {
        usePolling: true,
        interval: 100
      }
    }
  }
})
