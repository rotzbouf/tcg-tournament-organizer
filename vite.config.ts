import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import path from 'path'

// Build-only (dev-mode HMR needs inline/ws access Vite provides itself).
// connect-src allows Discord for webhook notifications sent from the renderer.
function injectCsp(): Plugin {
  return {
    name: 'inject-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [{
          tag: 'meta',
          attrs: {
            'http-equiv': 'Content-Security-Policy',
            content: [
              "default-src 'self'",
              "script-src 'self'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://discord.com https://discordapp.com",
              "object-src 'none'",
              "base-uri 'none'",
              "form-action 'none'",
            ].join('; '),
          },
          injectTo: 'head',
        }],
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    injectCsp(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: 'electron/preload.ts',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
