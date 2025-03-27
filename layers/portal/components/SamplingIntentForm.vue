<script setup>
import { ref, onMounted, computed } from 'vue';

const props = defineProps({
  userId: {
    type: String,
    required: true
  }
});

const loading = ref(false);
const saving = ref(false);
const error = ref(null);
const success = ref(false);
const toast = useToast();
const yearData = ref([]);
const currentYear = ref(new Date().getFullYear());

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

// Initialize empty data structure
const initializeYearData = () => {
  loading.value = true;
  
  try {
    const newYearData = {
      id: null, // Will be filled if existing record is found
      user_id: props.userId,
      year: currentYear.value,
      jan_sites: 0, feb_sites: 0, mar_sites: 0, apr_sites: 0,
      may_sites: 0, jun_sites: 0, jul_sites: 0, aug_sites: 0,
      sep_sites: 0, oct_sites: 0, nov_sites: 0, dec_sites: 0,
      jan_ecoli: 0, feb_ecoli: 0, mar_ecoli: 0, apr_ecoli: 0,
      may_ecoli: 0, jun_ecoli: 0, jul_ecoli: 0, aug_ecoli: 0,
      sep_ecoli: 0, oct_ecoli: 0, nov_ecoli: 0, dec_ecoli: 0
    };
    
    yearData.value = newYearData;
  } catch (err) {
    console.error('Error initializing year data', err);
    error.value = 'Failed to initialize sampling data.';
  } finally {
    loading.value = false;
  }
};

// Total counts for summary
const totalSites = computed(() => {
  return months.reduce((total, month) => {
    return total + (yearData.value[`${month.key}_sites`] || 0);
  }, 0);
});

const totalEcoli = computed(() => {
  return months.reduce((total, month) => {
    return total + (yearData.value[`${month.key}_ecoli`] || 0);
  }, 0);
});

// Load user's sampling intent data
const loadSamplingIntent = async () => {
  if (!props.userId) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    // Query the new sampling_intent table for the current user and year
    const response = await useDirectus(readItems('sampling_intent', {
      filter: {
        _and: [
          { user_id: { _eq: props.userId } },
          { year: { _eq: currentYear.value } }
        ]
      },
      limit: 1
    }));
    
    if (response && response.length > 0) {
      yearData.value = response[0];
    } else {
      // No existing data found, use the initialized empty data
      initializeYearData();
    }
  } catch (err) {
    console.error('Error loading sampling intent data', err);
    error.value = 'Failed to load your sampling plan data.';
    initializeYearData(); // Fallback to empty data
  } finally {
    loading.value = false;
  }
};

// Save the sampling intent data
const saveSamplingIntent = async () => {
  saving.value = true;
  error.value = null;
  success.value = false;
  
  try {
    let result;
    
    if (yearData.value.id) {
      // Update existing record
      result = await useDirectus(updateItem('sampling_intent', yearData.value.id, {
        ...yearData.value,
        user_id: props.userId,
        year: currentYear.value
      }));
    } else {
      // Create new record
      result = await useDirectus(createItem('sampling_intent', {
        ...yearData.value,
        user_id: props.userId,
        year: currentYear.value
      }));
      
      // Update the local data with the new ID
      if (result && result.id) {
        yearData.value.id = result.id;
      }
    }
    
    success.value = true;
    toast.add({
      title: 'Success',
      description: 'Your sampling plan has been saved.',
      color: 'green'
    });
  } catch (err) {
    console.error('Error saving sampling intent data', err);
    error.value = 'Failed to save your sampling plan. Please try again.';
    toast.add({
      title: 'Error',
      description: 'Failed to save your sampling plan. Please try again.',
      color: 'red'
    });
  } finally {
    saving.value = false;
  }
};

// Monthly column styling - highlight certain months
const getMonthClass = (month) => {
  return {
    'bg-orange-100': month.highlight,
    'font-semibold': month.highlight
  };
};

// Watch for year changes to reload data
watch(currentYear, () => {
  loadSamplingIntent();
});

// Load data when component is mounted
onMounted(() => {
  loadSamplingIntent();
});
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">Annual Sampling Plan ({{ currentYear }})</h2>
        <div class="flex space-x-2">
          <UButton
            color="gray"
            size="sm"
            icon="i-heroicons-arrow-left"
            :disabled="loading || saving"
            @click="currentYear--"
          />
          <UButton
            color="gray"
            size="sm"
            icon="i-heroicons-arrow-right"
            :disabled="loading || saving || currentYear >= new Date().getFullYear() + 1"
            @click="currentYear++"
          />
        </div>
      </div>
      <p class="text-sm text-gray-500 mt-1">
        Please indicate how many sites you plan to sample and how many E.coli cards you'll need each month (3 cards/site).
        <span class="font-medium">Major sampling months (May, July, September) are highlighted in orange.</span>
      </p>
    </template>
    
    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-4">
      <ULoadingIcon />
      <span class="ml-2">Loading your sampling plan...</span>
    </div>
    
    <!-- Error state -->
    <UAlert
      v-if="error"
      type="error"
      :title="error"
      class="mb-4"
    />
    
    <!-- Success message -->
    <UAlert
      v-if="success"
      type="success"
      title="Sampling plan saved successfully"
      class="mb-4"
    />
    
    <!-- Sampling intent form -->
    <div v-if="!loading" class="overflow-x-auto">
      <table class="min-w-full border-collapse">
        <thead>
          <tr>
            <th class="p-2 border bg-gray-50"></th>
            <template v-for="month in months" :key="month.key">
              <th 
                class="p-2 border text-center" 
                :class="getMonthClass(month)"
              >
                {{ month.abbr }}
              </th>
            </template>
            <th class="p-2 border bg-gray-50 text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          <!-- Sites row -->
          <tr>
            <td class="p-2 border font-medium bg-gray-50">Sites to Sample</td>
            <template v-for="month in months" :key="`sites-${month.key}`">
              <td class="p-1 border" :class="getMonthClass(month)">
                <UInput
                  v-model.number="yearData[`${month.key}_sites`]"
                  type="number"
                  min="0"
                  size="sm"
                  class="w-16 text-center"
                  :disabled="saving"
                />
              </td>
            </template>
            <td class="p-2 border text-center font-bold bg-gray-50">
              {{ totalSites }}
            </td>
          </tr>
          
          <!-- E. coli cards row -->
          <tr>
            <td nowrap class="p-2 border font-medium bg-gray-50">E.coli Cards Needed<br><span class="text-sm">(3 cards/site)</span></td>
            <template v-for="month in months" :key="`ecoli-${month.key}`">
              <td class="p-1 border" :class="getMonthClass(month)">
                <UInput
                  v-model.number="yearData[`${month.key}_ecoli`]"
                  type="number"
                  min="0"
                  size="sm"
                  class="w-16 text-center"
                  :disabled="saving"
                />
              </td>
            </template>
            <td class="p-2 border text-center font-bold bg-gray-50">
              {{ totalEcoli }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Form actions -->
    <div class="flex justify-end mt-4">
      <UButton
        color="primary"
        :loading="saving"
        :disabled="loading"
        @click="saveSamplingIntent"
      >
        Save Sampling Plan
      </UButton>
    </div>
  </UCard>
</template>