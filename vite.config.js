import { defineConfig } from 'vite';
import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';

// Vite 插件：构建后复制 Cloudflare 配置文件
const cloudflarePlugin = () => {
  return {
    name: 'cloudflare-config',
    closeBundle() {
      try {
        const redirectsSrc = join(process.cwd(), 'public/_redirects');
        const headersSrc = join(process.cwd(), '_headers');
        const distDir = join(process.cwd(), 'dist');
        
        if (existsSync(redirectsSrc)) {
          copyFileSync(redirectsSrc, join(distDir, '_redirects'));
          console.log('✓ Copied _redirects to dist');
        }
        
        if (existsSync(headersSrc)) {
          copyFileSync(headersSrc, join(distDir, '_headers'));
          console.log('✓ Copied _headers to dist');
        }
      } catch (err) {
        console.warn('⚠ Failed to copy Cloudflare config files:', err.message);
      }
    }
  };
};

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0', // 监听所有网络接口
    open: true,
    strictPort: false // 如果端口被占用，自动尝试下一个端口
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three']
        }
      }
    }
  },
  publicDir: 'public',
  base: '/',
  plugins: [cloudflarePlugin()]
});
