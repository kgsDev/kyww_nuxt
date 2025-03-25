<script setup lang="ts">
import type { RouteLocationRaw } from '#vue-router';
import type { NavigationItem } from '~~/types';

const { globals } = useAppConfig();

const { data: navigation } = await useAsyncData('footerNav', () => {
  return useDirectus(
    readItem('navigation', 'footer', {
      fields: [
        {
          items: [
            'id',
            'title',
            'icon',
            'label',
            'type',
            'url',
            'has_children',
            {
              page: ['permalink', 'title'],
              children: [
                'id',
                'title',
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
});

// Add the current year for copyright
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer
    class="px-6 py-8 bg-white md:px-10 md:py-8 dark:bg-gray-900 rounded-lg shadow-sm"
    aria-labelledby="footer-heading"
  >
    <div class="max-w-7xl mx-auto">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Logo and about section -->
        <div class="col-span-1 md:col-span-1">
          <NuxtLink href="https://www.kywater.org/" class="inline-block mb-5 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md">
            <Logo class="h-10 dark:text-white" />
          </NuxtLink>
          <p class="text-gray-600 dark:text-gray-400 text-sm">
            Monitoring Kentucky's waterways through citizen science and water quality sampling.
          </p>
        </div>

        <!-- Quick Links -->
        <div class="col-span-1">
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white tracking-wider uppercase mb-4">
            Quick Links
          </h3>
          <ul class="space-y-3">
            <li>
              <NuxtLink to="https://www.kywater.org/" class="text-gray-600 dark:text-gray-400 hover:text-primary-600 text-sm">
                Home
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/sites" class="text-gray-600 dark:text-gray-400 hover:text-primary-600 text-sm">
                All Sites
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/portal" class="text-gray-600 dark:text-gray-400 hover:text-primary-600 text-sm">
                Volunteer Login
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Dynamic Footer Links -->
        <div class="col-span-1">
		<!--
          <h3 class="text-sm font-semibold text-gray-900 dark:text-white tracking-wider uppercase mb-4">
            Resources
          </h3>
		-->
          <ul class="space-y-3">
            <template v-if="navigation && navigation.items && navigation.items.length">
              <li v-for="(item, i) in navigation.items.slice(0, 5)" :key="i">
                <NuxtLink 
                  :to="item.type === 'page' ? item.page.permalink : item.url" 
                  :external="item.type === 'url'"
                  class="text-gray-600 dark:text-gray-400 hover:text-primary-600 text-sm"
                >
                  {{ item.title }}
                </NuxtLink>
              </li>
            </template>
          </ul>
        </div>
      </div>

      <!-- Bottom -->
      <div class="pt-6 mt-8 border-t dark:border-t-gray-700 flex flex-col md:flex-row justify-between items-center">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          &copy; {{ currentYear }} {{ globals.title }}. All rights reserved.
        </p>
        
        <!-- Social media icons could go here -->
        <div class="mt-4 md:mt-0 flex space-x-6">
          <!-- Add your social icons here if needed -->
        </div>
      </div>
    </div>
  </footer>
</template>
