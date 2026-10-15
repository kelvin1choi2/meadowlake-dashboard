import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps asset paths relative, so the same build works on GitHub Pages
// (served under /meadowlake-dashboard/) and from the Mac Mini at /.
export default defineConfig({
  plugins: [react()],
  base: './',
})
