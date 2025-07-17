<script setup>
import { ref, onMounted, computed, watch } from 'vue';

const props = defineProps({
  userIds: {
    type: Array,
    default: () => []
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  }
});

const emit = defineEmits(['update:count']);

const loading = ref(true);
const error = ref(null);
const samplingData = ref([]);
const currentYear = ref(props.year);

// NEW: Keep track of unique users with plans
const uniqueUsersWithPlans = computed(() => {
  const uniqueUserIds = new Set(samplingData.value.map(data => data.user_id.id));
  return uniqueUserIds.size;
});

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

// Calculate monthly totals
const monthlyTotals = computed(() => {
  const totals = {
    sites: {},
    ecoli: {}
  };
  
  // Initialize totals for each month
  months.forEach(month => {
    totals.sites[month.key] = 0;
    totals.ecoli[month.key] = 0;
  });
  
  // Sum up the values for each month
  samplingData.value.forEach(userData => {
    months.forEach(month => {
      totals.sites[month.key] += userData[`${month.key}_sites`] || 0;
      totals.ecoli[month.key] += userData[`${month.key}_ecoli`] || 0;
    });
  });
  
  return totals;
});

// Calculate grand totals
const grandTotals = computed(() => {
  return {
    sites: Object.values(monthlyTotals.value.sites).reduce((sum, val) => sum + val, 0),
    ecoli: Object.values(monthlyTotals.value.ecoli).reduce((sum, val) => sum + val, 0)
  };
});

// Monthly column styling - highlight certain months
const getMonthClass = (month) => {
  return {
    'bg-orange-100': month.highlight,
    'font-semibold': month.highlight
  };
};

// Chart data for visualization
const chartData = computed(() => {
  return months.map(month => ({
    name: month.abbr,
    sites: monthlyTotals.value.sites[month.key] || 0,
    ecoli: monthlyTotals.value.ecoli[month.key] || 0,
    highlight: month.highlight
  }));
});

// Fetch sampling intent data
const fetchSamplingData = async () => {
  if (!props.userIds.length) {
    samplingData.value = [];
    loading.value = false;
    
    // Emit the count update
    emit('update:count', 0);
    return;
  }

  loading.value = true;
  error.value = null;
  
  try {
    // Build a filter for user_id and year
    const filter = {
      _and: [
        { year: { _eq: currentYear.value } }
      ]
    };
    
    // Add user_id filter only if we have specific userIds
    if (props.userIds.length > 0) {
      filter._and.push({
        user_id: { _in: props.userIds }
      });
    }
    
    // Get all sampling intent records for the current year and filtered users
    const response = await useDirectus(readItems('sampling_intent', {
      filter,
      fields: ['*', {
        user_id: ['id', 'first_name', 'last_name']
      }],
      limit: -1// Fetch all records without limit
    }));
    
    samplingData.value = response;
    
    // Emit the count update after data is fetched
    emit('update:count', uniqueUsersWithPlans.value);
  } catch (err) {
    console.error('Error fetching sampling intent data:', err);
    error.value = 'Failed to load sampling data';
    
    // Emit zero count on error
    emit('update:count', 0);
  } finally {
    loading.value = false;
  }
};

// Load data when component is mounted
onMounted(() => {
  fetchSamplingData();
});

// Watch for changes in props
watch([() => props.userIds, () => props.year], () => {
  currentYear.value = props.year;
  fetchSamplingData();
}, { deep: true });

// Watch for changes in uniqueUsersWithPlans
watch(uniqueUsersWithPlans, (newCount) => {
  emit('update:count', newCount);
});
</script>

<template>
  <div>
    <!-- Loading state -->
    <div v-if="loading" class="flex justify-center py-4">
      <ULoadingIcon />
      <span class="ml-2">Loading sampling plan summary...</span>
    </div>
    
    <!-- Error state -->
    <UAlert
      v-if="error"
      type="error"
      :title="error"
      class="mb-4"
    />
    
    <!-- No data state -->
    <div v-else-if="samplingData.length === 0" class="py-2 text-gray-600 text-center">
      No sampling plans found for the selected users in {{ currentYear }}.
    </div>
    
    <!-- Data visualization -->
    <div v-else>
      <!-- Summary totals banner -->
      <div class="bg-gray-50 p-4 rounded-md mb-4 grid grid-cols-3 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{{ grandTotals.sites }}</div>
          <div class="text-sm text-gray-600">Total Sites</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{{ grandTotals.ecoli }}</div>
          <div class="text-sm text-gray-600">Total E. coli Cards</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{{ uniqueUsersWithPlans }}</div>
          <div class="text-sm text-gray-600">Samplers with Plans</div>
        </div>
      </div>
      
      <!-- Monthly data table -->
      <div class="overflow-x-auto mb-4">
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
              <td class="p-2 border font-medium bg-gray-50">Sites</td>
              <template v-for="month in months" :key="`sites-${month.key}`">
                <td 
                  class="p-2 border text-center" 
                  :class="getMonthClass(month)"
                >
                  {{ monthlyTotals.sites[month.key] }}
                </td>
              </template>
              <td class="p-2 border text-center font-bold bg-gray-50">
                {{ grandTotals.sites }}
              </td>
            </tr>
            
            <!-- E. coli cards row -->
            <tr>
              <td nowrap class="p-2 border font-medium bg-gray-50">E. coli Cards</td>
              <template v-for="month in months" :key="`ecoli-${month.key}`">
                <td 
                  class="p-2 border text-center" 
                  :class="getMonthClass(month)"
                >
                  {{ monthlyTotals.ecoli[month.key] }}
                </td>
              </template>
              <td class="p-2 border text-center font-bold bg-gray-50">
                {{ grandTotals.ecoli }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- User submission stats -->
      <div class="text-sm text-gray-600 text-center mt-2">
        {{ uniqueUsersWithPlans }} samplers have submitted plans for {{ currentYear }}
      </div>
    </div>
  </div>
</template>