<script setup lang="ts">
import { useKYWWMap } from '~/composables/useKYWWMap';

const mapContainer = ref(null);
const containerReady = ref(false);

const {
  loading,
  error,
  hubs,
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

    <div class="container mx-auto px-4">
      <ULoadingBlock v-if="loading" class="h-64" />

      <UAlert
        v-else-if="error"
        type="error"
        :title="error"
        class="mb-4"
      />

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Map -->
        <div class="bg-white rounded-lg shadow-lg">
          <div 
            ref="mapContainer" 
            class="w-full h-[600px] rounded-lg relative"
          >
            <!-- Loading overlay -->
            <div 
              v-if="!containerReady" 
              class="absolute inset-0 flex items-center justify-center bg-gray-100"
            >
              <ULoadingIcon />
              <span class="ml-2">Loading map...</span>
            </div>
          </div>
        </div>

        <!-- Hub List -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Hub Locations</h2>
          <div class="space-y-4">
            <UCard
              v-for="hub in hubs"
              :key="hub.hub_id"
              class="hover:bg-gray-50 cursor-pointer"
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
                      <li v-if="hub.Incubator">E. coli analysis</li>
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
      </div>
    </div>
  </div>
</template>

<style scoped>
@import "https://js.arcgis.com/4.28/@arcgis/core/assets/esri/themes/light/main.css";

.container {
  max-width: 1400px;
}
</style>