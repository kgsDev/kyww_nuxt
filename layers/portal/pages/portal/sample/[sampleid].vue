<script setup lang="ts">
//this is the main page for a single sample in the KYWW portal [sampleid].vue
const route = useRoute();
const sampleId = computed(() => route.params.sampleid);
const { user } = useDirectusAuth();

// Add a computed property to check if current user is the sample owner
const isUserSampleOwner = computed(() => {
  return user.value?.id === sampleData.value?.volunteer_id;
});

// Add a computed to check if user is admin
const isAdmin = computed(() => {
  const configPublic = useRuntimeConfig().public;
  return user.value?.role === configPublic.DEVADMIN_ROLE_ID || user.value?.role === configPublic.WWKYADMIN_ROLE_ID;
});

// Add a computed to check if user can edit the sample
const canEditSample = computed(() => {
  return isUserSampleOwner.value || isAdmin.value;
});

const loading = ref(true);
const error = ref(null);
const sampleData = ref(null);
const siteData = ref(null);

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

const trashTypes = {
  1: 'None',
  2: 'Minor',
  3: 'Several Bags',
  4: 'Tires / Large Debris',
  5: 'Abundant / Dump Site'
};

const waterColors = {
  1: 'Clear',
  2: 'Brown/Muddy',
  3: 'Green',
  4: 'White',
  5: 'Gray',
  6: 'Orange'
};

const odorTypes = {
  1: 'None',
  2: 'Rotten Eggs',
  3: 'Chlorine',
  4: 'Rancid/Sour',
  6: 'Gas/Petro',
  7: 'Musty',
  8: 'Sweet/Fruity',
  9: 'Sharp/Pungent'
};

const waterSurfaceTypes = {
  1: 'None',
  2: 'Oil Sheen',
  3: 'Algae',
  4: 'Soap Suds',
  5: 'Sewage',
  6: 'Erosion'
};

const bacterialSourceTypes = {
  1: 'Duck/Goose',
  2: 'Human',
  3: 'Livestock',
  4: 'Pet Waste',
  5: 'Wildlife',
  6: 'Other'
};

const photos = ref([]);
const loadingPhotos = ref(true);
const additionalSamplers = ref([]);
const otherSamplers = ref([]);

// Function to fetch photos
const fetchSamplePhotos = async () => {
  try {
    loadingPhotos.value = true;
    const photoRecords = await useDirectus(
      readItems('lu_sample_photos', {
        filter: { sample_id: { _eq: sampleId.value } },
        fields: ['*']
      })
    );

    if (photoRecords?.length > 0) {
      photos.value = photoRecords.map(record => ({
        id: record.id,
        type: record.type,
        url: record.file_path
      }));
    }
  } catch (error) {
    console.error('Error fetching photos:', error);
  } finally {
    loadingPhotos.value = false;
  }
};

// Fetch all related data
const fetchSampleData = async () => {
  try {
    // Fetch main sample data
    const sample = await useDirectus(
      readItem('base_samples', sampleId.value, {
        fields: ['*', 'volunteer_id.first_name', 'volunteer_id.last_name']
      })
    );

    if (sample) {
      sampleData.value = sample;

      // Fetch related site data
      const site = await useDirectus(
        readItems('wwky_sites', {
          filter: { wwkyid_pk: { _eq: sampleData.value.wwky_id } },
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

      if (site && site.length > 0) {
        siteData.value = site[0];
      }

      // Fetch related data from join tables
      const [odors, waterSurfaces, bacterialSources, waterColorRecords, samplers] = await Promise.all([
        useDirectus(readItems('base_samples_lu_odor', {
          filter: { base_samples_id: { _eq: sampleId.value } },
          fields: ['lu_odor_id'],
          limit: -1 // Fetch all related odors
        })),
        useDirectus(readItems('base_samples_lu_water_surface', {
          filter: { base_samples_id: { _eq: sampleId.value } },
          fields: ['lu_water_surface_id'],
          limit: -1 // Fetch all related water surfaces
        })),
        useDirectus(readItems('base_samples_lu_bacterial_sources', {
          filter: { base_samples_id: { _eq: sampleId.value } },
          fields: ['lu_bacterial_sources_id'],
          limit: -1 // Fetch all related bacterial sources  
        })),
        useDirectus(readItems('base_samples_lu_water_color', {
          filter: { base_samples_id: { _eq: sampleId.value } },
          fields: ['lu_water_color_id'],
          limit: -1 // Fetch all related water colors   
        })),
        useDirectus(readItems('base_samples_directus_users', {
          filter: { base_samples_id: { _eq: sampleId.value } },
          fields: ['directus_users_id.*'],
          limit: -1 // Fetch all related samplers
        }))
      ]);
      
      additionalSamplers.value = samplers.map(s => ({
        name: `${s.directus_users_id.first_name} ${s.directus_users_id.last_name}`
      }));

      otherSamplers.value = sampleData.value.other_samplers && sampleData.value.other_samplers !== '[]' ? sampleData.value.other_samplers : null;
      // Add related data to sample data
      sampleData.value = {
        ...sampleData.value,
        odors: odors.map(o => o.lu_odor_id),
        waterSurfaces: waterSurfaces.map(w => w.lu_water_surface_id),
        bacterialSources: bacterialSources.map(b => b.lu_bacterial_sources_id),
        water_color: waterColorRecords.length > 0 ? waterColorRecords[0].lu_water_color_id : null
      };
    } else {
      error.value = 'Sample not found';
    }
  } catch (err) {
    console.error('Error fetching sample data:', err);
    error.value = 'Failed to load sample data';
  } finally {
    loading.value = false;
  }
};

// Helper functions for formatting
const samplerName = computed(() => {
  if (!sampleData.value?.volunteer_id) return 'Unknown';
  return `${sampleData.value.volunteer_id.first_name} ${sampleData.value.volunteer_id.last_name}`;
});

const formatDate = (date) => {
  if (!date) return 'Not recorded';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatTime = (time) => {
  if (!time) return 'Not recorded';
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric'
  });
};

const formatMeasurement = (value, unit, precision = 2) => {
  if (value === null || value === undefined || isNaN(value)) return 'Not recorded';
  return `${Number(parseFloat(value)).toFixed(precision)} ${unit}`;
};

// Helper function for list formatting
const formatList = (items: number[], lookupObj: Record<number, string>) => {
  if (!items || items.length === 0) return 'None';
  return items.map(id => lookupObj[id]).join(', ');
};

const getPhotoLabel = (type: string) => {
  const labels = {
    upstream: 'Upstream Photo',
    downstream: 'Downstream Photo',
    other: 'Other Photo',
    form: 'Sample Form'
  };
  return labels[type] || 'Photo';
};

// Initialize data
onMounted(async () => {
  await Promise.all([
    fetchSampleData(),
    fetchSamplePhotos()
  ]);
});
</script>

<template>
  <PageContainer>
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <ULoadingIcon />
      <span class="ml-2">Loading sample information...</span>
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
      <!-- Header -->
      <div class="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div class="flex-1">
          <h1 class="text-xl sm:text-2xl font-bold mb-2">
            Sample Details
            <span class="text-gray-500 text-base sm:text-lg">(ID: {{ sampleData.id }})</span>
          </h1>
          <div class="space-y-1 text-sm sm:text-base">
            <p class="text-gray-900">
              Site: {{ siteData?.stream_name || 'Unnamed Stream' }}
              (ID: {{ sampleData.wwky_id }})
            </p>
            <p class="text-gray-900">
              Taken on {{ formatDate(sampleData.date) }} at {{ formatTime(sampleData.start_time) }}
            </p>
            <p class="text-gray-900">
              Sampled / Entered by: {{ samplerName }}
            </p>
          </div>
        </div>
        <UButton
          icon="i-heroicons-arrow-left"
          @click="navigateTo(`/portal/sites/${sampleData.wwky_id}`)"
          class="w-full sm:w-auto"
        >
          Back to Site
        </UButton>
      </div>

      <!-- Main Content Grid -->
      <div class="space-y-4 sm:space-y-6">

        <!-- Participant Information -->
        <UCard>
          <template #header>
            <h2 class="text-base sm:text-lg font-semibold">Participant Information</h2>
          </template>
          <div class="space-y-4">
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <p class="font-medium text-sm sm:text-base">Adult Participants</p>
                <p class="text-sm sm:text-base">{{ sampleData.participants_adults }}</p>
              </div>
              <div>
                <p class="font-medium text-sm sm:text-base">Youth Participants</p>
                <p class="text-sm sm:text-base">{{ sampleData.participants_youth }}</p>
              </div>
              <div>
                <p class="font-medium text-sm sm:text-base">Total Volunteer Minutes</p>
                <p class="text-sm sm:text-base">{{ sampleData.total_volunteer_minutes }}</p>
              </div>  
              <div>
                <p class="font-medium text-sm sm:text-base">Miles Driven</p>
                <p class="text-sm sm:text-base">{{ sampleData.miles_driven }}</p>
              </div>
            </div>

            <!-- Additional Samplers Section -->
            <div v-if="additionalSamplers.length > 0">
              <p class="font-medium mb-2 text-sm sm:text-base">Additional Samplers</p>
              <ul class="list-disc list-inside space-y-1 text-sm sm:text-base">
                <li v-for="(sampler, index) in additionalSamplers" :key="index">
                  {{ sampler.name }}
                </li>
              </ul>
            </div>
            <div>
                <p class="font-medium text-sm sm:text-base">Non-KYWW Samplers</p>
                <p class="text-sm sm:text-base">{{ otherSamplers || 'None' }}</p>
            </div>
          </div>
        </UCard>

        <!-- Main Information Grid -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <!-- Environmental Conditions -->
          <UCard>
            <template #header>
              <h2 class="text-base sm:text-lg font-semibold">Environmental Conditions</h2>
            </template>
            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p class="font-medium text-sm sm:text-base">Weather</p>
                  <p class="text-sm sm:text-base">{{ weatherTypes[sampleData.current_weather] }}</p>
                </div>
                <div>
                  <p class="font-medium text-sm sm:text-base">Rainfall (48hrs)</p>
                  <p class="text-sm sm:text-base">{{ rainfallAmounts[sampleData.rainfall_amount] }}</p>
                </div>
                <div>
                  <p class="font-medium text-sm sm:text-base">Water Color</p>
                  <p class="text-sm sm:text-base">{{ waterColors[sampleData.water_color] || 'Not recorded' }}</p>
                </div>
                <div>
                  <p class="font-medium text-sm sm:text-base">Stream Flow</p>
                  <p class="text-sm sm:text-base">{{ streamFlowTypes[sampleData.stream_flow_visual] }}</p>
                </div>
                <div>
                  <p class="font-medium text-sm sm:text-base">Trash</p>
                  <p class="text-sm sm:text-base">{{ trashTypes[sampleData.trash] }}</p>
                </div>
                <div>
                  <p class="font-medium text-sm sm:text-base">Turbidity</p>
                  <p class="text-sm sm:text-base">{{ turbidityTypes[sampleData.turbidity] }}</p>
                </div>
              </div>

              <div class="space-y-3">
                <div>
                  <p class="font-medium text-sm sm:text-base">Odors Detected</p>
                  <p class="text-sm sm:text-base break-words">{{ formatList(sampleData.odors, odorTypes) }}</p>
                </div>

                <div>
                  <p class="font-medium text-sm sm:text-base">Water Surface Conditions</p>
                  <p class="text-sm sm:text-base break-words">{{ formatList(sampleData.waterSurfaces, waterSurfaceTypes) }}</p>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Water Quality Measurements -->
          <UCard>
            <template #header>
              <h2 class="text-base sm:text-lg font-semibold">Water Quality Measurements</h2>
            </template>
            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p class="font-medium text-sm sm:text-base">Temperature</p>
                  <p class="text-sm sm:text-base">{{ formatMeasurement(sampleData.water_temperature, '°C') }}</p>
                </div>
                <div>
                  <p class="font-medium text-sm sm:text-base">pH</p>
                  <p class="text-sm sm:text-base">{{ formatMeasurement(sampleData.pH, '') }}</p>
                </div>
                <div>
                  <p class="font-medium text-sm sm:text-base">Dissolved Oxygen</p>
                  <p class="text-sm sm:text-base">{{ formatMeasurement(sampleData.dissolved_oxygen, 'mg/L') }}</p>
                </div>
                <div>
                  <p class="font-medium text-sm sm:text-base">Conductivity</p>
                  <p class="text-sm sm:text-base">{{ formatMeasurement(sampleData.conductivity, 'μS/cm') }}</p>
                </div>
                <div v-if="sampleData.transparency_tube_measure">
                  <p class="font-medium text-sm sm:text-base">Transparency Tube</p>
                  <p class="text-sm sm:text-base">{{ formatMeasurement(sampleData.transparency_tube_measure, 'cm') }}</p>
                </div>
                <div v-if="sampleData.turbidtube_measure">
                  <p class="font-medium text-sm sm:text-base">Turbidity Meter</p>
                  <p class="text-sm sm:text-base">{{ formatMeasurement(sampleData.turbidtube_measure, 'NTU') }}</p>
                </div>
                <div v-if="sampleData.stream_flow_measurement" class="sm:col-span-2">
                  <p class="font-medium text-sm sm:text-base">Stream Flow</p>
                  <p class="text-sm sm:text-base">{{ formatMeasurement(sampleData.stream_flow_measurement, 'ft³/s') }}</p>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Bacteria Analysis Section (if present) -->
        <UCard v-if="sampleData.bacteria_timedate_in">
          <template #header>
            <h2 class="text-base sm:text-lg font-semibold">Bacteria Analysis (R-Card Method)</h2>
          </template>
          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <div>
                <p class="font-medium text-sm sm:text-base">Time In Incubator</p>
                <p class="text-sm sm:text-base">{{ new Date(sampleData.bacteria_timedate_in).toLocaleString() }}</p>
              </div>
              <div>
                <p class="font-medium text-sm sm:text-base">Time Out Incubator</p>
                <p class="text-sm sm:text-base">{{ new Date(sampleData.bacteria_timedate_out).toLocaleString() }}</p>
              </div>
              <div>
                <p class="font-medium text-sm sm:text-base">R-Card Reader Initials</p>
                <p class="text-sm sm:text-base">{{ sampleData.bacteria_rcard_initials }}</p>
              </div>
            </div>

            <!-- E. coli Results -->
            <div class="mt-4">
              <h3 class="text-sm sm:text-base font-semibold mb-3">E. coli Results</h3>
              
              <!-- Desktop Table -->
              <div class="hidden sm:block overflow-x-auto">
                <table class="min-w-full text-sm">
                  <thead>
                    <tr class="border-b">
                      <th class="text-left py-2 font-medium">Sample</th>
                      <th class="text-right py-2 font-medium">Count</th>
                      <th class="text-right py-2 font-medium">Volume (mL)</th>
                      <th class="text-right py-2 font-medium">E. coli/100mL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="border-b">
                      <td class="py-2">Sample A</td>
                      <td class="text-right">{{ sampleData.bacteria_sample_a_ecoli_count }}</td>
                      <td class="text-right">{{ sampleData.bacteria_sample_a_volume }}</td>
                      <td class="text-right">{{ sampleData.bacteria_sample_a_ecoli }}</td>
                    </tr>
                    <tr class="border-b">
                      <td class="py-2">Sample B</td>
                      <td class="text-right">{{ sampleData.bacteria_sample_b_ecoli_count }}</td>
                      <td class="text-right">{{ sampleData.bacteria_sample_b_volume }}</td>
                      <td class="text-right">{{ sampleData.bacteria_sample_b_ecoli }}</td>
                    </tr>
                    <tr class="border-b">
                      <td class="py-2">Sample C</td>
                      <td class="text-right">{{ sampleData.bacteria_sample_c_ecoli_count }}</td>
                      <td class="text-right">{{ sampleData.bacteria_sample_c_volume }}</td>
                      <td class="text-right">{{ sampleData.bacteria_sample_c_ecoli }}</td>
                    </tr>
                    <tr class="font-semibold">
                      <td class="py-2">Average</td>
                      <td class="text-right" colspan="3">
                        {{ formatMeasurement(sampleData.bacteria_avg_ecoli_cfu, 'CFU/100mL', 0) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Mobile Cards -->
              <div class="sm:hidden space-y-3">
                <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <h4 class="font-medium text-sm mb-2">Sample A</h4>
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span class="font-medium">Count:</span> {{ sampleData.bacteria_sample_a_ecoli_count }}</div>
                    <div><span class="font-medium">Volume:</span> {{ sampleData.bacteria_sample_a_volume }} mL</div>
                    <div class="col-span-2"><span class="font-medium">E. coli/100mL:</span> {{ sampleData.bacteria_sample_a_ecoli }}</div>
                  </div>
                </div>
                <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <h4 class="font-medium text-sm mb-2">Sample B</h4>
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span class="font-medium">Count:</span> {{ sampleData.bacteria_sample_b_ecoli_count }}</div>
                    <div><span class="font-medium">Volume:</span> {{ sampleData.bacteria_sample_b_volume }} mL</div>
                    <div class="col-span-2"><span class="font-medium">E. coli/100mL:</span> {{ sampleData.bacteria_sample_b_ecoli }}</div>
                  </div>
                </div>
                <div class="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <h4 class="font-medium text-sm mb-2">Sample C</h4>
                  <div class="grid grid-cols-2 gap-2 text-xs">
                    <div><span class="font-medium">Count:</span> {{ sampleData.bacteria_sample_c_ecoli_count }}</div>
                    <div><span class="font-medium">Volume:</span> {{ sampleData.bacteria_sample_c_volume }} mL</div>
                    <div class="col-span-2"><span class="font-medium">E. coli/100mL:</span> {{ sampleData.bacteria_sample_c_ecoli }}</div>
                  </div>
                </div>
                <div class="border border-blue-200 rounded-lg p-3 bg-blue-50">
                  <h4 class="font-semibold text-sm">Average Result</h4>
                  <p class="text-sm mt-1">{{ formatMeasurement(sampleData.bacteria_avg_ecoli_cfu, 'CFU/100mL', 0) }}</p>
                </div>
              </div>
            </div>

            <!-- Bacterial Sources -->
            <div class="mt-4">
              <p class="font-medium text-sm sm:text-base">Possible Bacterial Sources</p>
              <p class="text-sm sm:text-base break-words">{{ formatList(sampleData.bacterialSources, bacterialSourceTypes) }}</p>
            </div>
          </div>
        </UCard>

        <!-- Other Observations -->
        <UCard v-if="sampleData.other_observations_or_measurements">
          <template #header>
            <h2 class="text-base sm:text-lg font-semibold">Additional Observations</h2>
          </template>
          <p class="whitespace-pre-wrap text-sm sm:text-base">{{ sampleData.other_observations_or_measurements }}</p>
        </UCard>

        <!-- Photos Section -->
        <UCard v-if="!loadingPhotos && photos.length > 0">
          <template #header>
            <h2 class="text-base sm:text-lg font-semibold">Sample Photos & Documents</h2>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            <template v-for="photo in photos" :key="photo.id">
              <!-- Form File Display -->
              <div v-if="photo.type === 'form'" class="relative group">
                <!-- Image Form Preview -->
                <a 
                  v-if="photo.url?.toLowerCase().endsWith('.png')"
                  :href="photo.url" 
                  target="_blank" 
                  class="block"
                >
                  <img 
                    :src="photo.url" 
                    alt="Sample Form"
                    class="w-full h-32 sm:h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                  />
                  <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                    <span class="text-xs sm:text-sm">Sample Form (Image)</span>
                  </div>
                </a>
                <!-- PDF Form Preview -->
                <a 
                  v-else
                  :href="photo.url" 
                  target="_blank" 
                  class="block h-32 sm:h-48 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors duration-200"
                >
                  <div class="flex flex-col items-center justify-center h-full p-2 sm:p-4">
                    <i class="fas fa-file-pdf text-2xl sm:text-4xl text-red-500 mb-2"></i>
                    <span class="text-xs sm:text-sm font-medium text-gray-700 text-center">Sample Form</span>
                    <span class="text-xs text-gray-500 mt-1 text-center">Click to view PDF</span>
                  </div>
                  <!-- Hover overlay -->
                  <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-opacity duration-200 rounded-lg"></div>
                </a>
              </div>
              
              <!-- Regular Photo Display -->
              <div v-else class="relative group">
                <a :href="photo.url" target="_blank" class="block">
                  <img 
                    :src="photo.url" 
                    :alt="getPhotoLabel(photo.type)"
                    class="w-full h-32 sm:h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                  />
                  <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                    <span class="text-xs sm:text-sm">{{ getPhotoLabel(photo.type) }}</span>
                  </div>
                </a>
              </div>
            </template>
          </div>
        </UCard>

        <!-- Edit Button -->
        <div class="mt-4 sm:mt-6 flex justify-end">
          <UButton
            v-if="canEditSample"
            icon="i-heroicons-pencil-square"
            @click="navigateTo(`/portal/sample?edit=${sampleData.id}`)"
            class="w-full sm:w-auto"
          >
            Edit Sample
          </UButton>
        </div>
      </div>
    </template>
  </PageContainer>
</template>

<style scoped>
/* Mobile responsive improvements */
@media (max-width: 640px) {
  /* Better spacing for mobile */
  .space-y-4 > * + * {
    margin-top: 1rem;
  }
  
  /* Ensure text doesn't overflow on very small screens */
  .break-words {
    word-break: break-word;
    hyphens: auto;
  }
  
  /* Better touch targets for links */
  a {
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  
  /* Improve readability of small text */
  .text-xs {
    line-height: 1.4;
  }
}

/* Tablet improvements */
@media (min-width: 641px) and (max-width: 1024px) {
  /* Better grid spacing on tablets */
  .grid {
    gap: 1rem;
  }
}

/* Desktop improvements */
@media (min-width: 1025px) {
  /* Ensure proper spacing on large screens */
  .space-y-6 > * + * {
    margin-top: 1.5rem;
  }
}

/* Photo gallery improvements */
.group:hover .group-hover\:bg-opacity-5 {
  background-opacity: 0.05;
}

/* Table responsiveness */
.overflow-x-auto {
  max-width: 100%;
}

@media (max-width: 640px) {
  .overflow-x-auto {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}

/* Better visual hierarchy */
.font-medium {
  font-weight: 500;
}

.font-semibold {
  font-weight: 600;
}

/* Improved card spacing */
@media (max-width: 640px) {
  .space-y-3 > * + * {
    margin-top: 0.75rem;
  }
}
</style>