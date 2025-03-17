<script setup>
import { ref, onMounted, computed } from 'vue';

const props = defineProps({
  userId: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  }
});

const loading = ref(true);
const error = ref(null);
const samplingData = ref(null);
const showDetails = ref(false);

// Create array of months
const months = [
  { name: 'January', abbr: 'Jan', key: 'jan' },
  { name: 'February', abbr: 'Feb', key: 'feb' },
  { name: 'March', abbr: 'Mar', key: 'mar' },
  { name: 'April', abbr: 'Apr', key: 'apr' },
  { name: 'May', abbr: 'May', key: 'may', highlight: true },
  { name: 'June', abbr: 'Jun', key: 'jun' },
  { name: 'July', abbr: 'Jul', key: 'jul', highlight: true },
  { name: 'August', abbr: 'Aug', key: 'aug' },
  { name: 'September', abbr: 'Sep', key: 'sep', highlight: true },
  { name: 'October', abbr: 'Oct', key: 'oct' },
  { name: 'November', abbr: 'Nov', key: 'nov' },
  { name: 'December', abbr: 'Dec', key: 'dec' }
];

// Calculate totals for the user
const totals = computed(() => {
  if (!samplingData.value) return { sites: 0, ecoli: 0 };
  
  return {
    sites: months.reduce((sum, month) => sum + (samplingData.value[`${month.key}_sites`] || 0), 0),
    ecoli: months.reduce((sum, month) => sum + (samplingData.value[`${month.key}_ecoli`] || 0), 0)
  };
});

// Monthly column styling - highlight certain months
const getMonthClass = (month) => {
  return {
    'bg-blue-50': month.highlight,
    'font-semibold': month.highlight
  };
};

// Fetch user's sampling intent data
const fetchSamplingData = async () => {
  if (!props.userId) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    // Query for this specific user's sampling intent for the current year
    const response = await useDirectus(readItems('sampling_intent', {
      filter: {
        _and: [
          { user_id: { _eq: props.userId } },
          { year: { _eq: props.year } }
        ]
      },
      limit: 1
    }));
    
    if (response && response.length > 0) {
      samplingData.value = response[0];
    } else {
      samplingData.value = null;
    }
  } catch (err) {
    console.error('Error fetching user sampling data:', err);
    error.value = 'Failed to load sampling plan';
  } finally {
    loading.value = false;
  }
};

// Load data when component is mounted
onMounted(() => {
  fetchSamplingData();
});

// Watch for changes in props
watch([() => props.userId, () => props.year], () => {
  fetchSamplingData();
});
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-2">
      <ULoadingIcon class="h-4 w-4" />
      <span class="ml-2 text-sm">Loading sampling plan...</span>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="text-sm text-red-500">
      {{ error }}
    </div>
    
    <!-- No data state -->
    <div v-else-if="!samplingData" class="text-sm text-gray-500">
      No sampling plan found for {{ props.year }}.
    </div>
    
    <!-- Data display -->
    <div v-else>
      <div class="flex items-center justify-between">
        <div class="text-sm text-gray-900 font-medium">
          <span>{{ props.year }} Sampling Plan:</span>
          <span class="ml-2 text-blue-600">{{ totals.sites }} Sites</span>
          <span class="ml-2 text-green-600">{{ totals.ecoli }} E. coli Cards</span>
        </div>
        <UButton
          size="xs"
          color="gray"
          variant="ghost"
          :icon="showDetails ? 'i-heroicons-minus-small' : 'i-heroicons-plus-small'"
          @click="showDetails = !showDetails"
        >
          {{ showDetails ? 'Hide Details' : 'Show Details' }}
        </UButton>
      </div>
      
      <!-- Detailed monthly breakdown -->
      <div v-if="showDetails" class="mt-2 overflow-x-auto">
        <table class="min-w-full border-collapse text-xs">
          <thead>
            <tr>
              <th class="p-1 border bg-gray-50"></th>
              <template v-for="month in months" :key="month.key">
                <th 
                  class="p-1 border text-center" 
                  :class="getMonthClass(month)"
                >
                  {{ month.abbr }}
                </th>
              </template>
            </tr>
          </thead>
          <tbody>
            <!-- Sites row -->
            <tr>
              <td class="p-1 border font-medium bg-gray-50">Sites</td>
              <template v-for="month in months" :key="`sites-${month.key}`">
                <td 
                  class="p-1 border text-center" 
                  :class="getMonthClass(month)"
                >
                  {{ samplingData[`${month.key}_sites`] || 0 }}
                </td>
              </template>
            </tr>
            
            <!-- E. coli cards row -->
            <tr>
              <td class="p-1 border font-medium bg-gray-50">E. coli</td>
              <template v-for="month in months" :key="`ecoli-${month.key}`">
                <td 
                  class="p-1 border text-center" 
                  :class="getMonthClass(month)"
                >
                  {{ samplingData[`${month.key}_ecoli`] || 0 }}
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>