import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/pomotodo/',
  server: {
    host: '0.0.0.0',
    port: 12000,
    strictPort: true,
    cors: true,
    allowedHosts: [
      'work-1-rsfvgvjmtlnocabq.prod-runtime.all-hands.dev',
      '.all-hands.dev'
    ],
    hmr: {
      clientPort: 12000,
    },
  }
})
