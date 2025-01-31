import { defineConfig } from 'vitest/config';
import wasm from 'vite-plugin-wasm';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    deps: { inline: [/ergo-lib-wasm-browser/] }
  },
  assetsInclude: ['**/*.wasm'],
  resolve: {
    alias: {
      '@': '/src', // Ensure alias resolution works
    },
  },
  plugins: [wasm()],
});
