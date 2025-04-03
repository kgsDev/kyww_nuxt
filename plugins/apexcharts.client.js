import VueApexCharts from 'vue3-apexcharts'
import ApexCharts from 'apexcharts'

export default defineNuxtPlugin((nuxtApp) => {
  // Make ApexCharts available globally
  window.ApexCharts = ApexCharts
  // Register the component
  nuxtApp.vueApp.component('apexchart', VueApexCharts)
})