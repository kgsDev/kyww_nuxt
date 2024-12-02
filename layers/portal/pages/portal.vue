<script setup>
import { Dialog, DialogPanel, TransitionChild, TransitionRoot } from '@headlessui/vue';

definePageMeta({
	layout: 'blank',
	middleware: ['auth'],
});

const { logout, user } = useDirectusAuth();

const NuxtLink = resolveComponent('NuxtLink');

function useCommandPalette() {
	const showCommandPalette = ref(false);

	defineShortcuts({
		meta_k: {
			usingInput: true,
			handler: () => {
				showCommandPalette.value = !showCommandPalette.value;
			},
		},
	});

	return {
		showCommandPalette,
	};
}

const configPublic = useRuntimeConfig().public;
const roles = {
	sampler: configPublic.SAMPLER_ROLE_ID,
	trainer: configPublic.TRAINER_ROLE_ID,
	basin_lead: configPublic.BASIN_LEAD_ROLE_ID,
	admin: configPublic.ADMIN_ROLE_ID,
};

const user_role = user.value.role;
const sidebarNavigation = {
  top: [
    { name: 'Dashboard', href: '/portal', icon: 'material-symbols:home-outline-rounded' },
    ...(user_role == roles.admin || user_role == roles.trainer || user_role == roles.basin_lead 
      ? [
          { name: 'Add Trainees', href: '/portal/train', icon: 'oui:training' },
          { name: 'Training Report', href: '/portal/train/report', icon: 'mdi:file-document-outline' }
        ] 
      : []
    ),
    ...(user_role == roles.admin || user_role == roles.basin_lead 
      ? [{ name: 'Add / Edit Hub', href: '/portal/hub', icon: 'material-symbols:hub-outline' }] 
      : []
    ),
	...(user_role == roles.admin || user_role == roles.basin_lead || user_role == roles.trainer || user_role == roles.sampler
      ? [{ name: 'Hubs and Sites', href: '/portal/hub/hub-list', icon: 'material-symbols:list' }] 
      : []
    ),
    ...(user_role == roles.admin || user_role == roles.trainer || user_role == roles.basin_lead 
      ? [{ name: 'Stream Sample', href: '/portal/sample', icon: 'mdi:eyedropper' }] 
      : []
    ),
    ...(user_role == roles.admin 
      ? [{ name: 'Biological Assessment', href: '/portal/biological', icon: 'mdi:fish' }] 
      : []
    ),
    ...(user_role == roles.admin 
      ? [{ name: 'Habitat Assessment', href: '/portal/habitat', icon: 'mdi:leaf' }] 
      : []
    ),
  ],
  bottom: [{ name: 'Help', href: '/portal/help', icon: 'material-symbols:help-outline-rounded' }],
};

const userNavigation = [
	[
		{
			label: 'Your Profile',
			icon: 'i-heroicons-user-circle',
			click: () => {
				navigateTo('/portal/account#profile');
			},
		},
		{ label: 'Sign out', icon: 'i-heroicons-arrow-left-on-rectangle', click: () => logout() },
	],
];

const { showCommandPalette } = useCommandPalette();
const mobileMenuOpen = ref(false);
</script>

<template>
  <div class="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
    <!-- Mobile header -->
    <div class="md:hidden flex items-center justify-between p-4 bg-gray-900 text-white">
      <Logo class="h-8 w-auto" alt="Your Company" />
      <button
        type="button"
        class="p-2 rounded-md text-gray-200 hover:text-white"
        @click="mobileMenuOpen = true"
      >
        <UIcon name="heroicons:bars-3" class="h-6 w-6" />
      </button>
    </div>

    <div class="flex flex-1 h-0">
      <!-- Desktop sidebar -->
      <div class="hidden md:flex md:flex-col md:w-24 md:fixed md:inset-y-0">
        <div class="flex flex-col flex-1 min-h-0 bg-gray-900">
          <div class="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div class="flex items-center flex-shrink-0 px-4">
              <Logo class="w-20 text-white" alt="Your Company" />
            </div>
            
            <nav class="mt-5 flex-1 flex flex-col justify-between">
              <!-- Top navigation items -->
              <div class="px-2 space-y-1">
                <component
                  :is="item.href ? NuxtLink : 'button'"
                  v-for="item in sidebarNavigation.top"
                  :key="item.name"
                  :href="item.href ?? undefined"
                  :class="[
                    item.current ? 'bg-gray-800 text-white' : 'text-gray-100 hover:bg-gray-800 hover:text-white',
                    'group flex w-full flex-col items-center text-center rounded-md py-3 px-2 text-xs font-medium'
                  ]"
                  :aria-current="item.current ? 'page' : undefined"
                  @click="item.click ? item.click() : undefined"
                >
                  <UIcon
                    :name="item.icon"
                    :class="[
                      item.current ? 'text-white' : 'text-gray-300 group-hover:text-white',
                      'h-6 w-6'
                    ]"
                    aria-hidden="true"
                  />
                  <span class="mt-2 text-center w-full">{{ item.name }}</span>
                </component>
              </div>

              <!-- Bottom navigation items -->
              <div class="flex flex-col items-center justify-center w-full px-2 space-y-2">
                <NuxtLink
                  v-for="item in sidebarNavigation.bottom"
                  :key="item.name"
                  :href="item.href"
                  :class="[
                    item.current ? 'bg-gray-800 text-white' : 'text-gray-100 hover:bg-gray-800 hover:text-white',
                    'group flex w-full flex-col items-center text-center rounded-md py-3 px-2 text-xs font-medium'
                  ]"
                  :aria-current="item.current ? 'page' : undefined"
                >
                  <UIcon
                    :name="item.icon"
                    :class="[
                      item.current ? 'text-white' : 'text-gray-300 group-hover:text-white',
                      'h-6 w-6'
                    ]"
                    aria-hidden="true"
                  />
                  <span class="mt-2 text-center w-full">{{ item.name }}</span>
                </NuxtLink>
                <DarkModeToggle bg="dark" class="w-full flex justify-center" />

                <!-- Profile dropdown -->
                <UDropdown class="relative w-full flex justify-center px-2" :items="userNavigation">
                  <button class="w-12 h-12 flex justify-center mx-auto">
                    <span class="sr-only">Open user menu</span>
                    <UAvatar class="w-12 h-12" :src="user.avatar" :alt="userName(user)" />
                  </button>
                </UDropdown>
              </div>
            </nav>
          </div>
        </div>
      </div>

      <!-- Mobile menu -->
      <TransitionRoot as="template" :show="mobileMenuOpen">
        <Dialog as="div" class="relative z-50 md:hidden" @close="mobileMenuOpen = false">
          <TransitionChild
            as="template"
            enter="transition-opacity ease-linear duration-300"
            enter-from="opacity-0"
            enter-to="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leave-from="opacity-100"
            leave-to="opacity-0"
          >
            <div class="fixed inset-0 bg-gray-600 bg-opacity-75" />
          </TransitionChild>

          <div class="fixed inset-0 z-40 flex">
            <TransitionChild
              as="template"
              enter="transition ease-in-out duration-300 transform"
              enter-from="-translate-x-full"
              enter-to="translate-x-0"
              leave="transition ease-in-out duration-300 transform"
              leave-from="translate-x-0"
              leave-to="-translate-x-full"
            >
              <DialogPanel class="relative flex flex-col w-full max-w-xs pt-5 pb-4 bg-gray-900">
                <div class="absolute top-0 right-0 p-1 -mr-14">
                  <button
                    type="button"
                    class="flex items-center justify-center w-12 h-12 rounded-full focus:outline-none focus:ring-2 focus:ring-white"
                    @click="mobileMenuOpen = false"
                  >
                    <UIcon name="heroicons:x-mark" class="w-6 h-6 text-white" />
                    <span class="sr-only">Close sidebar</span>
                  </button>
                </div>

                <nav class="flex-1 px-4 divide-y divide-gray-800">
                  <!-- Top navigation items -->
                  <div class="space-y-1 py-4">
                    <NuxtLink
                      v-for="item in sidebarNavigation.top"
                      :key="item.name"
                      :href="item.href"
                      :class="[
                        item.current ? 'bg-gray-800 text-white' : 'text-gray-100 hover:bg-gray-800 hover:text-white',
                        'group flex items-center rounded-md px-3 py-2 text-base font-medium'
                      ]"
                      @click="mobileMenuOpen = false"
                    >
                      <UIcon
                        :name="item.icon"
                        :class="[
                          item.current ? 'text-white' : 'text-gray-300 group-hover:text-white',
                          'mr-4 h-6 w-6'
                        ]"
                      />
                      {{ item.name }}
                    </NuxtLink>
                  </div>

                  <!-- Bottom navigation items -->
                  <div class="space-y-1 py-4">
                    <NuxtLink
                      v-for="item in sidebarNavigation.bottom"
                      :key="item.name"
                      :href="item.href"
                      :class="[
                        item.current ? 'bg-gray-800 text-white' : 'text-gray-100 hover:bg-gray-800 hover:text-white',
                        'group flex items-center rounded-md px-3 py-2 text-base font-medium'
                      ]"
                      @click="mobileMenuOpen = false"
                    >
                      <UIcon
                        :name="item.icon"
                        :class="[
                          item.current ? 'text-white' : 'text-gray-300 group-hover:text-white',
                          'mr-4 h-6 w-6'
                        ]"
                      />
                      {{ item.name }}
                    </NuxtLink>

                    <div class="flex items-center justify-between px-3 py-2">
                      <DarkModeToggle bg="dark" />
                      <UDropdown :items="userNavigation">
                        <button class="flex items-center">
                          <UAvatar :src="user.avatar" :alt="userName(user)" class="w-8 h-8" />
                          <span class="ml-3 text-sm text-white">{{ userName(user) }}</span>
                        </button>
                      </UDropdown>
                    </div>
                  </div>
                </nav>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </TransitionRoot>

      <!-- Main content -->
      <main class="flex-1 md:pl-24">
        <div class="h-full">
          <NuxtErrorBoundary>
            <template #error="{ error, clearError }">
              <div class="p-4">
                <VAlert type="error">{{ error }}</VAlert>
                <button class="mt-4 text-sm text-gray-500 underline" @click="clearError">
                  Try again
                </button>
              </div>
            </template>
            <div class="max-w-5xl mx-auto p-4">
              <NuxtPage />
            </div>
          </NuxtErrorBoundary>
        </div>
      </main>
    </div>

    <!-- Command palette and notifications -->
    <UModal v-model="showCommandPalette">
      <PortalSearch @close="showCommandPalette = false" />
    </UModal>
    <UNotifications />
  </div>
</template>

<style>
html,
body,
#__nuxt {
  @apply h-full;
}

.dark .dark\:bg-gray-950 {
  background-color: rgb(3, 7, 18);
}
</style>
