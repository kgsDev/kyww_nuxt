<script setup lang="ts">
//this is the main page for a single site in the KYWW portal [siteId].vue - UPDATED
import { useKYWWMap } from '~/composables/useKYWWMap';
import SampleForm from '../sample/index.vue'; // Import form
import ContactSamplerForm from '~/components/ContactSamplerForm.vue'; // Import contact form

const { user } = useDirectusAuth();
const configPublic = useRuntimeConfig().public;

// Add these computed properties for permission checking
const isAdmin = computed(() => {
  return user.value?.role === configPublic.DEVADMIN_ROLE_ID || user.value?.role === configPublic.WWKYADMIN_ROLE_ID;
});

const canEditSample = (sample) => {
  if (!sample || !user.value) return false;
  return isAdmin.value || 
         user.value.id === sample.volunteer_id?.id || // Primary sampler
         user.value.id === sample.user_created?.id;   // Created the sample
};

const showEditForm = ref(false);
const selectedSample = ref(null);
const showContactForm = ref(false);
const selectedSampler = ref(null);

const showSuccessToast = ref(false);
const successMessage = ref('');

const route = useRoute();
const siteId = computed(() => route.params.siteId);

// Add activeTab reactive variable
const activeTab = ref('stream');

const loading = ref(true);
const error = ref(null);
const siteData = ref(null);
const samples = ref([]);
const biologicalSamples = ref([]);
const habitatSamples = ref([]);
const mapContainer = ref(null);
const containerReady = ref(false);

const {
  fetchData,
  initializeMap,
} = useKYWWMap();

const handleEditComplete = async () => {
  showEditForm.value = false;
  selectedSample.value = null;
  
  // Refresh the samples data
  try {
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
  } catch (err) {
    console.error('Error refreshing samples:', err);
  }
};

const fetchSamplerConnectSettings = async () => {
  // Get unique volunteer IDs from all sample types
  const volunteerIds = [...new Set([
    ...samples.value.filter(sample => sample.volunteer_id).map(sample => sample.volunteer_id.id),
    ...biologicalSamples.value.filter(sample => sample.volunteer_id).map(sample => sample.volunteer_id.id),
    ...habitatSamples.value.filter(sample => sample.volunteer_id).map(sample => sample.volunteer_id.id)
  ])];
  
  if (volunteerIds.length === 0) return;
  
  try {
    const samplerDataResponse = await useDirectus(
      readItems('sampler_data', {
        filter: {
          user_id: { _in: volunteerIds }
        },
        fields: ['user_id', 'allow_connections'],
        limit: -1
      })
    );
    
    const samplerDataMap = samplerDataResponse.reduce((map, data) => {
      map[data.user_id] = data;
      return map;
    }, {});
    
    // Update all sample types with connection settings
    const updateSampleArray = (sampleArray) => {
      return sampleArray.map(sample => {
        if (sample.volunteer_id && samplerDataMap[sample.volunteer_id.id]) {
          return {
            ...sample,
            volunteer_id: {
              ...sample.volunteer_id,
              sampler_data: samplerDataMap[sample.volunteer_id.id]
            }
          };
        }
        
        if (sample.volunteer_id) {
          return {
            ...sample,
            volunteer_id: {
              ...sample.volunteer_id,
              sampler_data: { allow_connections: false }
            }
          };
        }
        
        return sample;
      });
    };

    samples.value = updateSampleArray(samples.value);
    biologicalSamples.value = updateSampleArray(biologicalSamples.value);
    habitatSamples.value = updateSampleArray(habitatSamples.value);
    
  } catch (err) {
    console.error('Error fetching sampler connection settings:', err);
  }
};

// Function to handle opening the contact form
const openContactForm = (sample) => {
  if (!sample || !sample.volunteer_id) return;
  
  // Don't show contact form for the current user
  if (sample.volunteer_id.id === user.value?.id) return;
  
  selectedSampler.value = {
    id: sample.volunteer_id.id,
    name: `${sample.volunteer_id.first_name} ${sample.volunteer_id.last_name}`
  };
  showContactForm.value = true;
};

const closeContactForm = (success = false) => {
  showContactForm.value = false;
  
  if (success) {
    successMessage.value = `Your message has been sent to ${selectedSampler.value.name}. They'll respond via email if interested in connecting.`;
    showSuccessToast.value = true;
    
    setTimeout(() => {
      showSuccessToast.value = false;
    }, 6000);
  }
  
  selectedSampler.value = null;
};

//helper functions
const calculateAverage = (field, sampleType = 'stream') => {
  let targetSamples = samples.value;
  
  // For biological and habitat samples, use their specific score fields
  if (sampleType === 'biological') {
    targetSamples = biologicalSamples.value;
    field = 'biological_water_quality_score';
  } else if (sampleType === 'habitat') {
    targetSamples = habitatSamples.value;
    field = 'physical_assessment_score';
  }
  
  const validValues = targetSamples
    .map(s => {
      const val = parseFloat(s[field]);
      return !isNaN(val) ? val : null;
    })
    .filter(val => val !== null);
  
  if (!validValues.length) return null;
  
  const sum = validValues.reduce((a, b) => a + b, 0);
  return (sum / validValues.length).toFixed(2);
};

// Update siteStats computed property to include all sample types
const siteStats = computed(() => {
  const totalSamples = samples.value.length + biologicalSamples.value.length + habitatSamples.value.length;
  
  if (!totalSamples) return null;
  
  return {
    totalSamples: {
      stream: samples.value.length,
      biological: biologicalSamples.value.length,
      habitat: habitatSamples.value.length,
      total: totalSamples
    },
    waterQuality: {
      avgTemp: calculateAverage('water_temperature'),
      avgPH: calculateAverage('pH'),
      avgDO: calculateAverage('dissolved_oxygen'),
      avgConductivity: calculateAverage('conductivity'),
    },
    bacteria: {
      avgEColi: calculateAverage('bacteria_avg_ecoli_cfu'),
      maxEColi: Math.max(...samples.value
        .map(s => parseFloat(s.bacteria_avg_ecoli_cfu))
        .filter(val => !isNaN(val) && val !== null)
        .concat([0])),
      minEColi: Math.min(...samples.value
        .filter(s => s.bacteria_avg_ecoli_cfu)
        .map(s => parseFloat(s.bacteria_avg_ecoli_cfu))
        .filter(val => !isNaN(val) && val !== null)
        .concat([0]))
    },
    biologicalScore: {
      avg: calculateAverage('biological_water_quality_score', 'biological'),
      count: biologicalSamples.value.length
    },
    habitatScore: {
      avg: calculateAverage('physical_assessment_score', 'habitat'),
      count: habitatSamples.value.length
    },
    volunteerImpact: {
      totalMinutes: [
        ...samples.value,
        ...biologicalSamples.value,
        ...habitatSamples.value
      ].reduce((acc, s) => acc + (parseInt(s.total_volunteer_minutes) || 0), 0),
      totalAdults: [
        ...samples.value,
        ...biologicalSamples.value,
        ...habitatSamples.value
      ].reduce((acc, s) => acc + (parseInt(s.participants_adults) || 0), 0),
      totalYouth: [
        ...samples.value,
        ...biologicalSamples.value,
        ...habitatSamples.value
      ].reduce((acc, s) => acc + (parseInt(s.participants_youth) || 0), 0)
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
                <dt class="font-medium">Total Samples:</dt>
                <dd>Stream: ${samples.value.length}, Bio: ${biologicalSamples.value.length}, Habitat: ${habitatSamples.value.length}</dd>
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

// Helper functions for categorizing samples by user relationship
const categorizeSamples = (sampleArray) => {
  const primary = sampleArray.filter(sample => 
    sample.volunteer_id?.id === user.value?.id || // Primary sampler
    sample.user_created?.id === user.value?.id // Created the sample
  ).map(sample => ({
    ...sample,
    isEnteredForOther: sample.user_created?.id === user.value?.id && 
                       sample.volunteer_id?.id !== user.value?.id
  }));

  const additional = sampleArray.filter(sample => {
    const isAdditionalSampler = sample.additional_samplers?.some(
      entry => entry.directus_users_id?.id === user.value?.id
    );
    
    return isAdditionalSampler && 
           sample.volunteer_id?.id !== user.value?.id && 
           sample.user_created?.id !== user.value?.id;
  });

  const other = sampleArray.filter(sample => {
    const isPrimarySample = sample.volunteer_id?.id === user.value?.id || 
                          sample.user_created?.id === user.value?.id;
    
    const isAdditionalSampler = sample.additional_samplers?.some(
      entry => entry.directus_users_id?.id === user.value?.id
    );
    
    return !isPrimarySample && !isAdditionalSampler;
  });

  return { primary, additional, other };
};

// Computed properties for each sample type
const streamSamples = computed(() => categorizeSamples(samples.value));
const bioSamples = computed(() => categorizeSamples(biologicalSamples.value));
const habSamples = computed(() => categorizeSamples(habitatSamples.value));

// Fetch data
onMounted(async () => {
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

      // Fetch all three types of samples
      try {
        const [streamSamplesResponse, bioSamplesResponse, habitatSamplesResponse] = await Promise.all([
          // Stream samples
          useDirectus(
            readItems('base_samples', {
              filter: {
                wwky_id: { _eq: siteId.value }
              },
              fields: [
                '*',
                'user_created.id',
                'user_created.first_name',
                'user_created.last_name',
                'volunteer_id.id',
                'volunteer_id.first_name',
                'volunteer_id.last_name',
                'volunteer_id.sampler_data.allow_connections'
              ],
              sort: ['-date']
            })
          ),
          // Biological samples
          useDirectus(
            readItems('biological_samples', {
              filter: {
                wwky_id: { _eq: siteId.value }
              },
              fields: [
                '*',
                'user_created.id',
                'user_created.first_name',
                'user_created.last_name',
                'volunteer_id.id',
                'volunteer_id.first_name',
                'volunteer_id.last_name',
                'volunteer_id.sampler_data.allow_connections'
              ],
              sort: ['-date']
            })
          ),
          // Habitat samples
          useDirectus(
            readItems('habitat_samples', {
              filter: {
                wwky_id: { _eq: siteId.value }
              },
              fields: [
                '*',
                'user_created.id',
                'user_created.first_name',
                'user_created.last_name',
                'volunteer_id.id',
                'volunteer_id.first_name',
                'volunteer_id.last_name',
                'volunteer_id.sampler_data.allow_connections'
              ],
              sort: ['-date']
            })
          )
        ]);

        // Process samples with additional samplers for each type
        const processAdditionalSamplers = async (sampleArray, tableName) => {
          return await Promise.all(
            sampleArray.map(async (sample) => {
              const additionalSamplers = await useDirectus(
                readItems(tableName, {
                  filter: { 
                    [`${tableName.split('_')[0]}_samples_id`]: { _eq: sample.id } 
                  },
                  fields: ['directus_users_id.*']
                })
              );
              return {
                ...sample,
                additional_samplers: additionalSamplers
              };
            })
          );
        };

        samples.value = await processAdditionalSamplers(streamSamplesResponse, 'base_samples_directus_users');
        biologicalSamples.value = await processAdditionalSamplers(bioSamplesResponse, 'biological_samples_directus_users');
        habitatSamples.value = await processAdditionalSamplers(habitatSamplesResponse, 'habitat_samples_directus_users');

        await fetchSamplerConnectSettings();

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
</script>

<template>
  <PageContainer>

    <!-- Edit Sample Modal -->
    <div v-if="showEditForm" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-5 mx-auto p-2 sm:p-5 border w-[95%] sm:w-4/5 shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg sm:text-xl font-bold">Edit Sample</h2>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            @click="handleEditComplete"
          />
        </div>
        
        <SampleForm
          :initial-data="selectedSample"
          @submit-complete="handleEditComplete"
        />
      </div>
    </div>

    <!-- Contact Sampler Modal -->
    <div v-if="showContactForm" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
      <div class="relative top-4 sm:top-20 mx-auto p-4 sm:p-5 border w-full max-w-xl shadow-lg rounded-md bg-white">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-lg sm:text-xl font-bold">Contact Sampler</h2>
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            @click="closeContactForm(false)"
          />
        </div>
        
        <ContactSamplerForm 
          v-if="selectedSampler"
          :sampler-name="selectedSampler.name"
          :sampler-id="selectedSampler.id"
          :site-id="siteData?.wwkyid_pk"
          :site-name="siteData?.stream_name || `Site ${siteData?.wwkyid_pk}`"
          @message-sent="closeContactForm(true)"
          @dismiss="closeContactForm(false)"
        />
      </div>
    </div>

    <!-- Success Modal -->
    <div v-if="showSuccessToast" class="fixed top-4 right-4 sm:inset-20 z-50 max-w-md animate-fade-in">
      <UAlert
        variant="solid"
        color="green"
        :title="successMessage"
        icon="i-heroicons-check-circle"
        class="shadow-lg"
      >
        <template #description>
          <p class="mt-1 text-sm">Check your email for confirmation.</p>
        </template>
        <template #actions>
          <UButton
            color="white"
            variant="ghost"
            icon="i-heroicons-x-mark"
            class="p-1"
            @click="showSuccessToast = false"
          />
        </template>
      </UAlert>
    </div>

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
      <div class="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div class="flex-1">
          <h1 class="text-xl sm:text-2xl font-bold mb-2">
            {{ siteData.stream_name || 'Unnamed Stream' }}
            <span class="text-gray-500 text-base sm:text-lg">(Site {{ siteData.wwkyid_pk }})</span>
          </h1>
          <p class="text-gray-600 text-sm sm:text-base">{{ siteData.description }}</p>
          <p class="text-gray-600 text-sm sm:text-base">Basin: {{ siteData.wwkybasin }}</p>
        </div>
        <UButton
          icon="i-heroicons-arrow-left"
          @click="navigateTo('/portal')"
          class="w-full sm:w-auto"
        >
          Back to Dashboard
        </UButton>
      </div>

      <!-- Map and Stats Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
        <!-- Map -->
        <UCard class="lg:col-span-1">
          <template #header>
            <h2 class="text-base sm:text-lg font-semibold">Site Location</h2>
          </template>
          <div class="relative w-full h-[250px] sm:h-[300px]">
            <div 
              ref="mapContainer" 
              class="absolute inset-0 w-full h-full"
            ></div>
            
            <div 
              v-if="!containerReady" 
              class="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75"
            >
              <ULoadingIcon />
              <span class="ml-2 text-sm">Loading map...</span>
            </div>
          </div>
        </UCard>

        <!-- Site Statistics -->
        <UCard class="lg:col-span-1" v-if="siteStats">
          <template #header>
            <h2 class="text-base sm:text-lg font-semibold">Site Statistics</h2>
          </template>
          <div class="space-y-3 sm:space-y-4 text-sm sm:text-base">
            <div>
              <h3 class="font-medium text-gray-700 mb-2">Sample Summary</h3>
              <div class="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                <div>Stream: {{ siteStats.totalSamples.stream }}</div>
                <div>Bio: {{ siteStats.totalSamples.biological }}</div>
                <div>Habitat: {{ siteStats.totalSamples.habitat }}</div>
                <div class="font-semibold">Total: {{ siteStats.totalSamples.total }}</div>
              </div>
            </div>
            
            <div v-if="siteStats.totalSamples.stream > 0">
              <h3 class="font-medium text-gray-700 mb-2">Water Quality Averages</h3>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs sm:text-sm">
                <div>Temp: {{ formatMeasurement(siteStats.waterQuality.avgTemp, '°C') }}</div>
                <div>pH: {{ formatMeasurement(siteStats.waterQuality.avgPH, '') }}</div>
                <div>DO: {{ formatMeasurement(siteStats.waterQuality.avgDO, 'mg/L') }}</div>
                <div>Conductivity: {{ formatMeasurement(siteStats.waterQuality.avgConductivity, 'μS/cm') }}</div>
              </div>
            </div>
            
            <div v-if="siteStats.biologicalScore.count > 0">
              <h3 class="font-medium text-gray-700 mb-1">Biological Assessment</h3>
              <div class="text-xs sm:text-sm">
                Avg Score: {{ formatMeasurement(siteStats.biologicalScore.avg, '') }} ({{ siteStats.biologicalScore.count }} assessments)
              </div>
            </div>
            
            <div v-if="siteStats.habitatScore.count > 0">
              <h3 class="font-medium text-gray-700 mb-1">Habitat Assessment</h3>
              <div class="text-xs sm:text-sm">
                Avg Score: {{ formatMeasurement(siteStats.habitatScore.avg, '') }} ({{ siteStats.habitatScore.count }} assessments)
              </div>
            </div>
            
            <div>
              <h3 class="font-medium text-gray-700 mb-2">Volunteer Impact</h3>
              <div class="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                <div>Hours: {{ Math.round(siteStats.volunteerImpact.totalMinutes / 60) }}</div>
                <div>Participants: {{ siteStats.volunteerImpact.totalAdults + siteStats.volunteerImpact.totalYouth }}</div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Sample Type Navigation -->
      <div class="mb-4 sm:mb-6">
        <div class="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 border-b overflow-x-auto">
          <button
            :class="[
              'px-3 sm:px-4 py-2 border-b-2 transition-colors text-sm sm:text-base whitespace-nowrap flex-shrink-0',
              activeTab === 'stream' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:border-gray-300'
            ]"
            @click="activeTab = 'stream'"
          >
            Stream Samples ({{ samples.length }})
          </button>
          <button
            :class="[
              'px-3 sm:px-4 py-2 border-b-2 transition-colors text-sm sm:text-base whitespace-nowrap flex-shrink-0',
              activeTab === 'biological' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:border-gray-300'
            ]"
            @click="activeTab = 'biological'"
          >
            Biological ({{ biologicalSamples.length }})
          </button>
          <button
            :class="[
              'px-3 sm:px-4 py-2 border-b-2 transition-colors text-sm sm:text-base whitespace-nowrap flex-shrink-0',
              activeTab === 'habitat' ? 'border-blue-500 text-blue-600' : 'border-transparent hover:border-gray-300'
            ]"
            @click="activeTab = 'habitat'"
          >
            Habitat ({{ habitatSamples.length }})
          </button>
        </div>
      </div>

    <!-- Stream Samples Section -->
      <div v-show="activeTab === 'stream'">
        <!-- Primary Stream Samples Table -->
        <UCard class="mt-4 sm:mt-6">
          <template #header>
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <h2 class="text-base sm:text-lg font-semibold">Your Stream Samples (Primary Sampler or Creator)</h2>
              <UButton
                icon="i-heroicons-plus"
                @click="navigateTo('/portal/sample')"
                class="w-full sm:w-auto"
                size="sm"
              >
                New Stream Sample
              </UButton>
            </div>
          </template>

          <div v-if="streamSamples.primary.length === 0" class="text-center py-6 sm:py-4 text-gray-500 text-sm sm:text-base">
            You haven't created any stream samples or been a primary sampler for this site yet.
          </div>

          <div v-else>
            <!-- Desktop Table -->
            <div class="desktop-table overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temp (°C)</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">pH</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DO (mg/L)</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conduct (μS/cm)</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg E. coli (CFU/100mL)</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="sample in streamSamples.primary" :key="sample.id" 
                      :class="{'hover:bg-gray-50': true, 'bg-yellow-50': sample.isEnteredForOther}">
                    <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ sample.id }}</td>
                    <td class="px-3 py-4 text-sm text-gray-900">
                      {{ formatDate(sample.date) }}
                      <div v-if="sample.isEnteredForOther" 
                          class="text-xs text-orange-600 font-medium mt-1">
                        You entered this sample for {{ sample.volunteer_id.first_name }} {{ sample.volunteer_id.last_name }}
                      </div>
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.water_temperature, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.pH, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.dissolved_oxygen, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.conductivity, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.bacteria_avg_ecoli_cfu, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <div class="flex justify-center space-x-1">
                        <UButton size="xs" variant="soft" @click="navigateTo(`/portal/sample/${sample.id}`)" 
                                icon="i-heroicons-eye">View</UButton>
                        <UButton size="xs" variant="soft" color="blue" 
                                @click="navigateTo(`/portal/sample?edit=${sample.id}`)" 
                                icon="i-heroicons-pencil-square">Edit</UButton>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards -->
            <div class="mobile-cards space-y-3">
              <div v-for="sample in streamSamples.primary" :key="sample.id" 
                  :class="[
                    'border border-gray-200 rounded-lg p-3',
                    sample.isEnteredForOther ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
                  ]">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <div class="font-medium text-sm">Sample #{{ sample.id }}</div>
                    <div class="text-xs text-gray-600">{{ formatDate(sample.date) }}</div>
                    <div v-if="sample.isEnteredForOther" 
                        class="text-xs text-orange-600 font-medium mt-1">
                      You entered this for {{ sample.volunteer_id.first_name }} {{ sample.volunteer_id.last_name }}
                    </div>
                  </div>
                  <div class="flex space-x-1">
                    <UButton size="xs" variant="soft" @click="navigateTo(`/portal/sample/${sample.id}`)" 
                            icon="i-heroicons-eye">View</UButton>
                    <UButton size="xs" variant="soft" color="blue" 
                            @click="navigateTo(`/portal/sample?edit=${sample.id}`)" 
                            icon="i-heroicons-pencil-square">Edit</UButton>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div><span class="font-medium">Temp:</span> {{ formatMeasurement(sample.water_temperature, '°C') }}</div>
                  <div><span class="font-medium">pH:</span> {{ formatMeasurement(sample.pH, '') }}</div>
                  <div><span class="font-medium">DO:</span> {{ formatMeasurement(sample.dissolved_oxygen, 'mg/L') }}</div>
                  <div><span class="font-medium">Conductivity:</span> {{ formatMeasurement(sample.conductivity, 'μS/cm') }}</div>
                  <div class="col-span-2"><span class="font-medium">E. coli:</span> {{ formatMeasurement(sample.bacteria_avg_ecoli_cfu, 'CFU/100mL') }}</div>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Additional Sampler Stream Samples Table -->
        <UCard class="mt-4 sm:mt-6">
          <template #header>
            <h2 class="text-base sm:text-lg font-semibold">Stream Samples Where You're an Additional Sampler</h2>
          </template>

          <div v-if="streamSamples.additional.length === 0" class="text-center py-6 sm:py-4 text-gray-500 text-sm sm:text-base">
            You haven't been an additional sampler for any stream samples at this site.
          </div>

          <div v-else>
            <!-- Desktop Table -->
            <div class="desktop-table overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temp (°C)</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">pH</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DO (mg/L)</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conduct (μS/cm)</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg E. coli (CFU/100mL)</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="sample in streamSamples.additional" :key="sample.id" class="hover:bg-gray-50">
                    <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ sample.id }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(sample.date) }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.water_temperature, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.pH, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.dissolved_oxygen, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.conductivity, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.bacteria_avg_ecoli_cfu, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <UButton size="xs" variant="soft" @click="navigateTo(`/portal/sample/${sample.id}`)" 
                              icon="i-heroicons-eye">View</UButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards -->
            <div class="mobile-cards space-y-3">
              <div v-for="sample in streamSamples.additional" :key="sample.id" 
                  class="border border-gray-200 rounded-lg p-3 bg-white">
                <div class="flex justify-between items-start mb-2">
                  <div>
                    <div class="font-medium text-sm">Sample #{{ sample.id }}</div>
                    <div class="text-xs text-gray-600">{{ formatDate(sample.date) }}</div>
                  </div>
                  <UButton size="xs" variant="soft" @click="navigateTo(`/portal/sample/${sample.id}`)" 
                          icon="i-heroicons-eye">View</UButton>
                </div>
                <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div><span class="font-medium">Temp:</span> {{ formatMeasurement(sample.water_temperature, '°C') }}</div>
                  <div><span class="font-medium">pH:</span> {{ formatMeasurement(sample.pH, '') }}</div>
                  <div><span class="font-medium">DO:</span> {{ formatMeasurement(sample.dissolved_oxygen, 'mg/L') }}</div>
                  <div><span class="font-medium">Conductivity:</span> {{ formatMeasurement(sample.conductivity, 'μS/cm') }}</div>
                  <div class="col-span-2"><span class="font-medium">E. coli:</span> {{ formatMeasurement(sample.bacteria_avg_ecoli_cfu, 'CFU/100mL') }}</div>
                </div>
              </div>
            </div>
          </div>
        </UCard>

          <!-- Other Stream Samples Table - Properly Formatted -->
        <UCard class="mt-4 sm:mt-6">
          <template #header>
            <h2 class="text-base sm:text-lg font-semibold">Other Stream Samples at This Site</h2>
          </template>
          
          <div v-if="streamSamples.other.length === 0" class="text-center py-6 sm:py-4 text-gray-500 text-sm sm:text-base">
            There are no other stream samples recorded for this site.
          </div>

          <div v-else>
            <!-- Desktop Table -->
            <div class="desktop-table overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 text-sm">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Sampler</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temp (°C)</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">pH</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DO (mg/L)</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conduct (μS/cm)</th>
                    <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg E. coli (CFU/100mL)</th>
                    <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-for="sample in streamSamples.other" :key="sample.id" class="hover:bg-gray-50">
                    <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ sample.id }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(sample.date) }}</td>
                    <td class="px-3 py-4 text-sm text-gray-900">
                      <div class="flex flex-col space-y-1">
                        <div class="flex items-center">
                          <span class="text-sm">{{ sample.volunteer_id?.first_name }} {{ sample.volunteer_id?.last_name }}</span>
                          
                          <template v-if="sample.volunteer_id && sample.volunteer_id.id !== user?.id">
                            <UTooltip 
                              v-if="!(sample.volunteer_id.sampler_data && sample.volunteer_id.sampler_data.allow_connections === true)" 
                              text="This sampler is not accepting connection requests"
                            >
                              <UIcon 
                                name="i-heroicons-lock-closed" 
                                class="ml-2 text-gray-400 h-4 w-4" 
                              />
                            </UTooltip>
                          </template>
                        </div>
                        
                        <div v-if="sample.volunteer_id && sample.volunteer_id.id !== user?.id">
                          <UButton 
                            v-if="sample.volunteer_id.sampler_data && sample.volunteer_id.sampler_data.allow_connections === true"
                            size="xs" 
                            variant="soft" 
                            color="blue"
                            @click="openContactForm(sample)"
                            title="Connect with this sampler"
                          >
                            <div class="flex items-center space-x-1">
                              <span class="i-heroicons-sparkles text-red-500 h-3 w-3"></span>
                              <span class="font-medium text-xs">Connect</span>
                            </div>
                          </UButton>
                        </div>
                      </div>
                    </td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.water_temperature, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.pH, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.dissolved_oxygen, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.conductivity, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatMeasurement(sample.bacteria_avg_ecoli_cfu, '') }}</td>
                    <td class="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
                      <UButton size="xs" variant="soft" @click="navigateTo(`/portal/sample/${sample.id}`)" 
                              icon="i-heroicons-eye">View</UButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Cards -->
            <div class="mobile-cards space-y-3">
              <div v-for="sample in streamSamples.other" :key="sample.id" 
                  class="border border-gray-200 rounded-lg p-3 bg-white">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex-1">
                    <div class="font-medium text-sm">Sample #{{ sample.id }}</div>
                    <div class="text-xs text-gray-600">{{ formatDate(sample.date) }}</div>
                    <div class="text-xs text-gray-700 mt-1">
                      by {{ sample.volunteer_id?.first_name }} {{ sample.volunteer_id?.last_name }}
                      <template v-if="sample.volunteer_id && sample.volunteer_id.id !== user?.id">
                        <UIcon 
                          v-if="!(sample.volunteer_id.sampler_data && sample.volunteer_id.sampler_data.allow_connections === true)" 
                          name="i-heroicons-lock-closed" 
                          class="ml-1 text-gray-400 h-3 w-3 inline" 
                        />
                      </template>
                    </div>
                  </div>
                  <div class="flex flex-col space-y-1">
                    <UButton size="xs" variant="soft" @click="navigateTo(`/portal/sample/${sample.id}`)" 
                            icon="i-heroicons-eye">View</UButton>
                    <UButton 
                      v-if="sample.volunteer_id && sample.volunteer_id.id !== user?.id && sample.volunteer_id.sampler_data && sample.volunteer_id.sampler_data.allow_connections === true"
                      size="xs" 
                      variant="soft" 
                      color="blue"
                      @click="openContactForm(sample)"
                      class="w-full"
                    >
                      <div class="flex items-center space-x-1">
                        <span class="i-heroicons-sparkles text-red-500 h-3 w-3"></span>
                        <span class="font-medium text-xs">Connect</span>
                      </div>
                    </UButton>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <div><span class="font-medium">Temp:</span> {{ formatMeasurement(sample.water_temperature, '°C') }}</div>
                  <div><span class="font-medium">pH:</span> {{ formatMeasurement(sample.pH, '') }}</div>
                  <div><span class="font-medium">DO:</span> {{ formatMeasurement(sample.dissolved_oxygen, 'mg/L') }}</div>
                  <div><span class="font-medium">Conductivity:</span> {{ formatMeasurement(sample.conductivity, 'μS/cm') }}</div>
                  <div class="col-span-2"><span class="font-medium">E. coli:</span> {{ formatMeasurement(sample.bacteria_avg_ecoli_cfu, 'CFU/100mL') }}</div>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>

        <!-- Primary Biological Samples Table -->
      <UCard class="mt-4 sm:mt-6">
        <template #header>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 class="text-base sm:text-lg font-semibold">Your Biological Assessments (Primary Sampler or Creator)</h2>
            <UButton
              icon="i-heroicons-plus"
              @click="navigateTo('/portal/biological')"
              class="w-full sm:w-auto"
              size="sm"
            >
              New Biological Assessment
            </UButton>
          </div>
        </template>

        <div v-if="bioSamples.primary.length === 0" class="text-center py-6 sm:py-4 text-gray-500 text-sm sm:text-base">
          You haven't created any biological assessments or been a primary sampler for this site yet.
        </div>

        <div v-else>
          <!-- Desktop Table -->
          <div class="desktop-table overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bio Score</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality Rating</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weather/Flow</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="sample in bioSamples.primary" :key="sample.id" 
                    :class="{'hover:bg-gray-50': true, 'bg-yellow-50': sample.isEnteredForOther}">
                  <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ sample.id }}</td>
                  <td class="px-3 py-4 text-sm text-gray-900">
                    {{ formatDate(sample.date) }}
                    <div v-if="sample.isEnteredForOther" 
                        class="text-xs text-orange-600 font-medium mt-1">
                      You entered this assessment for {{ sample.volunteer_id.first_name }} {{ sample.volunteer_id.last_name }}
                    </div>
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ sample.biological_water_quality_score || 'Not calculated' }}</td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm">
                    <span v-if="sample.biological_water_quality_score" :class="{
                      'text-red-600 font-medium': sample.biological_water_quality_score < 19,
                      'text-orange-600 font-medium': sample.biological_water_quality_score >= 19 && sample.biological_water_quality_score <= 32,
                      'text-yellow-600 font-medium': sample.biological_water_quality_score > 32 && sample.biological_water_quality_score <= 41,
                      'text-green-600 font-medium': sample.biological_water_quality_score > 41
                    }">
                      {{ sample.biological_water_quality_score < 19 ? 'Poor' : 
                        sample.biological_water_quality_score >= 19 && sample.biological_water_quality_score <= 32 ? 'Marginal' :
                        sample.biological_water_quality_score > 32 && sample.biological_water_quality_score <= 41 ? 'Fair' : 'Good' }}
                    </span>
                    <span v-else class="text-gray-500">—</span>
                  </td>
                  <td class="px-3 py-4 text-sm text-gray-500">{{ sample.weather_flow || 'Not recorded' }}</td>
                  <td class="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div class="flex justify-center space-x-1">
                      <UButton size="xs" variant="soft" @click="navigateTo(`/portal/biological/${sample.id}`)" 
                              icon="i-heroicons-eye">View</UButton>
                      <UButton size="xs" variant="soft" color="blue" 
                              @click="navigateTo(`/portal/biological?edit=${sample.id}`)" 
                              icon="i-heroicons-pencil-square">Edit</UButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="mobile-cards space-y-3">
            <div v-for="sample in bioSamples.primary" :key="sample.id" 
                :class="[
                  'border border-gray-200 rounded-lg p-3',
                  sample.isEnteredForOther ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
                ]">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <div class="font-medium text-sm">Assessment #{{ sample.id }}</div>
                  <div class="text-xs text-gray-600">{{ formatDate(sample.date) }}</div>
                  <div v-if="sample.isEnteredForOther" 
                      class="text-xs text-orange-600 font-medium mt-1">
                    You entered this for {{ sample.volunteer_id.first_name }} {{ sample.volunteer_id.last_name }}
                  </div>
                </div>
                <div class="flex space-x-1">
                  <UButton size="xs" variant="soft" @click="navigateTo(`/portal/biological/${sample.id}`)" 
                          icon="i-heroicons-eye">View</UButton>
                  <UButton size="xs" variant="soft" color="blue" 
                          @click="navigateTo(`/portal/biological?edit=${sample.id}`)" 
                          icon="i-heroicons-pencil-square">Edit</UButton>
                </div>
              </div>
              <div class="grid grid-cols-1 gap-y-1 text-xs">
                <div><span class="font-medium">Bio Score:</span> {{ sample.biological_water_quality_score || 'Not calculated' }}</div>
                <div v-if="sample.biological_water_quality_score">
                  <span class="font-medium">Quality:</span> 
                  <span :class="{
                    'text-red-600': sample.biological_water_quality_score < 19,
                    'text-orange-600': sample.biological_water_quality_score >= 19 && sample.biological_water_quality_score <= 32,
                    'text-yellow-600': sample.biological_water_quality_score > 32 && sample.biological_water_quality_score <= 41,
                    'text-green-600': sample.biological_water_quality_score > 41
                  }">
                    {{ sample.biological_water_quality_score < 19 ? 'Poor' : 
                      sample.biological_water_quality_score >= 19 && sample.biological_water_quality_score <= 32 ? 'Marginal' :
                      sample.biological_water_quality_score > 32 && sample.biological_water_quality_score <= 41 ? 'Fair' : 'Good' }}
                  </span>
                </div>
                <div><span class="font-medium">Weather/Flow:</span> {{ sample.weather_flow || 'Not recorded' }}</div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Other Biological Samples -->
      <UCard class="mt-4 sm:mt-6">
        <template #header>
          <h2 class="text-base sm:text-lg font-semibold">Other Biological Assessments at This Site</h2>
        </template>
        
        <div v-if="bioSamples.other.length === 0" class="text-center py-6 sm:py-4 text-gray-500 text-sm sm:text-base">
          There are no other biological assessments recorded for this site.
        </div>

        <div v-else>
          <!-- Desktop Table -->
          <div class="desktop-table overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Sampler</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bio Score</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality Rating</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="sample in bioSamples.other" :key="sample.id" class="hover:bg-gray-50">
                  <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ sample.id }}</td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(sample.date) }}</td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{{ sample.volunteer_id?.first_name }} {{ sample.volunteer_id?.last_name }}</td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ sample.biological_water_quality_score || 'Not calculated' }}</td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm">
                    <span v-if="sample.biological_water_quality_score" :class="{
                      'text-red-600 font-medium': sample.biological_water_quality_score < 19,
                      'text-orange-600 font-medium': sample.biological_water_quality_score >= 19 && sample.biological_water_quality_score <= 32,
                      'text-yellow-600 font-medium': sample.biological_water_quality_score > 32 && sample.biological_water_quality_score <= 41,
                      'text-green-600 font-medium': sample.biological_water_quality_score > 41
                    }">
                      {{ sample.biological_water_quality_score < 19 ? 'Poor' : 
                        sample.biological_water_quality_score >= 19 && sample.biological_water_quality_score <= 32 ? 'Marginal' :
                        sample.biological_water_quality_score > 32 && sample.biological_water_quality_score <= 41 ? 'Fair' : 'Good' }}
                    </span>
                    <span v-else class="text-gray-500">—</span>
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <UButton size="xs" variant="soft" @click="navigateTo(`/portal/biological/${sample.id}`)" 
                            icon="i-heroicons-eye">View</UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="mobile-cards space-y-3">
            <div v-for="sample in bioSamples.other" :key="sample.id" 
                class="border border-gray-200 rounded-lg p-3 bg-white">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <div class="font-medium text-sm">Assessment #{{ sample.id }}</div>
                  <div class="text-xs text-gray-600">{{ formatDate(sample.date) }}</div>
                  <div class="text-xs text-gray-700 mt-1">
                    by {{ sample.volunteer_id?.first_name }} {{ sample.volunteer_id?.last_name }}
                  </div>
                </div>
                <UButton size="xs" variant="soft" @click="navigateTo(`/portal/biological/${sample.id}`)" 
                        icon="i-heroicons-eye">View</UButton>
              </div>
              <div class="grid grid-cols-1 gap-y-1 text-xs">
                <div><span class="font-medium">Bio Score:</span> {{ sample.biological_water_quality_score || 'Not calculated' }}</div>
                <div v-if="sample.biological_water_quality_score">
                  <span class="font-medium">Quality:</span> 
                  <span :class="{
                    'text-red-600': sample.biological_water_quality_score < 19,
                    'text-orange-600': sample.biological_water_quality_score >= 19 && sample.biological_water_quality_score <= 32,
                    'text-yellow-600': sample.biological_water_quality_score > 32 && sample.biological_water_quality_score <= 41,
                    'text-green-600': sample.biological_water_quality_score > 41
                  }">
                    {{ sample.biological_water_quality_score < 19 ? 'Poor' : 
                      sample.biological_water_quality_score >= 19 && sample.biological_water_quality_score <= 32 ? 'Marginal' :
                      sample.biological_water_quality_score > 32 && sample.biological_water_quality_score <= 41 ? 'Fair' : 'Good' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </UCard>
  
      <!-- Primary Habitat Samples Table -->
      <UCard class="mt-4 sm:mt-6">
        <template #header>
          <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 class="text-base sm:text-lg font-semibold">Your Habitat Assessments (Primary Sampler or Creator)</h2>
            <UButton
              icon="i-heroicons-plus"
              @click="navigateTo('/portal/habitat')"
              class="w-full sm:w-auto"
              size="sm"
            >
              New Habitat Assessment
            </UButton>
          </div>
        </template>

        <div v-if="habSamples.primary.length === 0" class="text-center py-6 sm:py-4 text-gray-500 text-sm sm:text-base">
          You haven't created any habitat assessments or been a primary sampler for this site yet.
        </div>

        <div v-else>
          <!-- Desktop Table -->
          <div class="desktop-table overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Habitat Score</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality Rating</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location Description</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="sample in habSamples.primary" :key="sample.id" 
                    :class="{'hover:bg-gray-50': true, 'bg-yellow-50': sample.isEnteredForOther}">
                  <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ sample.id }}</td>
                  <td class="px-3 py-4 text-sm text-gray-900">
                    {{ formatDate(sample.date) }}
                    <div v-if="sample.isEnteredForOther" 
                        class="text-xs text-orange-600 font-medium mt-1">
                      You entered this assessment for {{ sample.volunteer_id.first_name }} {{ sample.volunteer_id.last_name }}
                    </div>
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ sample.physical_assessment_score || 'Not calculated' }}</td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm">
                    <span v-if="sample.physical_assessment_score" :class="{
                      'text-red-600 font-medium': sample.physical_assessment_score <= 15,
                      'text-orange-600 font-medium': sample.physical_assessment_score >= 16 && sample.physical_assessment_score <= 22,
                      'text-yellow-600 font-medium': sample.physical_assessment_score >= 23 && sample.physical_assessment_score <= 29,
                      'text-green-600 font-medium': sample.physical_assessment_score >= 30
                    }">
                      {{ sample.physical_assessment_score <= 15 ? 'Poor' : 
                        sample.physical_assessment_score >= 16 && sample.physical_assessment_score <= 22 ? 'Marginal' :
                        sample.physical_assessment_score >= 23 && sample.physical_assessment_score <= 29 ? 'Fair' : 'Good' }}
                    </span>
                    <span v-else class="text-gray-500">—</span>
                  </td>
                  <td class="px-3 py-4 text-sm text-gray-500 max-w-xs">
                    <div class="truncate" :title="sample.stream_location_description">
                      {{ sample.stream_location_description || 'Not provided' }}
                    </div>
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div class="flex justify-center space-x-1">
                      <UButton size="xs" variant="soft" @click="navigateTo(`/portal/habitat/${sample.id}`)" 
                              icon="i-heroicons-eye">View</UButton>
                      <UButton size="xs" variant="soft" color="blue" 
                              @click="navigateTo(`/portal/habitat?edit=${sample.id}`)" 
                              icon="i-heroicons-pencil-square">Edit</UButton>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="mobile-cards space-y-3">
            <div v-for="sample in habSamples.primary" :key="sample.id" 
                :class="[
                  'border border-gray-200 rounded-lg p-3',
                  sample.isEnteredForOther ? 'bg-yellow-50 border-yellow-200' : 'bg-white'
                ]">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <div class="font-medium text-sm">Assessment #{{ sample.id }}</div>
                  <div class="text-xs text-gray-600">{{ formatDate(sample.date) }}</div>
                  <div v-if="sample.isEnteredForOther" 
                      class="text-xs text-orange-600 font-medium mt-1">
                    You entered this for {{ sample.volunteer_id.first_name }} {{ sample.volunteer_id.last_name }}
                  </div>
                </div>
                <div class="flex space-x-1">
                  <UButton size="xs" variant="soft" @click="navigateTo(`/portal/habitat/${sample.id}`)" 
                          icon="i-heroicons-eye">View</UButton>
                  <UButton size="xs" variant="soft" color="blue" 
                          @click="navigateTo(`/portal/habitat?edit=${sample.id}`)" 
                          icon="i-heroicons-pencil-square">Edit</UButton>
                </div>
              </div>
              <div class="space-y-1 text-xs">
                <div><span class="font-medium">Habitat Score:</span> {{ sample.physical_assessment_score || 'Not calculated' }}</div>
                <div v-if="sample.physical_assessment_score">
                  <span class="font-medium">Quality:</span> 
                  <span :class="{
                    'text-red-600': sample.physical_assessment_score <= 15,
                    'text-orange-600': sample.physical_assessment_score >= 16 && sample.physical_assessment_score <= 22,
                    'text-yellow-600': sample.physical_assessment_score >= 23 && sample.physical_assessment_score <= 29,
                    'text-green-600': sample.physical_assessment_score >= 30
                  }">
                    {{ sample.physical_assessment_score <= 15 ? 'Poor' : 
                      sample.physical_assessment_score >= 16 && sample.physical_assessment_score <= 22 ? 'Marginal' :
                      sample.physical_assessment_score >= 23 && sample.physical_assessment_score <= 29 ? 'Fair' : 'Good' }}
                  </span>
                </div>
                <div><span class="font-medium">Location:</span> {{ sample.stream_location_description || 'Not provided' }}</div>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Other Habitat Samples -->
      <UCard class="mt-4 sm:mt-6">
        <template #header>
          <h2 class="text-base sm:text-lg font-semibold">Other Habitat Assessments at This Site</h2>
        </template>
        
        <div v-if="habSamples.other.length === 0" class="text-center py-6 sm:py-4 text-gray-500 text-sm sm:text-base">
          There are no other habitat assessments recorded for this site.
        </div>

        <div v-else>
          <!-- Desktop Table -->
          <div class="desktop-table overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primary Sampler</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Habitat Score</th>
                  <th class="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quality Rating</th>
                  <th class="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                <tr v-for="sample in habSamples.other" :key="sample.id" class="hover:bg-gray-50">
                  <td class="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{{ sample.id }}</td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ formatDate(sample.date) }}</td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-900">{{ sample.volunteer_id?.first_name }} {{ sample.volunteer_id?.last_name }}</td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{{ sample.physical_assessment_score || 'Not calculated' }}</td>
                  <td class="px-3 py-4 whitespace-nowrap text-sm">
                    <span v-if="sample.physical_assessment_score" :class="{
                      'text-red-600 font-medium': sample.physical_assessment_score <= 15,
                      'text-orange-600 font-medium': sample.physical_assessment_score >= 16 && sample.physical_assessment_score <= 22,
                      'text-yellow-600 font-medium': sample.physical_assessment_score >= 23 && sample.physical_assessment_score <= 29,
                      'text-green-600 font-medium': sample.physical_assessment_score >= 30
                    }">
                      {{ sample.physical_assessment_score <= 15 ? 'Poor' : 
                        sample.physical_assessment_score >= 16 && sample.physical_assessment_score <= 22 ? 'Marginal' :
                        sample.physical_assessment_score >= 23 && sample.physical_assessment_score <= 29 ? 'Fair' : 'Good' }}
                    </span>
                    <span v-else class="text-gray-500">—</span>
                  </td>
                  <td class="px-3 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <UButton size="xs" variant="soft" @click="navigateTo(`/portal/habitat/${sample.id}`)" 
                            icon="i-heroicons-eye">View</UButton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Cards -->
          <div class="mobile-cards space-y-3">
            <div v-for="sample in habSamples.other" :key="sample.id" 
                class="border border-gray-200 rounded-lg p-3 bg-white">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <div class="font-medium text-sm">Assessment #{{ sample.id }}</div>
                  <div class="text-xs text-gray-600">{{ formatDate(sample.date) }}</div>
                  <div class="text-xs text-gray-700 mt-1">
                    by {{ sample.volunteer_id?.first_name }} {{ sample.volunteer_id?.last_name }}
                  </div>
                </div>
                <UButton size="xs" variant="soft" @click="navigateTo(`/portal/habitat/${sample.id}`)" 
                        icon="i-heroicons-eye">View</UButton>
              </div>
              <div class="space-y-1 text-xs">
                <div><span class="font-medium">Habitat Score:</span> {{ sample.physical_assessment_score || 'Not calculated' }}</div>
                <div v-if="sample.physical_assessment_score">
                  <span class="font-medium">Quality:</span> 
                  <span :class="{
                    'text-red-600': sample.physical_assessment_score <= 15,
                    'text-orange-600': sample.physical_assessment_score >= 16 && sample.physical_assessment_score <= 22,
                    'text-yellow-600': sample.physical_assessment_score >= 23 && sample.physical_assessment_score <= 29,
                    'text-green-600': sample.physical_assessment_score >= 30
                  }">
                    {{ sample.physical_assessment_score <= 15 ? 'Poor' : 
                      sample.physical_assessment_score >= 16 && sample.physical_assessment_score <= 22 ? 'Marginal' :
                      sample.physical_assessment_score >= 23 && sample.physical_assessment_score <= 29 ? 'Fair' : 'Good' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
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

  .inset-20 {
    top: 20;
    right: 20;
    bottom: 20;
    left: 20;
  }

  /* Animation for toast notification */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .animate-fade-in {
    animation: fadeIn 0.3s ease-out forwards;
  }

  /* Mobile responsive improvements */
  @media (max-width: 640px) {
    /* Better spacing for mobile cards */
    .space-y-3 > * + * {
      margin-top: 0.75rem;
    }
    
    /* Ensure text doesn't overflow on very small screens */
    .truncate {
      max-width: 100%;
    }
    
    /* Better touch targets */
    .flex.space-x-1 > * {
      min-height: 32px;
    }
  }

  /* Tablet improvements */
  @media (min-width: 641px) and (max-width: 1024px) {
    /* Better table spacing on tablets */
    .overflow-x-auto table {
      font-size: 0.875rem;
    }
    
    /* Improved button spacing */
    .flex.space-x-1 {
      gap: 0.375rem;
    }
  }

  /* Desktop improvements */
  @media (min-width: 1025px) {
    /* Ensure tables don't get too cramped */
    .px-3 {
      padding-left: 0.875rem;
      padding-right: 0.875rem;
    }
  }

  /* Custom scrollbar for horizontal overflow */
  .overflow-x-auto::-webkit-scrollbar {
    height: 6px;
  }

  .overflow-x-auto::-webkit-scrollbar-track {
    background: #f1f5f9;
    border-radius: 3px;
  }

  .overflow-x-auto::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }

  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }

  /* Force desktop tables to show and mobile cards to hide on large screens */
  @media (min-width: 1024px) {
    .desktop-table {
      display: block !important;
      width: 100% !important;
      overflow-x: auto;
    }
    
    .mobile-cards {
      display: none !important;
    }
  }

  /* Force mobile cards to show and desktop tables to hide on small screens */
  @media (max-width: 1023px) {
    .desktop-table {
      display: none !important;
    }
    
    .mobile-cards {
      display: block !important;
    }
  }

  /* Ensure table elements are visible */
  .desktop-table table {
    display: table !important;
    width: 100% !important;
    min-width: 100% !important;
  }

  .desktop-table thead {
    display: table-header-group !important;
  }

  .desktop-table tbody {
    display: table-row-group !important;
  }

  .desktop-table tr {
    display: table-row !important;
  }

  .desktop-table th,
  .desktop-table td {
    display: table-cell !important;
  }
</style>