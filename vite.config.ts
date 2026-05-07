import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ── Dev Server Proxy ────────────────────────────────────────────────────
  // Forwards all /api/* requests from the Vite dev server (port 5173)
  // to the FastAPI backend (port 5000). This avoids CORS issues during
  // development and lets the frontend use relative URLs like "/api/auth/login".
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',  // FastAPI backend URL
        changeOrigin: true,               // Required for virtual hosted sites
      },
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
