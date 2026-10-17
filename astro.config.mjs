// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Hace falta para que las etiquetas og: del layout salgan con la
  // dirección completa: WhatsApp no lee rutas relativas.
  // Plantilla de muestra: se cambia por la dirección de cada cliente.
  site: "https://boda-sebastian-y-valeria.vercel.app",
  vite: {
    plugins: [tailwindcss()]
  }
});