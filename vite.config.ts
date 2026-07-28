import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Served from https://chevp.github.io/cryojs-component/ (GitHub Pages project site).
export default defineConfig({
  base: '/cryojs-component/',
  plugins: [vue()],
  build: {
    commonjsOptions: {
      // @cryo/cryojs is a `file:` dep resolved through a submodule symlink, so its
      // real path sits outside node_modules — Rollup's default CJS-detection
      // (which matches on node_modules) would otherwise miss it and treat its
      // tsc-emitted CJS output as a broken ES module.
      include: [/node_modules/, /tools[\\/]cryojs/],
    },
  },
})
