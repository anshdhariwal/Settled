import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react({
      fastRefresh: true,
    }),
    tailwindcss(),
  ],
  server: {
    host: true,
    port: 5173,
    hmr: {
      overlay: true,
    },
  },
})
