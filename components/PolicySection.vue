<template>
    <div>
      <div v-if="loading" class="py-2">
        <UIcon name="i-heroicons-arrow-path" class="h-4 w-4 animate-spin" />
      </div>
      
      <template v-else>
        <slot v-if="hasPermission" />
        <div v-else class="text-sm text-gray-500 italic">
          You don't have permission to access this section.
        </div>
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