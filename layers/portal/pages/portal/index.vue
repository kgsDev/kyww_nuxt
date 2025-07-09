<script setup lang="ts">
import { useGreetings } from '~/composables/useGreetings';
import { useKYWWMap } from '~/composables/useKYWWMap';

const { loading: messagesLoading, error: messagesError, messages: greetingMessages } = useGreetings();

// Separate evergreen and dated messages with proper sorting
const evergreenMessage = computed(() => {
  if (!greetingMessages.value) return null;
  return greetingMessages.value.find(msg => !msg.start_date && !msg.end_date);
});

const timedMessages = computed(() => {
  if (!greetingMessages.value) return [];
  return greetingMessages.value
    .filter(msg => msg.start_date || msg.end_date)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)); // Sort by sort_order
});

const { user } = useDirectusAuth();

// Add sampling stats functionality
const samplingStats = ref({
  totalSamples: 0,
  uniqueSites: [],
  latestSample: null,
  totalVolunteerMinutes: 0,
  totalVolunteers: {
    adults: 0,
    youth: 0
  },
  siteDetails: [],
  siteSamplingHistory: [], // New field for detailed sampling history
  samples: [] // Store all samples for reference
});

const formatDate = (date) => {
  if (!date) return 'Not recorded';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  })
};

const mapContainer = ref(null);
const containerReady = ref(false);
const legendVisible = ref(true);

const {
  loading,
  error,
  userSites,
  sites,
  hubs,
  userSitesVisible,
  sitesVisible,
  hubsVisible,
  fetchData,
  initializeMap,
  highlightUserSites,
  zoomTo,
  toggleLayerVisibility, // Function to toggle layer visibility
  searchSiteById, // Function to search sites by ID
  siteSearchQuery: mapSearchQuery, // For map search
} = useKYWWMap();

//fetch data immediately
onMounted(async () => {
  await fetchData();
});

// Watch for container and data
watch(mapContainer, async (newValue) => {
  if (newValue && !loading.value) {
    containerReady.value = true;
    await initializeMap(newValue, {
      showSites: true, // Always show all sites
      showHubs: true
    });
    
    // After map is initialized, fetch and highlight user's sites if they have any
    if (user.value?.id) {
      try {
        // Get user samples
        const userSamples = await useDirectus(
          readItems('base_samples', {
            filter: { 
              volunteer_id: { _eq: user.value.id }
            },
            fields: ['wwky_id', 'date'],
            sort: ['-date']
          })
        );

        if (userSamples.length > 0) {
          // Process current user sites
          const siteMap = userSamples.reduce((acc, sample) => {
            if (!acc.has(sample.wwky_id) || new Date(sample.date) > new Date(acc.get(sample.wwky_id).date)) {
              acc.set(sample.wwky_id, sample);
            }
            return acc;
          }, new Map());

          const siteIds = [...siteMap.keys()];
          
          if (siteIds.length > 0) {
            const siteDetails = await useDirectus(
              readItems('wwky_sites', {
                filter: {
                  wwkyid_pk: { _in: siteIds }
                },
                fields: [
                  'wwkyid_pk',
                  'latitude',
                  'longitude',
                  'stream_name',
                  'wwkybasin',
                  'description'
                ]
              })
            );

            const userSitesWithDetails = siteDetails.map(site => ({
              ...site,
              date: siteMap.get(site.wwkyid_pk)?.date,
              wwky_id: site.wwkyid_pk,
              sampleCount: userSamples.filter(sample => sample.wwky_id === site.wwkyid_pk).length
            }));
            
            await highlightUserSites(userSitesWithDetails);
          }
        }
      } catch (err) {
        console.error('Error loading user sites:', err);
      }
    }
  }
 } , { immediate: true });

// Fetch user's sampling data
onMounted(async () => {
  try {
    // First fetch the map data
    await fetchData();

    if (user.value?.id) {
      // Get user's samples with more details
      const samples = await useDirectus(readItems('base_samples', {
        filter: {
          volunteer_id: { _eq: user.value.id }
        },
        sort: ['-date'],
        fields: [
          'id',
          'date',
          'wwky_id',
          'participants_adults',
          'participants_youth',
          'total_volunteer_minutes',
          'water_temperature',
          'pH',
          'dissolved_oxygen',
          'conductivity',
          'bacteria_sample_a_ecoli',
          'bacteria_sample_b_ecoli',
          'bacteria_sample_c_ecoli'
        ]
      }));

      if (samples?.length > 0) {
        samplingStats.value.samples = samples;
        samplingStats.value.totalSamples = samples.length;
        samplingStats.value.latestSample = samples[0];
        
        // Calculate volunteer stats
        samplingStats.value.totalVolunteerMinutes = samples.reduce((acc, sample) => 
          acc + (sample.total_volunteer_minutes || 0), 0);
        
        samplingStats.value.totalVolunteers = samples.reduce((acc, sample) => ({
          adults: acc.adults + (sample.participants_adults || 0),
          youth: acc.youth + (sample.participants_youth || 0)
        }), { adults: 0, youth: 0 });

        // Get unique sites
        const uniqueSiteIds = [...new Set(samples.map(sample => sample.wwky_id))];

        // Fetch detailed site information
        const sites = await useDirectus(readItems('wwky_sites', {
          filter: {
            wwkyid_pk: { 
              _in: uniqueSiteIds.filter(id => id != null)
            }
          },
          fields: [
            'wwkyid_pk',
            'stream_name',
            'wwkybasin',
            'description',
            'latitude',
            'longitude'
          ]
        }));

        samplingStats.value.siteDetails = sites;
        samplingStats.value.uniqueSites = sites;

        // Create sampling history for each site
        samplingStats.value.siteSamplingHistory = sites.map(site => {
          const siteSamples = samples.filter(sample => sample.wwky_id === site.wwkyid_pk);
          return {
            ...site,
            sampleCount: siteSamples.length,
            samples: siteSamples.map(sample => ({
              id: sample.id,
              date: sample.date,
              measurements: {
                temperature: sample.water_temperature,
                pH: sample.pH,
                dissolvedOxygen: sample.dissolved_oxygen,
                conductivity: sample.conductivity,
                eColi: sample.bacteria_sample_a_ecoli
              }
            }))
          };
        });

        await nextTick();
      }
    }
  } catch (err) {
    error.value = 'Failed to load sampling information.';
    console.error('Dashboard load error:', err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <PageContainer>
    <img class="w-48 ml-auto mr-0" src="~/assets/KyWW_logo.png" />
    <!-- Handle loading and error states for messages -->
    <TypographyTitle class="normal-case">{{ greetUser() }} {{ user?.first_name ?? 'friend' }},</TypographyTitle>
    
    <!-- Handle loading and error states for messages -->
    <div v-if="messagesLoading" class="animate-pulse">
      <div class="h-6 w-3/4 bg-gray-200 rounded"></div>
    </div>
    <UAlert
      v-else-if="messagesError"
      type="error"
      :title="messagesError"
      icon="i-heroicons-exclamation-triangle"
    />
    <div v-else class="space-y-4">
      <!-- Evergreen Message -->
      <div v-if="evergreenMessage" class="text-xl font-medium text-gray-700">
        <div class="flex items-start">
          <UIcon name="i-heroicons-megaphone" class="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
          <div v-html="evergreenMessage.message" class="message-content flex-1"></div>
        </div>
      </div>
      
      <!-- Timed Messages (sorted by sort_order) -->
      <div v-if="timedMessages.length > 0" class="ml-4 space-y-2">
        <div 
          v-for="message in timedMessages" 
          :key="message.id"
          class="text-md font-medium text-gray-800 border-l-4 border-yellow-500 pl-4 pr-6 py-3 bg-yellow-50 rounded-r shadow-sm hover:bg-yellow-100 transition-all"
        >
          <div class="flex items-start">
            <UIcon name="i-heroicons-megaphone" class="w-5 h-5 text-yellow-600 mr-3 mt-1 flex-shrink-0" />
            <div v-html="message.message" class="message-content flex-1"></div>
          </div>
        </div>
      </div>
    </div>
    <VDivider class="my-8" />
    
    <div class="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
      <!-- Loading State -->
      <div v-if="loading" class="col-span-2 text-center py-8">
        <ULoadingIcon />
        <p class="mt-2 text-gray-600">Loading sampling information...</p>
      </div>

      <!-- Error State -->
      <UAlert
        v-else-if="error"
        class="col-span-2"
        type="error"
        :title="error"
        icon="i-heroicons-exclamation-triangle"
      />

      <!-- Sampling Stats -->
      <template v-else>
        <!-- Summary Stats Card -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Sampling Activity</h2>
          </template>
          
          <div class="space-y-4">
            <div>
              <label class="text-sm text-gray-500">Total Samples</label>
              <p class="text-2xl font-bold text-blue-600">
                {{ samplingStats.totalSamples }}
              </p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Unique Sites</label>
              <p class="text-2xl font-bold text-green-600">
                {{ samplingStats.uniqueSites.length }}
              </p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Latest Sample</label>
              <p class="text-lg">
                {{ samplingStats.latestSample ? formatDate(samplingStats.latestSample.date) : 'No samples yet' }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Volunteer Stats Card -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Volunteer Impact</h2>
          </template>
          
          <div class="space-y-4">
            <div>
              <label class="text-sm text-gray-500">Total Hours</label>
              <p class="text-2xl font-bold text-purple-600">
                {{ Math.round(samplingStats.totalVolunteerMinutes / 60) }}
              </p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Participants</label>
              <div class="space-y-1">
                <p>Adults: {{ samplingStats.totalVolunteers.adults }}</p>
                <p>Youth: {{ samplingStats.totalVolunteers.youth }}</p>
              </div>
            </div>
          </div>
        </UCard>

        <UCard class="col-span-2">
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">Your Sampling Sites</h2>
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
        
        <div class="relative w-full h-[400px] bg-gray-100">
          <!-- Map Container -->
          <div 
            ref="mapContainer" 
            class="absolute inset-0 w-full h-full"
          ></div>
          
          <!-- Loading State -->
          <div 
            v-if="!containerReady" 
            class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75"
          >
            <ULoadingIcon />
            <span class="ml-2">Loading map...</span>
          </div>

          <!-- Interactive Legend -->
          <div 
            v-if="legendVisible && containerReady"
            class="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10 min-w-[200px]"
          >
            <h3 class="font-semibold mb-2">Map Legend</h3>
            <div class="space-y-2">
              <!-- Interactive legend items with checkboxes -->
              <div class="flex items-center">
                <input 
                type="checkbox" 
                  :checked="userSitesVisible" 
                  @change="toggleLayerVisibility('userSites')"
                  class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div class="w-4 h-4 rounded-full bg-blue-500 opacity-70 mr-2"></div>
                <span>Your Sampling Sites ({{ samplingStats.uniqueSites.length || 0 }})</span>
              </div>
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  :checked="sitesVisible" 
                  @change="toggleLayerVisibility('sites')"
                  class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div class="w-4 h-4 rounded-full bg-[#a83271] opacity-70 mr-2"></div>
                <span>All Sampled Sites ({{ sites.length || 0 }})</span>
              </div>
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  :checked="hubsVisible" 
                  @change="toggleLayerVisibility('hubs')"
                  class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div class="w-3 h-3 rounded-full bg-[#2ECC71] opacity-70 mr-2"></div>
                <span>Support Hubs ({{ hubs?.length || 0 }})</span>
              </div>
              <div class="mt-4 text-xs text-gray-500">
                Total Sites: {{ sites?.length || 0 }}
              </div>

            </div>
            <div class="mt-4 text-xs text-gray-500">
              <p>Click the checkboxes to show/hide each layer</p>
              <p>Sampling data in this portal started in 2024.</p>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Site Sampling History - Full Width -->
      <UCard class="col-span-2">
        <template #header>
          <h2 class="text-lg font-semibold">Site Sampling History</h2>
        </template>
        
       <!-- Message if no primary samples -->
       <div v-if="samplingStats.siteSamplingHistory.length === 0" class="text-center py-4 text-gray-500">
        You have no site sampling history yet. Get started by sampling a site!
       </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left">Site ID</th>
                <th class="px-4 py-2 text-left">Stream Name</th>
                <th class="px-4 py-2 text-left">Basin</th>
                <th class="px-4 py-2 text-center">Times Sampled</th>
                <th class="px-4 py-2 text-center">Latest Sample</th>
                <th class="px-4 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="site in samplingStats.siteSamplingHistory" :key="site.wwkyid_pk">
                <td class="px-4 py-2">{{ site.wwkyid_pk }}</td>
                <td class="px-4 py-2">{{ site.stream_name || 'Unnamed' }}</td>
                <td class="px-4 py-2">{{ site.wwkybasin }}</td>
                <td class="px-4 py-2 text-center">{{ site.sampleCount }}</td>
                <td class="px-4 py-2 text-center">
                  {{ formatDate(site.samples[0]?.date) }}
                </td>
                <td class="px-4 py-2 text-center">
                  <UButton
                    size="sm"
                    @click="navigateTo(`/portal/sites/${site.wwkyid_pk}`)"
                  >
                    View Samples
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      </template>
    </div>
  </PageContainer>
</template>

<style scoped>
@import "https://js.arcgis.com/4.31/@arcgis/core/assets/esri/themes/light/main.css";

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

[ref="mapContainer"] {
  min-height: 400px;
  min-width: 100%;
}

.message-content :deep(p) {
  margin-bottom: 0.5rem;
}

.message-content :deep(ul) {
  list-style-type: disc;
  list-style-position: outside;
  margin-left: 1.5rem;
  margin-bottom: 0.5rem;
  padding-left: 1rem;
}

.message-content :deep(ol) {
  list-style-type: decimal;
  list-style-position: outside;
  margin-left: 1.5rem;
  margin-bottom: 0.5rem;
  padding-left: 1rem;
}

.message-content :deep(li) {
  margin-bottom: 0.25rem;
  padding-left: 0;
}

.message-content :deep(h1, h2, h3, h4, h5, h6) {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.message-content :deep(strong) {
  font-weight: 600;
}

.message-content :deep(em) {
  font-style: italic;
}

.message-content :deep(a) {
  color: #3b82f6;
  text-decoration: underline;
}

.message-content :deep(a:hover) {
  color: #1d4ed8;
}
</style>