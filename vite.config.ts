import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      path: 'path-posix',
      '@babel/core/lib/config/files/index.js': '@babel/core/lib/config/files/index-browser.js',
      '@babel/core/lib/config/resolve-targets.js': '@babel/core/lib/config/resolve-targets-browser.js',
      '@babel/core/lib/transform-file.js': '@babel/core/lib/transform-file-browser.js',
    },
  },
  define: {
    'process.cwd': '(()=>"/")',
    'process.env': '({})',
    'Buffer.isBuffer': 'window.Buffer?.isBuffer',  // jsesc
  },
});
