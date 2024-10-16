import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(async (nuxtApp) => {
  if (process.client) {
    const L = await import('leaflet')
    await import('leaflet/dist/leaflet.css')
    nuxtApp.provide('L', L.default)
  }
})