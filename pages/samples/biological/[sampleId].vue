<script setup lang="ts">
// Public-facing biological assessment detail. No volunteer-identifying
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

// Streamflow conditions recorded on the assessment.
// Stored as a string ('1','2','4','6') by the URadioGroup on the entry form.
const weatherflowConditions = {
  '1': 'Flooded over banks',
  '2': 'Water at bank level',
  '4': 'Water below bank level, but flowing',
  '6': 'Drought condition; not flowing'
};

// Point values match biological/index.vue's scoring, NOT the portal view page.
const macroinvertebrates = [
  { field: 'macroinvertebrate_musslesnative', name: 'Mussels (Native)', points: 4, category: 'Highly Sensitive' },
  { field: 'macroinvertebrate_stoneflies', name: 'Stoneflies', points: 4, category: 'Highly Sensitive' },
  { field: 'macroinvertebrate_caddisfliescasebuilding', name: 'Caddisflies (Case-building)', points: 4, category: 'Highly Sensitive' },
  { field: 'macroinvertebrate_mayflies', name: 'Mayflies', points: 4, category: 'Highly Sensitive' },
  { field: 'macroinvertebrate_waterpennies', name: 'Water Pennies', points: 4, category: 'Highly Sensitive' },
  { field: 'macroinvertebrate_watersnipe', name: 'Water Snipe', points: 4, category: 'Highly Sensitive' },

  { field: 'macroinvertebrate_caddisfliesnetspinning', name: 'Caddisflies (Net-spinning)', points: 3, category: 'Sensitive' },
  { field: 'macroinvertebrate_rifflebeetles', name: 'Riffle Beetles', points: 3, category: 'Sensitive' },
  { field: 'macroinvertebrate_operculatesnails', name: 'Operculate Snails', points: 3, category: 'Sensitive' },
  { field: 'macroinvertebrate_blackflylarvae', name: 'Black Fly Larvae', points: 3, category: 'Sensitive' },
  { field: 'macroinvertebrate_craneflylarvae', name: 'Crane Fly Larvae', points: 3, category: 'Sensitive' },

  { field: 'macroinvertebrate_hellgrammites', name: 'Hellgrammites', points: 2, category: 'Moderately Tolerant' },
  { field: 'macroinvertebrate_clamsmusselsnonnative', name: 'Clams and Mussels (Asian)', points: 2, category: 'Moderately Tolerant' },
  { field: 'macroinvertebrate_crayfish', name: 'Crayfish', points: 2, category: 'Moderately Tolerant' },
  { field: 'macroinvertebrate_dragonflies', name: 'Dragonflies', points: 2, category: 'Moderately Tolerant' },
  { field: 'macroinvertebrate_flatworms', name: 'Flatworms / Planaria', points: 2, category: 'Moderately Tolerant' },
  { field: 'macroinvertebrate_midges', name: 'Midges / Chironomids', points: 2, category: 'Moderately Tolerant' },

  { field: 'macroinvertebrate_alderflies', name: 'Alderflies', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_scuds', name: 'Scuds / Amphipods', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_nonoperculatesnails', name: 'Non-operculate Snails', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_sowbugs', name: 'Sow Bugs', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_leeches', name: 'Leeches', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_damselflies', name: 'Damselflies', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_aquaticworms', name: 'Aquatic Worms', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_otheraquaticbeetles', name: 'Other Aquatic Beetles', points: 1, category: 'Tolerant' }
];

// Preserve category order rather than relying on key insertion order.
const categoryOrder = ['Highly Sensitive', 'Sensitive', 'Moderately Tolerant', 'Tolerant'];

const foundMacroinvertebrates = computed(() => {
  if (!sampleData.value) return [];

  return categoryOrder
    .map(category => ({
      category,
      points: macroinvertebrates.find(m => m.category === category)?.points ?? 0,
      organisms: macroinvertebrates.filter(
        m => m.category === category && sampleData.value[m.field]
      )
    }))
    .filter(group => group.organisms.length > 0);
});

const totalOrganismsFound = computed(() =>
  foundMacroinvertebrates.value.reduce((acc, g) => acc + g.organisms.length, 0)
);

const habitatZones = computed(() => {
  if (!sampleData.value) return [];
  return [
    { label: 'Riffle', present: !!sampleData.value.habitatzone_riffle },
    { label: 'Leaf Packs', present: !!sampleData.value.habitatzone_leafpacks },
    { label: 'Woody Debris', present: !!sampleData.value.habitatzone_woodydebris },
    { label: 'Pools', present: !!sampleData.value.habitatzone_pools },
    { label: 'Undercut Banks', present: !!sampleData.value.habitatzone_undercutbanks },
    { label: 'Submerged Plants', present: !!sampleData.value.habitatzone_submergedplants }
  ];
});

// Weighted average, 1.00-4.00. Matches the scoring in biological/index.vue.
const getBiologicalScoreText = (score) => {
  const s = parseFloat(score);
  if (isNaN(s) || s === 0) return 'Not calculated';
  if (s >= 3.26) return 'Good';
  if (s >= 2.51) return 'Fair';
  if (s >= 1.76) return 'Marginal';
  return 'Poor';
};

const getBiologicalScoreClass = (score) => {
  const s = parseFloat(score);
  if (isNaN(s) || s === 0) return 'text-gray-500';
  if (s >= 3.26) return 'text-green-600 bg-green-100';
  if (s >= 2.51) return 'text-yellow-600 bg-yellow-100';
  if (s >= 1.76) return 'text-orange-600 bg-orange-100';
  return 'text-red-600 bg-red-100';
};

const categoryClass = (category) => ({
  'Highly Sensitive': 'text-green-700',
  'Sensitive': 'text-lime-700',
  'Moderately Tolerant': 'text-orange-700',
  'Tolerant': 'text-red-700'
}[category] || 'text-gray-700');

// Field photos only. The scanned form is excluded because it commonly
// carries handwritten volunteer names.
const fetchSamplePhotos = async () => {
  try {
    loadingPhotos.value = true;
    const photoRecords = await useDirectus(
      readItems('lu_biological_photos', {
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
// and no read of biological_samples_directus_users.
const fetchSampleData = async () => {
  try {
    const sample = await useDirectus(
      readItem('biological_samples', sampleId.value, {
        fields: [
          'id',
          'wwky_id',
          'date',
          'start_time',
          'participants_adults',
          'participants_youth',
          'total_volunteer_minutes',
          'biological_water_quality_score',
          'weather_flow',
          'other_observations',
          'habitatzone_riffle',
          'habitatzone_leafpacks',
          'habitatzone_woodydebris',
          'habitatzone_pools',
          'habitatzone_undercutbanks',
          'habitatzone_submergedplants',
          ...macroinvertebrates.map(m => m.field)
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
    } else {
      error.value = 'Biological assessment not found';
    }
  } catch (err) {
    console.error('Error fetching biological assessment:', err);
    error.value = 'Failed to load biological assessment data';
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
      <span class="ml-2">Loading biological assessment...</span>
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
            Biological Assessment
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
            <h2 class="text-lg font-semibold">Biological Water Quality Score</h2>
          </template>
          <div class="text-center">
            <div class="mb-4">
              <span class="text-4xl font-bold px-3 py-1 rounded" :class="getBiologicalScoreClass(sampleData.biological_water_quality_score)">
                {{ sampleData.biological_water_quality_score || 'N/A' }}
              </span>
            </div>
            <div class="text-xl font-semibold mb-2">
              {{ getBiologicalScoreText(sampleData.biological_water_quality_score) }}
            </div>
            <div class="text-sm text-gray-600">
              <p>
                The score is a weighted average of the pollution sensitivity of the
                organisms found, from 1.00 to 4.00.
              </p>
              <p class="mt-1">
                Poor (1.00&ndash;1.75) &middot; Marginal (1.76&ndash;2.50) &middot;
                Fair (2.51&ndash;3.25) &middot; Good (3.26&ndash;4.00)
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
          <!-- Stream Conditions -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Stream Conditions</h2>
            </template>
            <div class="space-y-4">
              <div>
                <p class="font-medium">Streamflow Conditions</p>
                <p>{{ weatherflowConditions[sampleData.weather_flow] || 'Not recorded' }}</p>
              </div>

              <div>
                <p class="font-medium mb-2">Habitat Zones Sampled</p>
                <div class="grid grid-cols-2 gap-2">
                  <div v-for="zone in habitatZones" :key="zone.label" class="flex items-center">
                    <UIcon
                      :name="zone.present ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                      :class="zone.present ? 'text-green-500' : 'text-gray-400'"
                      class="mr-2"
                    />
                    {{ zone.label }}
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Macroinvertebrates Found -->
          <UCard>
            <template #header>
              <div class="flex justify-between items-center">
                <h2 class="text-lg font-semibold">Macroinvertebrates Found</h2>
                <span class="text-sm text-gray-500">{{ totalOrganismsFound }} type(s)</span>
              </div>
            </template>
            <div class="space-y-4">
              <div v-for="group in foundMacroinvertebrates" :key="group.category">
                <h3 class="font-medium" :class="categoryClass(group.category)">
                  {{ group.category }} ({{ group.points }} point{{ group.points > 1 ? 's' : '' }} each)
                </h3>
                <ul class="list-disc list-inside text-sm mt-1">
                  <li v-for="organism in group.organisms" :key="organism.field">
                    {{ organism.name }}
                  </li>
                </ul>
              </div>

              <div v-if="foundMacroinvertebrates.length === 0" class="text-gray-500">
                No macroinvertebrates were recorded for this assessment.
              </div>
            </div>
          </UCard>
        </div>

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