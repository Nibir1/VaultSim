// web/vite.config.ts

// Purpose: Vite bundler configuration with native Tailwind v4 integration
// Author: Nahasat Nibir (Lead Cloud Architect)
// Date: 2026-03-06

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        port: 3000,
        strictPort: true,
    }
});