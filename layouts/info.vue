<script setup lang="ts"></script>
<template>
  <div
    class="relative flex flex-col min-h-screen overflow-hidden antialiased transition duration-150 bg-white visual-effects bg-gradient-to-br from-white to-gray-100 dark:from-gray-950 dark:to-gray-700"
  >
    <div class="sticky top-0 z-10 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm shadow-sm">
      <div class="relative w-full max-w-7xl px-4 py-3 mx-auto lg:px-8">
        <NavigationTheHeader />
      </div>
    </div>

    <div class="flex-grow relative text-gray-900">
      <slot />
    </div>

    <div class="mt-12">
      <div class="relative w-full max-w-7xl px-4 mx-auto lg:px-8">
        <NavigationTheFooter />
      </div>
    </div>
  </div>
</template>

<style>
/* Ensure content area has minimum height for short pages */
.flex-grow {
  min-height: 70vh;
}
</style>