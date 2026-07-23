<script setup lang="ts">
// Public-facing habitat assessment detail. No volunteer-identifying
// information; field photos only (the scanned form is withheld).
definePageMeta({
  layout: 'info'
});

const route = useRoute();
const sampleId = computed(() => route.params.sampleId);

const loading = ref(true);
const error = ref(null);
const sampleData = ref(null);
const siteData = ref(null);

const photos = ref([]);
const loadingPhotos = ref(true);

// Pollutant indicators from join tables
const odorData = ref([]);
const waterColorData = ref([]);
const floatablesData = ref([]);

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

const odorsList = computed(() => odorData.value.map(id => odorLabels[id]).filter(Boolean));
const waterColorsList = computed(() => waterColorData.value.map(id => waterColorLabels[id]).filter(Boolean));
const floatablesList = computed(() => floatablesData.value.map(id => floatablesLabels[id]).filter(Boolean));

const physicalAssessmentItems = [
  {
    title: 'Streambank Vegetation',
    field: 'physicalassessment_vegetation',
    prompt: 'Plant life above water level and on land next to the stream.',
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
    prompt: 'Whether humans have straightened or hardened the stream channel.',
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
    prompt: 'How far bottom rocks are buried in sand or silt.',
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
    prompt: 'How much of the bank is bare of vegetation.',
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
    prompt: 'Rocks, limbs and leaves available on the stream bottom.',
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
    prompt: 'Deep pools, submerged wood and undercut banks.',
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
    prompt: 'Width of the band of trees and shrubs on each side of the stream.',
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
    prompt: 'How steep the banks are. More vertical means less stable.',
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
    prompt: 'Variety of flow and depth conditions supporting aquatic life.',
    options: [
      'Stream has only 1 type of velocity and depth combination.',
      'Stream has 2 of the velocity and depth combinations.',
      'Stream has 3 of the velocity and depth combinations.',
      'Stream has areas of (a) fast/deep water, (b) fast/shallow water, (c) slow/shallow areas, and (d) slow/deep areas.'
    ]
  }
];

const assessmentResults = computed(() => {
  if (!sampleData.value) return [];

  return physicalAssessmentItems.map(item => {
    const score = sampleData.value[item.field];
    if (score && score >= 1 && score <= 4) {
      return {
        ...item,
        score,
        finding: item.options[score - 1],
        scoreClass: score === 4 ? 'text-green-600'
                  : score === 3 ? 'text-yellow-600'
                  : score === 2 ? 'text-orange-600'
                  : 'text-red-600'
      };
    }
    return { ...item, score: null, finding: 'Not assessed', scoreClass: 'text-gray-500' };
  });
});

const landUse = computed(() => {
  if (!sampleData.value) return [];
  return [
    { label: 'Industrial', present: !!sampleData.value.landuse_industrial },
    { label: 'Downtown Residential', present: !!sampleData.value.landuse_downtown },
    { label: 'Suburban Residential', present: !!sampleData.value.landuse_suburban },
    { label: 'Commercial', present: !!sampleData.value.landuse_commercial },
    { label: 'Open Space', present: !!sampleData.value.landuse_openspace },
    { label: 'Agriculture', present: !!sampleData.value.landuse_agriculture }
  ];
});

const hasPollutantIndicators = computed(() =>
  odorsList.value.length > 0 || waterColorsList.value.length > 0 || floatablesList.value.length > 0
);

// Sum of 9 metrics scored 1-4, so the range is 9-36.
const getHabitatScoreText = (score) => {
  const s = parseFloat(score);
  if (isNaN(s) || s === 0) return 'Not calculated';
  if (s >= 30) return 'Good';
  if (s >= 23) return 'Fair';
  if (s >= 16) return 'Marginal';
  return 'Poor';
};

const getHabitatScoreClass = (score) => {
  const s = parseFloat(score);
  if (isNaN(s) || s === 0) return 'text-gray-500';
  if (s >= 30) return 'text-green-600 bg-green-100';
  if (s >= 23) return 'text-yellow-600 bg-yellow-100';
  if (s >= 16) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
};

// Join tables carry no user data, so they're safe to read as-is.
const fetchRelatedData = async (table: string, id: string) => {
  const column = `${table.replace('habitat_samples_', '')}_id`;
  const response = await useDirectus(
    readItems(table, {
      filter: { habitat_samples_id: { _eq: id } },
      fields: [column],
      limit: -1
    })
  );
  return response.map(item => item[column]);
};

const fetchSamplePhotos = async () => {
  try {
    loadingPhotos.value = true;
    const photoRecords = await useDirectus(
      readItems('lu_habitat_photos', {
        filter: {
          sample_id: { _eq: sampleId.value },
          type: { _nin: ['form'] }
        },
        fields: ['id', 'type', 'file_path']
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

// Explicit allow-list. No volunteer_id, no user_created, no other_samplers,
// and no read of habitat_samples_directus_users.
const fetchSampleData = async () => {
  try {
    const sample = await useDirectus(
      readItem('habitat_samples', sampleId.value, {
        fields: [
          'id',
          'wwky_id',
          'date',
          'start_time',
          'participants_adults',
          'participants_youth',
          'total_volunteer_minutes',
          'physical_assessment_score',
          'other_observations',
          'landuse_industrial',
          'landuse_downtown',
          'landuse_suburban',
          'landuse_commercial',
          'landuse_openspace',
          'landuse_agriculture',
          'landuse_other',
          ...physicalAssessmentItems.map(i => i.field)
        ]
      })
    );

    if (sample) {
      sampleData.value = sample;

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

      const [odors, waterColors, floatables] = await Promise.all([
        fetchRelatedData('habitat_samples_lu_odor', sampleId.value),
        fetchRelatedData('habitat_samples_lu_water_color', sampleId.value),
        fetchRelatedData('habitat_samples_lu_water_surface', sampleId.value)
      ]);

      odorData.value = odors;
      waterColorData.value = waterColors;
      floatablesData.value = floatables;
    } else {
      error.value = 'Habitat assessment not found';
    }
  } catch (err) {
    console.error('Error fetching habitat assessment:', err);
    error.value = 'Failed to load habitat assessment data';
  } finally {
    loading.value = false;
  }
};

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
    other: 'Other Photo'
  };
  return labels[type] || 'Photo';
};

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
            Habitat Assessment
            <span class="text-gray-500 text-lg">(ID: {{ sampleData.id }})</span>
          </h1>
          <p class="text-gray-900">
            Site: {{ siteData?.stream_name || 'Unnamed Stream' }}
            (ID: {{ sampleData.wwky_id }})
          </p>
          <p class="text-gray-900">
            Assessed on {{ formatDate(sampleData.date) }} at {{ formatTime(sampleData.start_time) }}
          </p>
        </div>
        <NuxtLink :to="`/sites/${sampleData.wwky_id}`" class="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <span class="mr-2 i-heroicons-arrow-left h-5 w-5"></span>
          Back to Site
        </NuxtLink>
      </div>

      <div class="space-y-6">
        <!-- Score Summary -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Physical Assessment Score</h2>
          </template>
          <div class="text-center">
            <div class="mb-4">
              <span class="text-4xl font-bold px-3 py-1 rounded" :class="getHabitatScoreClass(sampleData.physical_assessment_score)">
                {{ sampleData.physical_assessment_score || 'N/A' }}
              </span>
            </div>
            <div class="text-xl font-semibold mb-2">
              {{ getHabitatScoreText(sampleData.physical_assessment_score) }}
            </div>
            <div class="text-sm text-gray-600">
              <p>
                Nine habitat characteristics are each rated 1 to 4 and summed,
                giving a total from 9 to 36.
              </p>
              <p class="mt-1">
                Poor (&le;15) &middot; Marginal (16&ndash;22) &middot;
                Fair (23&ndash;29) &middot; Good (&ge;30)
              </p>
            </div>
          </div>
        </UCard>

        <!-- Participation Statistics -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Participation Statistics</h2>
          </template>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p class="font-medium">Adult Participants</p>
              <p>{{ sampleData.participants_adults ?? 'Not recorded' }}</p>
            </div>
            <div>
              <p class="font-medium">Youth Participants</p>
              <p>{{ sampleData.participants_youth ?? 'Not recorded' }}</p>
            </div>
            <div>
              <p class="font-medium">Total Volunteer Minutes</p>
              <p>{{ sampleData.total_volunteer_minutes ?? 'Not recorded' }}</p>
            </div>
          </div>
        </UCard>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Land Use -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Land Use in Drainage Area</h2>
            </template>
            <div class="space-y-2">
              <div v-for="use in landUse" :key="use.label" class="flex items-center">
                <UIcon
                  :name="use.present ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                  :class="use.present ? 'text-green-500' : 'text-gray-400'"
                  class="mr-2"
                />
                {{ use.label }}
              </div>
              <div v-if="sampleData.landuse_other" class="pt-2">
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
              <div v-if="odorsList.length > 0">
                <p class="font-medium mb-1">Odor:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(odor, index) in odorsList" :key="index" class="text-sm text-gray-700">
                    {{ odor }}
                  </li>
                </ul>
              </div>

              <div v-if="waterColorsList.length > 0">
                <p class="font-medium mb-1">Water Color:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(color, index) in waterColorsList" :key="index" class="text-sm text-gray-700">
                    {{ color }}
                  </li>
                </ul>
              </div>

              <div v-if="floatablesList.length > 0">
                <p class="font-medium mb-1">Floatables on Water Surface:</p>
                <ul class="list-disc list-inside space-y-1">
                  <li v-for="(floatable, index) in floatablesList" :key="index" class="text-sm text-gray-700">
                    {{ floatable }}
                  </li>
                </ul>
              </div>

              <div v-if="!hasPollutantIndicators" class="text-gray-500">
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
            <div v-for="result in assessmentResults" :key="result.field" class="border-b border-gray-200 pb-4 last:border-b-0">
              <div class="flex justify-between items-start mb-2">
                <div class="pr-4">
                  <h3 class="font-medium">{{ result.title }}</h3>
                  <p class="text-sm text-gray-600 italic">{{ result.prompt }}</p>
                </div>
                <div class="text-right flex-shrink-0">
                  <span class="text-2xl font-bold" :class="result.scoreClass">
                    {{ result.score || 'N/A' }}
                  </span>
                  <div class="text-xs text-gray-500">/ 4</div>
                </div>
              </div>
              <div class="bg-gray-50 p-3 rounded">
                <p class="text-sm">
                  <strong>Finding:</strong> {{ result.finding }}
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

        <!-- Photos -->
        <UCard v-if="!loadingPhotos && photos.length > 0">
          <template #header>
            <h2 class="text-lg font-semibold">Assessment Photos</h2>
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