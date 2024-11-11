<script setup lang="ts">
function useGreetings() {
  type Message = string;

  const messages: Message[] = [
    'We appreciate your sampling efforts and data contributions.',
  ];

  function getTodaysMessage(): Message {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const difference = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(difference / oneDay);
    const messageIndex = dayOfYear % messages.length;

    return messages[messageIndex];
  }

  return {
    getTodaysMessage,
  };
}

const { getTodaysMessage } = useGreetings();
const { user } = useDirectusAuth();

// Add sampling stats functionality
const loading = ref(true);
const error = ref(null);
const samplingStats = ref({
  totalSamples: 0,
  uniqueSites: [],
  latestSample: null,
  totalVolunteerMinutes: 0,
  totalVolunteers: {
    adults: 0,
    youth: 0
  },
  siteDetails: []
});

const formatDate = (date) => {
  if (!date) return 'Not recorded';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Fetch user's sampling data
onMounted(async () => {
  try {
    if (user.value?.id) {
      // Get user's samples - make sure we're using the complete API path
      const samples = await useDirectus(readItems('base_samples', {
        filter: {
          volunteer_id: { _eq: user.value.id }
        },
        sort: ['-date'],
        fields: [
          'id',
          'date',
          'wwky_id',
          'participants_adults',
          'participants_youth',
          'total_volunteer_minutes'
        ]
      }));

      if (samples?.length > 0) {
        samplingStats.value.totalSamples = samples.length;
        samplingStats.value.latestSample = samples[0];
        
        samplingStats.value.totalVolunteerMinutes = samples.reduce((acc, sample) => 
          acc + (sample.total_volunteer_minutes || 0), 0);
        
        samplingStats.value.totalVolunteers = samples.reduce((acc, sample) => ({
          adults: acc.adults + (sample.participants_adults || 0),
          youth: acc.youth + (sample.participants_youth || 0)
        }), { adults: 0, youth: 0 });

        const uniqueSiteIds = [...new Set(samples.map(sample => sample.wwky_id))];
        
		// When fetching site details, ensure complete API path
		const sites = await useDirectus(readItems('wwky_sites', {
          filter: {
            wwkyid_pk: { 
              _in: uniqueSiteIds.filter(id => id != null) // Add null check
            }
          },
          fields: [
            'wwkyid_pk',
            'stream_name',
            'wwkybasin',
            'description'
          ]
        }));

        samplingStats.value.siteDetails = sites;
        samplingStats.value.uniqueSites = sites;
      }
    }
  } catch (err) {
    error.value = 'Failed to load sampling information.';
    console.error('Dashboard load error:', err);
    console.log('Error route:', window.location.pathname);
    console.log('Error state:', {
      user: user.value,
      route: useRoute().path,
      fullUrl: window.location.href
    });
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <PageContainer>
    <img class="w-48 ml-auto mr-0" src="~/assets/KyWW_logo.png" />
    <TypographyTitle class="normal-case">{{ greetUser() }} {{ user?.first_name ?? 'friend' }},</TypographyTitle>
    <TypographyHeadline :content="getTodaysMessage()" size="xl" />
    <VDivider class="my-8" />
    
    <div class="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
      <!-- Loading State -->
      <div v-if="loading" class="col-span-2 text-center py-8">
        <ULoadingIcon />
        <p class="mt-2 text-gray-600">Loading sampling information...</p>
      </div>

      <!-- Error State -->
      <UAlert
        v-else-if="error"
        class="col-span-2"
        type="error"
        :title="error"
        icon="i-heroicons-exclamation-triangle"
      />

      <!-- Sampling Stats -->
      <template v-else>
        <!-- Summary Stats Card -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Sampling Activity</h2>
          </template>
          
          <div class="space-y-4">
            <div>
              <label class="text-sm text-gray-500">Total Samples</label>
              <p class="text-2xl font-bold text-blue-600">
                {{ samplingStats.totalSamples }}
              </p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Unique Sites</label>
              <p class="text-2xl font-bold text-green-600">
                {{ samplingStats.uniqueSites.length }}
              </p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Latest Sample</label>
              <p class="text-lg">
                {{ samplingStats.latestSample ? formatDate(samplingStats.latestSample.date) : 'No samples yet' }}
              </p>
            </div>
          </div>
        </UCard>

        <!-- Volunteer Stats Card -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Volunteer Impact</h2>
          </template>
          
          <div class="space-y-4">
            <div>
              <label class="text-sm text-gray-500">Total Hours</label>
              <p class="text-2xl font-bold text-purple-600">
                {{ Math.round(samplingStats.totalVolunteerMinutes / 60) }}
              </p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Participants</label>
              <div class="space-y-1">
                <p>Adults: {{ samplingStats.totalVolunteers.adults }}</p>
                <p>Youth: {{ samplingStats.totalVolunteers.youth }}</p>
              </div>
            </div>
          </div>
        </UCard>
      </template>
    </div>
  </PageContainer>
</template>