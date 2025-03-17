<script setup>
import BarChart from '~/components/BarChart.vue';
import { ref, onMounted, computed } from 'vue';

const props = defineProps({
  yearFilter: {
    type: Number,
    default: () => new Date().getFullYear()
  },
  hubFilter: {
    type: String,
    default: null
  }
});

const samplingData = ref([]);
const loading = ref(true);
const error = ref(null);
const currentYear = ref(props.yearFilter);
const selectedHub = ref(props.hubFilter);
const hubs = ref([]);

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

// Fetch hubs for filtering
const fetchHubs = async () => {
  try {
    const response = await useDirectus(readItems('wwky_hubs', {
      sort: ['Description'],
      fields: ['hub_id', 'Basin', 'Description']
    }));
    
    hubs.value = [
      { hub_id: null, Basin: 'All', Description: 'Hubs', value: null }
    ].concat(response.map(hub => ({
      ...hub,
      value: hub.hub_id,
      label: `${hub.Basin} - ${hub.Description}`
    })));
  } catch (err) {
    console.error('Error fetching hubs:', err);
  }
};

// Fetch sampling intent data for all users
const fetchSamplingData = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // Construct the filter
    const filter = {
      year: { _eq: currentYear.value }
    };
    
    // Get all sampling intent records for the year
    const samplingIntent = await useDirectus(readItems('sampling_intent', {
      filter,
      fields: ['*', {
        user_id: ['id', 'first_name', 'last_name']
      }]
    }));
    
    // If a hub is selected, we need to filter users by hub
    if (selectedHub.value) {
      // Get sampler data to filter by hub
      const samplerData = await useDirectus(readItems('sampler_data', {
        filter: {
          hub_id: { _eq: selectedHub.value }
        },
        fields: ['user_id']
      }));
      
      // Create a set of user IDs from the selected hub
      const hubUserIds = new Set(samplerData.map(sampler => sampler.user_id));
      
      // Filter the sampling intent data to only include users from the selected hub
      samplingData.value = samplingIntent.filter(item => 
        hubUserIds.has(item.user_id.id)
      );
    } else {
      // No hub filter, use all sampling intent data
      samplingData.value = samplingIntent;
    }
  } catch (err) {
    console.error('Error fetching sampling data:', err);
    error.value = 'Failed to load sampling intention data.';
  } finally {
    loading.value = false;
  }
};

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
    'bg-blue-50': month.highlight,
    'font-semibold': month.highlight
  };
};

// Handle year change
const changeYear = (newYear) => {
  currentYear.value = newYear;
  fetchSamplingData();
};

// Handle hub change
const changeHub = (newHub) => {
  selectedHub.value = newHub;
  fetchSamplingData();
};

// Get hub display name
const getHubName = computed(() => {
  if (!selectedHub.value) return 'All Hubs';
  
  const hub = hubs.value.find(h => h.hub_id === selectedHub.value);
  return hub ? `${hub.Basin} - ${hub.Description}` : 'Unknown Hub';
});

// Chart data for visualization
const chartData = computed(() => {
  return months.map(month => ({
    name: month.abbr,
    sites: monthlyTotals.value.sites[month.key] || 0,
    ecoli: monthlyTotals.value.ecoli[month.key] || 0,
    highlight: month.highlight
  }));
});

// Load data when component is mounted
onMounted(async () => {
  await fetchHubs();
  await fetchSamplingData();
});

// Watch for prop changes
watch(() => props.yearFilter, (newYear) => {
  if (newYear !== currentYear.value) {
    currentYear.value = newYear;
    fetchSamplingData();
  }
});

watch(() => props.hubFilter, (newHub) => {
  if (newHub !== selectedHub.value) {
    selectedHub.value = newHub;
    fetchSamplingData();
  }
});
</script>

<template>
  <div>
    <UCard>
      <template #header>
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 class="text-lg font-semibold">Sampling Intentions Dashboard ({{ currentYear }})</h2>
            <p class="text-sm text-gray-500">
              {{ samplingData.length }} users have submitted their sampling plans
            </p>
          </div>
          
          <div class="flex flex-wrap gap-2">
            <!-- Year selection -->
            <UButtonGroup>
              <UButton
                size="sm"
                :color="currentYear === currentYear - 1 ? 'primary' : 'gray'"
                @click="changeYear(currentYear - 1)"
              >
                {{ currentYear - 1 }}
              </UButton>
              <UButton
                size="sm"
                :color="currentYear === currentYear ? 'primary' : 'gray'"
                @click="changeYear(currentYear)"
              >
                {{ currentYear }}
              </UButton>
              <UButton
                size="sm"
                :color="currentYear === currentYear + 1 ? 'primary' : 'gray'"
                :disabled="currentYear + 1 > new Date().getFullYear() + 1"
                @click="changeYear(currentYear + 1)"
              >
                {{ currentYear + 1 }}
              </UButton>
            </UButtonGroup>
            
            <!-- Hub selection -->
            <USelect
              v-model="selectedHub"
              :options="hubs"
              size="sm"
              placeholder="Select hub"
              @update:modelValue="changeHub"
              class="w-64"
            >
              <template #option="{ option }">
                {{ option.Basin }} - {{ option.Description }}
              </template>
              <template #selected-option="{ option }">
                {{ option.Basin }} - {{ option.Description }}
              </template>
            </USelect>
          </div>
        </div>
      </template>
      
      <!-- Loading state -->
      <div v-if="loading" class="flex justify-center py-8">
        <ULoadingIcon />
        <span class="ml-2">Loading sampling data...</span>
      </div>
      
      <!-- Error state -->
      <UAlert
        v-else-if="error"
        type="error"
        :title="error"
        class="mb-4"
      />
      
      <!-- No data state -->
      <div v-else-if="samplingData.length === 0" class="py-8 text-center">
        <UIcon name="i-heroicons-information-circle" class="text-4xl text-gray-400 mb-2" />
        <p class="text-gray-600">No sampling plans found for {{ getHubName }} in {{ currentYear }}.</p>
      </div>
      
      <!-- Data visualization -->
      <div v-else>
        <!-- Summary totals banner -->
        <div class="bg-gray-50 p-4 rounded-md mb-6 grid grid-cols-2 gap-4">
          <div class="text-center">
            <div class="text-3xl font-bold text-blue-600">{{ grandTotals.sites }}</div>
            <div class="text-sm text-gray-600">Total Sampling Sites</div>
          </div>
          <div class="text-center">
            <div class="text-3xl font-bold text-green-600">{{ grandTotals.ecoli }}</div>
            <div class="text-sm text-gray-600">Total E. coli Cards</div>
          </div>
        </div>
        
        <!-- Monthly data table -->
        <div class="overflow-x-auto mb-6">
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
                <td class="p-2 border font-medium bg-gray-50">E. coli Cards</td>
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
        
        <!-- Bar chart visualization -->
        <div class="h-80">
          <UCard>
            <template #header>
              <h3 class="text-md font-semibold">Monthly Distribution</h3>
            </template>
            
            <div class="h-64">
              <BarChart
                :data="chartData"
                x-axis-key="name"
                :y-axis-series="[
                  { key: 'sites', name: 'Sites', color: 'blue' },
                  { key: 'ecoli', name: 'E.coli Cards', color: 'green' }
                ]"
              />
            </div>
          </UCard>
        </div>
        
        <!-- Individual users table -->
        <UCard class="mt-6">
          <template #header>
            <h3 class="text-md font-semibold">Individual Sampler Plans</h3>
          </template>
          
          <UTable
            :columns="[
              { key: 'name', label: 'Sampler Name' },
              { key: 'total_sites', label: 'Total Sites' },
              { key: 'total_ecoli', label: 'Total E.coli Cards' },
              { key: 'actions', label: 'Actions' }
            ]"
            :rows="samplingData.map(data => {
              // Calculate totals for this user
              const totalSites = months.reduce((sum, month) => sum + (data[`${month.key}_sites`] || 0), 0);
              const totalEcoli = months.reduce((sum, month) => sum + (data[`${month.key}_ecoli`] || 0), 0);
              
              return {
                id: data.id,
                name: `${data.user_id.first_name} ${data.user_id.last_name}`,
                total_sites: totalSites,
                total_ecoli: totalEcoli,
                user_id: data.user_id.id
              };
            })"
          >
            <template #actions-data="{ row }">
              <UButton
                color="gray"
                size="xs"
                icon="i-heroicons-eye"
                :to="`/portal/admin/users/${row.user_id}`"
              >
                View Profile
              </UButton>
            </template>
          </UTable>
        </UCard>
      </div>
    </UCard>
  </div>
</template>

<style scoped>
/* Custom styling for the BarChart component */
:deep(.bar-chart-highlight) {
  fill-opacity: 0.2;
  stroke-dasharray: 4;
}
</style>