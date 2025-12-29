import { defineConfig } from 'vite'
import { cloudflarePages } from '@hono/vite-build'

export default defineConfig({
  plugins: [
    cloudflarePages({
      entry: 'src/index.tsx'
    })
  ],
  build: {
    minify: true
  }
})