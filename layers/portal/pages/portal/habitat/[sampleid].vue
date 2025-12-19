<!-- File: /layers/pages/portal/habitat/[sampleid].vue -->
<script setup lang="ts">
//this is the view page for a single habitat sample in the KYWW portal [sampleid].vue
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

const photos = ref([]);
const loadingPhotos = ref(true);
const additionalSamplers = ref([]);
const otherSamplers = ref([]);

// Pollutant indicator data from join tables
const odorData = ref([]);
const waterColorData = ref([]);
const floatablesData = ref([]);

// Lookup tables for pollutant indicators
const odorLabels = {
  1: 'None',
  2: 'Rotten Eggs',
  3: 'Chlorine',
  4: 'Rancid/Sour',
  6: 'Gas/Petro',
  7: 'Musty',
  8: 'Sweet/Fruity',
  9: 'Sharp/Pungent'
};

const waterColorLabels = {
  1: 'Clear',
  2: 'Brown/Muddy',
  3: 'Green',
  4: 'White',
  5: 'Gray',
  6: 'Orange'
};

const floatablesLabels = {
  1: 'None',
  2: 'Oil Sheen',
  3: 'Algae',
  4: 'Soap Suds',
  5: 'Sewage'
};

// Computed properties for display
const odorsList = computed(() => {
  return odorData.value.map(id => odorLabels[id]).filter(Boolean);
});

const waterColorsList = computed(() => {
  return waterColorData.value.map(id => waterColorLabels[id]).filter(Boolean);
});

const floatablesList = computed(() => {
  return floatablesData.value.map(id => floatablesLabels[id]).filter(Boolean);
});

// Function to fetch photos
const fetchSamplePhotos = async () => {
  try {
    loadingPhotos.value = true;
    const photoRecords = await useDirectus(
      readItems('lu_habitat_photos', {
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

// Helper function to fetch related data from join tables
const fetchRelatedData = async (table: string, sampleId: string) => {
  const response = await useDirectus(
    readItems(table, {
      filter: {
        habitat_samples_id: { _eq: sampleId }
      }
    })
  );
  return response.map(item => item[`${table.replace('habitat_samples_', '')}_id`]);
};

// Fetch all related data
const fetchSampleData = async () => {
  try {
    // Fetch main sample data
    const sample = await useDirectus(
      readItem('habitat_samples', sampleId.value, {
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

      // Fetch additional samplers
      const samplers = await useDirectus(
        readItems('habitat_samples_directus_users', {
          filter: { habitat_samples_id: { _eq: sampleId.value } },
          fields: ['directus_users_id.*']
        })
      );

      additionalSamplers.value = samplers.map(s => ({
        name: `${s.directus_users_id.first_name} ${s.directus_users_id.last_name}`
      }));

      otherSamplers.value = sampleData.value.other_samplers || '';

      // Fetch pollutant indicators from join tables
      const [odors, waterColors, floatables] = await Promise.all([
        fetchRelatedData('habitat_samples_lu_odor', sampleId.value),
        fetchRelatedData('habitat_samples_lu_water_color', sampleId.value),
        fetchRelatedData('habitat_samples_lu_water_surface', sampleId.value)
      ]);

      odorData.value = odors;
      waterColorData.value = waterColors;
      floatablesData.value = floatables;

    } else {
      error.value = 'Habitat sample not found';
    }
  } catch (err) {
    console.error('Error fetching habitat sample data:', err);
    error.value = 'Failed to load habitat sample data';
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

const getPhotoLabel = (type: string) => {
  const labels = {
    upstream: 'Upstream Photo',
    downstream: 'Downstream Photo',
    other: 'Other Photo',
    form: 'Assessment Form'
  };
  return labels[type] || 'Photo';
};

// Get habitat score interpretation
const getHabitatScoreText = (score) => {
  if (!score) return 'Not calculated';
  if (score <= 15) return 'Poor';
  if (score >= 16 && score <= 22) return 'Marginal';
  if (score >= 23 && score <= 29) return 'Fair';
  return 'Good';
};

const getHabitatScoreClass = (score) => {
  if (!score) return '';
  if (score <= 15) return 'text-red-600 bg-red-100';
  if (score >= 16 && score <= 22) return 'text-orange-600 bg-orange-100';
  if (score >= 23 && score <= 29) return 'text-yellow-600 bg-yellow-100';
  return 'text-green-600 bg-green-100';
};

// Physical assessment items with their scoring
const physicalAssessmentItems = [
  {
    title: 'Streambank Vegetation',
    field: 'physicalassessment_vegetation',
    description: 'Look above water level and on land next to stream. Mowing/grazing impacts?',
    options: [
      'Very little plant life at all along banks or in floodplain.',
      'Most trees and shrubs are gone.',
      'Some plants, shrubs and trees along banks.',
      'Lots of plants, shrubs and trees (not lawn or crops) covering banks and floodplain.'
    ]
  },
  {
    title: 'Stream Channel Alteration',
    field: 'physicalassessment_channelalteration',
    description: 'Is the stream curving or straight? Have humans changed the stream channel?',
    options: [
      'Channel straightened and flowing along a rocky or paved channel.',
      'Channel mostly straightened, but vegetation still present and no rock or cement hardening of banks.',
      'Channel straightened in some places, but some natural bends still present. No bank hardening with concrete or rocks.',
      'Channel allowed to naturally bend and curve around landscape. Flow not impacted by manmade features, such as rock baskets or concrete.'
    ]
  },
  {
    title: 'Embeddedness',
    field: 'physicalassessment_embeddedness',
    description: 'Are there rocks on the bottom and are they covered by silt? Is there a variety of rock sizes?',
    options: [
      'Rocks entirely buried by sand and silt.',
      'Rocks more than halfway buried (embedded) into sand/silt.',
      'Exposed rocks cover most of stream bed, with some sand/silt between & on rocks.',
      'Exposed rocks cover almost all of the stream bed with very little sand or silt between them.'
    ]
  },
  {
    title: 'Erosion',
    field: 'physicalassessment_erosion',
    description: 'What length of banks is bare of vegetation?',
    options: [
      'Steep banks of bare, exposed soil with very little covered by large rocks and vegetation.',
      'Approx. 1/3 of bank area covered with large rocks and vegetation, 2/3 exposed soil.',
      'Approx. 2/3 of bank area covered with large rocks and vegetation, 1/3 exposed soil.',
      'Most of streambanks are covered with large rocks and vegetation with very little exposed soil.'
    ]
  },
  {
    title: 'Shelter for Macroinvertebrates',
    field: 'physicalassessment_macroinvertebrates',
    description: 'Look for rocks, limbs and leaves on the stream bottom.',
    options: [
      'No rocks, wood, or leaf packs. Stream bottom mainly mud or bedrock.',
      'No rocks or wood, but some leaf packs.',
      'Only small gravel-sized rocks, some wood and leaf packs.',
      'Lots of different sized rocks, submerged wood, and plenty of leaf packs.'
    ]
  },
  {
    title: 'Shelter for Fish',
    field: 'physicalassessment_fish',
    description: 'Good shelter includes deep pools, submerged wood and undercut banks.',
    options: [
      'No pools, wood, and undercut banks in the water.',
      'Very few pools, wood, and undercut banks in the water.',
      'Some pools, wood, and undercut banks in the water.',
      'Multiple pools, some submerged wood, and undercut banks in the water.'
    ]
  },
  {
    title: 'Riparian Vegetated Buffer Width',
    field: 'physicalassessment_riparianwidth',
    description: 'How wide is the band of trees and shrubs on each side of the stream?',
    options: [
      'EACH bank has 0‐5 feet of trees and shrubs.',
      'EACH bank has at least 5‐20 feet of trees and shrubs.',
      'EACH bank has at least 20‐50 feet of trees and shrubs.',
      'More than 50 feet of trees and shrubs extending out from EACH bank of the stream.'
    ]
  },
  {
    title: 'Bank Stability',
    field: 'physicalassessment_bankstability',
    description: 'Are the banks of the stream steep or more gradually sloped? More vertical = more unstable.',
    options: [
      'Banks extremely high compared to water surface (70 to 90-degree slope). More than half of bank surface area eroded.',
      'Banks steep (45 to-70-degree slope) with approximately half of bank surface showing erosion.',
      'Bank slope steeper (20 to 45-degree slope) and higher than water surface, less than half of bank surface showing erosion.',
      'Top of bank only slightly higher than water surface, bank gradually sloped (less than 20-degree incline). Minimal evidence of erosion.'
    ]
  },
  {
    title: 'Velocity & Depth Combinations',
    field: 'physicalassessment_velocitydepth',
    description: 'A variety of combinations provides a range of habitat conditions that support aquatic life.',
    options: [
      'Stream has only 1 type of velocity and depth combination.',
      'Stream has 2 of the velocity and depth combinations.',
      'Stream has 3 of the velocity and depth combinations.',
      'Stream has areas of (a) fast/deep water, (b) fast/shallow water, (c) slow/shallow areas, and (d) slow/deep areas.'
    ]
  }
];

// Get assessment results with descriptions
const assessmentResults = computed(() => {
  if (!sampleData.value) return [];
  
  return physicalAssessmentItems.map(item => {
    const score = sampleData.value[item.field];
    if (score && score >= 1 && score <= 4) {
      return {
        ...item,
        score: score,
        description: item.options[score - 1],
        scoreClass: score >= 3 ? 'text-green-600' : score === 2 ? 'text-orange-600' : 'text-red-600'
      };
    }
    return {
      ...item,
      score: null,
      description: 'Not assessed',
      scoreClass: 'text-gray-500'
    };
  });
});

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
      <span class="ml-2">Loading habitat assessment...</span>
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
            Habitat Assessment Details
            <span class="text-gray-500 text-lg">(ID: {{ sampleData.id }})</span>
          </h1>
          <p class="text-gray-900">
            Site: {{ siteData?.stream_name || 'Unnamed Stream' }}
            (ID: {{ sampleData.wwky_id }})
          </p>
          <p class="text-gray-900">
            Assessed on {{ formatDate(sampleData.date) }} at {{ formatTime(sampleData.start_time) }}
          </p>
          <p class="text-gray-900">
            Assessed by: {{ samplerName }}
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

        <!-- Habitat Score Summary -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Physical Assessment Score</h2>
          </template>
          <div class="text-center">
            <div class="mb-4">
              <span class="text-4xl font-bold" :class="getHabitatScoreClass(sampleData.physical_assessment_score)">
                {{ sampleData.physical_assessment_score || 'Not calculated' }}
              </span>
            </div>
            <div class="text-xl font-semibold mb-2" :class="getHabitatScoreClass(sampleData.physical_assessment_score)">
              {{ getHabitatScoreText(sampleData.physical_assessment_score) }}
            </div>
            <div class="text-sm text-gray-600">
              <p>Score ranges: Poor (≤15), Marginal (16-22), Fair (23-29), Good (≥30)</p>
            </div>
          </div>
        </UCard>

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
            <div v-if="otherSamplers.length > 0">
                <p class="font-medium">Non-KYWW Samplers</p>
                <p>{{ sampleData.other_samplers }}</p>
            </div>
          </div>
        </UCard>

        <!-- Land Use and Pollutant Indicators -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Land Use -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Land Use in Drainage Area</h2>
            </template>
            <div class="space-y-2">
              <div class="flex items-center">
                <UIcon 
                  :name="sampleData.landuse_industrial ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                  :class="sampleData.landuse_industrial ? 'text-green-500' : 'text-gray-400'"
                  class="mr-2"
                />
                Industrial
              </div>
              <div class="flex items-center">
                <UIcon 
                  :name="sampleData.landuse_downtown ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                  :class="sampleData.landuse_downtown ? 'text-green-500' : 'text-gray-400'"
                  class="mr-2"
                />
                Downtown Residential
              </div>
              <div class="flex items-center">
                <UIcon 
                  :name="sampleData.landuse_suburban ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                  :class="sampleData.landuse_suburban ? 'text-green-500' : 'text-gray-400'"
                  class="mr-2"
                />
                Suburban Residential
              </div>
              <div class="flex items-center">
                <UIcon 
                  :name="sampleData.landuse_commercial ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                  :class="sampleData.landuse_commercial ? 'text-green-500' : 'text-gray-400'"
                  class="mr-2"
                />
                Commercial
              </div>
              <div class="flex items-center">
                <UIcon 
                  :name="sampleData.landuse_openspace ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                  :class="sampleData.landuse_openspace ? 'text-green-500' : 'text-gray-400'"
                  class="mr-2"
                />
                Open Space
              </div>
              <div class="flex items-center">
                <UIcon 
                  :name="sampleData.landuse_agriculture ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                  :class="sampleData.landuse_agriculture ? 'text-green-500' : 'text-gray-400'"
                  class="mr-2"
                />
                Agriculture
              </div>
              <div v-if="sampleData.landuse_other">
                <p class="font-medium">Other:</p>
                <p class="text-sm text-gray-600">{{ sampleData.landuse_other }}</p>
              </div>
            </div>
          </UCard>

          <!-- Pollutant Indicators -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Pollutant Indicators</h2>
            </template>
            <div class="space-y-4">
              <!-- Odor -->
              <div v-if="odorsList.length > 0">
                <p class="font-medium mb-1">Odor:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(odor, index) in odorsList" :key="index" class="text-sm text-gray-700">
                    {{ odor }}
                  </li>
                </ul>
              </div>
              
              <!-- Water Color -->
              <div v-if="waterColorsList.length > 0">
                <p class="font-medium mb-1">Water Color:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(color, index) in waterColorsList" :key="index" class="text-sm text-gray-700">
                    {{ color }}
                  </li>
                </ul>
              </div>
              
              <!-- Floatables on Water Surface -->
              <div v-if="floatablesList.length > 0">
                <p class="font-medium mb-1">Floatables on Water Surface:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(floatable, index) in floatablesList" :key="index" class="text-sm text-gray-700">
                    {{ floatable }}
                  </li>
                </ul>
              </div>
              
              <!-- No indicators message -->
              <div v-if="odorsList.length === 0 && waterColorsList.length === 0 && floatablesList.length === 0" class="text-gray-500">
                No pollutant indicators were recorded for this assessment.
              </div>
            </div>
          </UCard>
        </div>

        <!-- Physical Assessment Details -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Physical Assessment Results</h2>
          </template>
          <div class="space-y-6">
            <div v-for="(result, index) in assessmentResults" :key="index" class="border-b border-gray-200 pb-4 last:border-b-0">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h3 class="font-medium">{{ result.title }}</h3>
                  <p class="text-sm text-gray-600 italic">{{ result.description }}</p>
                </div>
                <div class="text-right">
                  <span class="text-2xl font-bold" :class="result.scoreClass">
                    {{ result.score || 'N/A' }}
                  </span>
                  <div class="text-xs text-gray-500">/ 4</div>
                </div>
              </div>
              <div class="bg-gray-50 p-3 rounded">
                <p class="text-sm">
                  <strong>Assessment:</strong> {{ result.description }}
                </p>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Other Observations -->
        <UCard v-if="sampleData.other_observations">
          <template #header>
            <h2 class="text-lg font-semibold">Additional Observations</h2>
          </template>
          <p class="whitespace-pre-wrap">{{ sampleData.other_observations }}</p>
        </UCard>

      <!-- Photos Section -->
      <UCard v-if="!loadingPhotos && photos.length > 0">
        <template #header>
          <h2 class="text-lg font-semibold">Assessment Photos & Documents</h2>
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
                  alt="Assessment Form"
                  class="w-full h-48 object-cover rounded-lg hover:opacity-90 transition-opacity"
                />
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
                  Assessment Form (Image)
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
                  <span class="text-sm font-medium text-gray-700">Assessment Form</span>
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
            @click="navigateTo(`/portal/habitat?edit=${sampleData.id}`)"
          >
            Edit Assessment
          </UButton>
        </div>
      </div>
    </template>
  </PageContainer>
</template>