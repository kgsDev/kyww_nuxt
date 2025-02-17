<template>
    <div class="page-container">
      <div class="info-container">
        <div class="logo-container">
          <img class="logo" src="~/assets/KyWW_logo.png" alt="KyWW Logo" />
        </div>
        <div class="max-w-xl w-full bg-white shadow-lg rounded-lg p-8 m-4 mt-8">
          <div class="text-center">
            <UIcon
              v-if="error.statusCode === 404"
              name="i-heroicons-map"
              class="mx-auto h-16 w-16 text-blue-500 dark:text-blue-400"
            />
            <UIcon
              v-else
              name="i-heroicons-exclamation-triangle"
              class="mx-auto h-16 w-16 text-yellow-500 dark:text-yellow-400"
            />
            
            <h1 class="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
              {{ error.statusCode === 404 ? 'Page Not Found' : 'An Error Occurred' }}
            </h1>
            
            <p class="mt-2 text-lg text-gray-600 dark:text-gray-300">
              {{ 
                error.statusCode === 404 
                  ? 'The page you are looking for does not exist or has been moved.' 
                  : error.message || 'Something went wrong. Please try again later.'
              }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  defineProps({
    error: {
      type: Object,
      required: true
    }
  })
  </script>
  
  <style scoped>
  .page-container {
    display: flex;
    justify-content: center;
    background-color: #e5e7eb;
    min-height: 100vh;
  }
  
  .info-container {
    width: 100%;
    max-width: 500px;
    padding: 2rem;
  }
  
  .logo-container {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }
  
  .logo {
    width: 12rem;
  }
  </style>