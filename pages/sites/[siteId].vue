<script setup lang="ts">
// Public-facing single-site page. Shows chemistry, biological, and habitat
// results with no volunteer-identifying information.
definePageMeta({
  layout: 'info'
});
import { usePublicKYWWMap } from '~/composables/usePublicKYWWMap';

const route = useRoute();
const siteId = computed(() => route.params.siteId);

const loading = ref(true);
const error = ref(null);
const siteData = ref(null);
const samples = ref([]);
const biologicalSamples = ref([]);
const habitatSamples = ref([]);
const mapContainer = ref(null);
const containerReady = ref(false);
// Allow the map popup and the sites table to deep-link to a specific tab.
const validTabs = ['stream', 'biological', 'habitat'];
const activeTab = ref(
  validTabs.includes(route.query.tab as string) ? (route.query.tab as string) : 'stream'
);

const {
  fetchData,
  initializeMap,
} = usePublicKYWWMap();

// Generic average helper — works across any of the three sample arrays.
const averageOf = (rows, field) => {
  const valid = rows
    .map(r => parseFloat(r[field]))
    .filter(v => !isNaN(v));

  if (!valid.length) return null;
  return (valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2);
};

const allSamples = computed(() => [
  ...samples.value,
  ...biologicalSamples.value,
  ...habitatSamples.value
]);

const siteStats = computed(() => {
  if (!allSamples.value.length) return null;

  const ecoliValues = samples.value
    .map(s => parseFloat(s.bacteria_avg_ecoli_cfu))
    .filter(v => !isNaN(v));

  return {
    totalSamples: samples.value.length,
    totalBiological: biologicalSamples.value.length,
    totalHabitat: habitatSamples.value.length,
    totalEvents: allSamples.value.length,
    waterQuality: {
      avgTemp: averageOf(samples.value, 'water_temperature'),
      avgPH: averageOf(samples.value, 'pH'),
      avgDO: averageOf(samples.value, 'dissolved_oxygen'),
      avgConductivity: averageOf(samples.value, 'conductivity'),
    },
    bacteria: {
      avgEColi: averageOf(samples.value, 'bacteria_avg_ecoli_cfu'),
      maxEColi: ecoliValues.length ? Math.max(...ecoliValues) : null,
      minEColi: ecoliValues.length ? Math.min(...ecoliValues) : null,
    },
    biological: {
      count: biologicalSamples.value.length,
      avgScore: averageOf(biologicalSamples.value, 'biological_water_quality_score'),
    },
    habitat: {
      count: habitatSamples.value.length,
      avgScore: averageOf(habitatSamples.value, 'physical_assessment_score'),
    },
    volunteerImpact: {
      totalSampleEvents: allSamples.value.length,
      totalMinutes: allSamples.value.reduce(
        (acc, s) => acc + (parseInt(s.total_volunteer_minutes) || 0), 0),
      totalParticipants: allSamples.value.reduce(
        (acc, s) => acc + (parseInt(s.participants_adults) || 0)
                        + (parseInt(s.participants_youth) || 0), 0)
    }
  };
});

const formatDate = (date) => {
  if (!date) return 'Not recorded';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  })
};

const formatMeasurement = (value, unit, precision = 2) => {
  if (value === null || value === undefined) return 'Not recorded';
  return `${Number(value).toFixed(precision)} ${unit}`;
};

// Biological score is a weighted average, 1.00-4.00 (see biological/index.vue).
// Good 3.26-4.00 | Fair 2.51-3.25 | Marginal 1.76-2.50 | Poor 1.00-1.75
const bioScoreText = (score) => {
  const s = parseFloat(score);
  if (isNaN(s) || s === 0) return 'Not calculated';
  if (s >= 3.26) return 'Good';
  if (s >= 2.51) return 'Fair';
  if (s >= 1.76) return 'Marginal';
  return 'Poor';
};

const bioScoreClass = (score) => {
  const s = parseFloat(score);
  if (isNaN(s) || s === 0) return 'text-gray-500';
  if (s >= 3.26) return 'text-green-600';
  if (s >= 2.51) return 'text-yellow-600';
  if (s >= 1.76) return 'text-orange-600';
  return 'text-red-600';
};

// Habitat score is a sum of 9 metrics scored 1-4, so 9-36.
// Good >=30 | Fair 23-29 | Marginal 16-22 | Poor <=15
const habScoreText = (score) => {
  const s = parseFloat(score);
  if (isNaN(s) || s === 0) return 'Not calculated';
  if (s >= 30) return 'Good';
  if (s >= 23) return 'Fair';
  if (s >= 16) return 'Marginal';
  return 'Poor';
};

const habScoreClass = (score) => {
  const s = parseFloat(score);
  if (isNaN(s) || s === 0) return 'text-gray-500';
  if (s >= 30) return 'text-green-600';
  if (s >= 23) return 'text-yellow-600';
  if (s >= 16) return 'text-orange-600';
  return 'text-red-600';
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
                <dt class="font-medium">Sample Location Description:</dt>
                <dd>${siteData.value.description || 'No description available'}</dd>
              </div>
              <div>
                <dt class="font-medium">Stream Samples:</dt>
                <dd>${samples.value.length}</dd>
              </div>
              <div>
                <dt class="font-medium">Biological Assessments:</dt>
                <dd>${biologicalSamples.value.length}</dd>
              </div>
              <div>
                <dt class="font-medium">Habitat Assessments:</dt>
                <dd>${habitatSamples.value.length}</dd>
              </div>
            </dl>
          </div>
        `
      }
    }
  });

  containerReady.value = true;
};

watch([mapContainer, siteData], async ([newContainer, newSiteData]) => {
  if (newContainer && newSiteData) {
    await initializeSiteMap();
  }
});

onMounted(async () => {
  await fetchData();

  try {
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

      // Fetch all three sample types - only non-identifiable fields.
      // No volunteer_id, no user_created, no join tables to directus_users.
      try {
        const [streamResponse, bioResponse, habitatResponse] = await Promise.all([
          useDirectus(
            readItems('base_samples', {
              filter: { wwky_id: { _eq: siteId.value } },
              fields: [
                'id',
                'date',
                'water_temperature',
                'pH',
                'dissolved_oxygen',
                'conductivity',
                'bacteria_avg_ecoli_cfu',
                'total_volunteer_minutes',
                'participants_adults',
                'participants_youth',
                'current_weather',
                'rainfall_amount',
                'stream_flow_visual',
                'turbidity'
              ],
              sort: ['-date'],
              limit: -1
            })
          ),
          useDirectus(
            readItems('biological_samples', {
              filter: { wwky_id: { _eq: siteId.value } },
              fields: [
                'id',
                'date',
                'biological_water_quality_score',
                'weather_flow',
                'total_volunteer_minutes',
                'participants_adults',
                'participants_youth'
              ],
              sort: ['-date'],
              limit: -1
            })
          ),
          useDirectus(
            readItems('habitat_samples', {
              filter: { wwky_id: { _eq: siteId.value } },
              fields: [
                'id',
                'date',
                'physical_assessment_score',
                'total_volunteer_minutes',
                'participants_adults',
                'participants_youth'
              ],
              sort: ['-date'],
              limit: -1
            })
          )
        ]);

        samples.value = streamResponse || [];
        biologicalSamples.value = bioResponse || [];
        habitatSamples.value = habitatResponse || [];
      } catch (err) {
        console.error('Error fetching samples:', err);
      }
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

// Lookup values for various fields
const weatherTypes = {
  1: 'Clear/Sunny',
  2: 'Overcast',
  3: 'Intermittent Rain',
  4: 'Steady Rain',
  5: 'Heavy Rain'
};

const rainfallAmounts = {
  1: '0"',
  2: '0.1"',
  3: '0.5"',
  4: '1"',
  5: '1.5"',
  6: '>1.5"'
};

const streamFlowTypes = {
  1: 'Flood',
  2: 'Bankfull',
  3: 'Normal',
  4: 'Low',
  5: 'Ponded',
  6: 'Dry'
};

const turbidityTypes = {
  1: 'Clear',
  2: 'Slightly Cloudy',
  3: 'Cloudy',
  4: 'Very Turbid'
};

// Weather/flow conditions recorded on biological assessments
const weatherFlowConditions = {
  1: 'Flooded over banks',
  2: 'Water at bank level',
  4: 'Water below bank level, but flowing',
  6: 'Drought condition; not flowing'
};
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
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
      <div class="mb-6">
        <h1 class="text-2xl font-bold mb-2">
          {{ siteData.stream_name || 'Unnamed Stream' }}
          <span class="text-gray-500 text-lg">(Site {{ siteData.wwkyid_pk }})</span>
        </h1>
        <p class="text-gray-600">{{ siteData.description }}</p>
        <p class="text-gray-600">Basin: {{ siteData.wwkybasin }}</p>
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
              <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
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
            <div v-if="siteStats.totalSamples > 0">
              <h3 class="font-medium text-gray-700">Water Quality Averages</h3>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <div>Temperature: {{ formatMeasurement(siteStats.waterQuality.avgTemp, '°C') }}</div>
                <div>pH: {{ formatMeasurement(siteStats.waterQuality.avgPH, '') }}</div>
                <div>DO: {{ formatMeasurement(siteStats.waterQuality.avgDO, 'mg/L') }}</div>
                <div>Conductivity: {{ formatMeasurement(siteStats.waterQuality.avgConductivity, 'μS/cm') }}</div>
              </div>
            </div>
            <div v-if="siteStats.bacteria.avgEColi !== null">
              <h3 class="font-medium text-gray-700">E. coli Results</h3>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <div>Average: {{ formatMeasurement(siteStats.bacteria.avgEColi, 'CFU/100mL') }}</div>
                <div>Maximum: {{ formatMeasurement(siteStats.bacteria.maxEColi, 'CFU/100mL') }}</div>
              </div>
            </div>
            <div v-if="siteStats.biological.count > 0">
              <h3 class="font-medium text-gray-700">Biological Assessment</h3>
              <div class="mt-2">
                Average Score:
                <span :class="bioScoreClass(siteStats.biological.avgScore)" class="font-semibold">
                  {{ siteStats.biological.avgScore }}
                </span>
                ({{ bioScoreText(siteStats.biological.avgScore) }})
                &mdash; {{ siteStats.biological.count }} assessment(s)
              </div>
            </div>
            <div v-if="siteStats.habitat.count > 0">
              <h3 class="font-medium text-gray-700">Habitat Assessment</h3>
              <div class="mt-2">
                Average Score: <span :class="habScoreClass(siteStats.habitat.avgScore)" class="font-semibold">
                  {{ siteStats.habitat.avgScore }}
                </span>
                ({{ habScoreText(siteStats.habitat.avgScore) }})
                &mdash; {{ siteStats.habitat.count }} assessment(s)
              </div>
            </div>
            <div>
              <h3 class="font-medium text-gray-700">Monitoring Stats</h3>
              <div class="grid grid-cols-2 gap-2 mt-2">
                <div>Total Sampling Events: {{ siteStats.totalEvents }}</div>
                <div>Total Participants: {{ siteStats.volunteerImpact.totalParticipants }}</div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Sample Type Tabs -->
      <div class="mb-4">
        <div class="flex space-x-4 border-b overflow-x-auto">
          <button
            :class="[
              'px-4 py-2 border-b-2 transition-colors whitespace-nowrap flex-shrink-0',
              activeTab === 'stream' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:border-gray-300'
            ]"
            @click="activeTab = 'stream'"
          >
            Stream Samples ({{ samples.length }})
          </button>
          <button
            :class="[
              'px-4 py-2 border-b-2 transition-colors whitespace-nowrap flex-shrink-0',
              activeTab === 'biological' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:border-gray-300'
            ]"
            @click="activeTab = 'biological'"
          >
            Biological ({{ biologicalSamples.length }})
          </button>
          <button
            :class="[
              'px-4 py-2 border-b-2 transition-colors whitespace-nowrap flex-shrink-0',
              activeTab === 'habitat' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:border-gray-300'
            ]"
            @click="activeTab = 'habitat'"
          >
            Habitat ({{ habitatSamples.length }})
          </button>
        </div>
      </div>

      <!-- Stream Samples Table -->
      <UCard v-show="activeTab === 'stream'">
        <template #header>
          <h2 class="text-lg font-semibold">Stream Chemistry Samples</h2>
        </template>

        <div v-if="samples.length === 0" class="text-center py-4 text-gray-500">
          No stream samples have been recorded for this site yet.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left">Date</th>
                <th class="px-4 py-2 text-left">Weather</th>
                <th class="px-4 py-2 text-left">Flow</th>
                <th class="px-4 py-2 text-left">Temp (°C)</th>
                <th class="px-4 py-2 text-left">pH</th>
                <th class="px-4 py-2 text-left">DO (mg/L)</th>
                <th class="px-4 py-2 text-left">Conduct (μS/cm)</th>
                <th class="px-4 py-2 text-left">E. coli (CFU/100mL)</th>
                <th class="px-4 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="sample in samples" :key="sample.id" class="hover:bg-gray-50">
                <td class="px-4 py-2">{{ formatDate(sample.date) }}</td>
                <td class="px-4 py-2">{{ weatherTypes[sample.current_weather] || 'Not recorded' }}</td>
                <td class="px-4 py-2">{{ streamFlowTypes[sample.stream_flow_visual] || 'Not recorded' }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.water_temperature, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.pH, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.dissolved_oxygen, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.conductivity, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.bacteria_avg_ecoli_cfu, '') }}</td>
                <td class="px-4 py-2 text-center">
                  <NuxtLink :to="`/samples/${sample.id}`" class="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <span class="mr-1">View</span>
                    <span class="i-heroicons-eye h-4 w-4"></span>
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <!-- Biological Assessments Table -->
      <UCard v-show="activeTab === 'biological'">
        <template #header>
          <h2 class="text-lg font-semibold">Biological Assessments</h2>
        </template>

        <div v-if="biologicalSamples.length === 0" class="text-center py-4 text-gray-500">
          No biological assessments have been recorded for this site yet.
        </div>

        <div v-else>
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th class="px-4 py-2 text-left">Date</th>
                  <th class="px-4 py-2 text-left">Weather / Flow</th>
                  <th class="px-4 py-2 text-left">Bio Score</th>
                  <th class="px-4 py-2 text-left">Water Quality</th>
                  <th class="px-4 py-2 text-center">Details</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                <tr v-for="sample in biologicalSamples" :key="sample.id" class="hover:bg-gray-50">
                  <td class="px-4 py-2">{{ formatDate(sample.date) }}</td>
                  <td class="px-4 py-2">{{ weatherFlowConditions[sample.weather_flow] || 'Not recorded' }}</td>
                  <td class="px-4 py-2 font-medium">
                    {{ sample.biological_water_quality_score ?? 'Not calculated' }}
                  </td>
                  <td class="px-4 py-2">
                    <span :class="bioScoreClass(sample.biological_water_quality_score)" class="font-medium">
                      {{ bioScoreText(sample.biological_water_quality_score) }}
                    </span>
                  </td>
                  <td class="px-4 py-2 text-center">
                    <NuxtLink :to="`/samples/biological/${sample.id}`" class="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <span class="mr-1">View</span>
                      <span class="i-heroicons-eye h-4 w-4"></span>
                    </NuxtLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-4 text-xs text-gray-500">
            Biological score is a weighted average of organism sensitivity (1.00&ndash;4.00):
            Poor (1.00&ndash;1.75), Marginal (1.76&ndash;2.50), Fair (2.51&ndash;3.25), Good (3.26&ndash;4.00).
          </p>
        </div>
      </UCard>

      <!-- Habitat Assessments Table -->
      <UCard v-show="activeTab === 'habitat'">
        <template #header>
          <h2 class="text-lg font-semibold">Habitat Assessments</h2>
        </template>

        <div v-if="habitatSamples.length === 0" class="text-center py-4 text-gray-500">
          No habitat assessments have been recorded for this site yet.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left">Date</th>
                <th class="px-4 py-2 text-left">Physical Assessment Score</th>
                <th class="px-4 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="sample in habitatSamples" :key="sample.id" class="hover:bg-gray-50">
                <td class="px-4 py-2">{{ formatDate(sample.date) }}</td>
                <td class="px-4 py-2">
                  <span class="font-medium">{{ sample.physical_assessment_score ?? 'Not calculated' }}</span>
                  <span v-if="sample.physical_assessment_score" :class="habScoreClass(sample.physical_assessment_score)" class="ml-2">
                    ({{ habScoreText(sample.physical_assessment_score) }})
                  </span>
                </td>
                <td class="px-4 py-2 text-center">
                  <NuxtLink :to="`/samples/habitat/${sample.id}`" class="inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    <span class="mr-1">View</span>
                    <span class="i-heroicons-eye h-4 w-4"></span>
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </template>
  </div>
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