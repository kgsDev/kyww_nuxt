<script setup lang="ts">
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
      const [odors, waterSurfaces, bacterialSources, waterColors, samplers] = await Promise.all([
        useDirectus(readItems('base_samples_lu_odor', {
          filter: { base_samples_id: { _eq: sampleId.value } },
          fields: ['lu_odor_id']
        })),
        useDirectus(readItems('base_samples_lu_water_surface', {
          filter: { base_samples_id: { _eq: sampleId.value } },
          fields: ['lu_water_surface_id']
        })),
        useDirectus(readItems('base_samples_lu_bacterial_sources', {
          filter: { base_samples_id: { _eq: sampleId.value } },
          fields: ['lu_bacterial_sources_id']
        })),
        useDirectus(readItems('base_samples_lu_water_color', {
          filter: { base_samples_id: { _eq: sampleId.value } },
          fields: ['lu_water_color_id']
        })),
        useDirectus(readItems('base_samples_directus_users', {
          filter: { base_samples_id: { _eq: sampleId.value } },
          fields: ['directus_users_id.*']
        }))
      ]);

      additionalSamplers.value = samplers.map(s => ({
        name: `${s.directus_users_id.first_name} ${s.directus_users_id.last_name}`
      }));

      // Add related data to sample data
      sampleData.value = {
        ...sampleData.value,
        odors: odors.map(o => o.lu_odor_id),
        waterSurfaces: waterSurfaces.map(w => w.lu_water_surface_id),
        bacterialSources: bacterialSources.map(b => b.lu_bacterial_sources_id),
        waterColor: waterColors.length > 0 ? waterColors[0].lu_water_color_id : null
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
      <div class="flex justify-between items-start mb-6">
        <div>
          <h1 class="text-2xl font-bold mb-2">
            Sample Details
            <span class="text-gray-500 text-lg">(ID: {{ sampleData.id }})</span>
          </h1>
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
        <UButton
          icon="i-heroicons-arrow-left"
          @click="navigateTo(`/portal/sites/${sampleData.wwky_id}`)"
        >
          Back to Site
        </UButton>
      </div>

      <!-- Main Content Grid -->
      <div class="space-y-6">

        <!-- Participant Information -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Participant Information</h2>
          </template>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="font-medium">Adult Participants</p>
                <p>{{ sampleData.participants_adults }}</p>
              </div>
              <div>
                <p class="font-medium">Youth Participants</p>
                <p>{{ sampleData.participants_youth }}</p>
              </div>
              <div>
                <p class="font-medium">Total Volunteer Minutes</p>
                <p>{{ sampleData.total_volunteer_minutes }}</p>
              </div>
              <div>
                <p class="font-medium">Miles Driven</p>
                <p>{{ sampleData.miles_driven }}</p>
              </div>
            </div>

            <!-- Additional Samplers Section -->
            <div v-if="additionalSamplers.length > 0">
              <p class="font-medium mb-2">Additional Samplers</p>
              <ul class="list-disc list-inside space-y-1">
                <li v-for="(sampler, index) in additionalSamplers" :key="index">
                  {{ sampler.name }}
                </li>
              </ul>
            </div>
          </div>
        </UCard>

        <!-- Main Information Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Environmental Conditions -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Environmental Conditions</h2>
            </template>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="font-medium">Weather</p>
                  <p>{{ weatherTypes[sampleData.current_weather] }}</p>
                </div>
                <div>
                  <p class="font-medium">Rainfall (48hrs)</p>
                  <p>{{ rainfallAmounts[sampleData.rainfall_amount] }}</p>
                </div>
                <div>
                  <p class="font-medium">Water Color</p>
                  <p>{{ waterColors[sampleData.water_color] || 'Not recorded' }}</p>
                </div>
                <div>
                  <p class="font-medium">Stream Flow</p>
                  <p>{{ streamFlowTypes[sampleData.stream_flow_visual] }}</p>
                </div>
                <div>
                  <p class="font-medium">Trash</p>
                  <p>{{ trashTypes[sampleData.trash] }}</p>
                </div>
                <div>
                  <p class="font-medium">Turbidity</p>
                  <p>{{ turbidityTypes[sampleData.turbidity] }}</p>
                </div>
              </div>

              <div>
                <p class="font-medium">Odors Detected</p>
                <p>{{ formatList(sampleData.odors, odorTypes) }}</p>
              </div>

              <div>
                <p class="font-medium">Water Surface Conditions</p>
                <p>{{ formatList(sampleData.waterSurfaces, waterSurfaceTypes) }}</p>
              </div>
            </div>
          </UCard>

          <!-- Water Quality Measurements -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Water Quality Measurements</h2>
            </template>
            <div class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="font-medium">Temperature</p>
                  <p>{{ formatMeasurement(sampleData.water_temperature, '°C') }}</p>
                </div>
                <div>
                  <p class="font-medium">pH</p>
                  <p>{{ formatMeasurement(sampleData.pH, '') }}</p>
                </div>
                <div>
                  <p class="font-medium">Dissolved Oxygen</p>
                  <p>{{ formatMeasurement(sampleData.dissolved_oxygen, 'mg/L') }}</p>
                </div>
                <div>
                  <p class="font-medium">Conductivity</p>
                  <p>{{ formatMeasurement(sampleData.conductivity, 'μS/cm') }}</p>
                </div>
                <div v-if="sampleData.transparency_tube_measure">
                  <p class="font-medium">Transparency Tube</p>
                  <p>{{ formatMeasurement(sampleData.transparency_tube_measure, 'cm') }}</p>
                </div>
                <div v-if="sampleData.turbidtube_measure">
                  <p class="font-medium">Turbidity Meter</p>
                  <p>{{ formatMeasurement(sampleData.turbidtube_measure, 'NTU') }}</p>
                </div>
                <div v-if="sampleData.stream_flow_measurement">
                  <p class="font-medium">Stream Flow</p>
                  <p>{{ formatMeasurement(sampleData.stream_flow_measurement, 'ft³/s') }}</p>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Bacteria Analysis Section (if present) -->
        <UCard v-if="sampleData.bacteria_timedate_in">
          <template #header>
            <h2 class="text-lg font-semibold">Bacteria Analysis (R-Card Method)</h2>
          </template>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="font-medium">Time In Incubator</p>
                <p>{{ new Date(sampleData.bacteria_timedate_in).toLocaleString() }}</p>
              </div>
              <div>
                <p class="font-medium">Time Out Incubator</p>
                <p>{{ new Date(sampleData.bacteria_timedate_out).toLocaleString() }}</p>
              </div>
              <div>
                <p class="font-medium">R-Card Reader Initials</p>
                <p>{{ sampleData.bacteria_rcard_initials }}</p>
              </div>
            </div>

            <!-- E. coli Results -->
            <div class="mt-4">
              <h3 class="text-md font-semibold mb-2">E. coli Results</h3>
              <table class="min-w-full">
                <thead>
                  <tr class="border-b">
                    <th class="text-left py-2">Sample</th>
                    <th class="text-right py-2">Count</th>
                    <th class="text-right py-2">Volume (mL)</th>
                    <th class="text-right py-2">E. coli/100mL</th>
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

            <!-- Bacterial Sources -->
            <div class="mt-4">
              <p class="font-medium">Possible Bacterial Sources</p>
              <p>{{ formatList(sampleData.bacterialSources, bacterialSourceTypes) }}</p>
            </div>
          </div>
        </UCard>

        <!-- Other Observations -->
        <UCard v-if="sampleData.other_observations_or_measurements">
          <template #header>
            <h2 class="text-lg font-semibold">Additional Observations</h2>
          </template>
          <p class="whitespace-pre-wrap">{{ sampleData.other_observations_or_measurements }}</p>
        </UCard>

      <!-- Photos Section -->
      <UCard v-if="!loadingPhotos && photos.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Sample Photos & Documents</h2>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  class="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                />
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  Sample Form (Image)
                </div>
              </a>
              <!-- PDF Form Preview -->
              <a 
                v-else
                :href="photo.url" 
                target="_blank" 
                class="block h-48 bg-gray-50 rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors duration-200"
              >
                <div class="flex flex-col items-center justify-center h-full p-4">
                  <i class="fas fa-file-pdf text-4xl text-red-500 mb-2"></i>
                  <span class="text-sm font-medium text-gray-700">Sample Form</span>
                  <span class="text-xs text-gray-500 mt-1">Click to view PDF</span>
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
                  class="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                />
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  {{ getPhotoLabel(photo.type) }}
                </div>
              </a>
            </div>
          </template>
        </div>
      </UCard>

        <!-- Edit Button -->
        <div class="mt-6 flex justify-end">
          <UButton
            v-if="canEditSample"
            icon="i-heroicons-pencil-square"
            @click="navigateTo(`/portal/sample?edit=${sampleData.id}`)"
          >
            Edit Sample
          </UButton>
        </div>
      </div>
    </template>
  </PageContainer>
</template>