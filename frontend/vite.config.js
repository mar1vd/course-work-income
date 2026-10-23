import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Конфігурація Vite: плагін React (JSX) та Tailwind CSS
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
});
