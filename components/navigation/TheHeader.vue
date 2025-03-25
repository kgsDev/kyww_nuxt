<script setup lang="ts">
const {
  theme,
  globals: { title },
} = useAppConfig();

const {
  data: navigation,
  pending,
  error,
} = await useAsyncData(
  'mainNavigation',
  () => {
    return useDirectus(
      readItem('navigation', 'main', {
        fields: [
          {
            items: [
              'id',
              'has_children',
              'title',
              'icon',
              'label',
              'type',
              'url',
              {
                page: ['permalink', 'title'],
                children: [
                  'id',
                  'title',
                  'has_children',
                  'icon',
                  'label',
                  'type',
                  'url',
                  {
                    page: ['permalink', 'title'],
                  },
                ],
              },
            ],
          },
        ],
      }),
    );
  },
  {
    transform: (data) => data,
  },
);

// Add flag to detect if we're on a public page
const route = useRoute();
const isPublicPage = computed(() => {
  return route.path.startsWith('/sites/') || route.path.startsWith('/samples/');
});
</script>

<template>
  <header class="flex justify-between items-center w-full">
    <div class="flex items-center">
      <NuxtLink to="https://www.kywater.org/" class="flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md">
        <Logo class="h-14 dark:text-white" />
      </NuxtLink>
    </div>

    <!-- Navigation for public pages -->
    <div v-if="isPublicPage" class="hidden md:flex items-center space-x-6">
      <NuxtLink to="https://www.kywater.org/" class="text-gray-600 hover:text-primary-600 font-medium">
        Home
      </NuxtLink>
      <NuxtLink to="/sites" class="text-gray-600 hover:text-primary-600 font-medium">
        All Sites
      </NuxtLink>
      <UButton to="/portal" color="primary" variant="solid" size="md" class="ml-3">
        <span class="hidden sm:inline">Volunteer</span> Login
      </UButton>
    </div>

    <!-- Standard navigation -->
    <div v-else class="flex items-center space-x-4">
      <div class="hidden md:flex items-center space-x-4">
        <template v-if="navigation && navigation.items && navigation.items.length">
          <template v-for="(item, i) in navigation.items" :key="i">
            <UButton
              v-if="!item.has_children"
              :to="item.type === 'page' ? item.page.permalink : item.url"
              :external="item.type === 'url'"
              color="gray"
              variant="ghost"
              class="font-medium"
            >
              {{ item.title }}
            </UButton>
          </template>
        </template>
      </div>
      <UButton to="/portal" color="primary" variant="solid" size="md">
        <span class="hidden sm:inline">Volunteer</span> Login
      </UButton>
    </div>

    <!-- Mobile menu -->
    <div class="md:hidden">
      <NavigationMobileMenu v-if="navigation" :navigation="navigation" />
    </div>
  </header>
</template>

<style scoped>
.logo-container {
  display: flex;
  justify-content: left;
}
</style>