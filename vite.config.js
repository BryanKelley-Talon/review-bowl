import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Beta target is its own Netlify site at the root, so base stays "/".
// Local dev on 5197 (5190 = Nation Builder, 5195 = the Arena).
export default defineConfig({
  plugins: [react()],
  server: { port: 5197, strictPort: true },
  preview: { port: 5197, strictPort: true },
  build: {
    outDir: 'dist',
    // Keep the payload honest against the school-wifi weight rule.
    chunkSizeWarningLimit: 700,
  },
})
