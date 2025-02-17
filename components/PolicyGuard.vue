<template>
    <div>
      <div v-if="loading" class="py-4 text-center">
        <UIcon name="i-heroicons-arrow-path" class="h-5 w-5 animate-spin mx-auto" />
        <p class="text-sm text-gray-500 mt-2">Checking permissions...</p>
      </div>
      
      <template v-else>
        <slot v-if="hasPermission" />
        <UnauthorizedMessage v-else />
      </template>
    </div>
  </template>
  
  <script setup>
  const props = defineProps({
    path: {
      type: String,
      required: true
    }
  })
  
  const { hasAccess } = useRBAC()
  const loading = ref(true)
  const hasPermission = ref(false)
  
  onMounted(async () => {
    loading.value = true
    try {
      hasPermission.value = await hasAccess(props.path)
    } catch (error) {
      console.error('Error checking permissions:', error)
      hasPermission.value = false
    } finally {
      loading.value = false
    }
  })
  </script>