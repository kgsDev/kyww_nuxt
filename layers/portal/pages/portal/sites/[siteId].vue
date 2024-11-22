<script setup lang="ts">
import { useKYWWMap } from '~/composables/useKYWWMap';

const route = useRoute();
const siteId = computed(() => route.params.siteId);

const loading = ref(true);
const error = ref(null);
const siteData = ref(null);
const samples = ref([]);
const mapContainer = ref(null);
const containerReady = ref(false);

const {
  fetchData,
  initializeMap,
} = useKYWWMap();

// Keep your helper functions
const calculateAverage = (field) => {
  // Filter out null, undefined, and NaN values first
  const validValues = samples.value
    .map(s => {
      const val = parseFloat(s[field]);
      return !isNaN(val) ? val : null;
    })
    .filter(val => val !== null);
  
  if (!validValues.length) return null;
  
  // Calculate average and round to 2 decimal places
  const sum = validValues.reduce((a, b) => a + b, 0);
  return (sum / validValues.length).toFixed(2);
};

// Update siteStats computed property to handle NaN/null values better
const siteStats = computed(() => {
  if (!samples.value.length) return null;
  
  return {
    totalSamples: samples.value.length,
    waterQuality: {
      avgTemp: calculateAverage('water_temperature'),
      avgPH: calculateAverage('pH'),
      avgDO: calculateAverage('dissolved_oxygen'),
      avgConductivity: calculateAverage('conductivity'),
    },
    bacteria: {
      avgEColi: calculateAverage('bacteria_sample_a_ecoli'),
      maxEColi: Math.max(...samples.value
        .map(s => parseFloat(s.bacteria_sample_a_ecoli))
        .filter(val => !isNaN(val) && val !== null)
        .concat([0])), // Add 0 as fallback if no valid values
      minEColi: Math.min(...samples.value
        .filter(s => s.bacteria_sample_a_ecoli)
        .map(s => parseFloat(s.bacteria_sample_a_ecoli))
        .filter(val => !isNaN(val) && val !== null)
        .concat([0])) // Add 0 as fallback if no valid values
    },
    volunteerImpact: {
      totalMinutes: samples.value.reduce((acc, s) => acc + (parseInt(s.total_volunteer_minutes) || 0), 0),
      totalAdults: samples.value.reduce((acc, s) => acc + (parseInt(s.participants_adults) || 0), 0),
      totalYouth: samples.value.reduce((acc, s) => acc + (parseInt(s.participants_youth) || 0), 0)
    }
  };
});

const formatDate = (date) => {
  if (!date) return 'Not recorded';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatMeasurement = (value, unit, precision = 2) => {
  if (value === null || value === undefined) return 'Not recorded';
  return `${Number(value).toFixed(precision)} ${unit}`;
};

// Initialize single site map
const initializeSiteMap = async () => {
  if (!siteData.value || !mapContainer.value) return;

  await initializeMap(mapContainer.value, {
    center: [siteData.value.longitude, siteData.value.latitude],
    zoom: 14,
    showSites: true,
    showHubs: true,
    singleSite: {
      ...siteData.value,
      popupTemplate: {
        title: `Site: ${siteData.value.wwkyid_pk}`,
        content: `
          <div class="bg-gray-50 p-4 rounded">
            <dl class="space-y-2">
              <div>
                <dt class="font-medium">Stream Name:</dt>
                <dd>${siteData.value.stream_name || 'Unnamed'}</dd>
              </div>
              <div>
                <dt class="font-medium">Basin:</dt>
                <dd>${siteData.value.wwkybasin}</dd>
              </div>
              <div>
                <dt class="font-medium">Description:</dt>
                <dd>${siteData.value.description || 'No description available'}</dd>
              </div>
              <div>
                <dt class="font-medium">Total Samples:</dt>
                <dd>${samples.value.length}</dd>
              </div>
            </dl>
          </div>
        `
      }
    }
  });

  containerReady.value = true;
};

// Watch for container and data readiness
watch([mapContainer, siteData], async ([newContainer, newSiteData]) => {
  if (newContainer && newSiteData) {
    await initializeSiteMap();
  }
});

// Fetch data
onMounted(async () => {
  //fetch sites and hubs:
  await fetchData();

  try {
    // Fetch site details
    const siteResponse = await useDirectus(
      readItems('wwky_sites', {
        filter: {
          wwkyid_pk: { _eq: siteId.value }
        },
        fields: [
          'wwkyid_pk',
          'stream_name',
          'wwkybasin',
          'description',
          'latitude',
          'longitude'
        ]
      })
    );

    if (siteResponse && siteResponse.length > 0) {
      const site = siteResponse[0];
      site.latitude = parseFloat(site.latitude);
      site.longitude = parseFloat(site.longitude);
      siteData.value = site;

      // Fetch samples
      const samplesResponse = await useDirectus(
        readItems('base_samples', {
          filter: {
            wwky_id: { _eq: siteId.value }
          },
          fields: ['*'],
          sort: ['-date']
        })
      );

      samples.value = samplesResponse;
    } else {
      error.value = 'Site not found';
    }
  } catch (err) {
    console.error('Error fetching site details:', err);
    error.value = 'Failed to load site information';
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <PageContainer>
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <ULoadingIcon />
      <span class="ml-2">Loading site information...</span>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      type="error"
      :title="error"
      icon="i-heroicons-exclamation-triangle"
    />

    <!-- Content -->
    <template v-else>
      <!-- Site Header -->
      <div class="flex justify-between items-start mb-6">
        <div>
          <h1 class="text-2xl font-bold mb-2">
            {{ siteData.stream_name || 'Unnamed Stream' }}
            <span class="text-gray-500 text-lg">(Site {{ siteData.wwkyid_pk }})</span>
          </h1>
          <p class="text-gray-600">{{ siteData.description }}</p>
          <p class="text-gray-600">Basin: {{ siteData.wwkybasin }}</p>
        </div>
        <UButton
          icon="i-heroicons-arrow-left"
          @click="navigateTo('/portal')"
        >
          Back to Dashboard
        </UButton>
      </div>

      <!-- Map and Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Map -->
        <UCard class="md:col-span-1">
            <template #header>
            <h2 class="text-lg font-semibold">Site Location</h2>
            </template>
            <div class="relative w-full h-[300px]">
            <div 
                ref="mapContainer" 
                class="absolute inset-0 w-full h-full"
            ></div>
            
            <div 
                v-if="!containerReady" 
                class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75"
            >
                <ULoadingIcon />
                <span class="ml-2">Loading map...</span>
            </div>
            </div>
        </UCard>

        <!-- Site Statistics -->
        <UCard class="md:col-span-1" v-if="siteStats">
          <template #header>
            <h2 class="text-lg font-semibold">Site Statistics</h2>
          </template>
          <div class="space-y-4">
            <div>
              <h3 class="font-medium text-gray-700">Water Quality Averages</h3>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <div>Temperature: {{ formatMeasurement(siteStats.waterQuality.avgTemp, '°C') }}</div>
                <div>pH: {{ formatMeasurement(siteStats.waterQuality.avgPH, '') }}</div>
                <div>DO: {{ formatMeasurement(siteStats.waterQuality.avgDO, 'mg/L') }}</div>
                <div>Conductivity: {{ formatMeasurement(siteStats.waterQuality.avgConductivity, 'μS/cm') }}</div>
              </div>
            </div>
            <div>
              <h3 class="font-medium text-gray-700">E. coli Results</h3>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <div>Average: {{ formatMeasurement(siteStats.bacteria.avgEColi, 'MPN/100mL') }}</div>
                <div>Maximum: {{ formatMeasurement(siteStats.bacteria.maxEColi, 'MPN/100mL') }}</div>
              </div>
            </div>
            <div>
              <h3 class="font-medium text-gray-700">Volunteer Impact</h3>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <div>Total Hours: {{ Math.round(siteStats.volunteerImpact.totalMinutes / 60) }}</div>
                <div>Total Participants: {{ siteStats.volunteerImpact.totalAdults + siteStats.volunteerImpact.totalYouth }}</div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Samples Table -->
      <UCard class="mt-6">
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">Sample History</h2>
            <div class="flex space-x-4">
              <!-- Add date range filters if needed -->
            </div>
          </div>
        </template>

        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left">Date</th>
                <th class="px-4 py-2 text-left">Temperature (°C)</th>
                <th class="px-4 py-2 text-left">pH</th>
                <th class="px-4 py-2 text-left">DO (mg/L)</th>
                <th class="px-4 py-2 text-left">Conductivity (μS/cm)</th>
                <th class="px-4 py-2 text-left">E. coli (MPN/100mL)</th>
                <th class="px-4 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="sample in samples" :key="sample.id" class="hover:bg-gray-50">
                <td class="px-4 py-2">{{ formatDate(sample.date) }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.water_temperature, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.pH, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.dissolved_oxygen, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.conductivity, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.bacteria_sample_a_ecoli, '') }}</td>
                <td class="px-4 py-2 text-center">
                  <UButton
                    size="sm"
                    variant="soft"
                    @click="navigateTo(`/portal/sample/${sample.id}`)"
                    icon="i-heroicons-eye"
                  >
                    View
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </template>
  </PageContainer>
</template>

<style scoped>
@import "https://js.arcgis.com/4.28/@arcgis/core/assets/esri/themes/light/main.css";

/* Add specific styles for map container */
.relative {
  position: relative;
}

.absolute {
  position: absolute;
}

.inset-0 {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}
</style>