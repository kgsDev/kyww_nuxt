<template>
    <div class="flex justify-center bg-gray-100 p-4 rounded-lg">
      <div class="max-w-xl w-full bg-white shadow-lg rounded-lg p-8">
        <div class="text-center">
          <UIcon
            name="i-heroicons-shield-exclamation"
            class="mx-auto h-12 w-12 text-red-500 dark:text-red-400"
          />
          <h2 class="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
            Access Denied
          </h2>
          <p class="mt-2 text-base text-gray-600 dark:text-gray-300">
            You don't have permission to access this page. If you believe this is an error, please contact your administrator.
          </p>
          
          <div class="mt-6 flex flex-row gap-4 justify-center">
            <UButton
              variant="solid"
              @click="router.back()"
            >
              Go Back
            </UButton>
            <UButton
              variant="outline"
              @click="navigateTo('/portal')"
            >
              Return to Dashboard
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  const router = useRouter();
  </script>