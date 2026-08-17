import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit tests cover `src/lib/` only — the derived Open Source list is the one
// piece of this site that is computed rather than typed out by hand. Pages and
// components stay untested; a type error or a failed build is the honest signal
// there. See docs/adr/0007-package-families.md.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    include: ['src/lib/**/*.test.ts'],
  },
});
