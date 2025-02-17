<template>
  <div class="page-container">
    <div class="info-container">
      <div class="logo-container">
        <img class="logo" src="~/assets/KyWW_logo.png" alt="KyWW Logo" />
      </div>
      <!-- Added margin-top to create more space between logo and message -->
      <div class="max-w-xl w-full bg-white shadow-lg rounded-lg p-8 m-4 mt-8">
        <div class="text-center">
          <UIcon
            name="i-heroicons-shield-exclamation"
            class="mx-auto h-16 w-16 text-red-500 dark:text-red-400"
          />
          <h1 class="mt-4 text-3xl font-bold text-gray-900 dark:text-white">
            Access Denied
          </h1>
          <p class="mt-2 text-lg text-gray-600 dark:text-gray-300">
            You don't have permission to access this page. If you believe this is an error, please contact your administrator.
          </p>
          
          <div class="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <UButton
              variant="solid"
              @click="goBack"
            >
              Go Back
            </UButton>
            <UButton
              variant="outline"
              @click="goHome"
            >
              Return to Dashboard
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  display: flex;
  justify-content: center;
  /* Changed to a darker grey */
  background-color: #e5e7eb;
  min-height: 100vh; /* Makes sure the grey background covers full height */
}

.info-container {
  width: 100%;
  max-width: 500px;
  padding: 2rem;
}

.logo-container {
  display: flex;
  justify-content: center;
  /* Increased bottom margin for more spacing */
  margin-bottom: 2rem;
}

.logo {
  width: 12rem;
}
</style>

<script setup>
definePageMeta({
  layout: 'blank'
});

const router = useRouter();

const goBack = () => {
  router.back();
};

const goHome = () => {
  navigateTo('/portal');
};
</script>