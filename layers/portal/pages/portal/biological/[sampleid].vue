<!-- File: /layers/pages/portal/biological/[sampleid].vue -->
<script setup lang="ts">
//this is the view page for a single biological sample in the KYWW portal [sampleid].vue
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

// Lookup values for biological assessment fields
const weatherflowConditions = {
  '1': 'Flooded over banks',
  '2': 'Water at bank level',
  '4': 'Water below bank level, but flowing',
  '6': 'Drought condition; not flowing'
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
      readItems('lu_biological_photos', {
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
      readItem('biological_samples', sampleId.value, {
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
        readItems('biological_samples_directus_users', {
          filter: { biological_samples_id: { _eq: sampleId.value } },
          fields: ['directus_users_id.*']
        })
      );

      additionalSamplers.value = samplers.map(s => ({
        name: `${s.directus_users_id.first_name} ${s.directus_users_id.last_name}`
      }));

      otherSamplers.value = sampleData.value.other_samplers || '';

    } else {
      error.value = 'Biological sample not found';
    }
  } catch (err) {
    console.error('Error fetching biological sample data:', err);
    error.value = 'Failed to load biological sample data';
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
    form: 'Sample Form'
  };
  return labels[type] || 'Photo';
};

// Get biological score interpretation
const getBiologicalScoreText = (score) => {
  if (!score) return 'Not calculated';
  if (score < 19) return 'Poor';
  if (score >= 19 && score <= 32) return 'Marginal';
  if (score > 32 && score <= 41) return 'Fair';
  return 'Good';
};

const getBiologicalScoreClass = (score) => {
  if (!score) return '';
  if (score < 19) return 'text-red-600 bg-red-100';
  if (score >= 19 && score <= 32) return 'text-orange-600 bg-orange-100';
  if (score > 32 && score <= 41) return 'text-yellow-600 bg-yellow-100';
  return 'text-green-600 bg-green-100';
};

// Macroinvertebrate data structure
const macroinvertebrates = [
  // Highly Sensitive (3 points each)
  { field: 'macroinvertebrate_musslesnative', name: 'Mussels (Native)', points: 3, category: 'Highly Sensitive' },
  { field: 'macroinvertebrate_stoneflies', name: 'Stoneflies', points: 3, category: 'Highly Sensitive' },
  { field: 'macroinvertebrate_caddisfliescasebuilding', name: 'Caddisflies (Case-building)', points: 3, category: 'Highly Sensitive' },
  { field: 'macroinvertebrate_mayflies', name: 'Mayflies', points: 3, category: 'Highly Sensitive' },
  { field: 'macroinvertebrate_waterpennies', name: 'Water Pennies', points: 3, category: 'Highly Sensitive' },
  { field: 'macroinvertebrate_watersnipe', name: 'Water Snipe', points: 3, category: 'Highly Sensitive' },
  
  // Sensitive (3 points each)
  { field: 'macroinvertebrate_caddisfliesnetspinning', name: 'Caddisflies (Net-spinning)', points: 3, category: 'Sensitive' },
  { field: 'macroinvertebrate_rifflebeetles', name: 'Riffle Beetles', points: 3, category: 'Sensitive' },
  { field: 'macroinvertebrate_operculatesnails', name: 'Operculate Snails', points: 3, category: 'Sensitive' },
  { field: 'macroinvertebrate_blackflylarvae', name: 'Black Fly Larvae', points: 3, category: 'Sensitive' },
  { field: 'macroinvertebrate_craneflylarvae', name: 'Crane Fly Larvae', points: 3, category: 'Sensitive' },
  
  // Moderately Tolerant (2 points each)
  { field: 'macroinvertebrate_hellgrammites', name: 'Hellgrammites', points: 2, category: 'Moderately Tolerant' },
  { field: 'macroinvertebrate_clamsmusselsnonnative', name: 'Clams and Mussels (Non-native)', points: 2, category: 'Moderately Tolerant' },
  { field: 'macroinvertebrate_crayfish', name: 'Crayfish', points: 2, category: 'Moderately Tolerant' },
  { field: 'macroinvertebrate_dragonflies', name: 'Dragonflies', points: 2, category: 'Moderately Tolerant' },
  { field: 'macroinvertebrate_flatworms', name: 'Flatworms', points: 2, category: 'Moderately Tolerant' },
  { field: 'macroinvertebrate_midges', name: 'Midges', points: 2, category: 'Moderately Tolerant' },
  
  // Tolerant (1 point each)
  { field: 'macroinvertebrate_alderflies', name: 'Alderflies', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_scuds', name: 'Scuds', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_nonoperculatesnails', name: 'Non-operculate Snails', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_sowbugs', name: 'Sow Bugs', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_leeches', name: 'Leeches', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_damselflies', name: 'Damselflies', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_aquaticworms', name: 'Aquatic Worms', points: 1, category: 'Tolerant' },
  { field: 'macroinvertebrate_otheraquaticbeetles', name: 'Other Aquatic Beetles', points: 1, category: 'Tolerant' }
];

// Get found macroinvertebrates grouped by category
const foundMacroinvertebrates = computed(() => {
  if (!sampleData.value) return {};
  
  const categories = {};
  
  macroinvertebrates.forEach(macro => {
    if (sampleData.value[macro.field]) {
      if (!categories[macro.category]) {
        categories[macro.category] = [];
      }
      categories[macro.category].push(macro);
    }
  });
  
  return categories;
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
            Biological Assessment Details
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

        <!-- Biological Score Summary -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Biological Water Quality Score</h2>
          </template>
          <div class="text-center">
            <div class="mb-4">
              <span class="text-4xl font-bold" :class="getBiologicalScoreClass(sampleData.biological_water_quality_score)">
                {{ sampleData.biological_water_quality_score || 'Not calculated' }}
              </span>
            </div>
            <div class="text-xl font-semibold mb-2" :class="getBiologicalScoreClass(sampleData.biological_water_quality_score)">
              {{ getBiologicalScoreText(sampleData.biological_water_quality_score) }}
            </div>
            <div class="text-sm text-gray-600">
              <p>Score ranges: Poor (&lt;19), Marginal (19-32), Fair (33-41), Good (&gt;41)</p>
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

        <!-- Main Information Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Environmental Conditions -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Environmental Conditions</h2>
            </template>
            <div class="space-y-4">
              <div>
                <p class="font-medium">Weather/Flow Conditions</p>
                <p>{{ weatherflowConditions[sampleData.weather_flow] || sampleData.weather_flow || 'Not recorded' }}</p>
              </div>

              <div>
                <p class="font-medium">Habitat Zones Present</p>
                <div class="grid grid-cols-2 gap-2 mt-2">
                  <div class="flex items-center">
                    <UIcon 
                      :name="sampleData.habitatzone_riffle ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                      :class="sampleData.habitatzone_riffle ? 'text-green-500' : 'text-gray-400'"
                      class="mr-2"
                    />
                    Riffle
                  </div>
                  <div class="flex items-center">
                    <UIcon 
                      :name="sampleData.habitatzone_leafpacks ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                      :class="sampleData.habitatzone_leafpacks ? 'text-green-500' : 'text-gray-400'"
                      class="mr-2"
                    />
                    Leaf Packs
                  </div>
                  <div class="flex items-center">
                    <UIcon 
                      :name="sampleData.habitatzone_woodydebris ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                      :class="sampleData.habitatzone_woodydebris ? 'text-green-500' : 'text-gray-400'"
                      class="mr-2"
                    />
                    Woody Debris
                  </div>
                  <div class="flex items-center">
                    <UIcon 
                      :name="sampleData.habitatzone_pools ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                      :class="sampleData.habitatzone_pools ? 'text-green-500' : 'text-gray-400'"
                      class="mr-2"
                    />
                    Pools
                  </div>
                  <div class="flex items-center">
                    <UIcon 
                      :name="sampleData.habitatzone_undercutbanks ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                      :class="sampleData.habitatzone_undercutbanks ? 'text-green-500' : 'text-gray-400'"
                      class="mr-2"
                    />
                    Undercut Banks
                  </div>
                  <div class="flex items-center">
                    <UIcon 
                      :name="sampleData.habitatzone_submergedplants ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'" 
                      :class="sampleData.habitatzone_submergedplants ? 'text-green-500' : 'text-gray-400'"
                      class="mr-2"
                    />
                    Submerged Plants
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- Macroinvertebrates Found -->
          <UCard>
            <template #header>
              <h2 class="text-lg font-semibold">Macroinvertebrates Found</h2>
            </template>
            <div class="space-y-4">
              <div v-for="(organisms, category) in foundMacroinvertebrates" :key="category">
                <h3 class="font-medium" :class="{
                  'text-red-600': category === 'Highly Sensitive',
                  'text-orange-600': category === 'Sensitive',
                  'text-yellow-600': category === 'Moderately Tolerant',
                  'text-green-600': category === 'Tolerant'
                }">
                  {{ category }} ({{ organisms[0].points }} point{{ organisms[0].points > 1 ? 's' : '' }} each)
                </h3>
                <ul class="list-disc list-inside text-sm mt-1">
                  <li v-for="organism in organisms" :key="organism.field">
                    {{ organism.name }}
                  </li>
                </ul>
              </div>
              
              <div v-if="Object.keys(foundMacroinvertebrates).length === 0" class="text-gray-500">
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
            @click="navigateTo(`/portal/biological?edit=${sampleData.id}`)"
          >
            Edit Assessment
          </UButton>
        </div>
      </div>
    </template>
  </PageContainer>
</template>