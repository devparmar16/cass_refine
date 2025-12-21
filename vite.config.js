import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Disable TypeScript checking
      typescript: false,
      // Use SWC for faster compilation
      swc: true,
      // Enable fast refresh
      fastRefresh: true
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/main.jsx'),
      },
      output: {
        // Enable code splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover'],
          supabase: ['@supabase/supabase-js'],
          charts: ['recharts'],
          icons: ['lucide-react', 'react-icons'],
          utils: ['date-fns', 'clsx', 'tailwind-merge'],
        },
        // Optimize chunk size
        chunkSizeWarningLimit: 1000,
        // Better caching with content hashes
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    // Enable source maps for debugging
    sourcemap: false,
    // Optimize build
    target: 'esnext',
    cssCodeSplit: true,
    reportCompressedSize: false, // Faster builds
  },
  // Optimize dependencies and build
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'react-router-dom',
      '@supabase/supabase-js',
      'lucide-react',
      'react-icons',
      'date-fns',
      'clsx',
      'tailwind-merge'
    ],
    exclude: ['@handsontable/react', 'handsontable'], // Exclude heavy libraries
    esbuildOptions: {
      loader: {
        '.ts': 'js',
        '.tsx': 'jsx',
        '.d.ts': 'js'
      },
      // Optimize esbuild
      target: 'esnext',
      minify: true,
    }
  },
  // Enable caching
  cacheDir: '.vite',
  // Optimize server
  server: {
    hmr: {
      // Optimize HMR for ngrok
      port: 24678,
      overlay: false, // Disable overlay to reduce latency
    },
    watch: {
      usePolling: false
    },
    proxy: {
      '/api': 'http://localhost:5001',
    },
    // Allow ngrok hosts
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '.ngrok-free.app',
      '.ngrok.io',
      '.ngrok.app',
      '2628374c584a.ngrok-free.app'  // Your specific ngrok host
    ],
    // Optimize for ngrok
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Reduce latency
    cors: true,
    // Optimize for remote access
    https: false,
    // Performance optimizations
    fs: {
      strict: false,
      allow: ['..']
    },
    // Optimize middleware
    middlewareMode: false,
  },
  // Enable CSS code splitting
  css: {
    devSourcemap: false,
    // Optimize CSS - removed require statements that cause ES module errors
  },
  // Optimize assets
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.svg'],
  // Performance optimizations
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
  },
  // Optimize preview
  preview: {
    port: 4173,
    host: '0.0.0.0',
    strictPort: true,
  },
}) 