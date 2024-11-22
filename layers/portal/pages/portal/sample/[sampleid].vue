<script setup lang="ts">
const route = useRoute();
const sampleId = computed(() => route.params.sampleId);

const loading = ref(true);
const error = ref(null);
const sampleData = ref(null);
const siteData = ref(null);

// Fetch all related data
const fetchSampleData = async () => {
  try {
    // Fetch main sample data
    const sample = await useDirectus(
      readItems('base_samples', {
        filter: { id: { _eq: sampleId.value } },
        fields: ['*']
      })
    );

    if (sample && sample.length > 0) {
      sampleData.value = sample[0];

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
      const [odors, waterSurfaces, bacterialSources] = await Promise.all([
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
        }))
      ]);

      // Add related data to sample data
      sampleData.value = {
        ...sampleData.value,
        odors: odors.map(o => o.lu_odor_id),
        waterSurfaces: waterSurfaces.map(w => w.lu_water_surface_id),
        bacterialSources: bacterialSources.map(b => b.lu_bacterial_sources_id)
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

// Initialize data
onMounted(async () => {
  await fetchSampleData();
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
          <p class="text-gray-600">
            Site: {{ siteData?.stream_name || 'Unnamed Stream' }}
            (ID: {{ sampleData.wwky_id }})
          </p>
          <p class="text-gray-600">
            Taken on {{ formatDate(sampleData.date) }} at {{ formatTime(sampleData.start_time) }}
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
                <p class="font-medium">Stream Flow</p>
                <p>{{ streamFlowTypes[sampleData.stream_flow_visual] }}</p>
              </div>
              <div>
                <p class="font-medium">Trash</p>
                <p>{{ trashTypes[sampleData.trash] }}</p>
              </div>
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
              <div>
                <p class="font-medium">Turbidity</p>
                <p>{{ turbidityTypes[sampleData.turbidity] }}</p>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </template>
  </PageContainer>
</template>