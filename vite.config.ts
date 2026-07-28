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

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split heavy third-party libraries into their own cacheable chunks so
        // the main application bundle stays small and vendor code can be cached
        // independently across deploys.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('/victory-')) return 'charts'
          if (id.includes('@mui') || id.includes('@emotion')) return 'mui'
          if (id.includes('@radix-ui')) return 'radix'
          if (id.includes('lucide-react')) return 'icons'
          if (id.includes('/motion/') || id.includes('framer-motion')) return 'motion'
          if (id.includes('xlsx')) return 'xlsx'
          if (id.includes('react-slick') || id.includes('/slick-carousel/')) return 'carousel'
          if (
            id.includes('/react-dom/') ||
            id.includes('/react/') ||
            id.includes('react-router') ||
            id.includes('/scheduler/')
          )
            return 'react-vendor'
          return 'vendor'
        },
      },
    },
  },
})
