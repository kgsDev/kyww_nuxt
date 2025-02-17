<script setup lang="ts">
import PolicyGuard from '../../components/PolicyGuard.vue';
import { useKYWWMap } from '~/composables/useKYWWMap';

const mapContainer = ref(null);
const containerReady = ref(false);
const legendVisible = ref(true);

const {
  loading,
  error,
  hubs,
  sites,
  fetchData,
  initializeMap,
  zoomTo
} = useKYWWMap();

// Handle zooming to hub
function zoomToHub(hub) {
  if (hub.longitude && hub.latitude) {
    zoomTo([hub.longitude, hub.latitude]);
  }
}

watch(mapContainer, async (newValue) => {
  if (newValue && !loading.value) {
    containerReady.value = true;
    await initializeMap(newValue, {
      showSites: true,
      showHubs: true
    });
  }
});

onMounted(async () => {
  await fetchData();
});
</script>

<template>
 <PolicyGuard path="/portal/hub">
  <div>
    <PortalPageHeader
      title="KYWW Hubs and Sites"
      :breadcrumbs="[
        {
          title: 'Portal',
          href: '/portal',
        },
        {
          title: 'Hubs',
          href: '/portal/hub',
        },
      ]"
    />

    <div class="container mx-auto px-4 space-y-6">
      <ULoadingBlock v-if="loading" class="h-64" />

      <UAlert
        v-else-if="error"
        type="error"
        :title="error"
        class="mb-4"
      />

      <template v-else>
        <!-- Map Section -->
        <UCard class="w-full">
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-semibold">Kentucky Sampling Sites and Hubs</h2>
              <UButton
                v-if="legendVisible"
                icon="i-heroicons-map"
                variant="ghost"
                @click="legendVisible = !legendVisible"
              >
                Hide Legend
              </UButton>
              <UButton
                v-else
                icon="i-heroicons-map"
                variant="ghost"
                @click="legendVisible = !legendVisible"
              >
                Show Legend
              </UButton>
            </div>
          </template>

          <div class="relative w-full h-[500px]">
            <div 
              ref="mapContainer" 
              class="w-full h-full rounded-lg relative"
            >
              <!-- Loading overlay -->
              <div 
                v-if="!containerReady" 
                class="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg"
              >
                <ULoadingIcon />
                <span class="ml-2">Loading map...</span>
              </div>
            </div>

            <!-- Legend -->
            <div 
              v-if="legendVisible && containerReady"
              class="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10 min-w-[200px]"
            >
              <h3 class="font-semibold mb-2">Map Legend</h3>
              <div class="space-y-2">
                <div class="flex items-center">
                  <div class="w-4 h-4 rounded-full bg-[#FFA500] opacity-70 mr-2"></div>
                  <span>Sampling Sites</span>
                </div>
                <div class="flex items-center">
                  <div class="w-4 h-4 rounded-full bg-[#2ECC71] opacity-70 mr-2"></div>
                  <span>Support Hubs</span>
                </div>
              </div>
              <div class="mt-4 text-xs text-gray-500">
                <div>Sites: {{ sites?.length || 0 }}</div>
                <div>Hubs: {{ hubs?.length || 0 }}</div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Hub List Section -->
        <UCard class="w-full">
          <template #header>
            <h2 class="text-xl font-semibold">Hub Locations</h2>
          </template>
          
          <div class="overflow-y-auto max-h-[600px] pr-2">
            <div class="grid gap-4">
              <UCard
                v-for="hub in hubs"
                :key="hub.hub_id"
                class="hover:bg-gray-50 cursor-pointer transition-colors"
                @click="zoomToHub(hub)"
              >
                <div class="space-y-2">
                  <h3 class="text-lg font-semibold">{{ hub.Description }}</h3>
                  <p class="text-gray-600">{{ hub.organization }}</p>
                  <p class="text-gray-600">{{ hub.Full_Address }}</p>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p class="font-medium">Contact</p>
                      <p>{{ hub.Contact_Person }}</p>
                    </div>
                    <div>
                      <p class="font-medium">Phone</p>
                      <p>{{ hub.Phone }}</p>
                    </div>
                    <div class="col-span-2">
                      <p class="font-medium">Email</p>
                      <p>{{ hub.Email }}</p>
                    </div>
                    <div v-if="hub.mailing_address" class="col-span-2">
                      <p class="font-medium">Mailing Address</p>
                      <p>{{ hub.mailing_address }}</p>
                    </div>
                    <div class="col-span-2">
                      <p class="font-medium">Availability</p>
                      <p>{{ hub.Availability }}</p>
                    </div>
                    <div class="col-span-2">
                      <p class="font-medium">Basin(s)</p>
                      <p>{{ hub.Basin }}</p>
                    </div>
                    <div v-if="hub.County" class="col-span-2">
                      <p class="font-medium">Counties</p>
                      <p>{{ hub.County }}</p>
                    </div>
                    <div class="col-span-2">
                      <p class="font-medium">Services</p>
                      <ul class="list-disc list-inside">
                        <li v-if="hub.Sampling_kits">Sampling kits</li>
                        <li v-if="hub.Incubator">Incubator for E. coli analysis</li>
                        <li v-if="hub.Biological_kit">Biological sampling</li>
                        <li v-if="hub.Events_and_meetings">Sampler training events</li>
                        <li v-if="hub.Site_selection_assist">Sampling site selection</li>
                        <li v-if="hub.Data_entry_assistance">Volunteer data entry</li>
                        <li v-if="hub.Interpret_findings">Interpret water quality</li>
                        <li v-if="hub.Coordinate_community">Community water projects</li>
                        <li v-if="hub.Host_outreach_materials">Outreach materials</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </UCard>
            </div>
          </div>
        </UCard>
      </template>
    </div>
  </div>
  </PolicyGuard>
</template>

<style scoped>
@import "https://js.arcgis.com/4.28/@arcgis/core/assets/esri/themes/light/main.css";

.container {
  max-width: 1400px;
}

/* Custom scrollbar styling */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #CBD5E0 #EDF2F7;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #EDF2F7;
  border-radius: 4px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #CBD5E0;
  border-radius: 4px;
  border: 2px solid #EDF2F7;
}
</style>
