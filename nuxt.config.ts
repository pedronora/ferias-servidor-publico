import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-27',
  devtools: { enabled: false },
  ssr: true,
  modules: ['@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  typescript: {
    strict: true,
  },
  app: {
    head: {
      htmlAttrs: { lang: 'pt-BR' },
      title: 'Férias do Servidor',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Sistema de marcação de férias do serviço público.' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    },
  },
  runtimeConfig: {
    databaseUrl: '',
    sessionSecret: '',
    adminEmail: '',
    adminPassword: '',
    public: {
      appUrl: 'http://localhost:3000',
    },
  },
  nitro: {
    preset: 'node-server',
  },
  eslint: {
    config: {
      stylistic: false,
    },
  },
})
