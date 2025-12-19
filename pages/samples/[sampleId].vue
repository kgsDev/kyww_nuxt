<script setup lang="ts">
definePageMeta({
  layout: 'info'
});
const route = useRoute();
const sampleId = computed(() => route.params.sampleId);

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

// Function to fetch photos - only public photos (excluding form photos which might contain private info)
const fetchSamplePhotos = async () => {
  try {
    loadingPhotos.value = true;
    const photoRecords = await useDirectus(
      readItems('lu_sample_photos', {
        filter: { 
          sample_id: { _eq: sampleId.value },
          type: { _nin: ['form'] }  // Exclude form photos which might contain personal info
        },
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

// Fetch all related data - excluding identifying information
const fetchSampleData = async () => {
  try {
    // Fetch main sample data - excluding volunteer info
    const sample = await useDirectus(
      readItem('base_samples', sampleId.value, {
        fields: [
          'id',
          'wwky_id',
          'date',
          'start_time',
          'water_temperature',
          'pH',
          'dissolved_oxygen',
          'conductivity',
          'transparency_tube_measure',
          'turbidtube_measure',
          'stream_flow_measurement',
          'participants_adults',
          'participants_youth',
          'total_volunteer_minutes',
          'current_weather',
          'rainfall_amount',
          'stream_flow_visual',
          'turbidity',
          'trash',
          'other_observations_or_measurements',
          'bacteria_avg_ecoli_cfu',
          'bacteria_sample_a_ecoli_count',
          'bacteria_sample_a_volume',
          'bacteria_sample_a_ecoli',
          'bacteria_sample_b_ecoli_count',
          'bacteria_sample_b_volume',
          'bacteria_sample_b_ecoli',
          'bacteria_sample_c_ecoli_count',
          'bacteria_sample_c_volume',
          'bacteria_sample_c_ecoli'
        ]
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
      const [odors, waterSurfaces, bacterialSources, waterColorRecords] = await Promise.all([
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
        }))
      ]);

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
    other: 'Other Photo'
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
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center h-64">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
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
            <span class="text-gray-500 text-lg">(Sample ID: {{ sampleData.id }})</span>
          </h1>
          <p class="text-gray-900">
            Site: {{ siteData?.stream_name || 'Unnamed Stream' }}
            (ID: {{ sampleData.wwky_id }})
          </p>
          <p class="text-gray-900">
            Taken on {{ formatDate(sampleData.date) }} at {{ formatTime(sampleData.start_time) }}
          </p>
        </div>
        <NuxtLink :to="`/sites/${sampleData.wwky_id}`" class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <span class="mr-2 i-heroicons-arrow-left h-5 w-5"></span>
          Back to Site
        </NuxtLink>
      </div>

      <!-- Main Content Grid -->
      <div class="space-y-6">
        <!-- Participant Information -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Participation Statistics</h2>
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
        <UCard v-if="sampleData.bacteria_avg_ecoli_cfu">
          <template #header>
            <h2 class="text-lg font-semibold">Bacteria Analysis</h2>
          </template>
          <div class="space-y-4">
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
            <h2 class="text-lg font-semibold">Sample Photos</h2>
          </template>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="photo in photos" :key="photo.id" class="relative group">
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
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>