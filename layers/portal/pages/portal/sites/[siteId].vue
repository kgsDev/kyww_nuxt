<script setup lang="ts">
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
  // Get unique volunteer IDs from samples
  const volunteerIds = [...new Set(samples.value
    .filter(sample => sample.volunteer_id)
    .map(sample => sample.volunteer_id.id))];
  
  if (volunteerIds.length === 0) return; // No need to fetch if there are no volunteers
  
  try {
    // Fetch sampler_data for all volunteers in one request
    const samplerDataResponse = await useDirectus(
      readItems('sampler_data', {
        filter: {
          user_id: { _in: volunteerIds }
        },
        fields: ['user_id', 'allow_connections'],
        limit: -1
      })
    );
    
    // Create a map for quick lookup - FIX: use user_id instead of directus_user_id
    const samplerDataMap = samplerDataResponse.reduce((map, data) => {
      map[data.user_id] = data; // This is the key fix - use user_id to match the API response
      return map;
    }, {});
    
   
    // Update samples with the connection settings
    samples.value = samples.value.map(sample => {
      if (sample.volunteer_id && samplerDataMap[sample.volunteer_id.id]) {
        // Create a new sample object with sampler_data attached to volunteer_id
        return {
          ...sample,
          volunteer_id: {
            ...sample.volunteer_id,
            sampler_data: samplerDataMap[sample.volunteer_id.id]
          }
        };
      }
      
      // If no sampler data found, add a default sampler_data object
      if (sample.volunteer_id) {
        return {
          ...sample,
          volunteer_id: {
            ...sample.volunteer_id,
            sampler_data: { allow_connections: false } // Default to not allowing connections
          }
        };
      }
      
      return sample;
    });
    
  } catch (err) {
    console.error('Error fetching sampler connection settings:', err);
    // Set default connection settings if fetch fails
    samples.value = samples.value.map(sample => {
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
    // Show success toast notification
    successMessage.value = `Your message has been sent to ${selectedSampler.value.name}. They'll respond via email if interested in connecting.`;
    showSuccessToast.value = true;
    
    // Auto-hide the toast after 6 seconds
    setTimeout(() => {
      showSuccessToast.value = false;
    }, 6000);
  }
  
  selectedSampler.value = null;
};

//helper functions
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
      avgEColi: calculateAverage('bacteria_avg_ecoli_cfu'),
      maxEColi: Math.max(...samples.value
        .map(s => parseFloat(s.bacteria_avg_ecoli_cfu))
        .filter(val => !isNaN(val) && val !== null)
        .concat([0])), // Add 0 as fallback if no valid values
      minEColi: Math.min(...samples.value
        .filter(s => s.bacteria_avg_ecoli_cfu)
        .map(s => parseFloat(s.bacteria_avg_ecoli_cfu))
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

const primarySamples = computed(() => {
  return samples.value.filter(sample => 
    sample.volunteer_id?.id === user.value?.id || // Primary sampler
    sample.user_created?.id === user.value?.id // Created the sample
  ).map(sample => ({
    ...sample,
    isEnteredForOther: sample.user_created?.id === user.value?.id && 
                       sample.volunteer_id?.id !== user.value?.id
  }));
});

const additionalSamplerSamples = computed(() => {
  return samples.value.filter(sample => {
    // Check if user is an additional sampler
    const isAdditionalSampler = sample.additional_samplers?.some(
      entry => entry.directus_users_id?.id === user.value?.id
    );
    
    return isAdditionalSampler && 
           sample.volunteer_id?.id !== user.value?.id && 
           sample.user_created?.id !== user.value?.id;
  });
});

const otherSamples = computed(() => {
  if (!user.value) return [];
  
  return samples.value.filter(sample => {
    // Exclude samples where user is primary sampler or creator
    const isPrimarySample = sample.volunteer_id?.id === user.value.id || 
                          sample.user_created?.id === user.value.id;
    
    // Exclude samples where user is additional sampler
    const isAdditionalSampler = sample.additional_samplers?.some(
      entry => entry.directus_users_id?.id === user.value.id
    );
    
    return !isPrimarySample && !isAdditionalSampler;
  });
});

// Fetch data
onMounted(async () => {
  //fetch sites and hubs from useKYWWMap:
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
      try {
        const samplesResponse = await useDirectus(
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
        );

        // For each sample, get its additional samplers
        const samplesWithSamplers = await Promise.all(
          samplesResponse.map(async (sample) => {
            const additionalSamplers = await useDirectus(
              readItems('base_samples_directus_users', {
                filter: { base_samples_id: { _eq: sample.id } },
                fields: ['directus_users_id.*']
              })
            );
            return {
              ...sample,
              additional_samplers: additionalSamplers
            };
          })
        );

        samples.value = samplesWithSamplers;
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
      <div class="relative top-5 mx-auto p-5 border w-4/5 shadow-lg rounded-md bg-white">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Edit Sample</h2>
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
    <div v-if="showContactForm" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-full max-w-xl shadow-lg rounded-md bg-white">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Contact Sampler</h2>
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
    <div v-if="showSuccessToast" class="fixed inset-20 z-50 max-w-md animate-fade-in">
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
                <div>Average: {{ formatMeasurement(siteStats.bacteria.avgEColi, 'CFU/100mL') }}</div>
                <div>Maximum: {{ formatMeasurement(siteStats.bacteria.maxEColi, 'CFU/100mL') }}</div>
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
      <!-- Primary Samples Table -->
      <UCard class="mt-6">
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">Your Samples (Primary Sampler or Creator)</h2>
          </div>
        </template>

        <!-- Message if no primary samples -->
        <div v-if="primarySamples.length === 0" class="text-center py-4 text-gray-500">
          You haven't created any samples or been a primary sampler for this site yet.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left">ID</th>
                <th class="px-4 py-2 text-left">Date</th>
                <th class="px-4 py-2 text-left">Temp (°C)</th>
                <th class="px-4 py-2 text-left">pH</th>
                <th class="px-4 py-2 text-left">DO (mg/L)</th>
                <th class="px-4 py-2 text-left">Conduct (μS/cm)</th>
                <th class="px-4 py-2 text-left">Avg E. coli (CFU/100mL)</th>
                <th class="px-4 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="sample in primarySamples" :key="sample.id" 
                  :class="{'hover:bg-gray-50': true, 'bg-yellow-50': sample.user_created?.id === user?.id && sample.volunteer_id !== user?.id}">
                <td class="px-4 py-2">{{ sample.id }}</td>
                <td class="px-4 py-2">
                  {{ formatDate(sample.date) }}
                  <div v-if="sample.isEnteredForOther" 
                      class="text-xs text-orange-600 font-medium">
                    You entered this sample for {{ sample.volunteer_id.first_name }} {{ sample.volunteer_id.last_name }}
                  </div>
                </td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.water_temperature, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.pH, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.dissolved_oxygen, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.conductivity, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.bacteria_avg_ecoli_cfu, '') }}</td>
                <td class="px-4 py-2 text-center">
                  <div class="flex justify-center space-x-2">
                    <UButton size="sm" variant="soft" @click="navigateTo(`/portal/sample/${sample.id}`)" 
                            icon="i-heroicons-eye">View</UButton>
                    <UButton size="sm" variant="soft" color="blue" 
                            @click="navigateTo(`/portal/sample?edit=${sample.id}`)" 
                            icon="i-heroicons-pencil-square">Edit</UButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <!-- Additional Sampler Samples Table -->
      <UCard class="mt-6">
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">Samples Where You're an Additional Sampler</h2>
          </div>
        </template>

        <!-- Message if no additional sampler samples -->
        <div v-if="additionalSamplerSamples.length === 0" class="text-center py-4 text-gray-500">
          You haven't been an additional sampler for any samples at this site.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left">ID</th>
                <th class="px-4 py-2 text-left">Date</th>
                <th class="px-4 py-2 text-left">Temp (°C)</th>
                <th class="px-4 py-2 text-left">pH</th>
                <th class="px-4 py-2 text-left">DO (mg/L)</th>
                <th class="px-4 py-2 text-left">Conduct (μS/cm)</th>
                <th class="px-4 py-2 text-left">Avg E. coli (CFU/100mL)</th>
                <th class="px-4 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="sample in additionalSamplerSamples" :key="sample.id" class="hover:bg-gray-50">
                <td class="px-4 py-2">{{ sample.id }}</td>
                <td class="px-4 py-2">{{ formatDate(sample.date) }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.water_temperature, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.pH, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.dissolved_oxygen, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.conductivity, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.bacteria_avg_ecoli_cfu, '') }}</td>
                <td class="px-4 py-2 text-center">
                  <div class="flex justify-center space-x-2">
                    <UButton size="sm" variant="soft" @click="navigateTo(`/portal/sample/${sample.id}`)" 
                            icon="i-heroicons-eye">View</UButton>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>

      <!-- Other Samples Table -->
      <UCard class="mt-6">
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-lg font-semibold">Other Samples at This Site</h2>
          </div>
        </template>
        
        <div v-if="otherSamples.length === 0" class="text-center py-4 text-gray-500">
          There are no other samples recorded for this site.
        </div>

        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-2 text-left">ID</th>
                <th class="px-4 py-2 text-left">Date</th>
                <th class="px-4 py-2 text-left">Primary Sampler</th>
                <th class="px-4 py-2 text-left">Temp (°C)</th>
                <th class="px-4 py-2 text-left">pH</th>
                <th class="px-4 py-2 text-left">DO (mg/L)</th>
                <th class="px-4 py-2 text-left">Conduct (μS/cm)</th>
                <th class="px-4 py-2 text-left">Avg E. coli (CFU/100mL)</th>
                <th class="px-4 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr v-for="sample in otherSamples" :key="sample.id" class="hover:bg-gray-50">
                <td class="px-4 py-2">{{ sample.id }}</td>
                <td class="px-4 py-2">{{ formatDate(sample.date) }}</td>
                <td class="px-4 py-2 whitespace-nowrap">
                  <div class="flex flex-col space-y-2">
                    <!-- User name with optional lock icon -->
                    <div class="flex items-center">
                      <span>{{ sample.volunteer_id?.first_name }} {{ sample.volunteer_id?.last_name }}</span>
                      
                      <!-- Lock icon (if not accepting connections) - show next to name -->
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
                    
                    <!-- Connect button (if accepting connections) - show below name -->
                    <div v-if="sample.volunteer_id && sample.volunteer_id.id !== user?.id">
                      <UButton 
                        v-if="sample.volunteer_id.sampler_data && sample.volunteer_id.sampler_data.allow_connections === true"
                        size="sm" 
                        variant="soft" 
                        color="blue"
                        @click="openContactForm(sample)"
                        title="Connect with this sampler"
                        class="mt-1"
                      >
                        <div class="flex items-center space-x-1.5 px-0.5">
                          <span class="i-heroicons-sparkles text-red-500 h-3 w-3"></span>
                          <span class="font-medium">Connect</span>
                        </div>
                      </UButton>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.water_temperature, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.pH, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.dissolved_oxygen, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.conductivity, '') }}</td>
                <td class="px-4 py-2">{{ formatMeasurement(sample.bacteria_avg_ecoli_cfu, '') }}</td>
                <td class="px-4 py-2 text-center">
                  <div class="flex justify-center space-x-2">
                    <UButton size="sm" variant="soft" @click="navigateTo(`/portal/sample/${sample.id}`)" 
                            icon="i-heroicons-eye">View</UButton>
                  </div>
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
</style>