import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              if (req.headers['authorization'])
                proxyReq.setHeader('authorization', req.headers['authorization']);
            });
          },
        }
      }
    },
    build: { outDir: 'build' },
    esbuild: { loader: 'jsx', include: /src\/.*\.[jt]sx?$/ },
    optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } }
  };
});
