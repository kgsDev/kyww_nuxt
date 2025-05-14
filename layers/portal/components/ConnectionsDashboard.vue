<script setup>
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

const connections = ref([]);
const isLoading = ref(true);
const error = ref(null);
const stats = ref({
  totalConnections: 0,
  activeUsers: 0,
  mostActiveHub: null,
  connectionsByMonth: {},
  connectionsByHub: {},
  topConnectors: []
});

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Monthly connections chart options
const monthlyChartOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: 250,
    toolbar: {
      show: false
    }
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 4
    }
  },
  dataLabels: {
    enabled: false
  },
  colors: ['#4F46E5'],
  xaxis: {
    categories: months.map(month => month.substring(0, 3))
  },
  yaxis: {
    title: {
      text: 'Connections'
    }
  },
  title: {
    text: 'Connections by Month',
    align: 'left',
    style: {
      fontSize: '16px',
      fontWeight: 'bold'
    }
  },
  tooltip: {
    y: {
      formatter: (val) => val
    }
  }
}));

// Monthly connections chart series
const monthlyChartSeries = computed(() => {
  const data = months.map((month, index) => stats.value.connectionsByMonth[index] || 0);
  return [
    {
      name: 'Connections',
      data
    }
  ];
});

// Hub connections chart options
const hubChartOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: 250,
    toolbar: {
      show: false
    }
  },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4
    }
  },
  dataLabels: {
    enabled: false
  },
  colors: ['#3B82F6'],
  xaxis: {
    categories: hubChartSeries.value[0].data.map(item => item.x),
    title: {
      text: 'Connections'
    }
  },
  title: {
    text: 'Top Hubs by Connections',
    align: 'left',
    style: {
      fontSize: '16px',
      fontWeight: 'bold'
    }
  },
  tooltip: {
    y: {
      title: {
        formatter: (seriesName) => ''
      }
    }
  }
}));

// Hub connections chart series
const hubChartSeries = computed(() => {
  const hubData = Object.entries(stats.value.connectionsByHub || {})
    .map(([hub, count]) => ({
      x: hub || 'Unknown',
      y: count
    }))
    .sort((a, b) => b.y - a.y)
    .slice(0, 5); // Top 5 hubs
  
  return [
    {
      name: 'Connections',
      data: hubData
    }
  ];
});

const fetchConnections = async () => {
  if (!props.userIds.length) return;
  
  isLoading.value = true;
  error.value = null;
  connections.value = []; // Clear existing connections
  
  try {
    const startDate = new Date(props.year, 0, 1);
    const endDate = new Date(props.year, 11, 31, 23, 59, 59);
    
    // Determine whether to use batching based on number of user IDs
    const BATCH_SIZE = 20; // Adjust as needed
    
    // If we have lots of users, use batching
    if (props.userIds.length > BATCH_SIZE) {
      // Split userIds into smaller batches
      const batches = [];
      for (let i = 0; i < props.userIds.length; i += BATCH_SIZE) {
        batches.push(props.userIds.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`Processing ${props.userIds.length} users in ${batches.length} batches of max ${BATCH_SIZE}`);
      
      // Process each batch sequentially to avoid overwhelming the server
      for (let i = 0; i < batches.length; i++) {
        const batchUserIds = batches[i];
        
        // Fetch connections for this batch
        const batchResponse = await fetchConnectionsBatch(batchUserIds, startDate, endDate);
        
        // Add to our overall connections array
        connections.value = [...connections.value, ...batchResponse];
        
        console.log(`Batch ${i+1}/${batches.length} completed, found ${batchResponse.length} connections`);
      }
    } else {
      // For smaller user lists, just use the original approach
      const response = await fetchConnectionsBatch(props.userIds, startDate, endDate);
      connections.value = response;
    }
    
    // Calculate statistics
    calculateStats();
  } catch (err) {
    console.error('Error fetching connections:', err);
    error.value = 'Failed to load connection data. The request may be too large.';
  } finally {
    isLoading.value = false;
  }
};

// Helper function to fetch a batch of connections
const fetchConnectionsBatch = async (userIdsBatch, startDate, endDate) => {
  const response = await useDirectus(
    readItems('sampler_connections', {
      filter: {
        _and: [
          {
            _or: [
              { requesting_user_id: { _in: userIdsBatch } },
              { samplerid: { _in: userIdsBatch } }
            ]
          },
          {
            date_created: {
              _between: [startDate.toISOString(), endDate.toISOString()]
            }
          }
        ]
      },
      fields: [
        '*', 
        'requesting_user_id.id', 
        'requesting_user_id.first_name', 
        'requesting_user_id.last_name',
        'requesting_user_id.sampler_data.hub_id.Description',
        'samplerid.first_name',
        'samplerid.last_name',
        'wwkyid.wwkyid_pk',
        'wwkyid.stream_name'
      ],
      sort: ['-date_created']
    })
  );
  
  return response || [];
};

const calculateStats = () => {
  const connectionsByMonth = {};
  const connectionsByHub = {};
  const userConnectionCounts = {};
  const activeUsers = new Set();
  
  connections.value.forEach(conn => {
    // Count by month
    const date = new Date(conn.date_created);
    const month = date.getMonth();
    connectionsByMonth[month] = (connectionsByMonth[month] || 0) + 1;
    
    // Count by hub
    const hubName = conn.requesting_user_id?.sampler_data?.hub_id?.Description || 'Unknown';
    connectionsByHub[hubName] = (connectionsByHub[hubName] || 0) + 1;
    
    // Track active users
    const requestingUserId = conn.requesting_user_id?.id;
    if (requestingUserId) {
      activeUsers.add(requestingUserId);
      userConnectionCounts[requestingUserId] = (userConnectionCounts[requestingUserId] || 0) + 1;
    }
    if (conn.samplerid) {
      activeUsers.add(conn.samplerid);
    }
  });
  
  // Find most active hub
  let mostActiveHub = { name: 'None', count: 0 };
  Object.entries(connectionsByHub).forEach(([hub, count]) => {
    if (count > mostActiveHub.count) {
      mostActiveHub = { name: hub, count };
    }
  });
  
  // Find top connectors
  const topConnectors = Object.entries(userConnectionCounts)
    .map(([userId, count]) => {
      const user = connections.value.find(conn => conn.requesting_user_id?.id === userId)?.requesting_user_id;
      return {
        id: userId,
        name: user ? `${user.first_name} ${user.last_name}` : 'Unknown User',
        count
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  stats.value = {
    totalConnections: connections.value.length,
    activeUsers: activeUsers.size,
    mostActiveHub,
    connectionsByMonth,
    connectionsByHub,
    topConnectors
  };
};

// Format dates
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Watch for changes in userIds or year
watch([() => props.userIds, () => props.year], () => {
  fetchConnections();
}, { immediate: true });
</script>

<template>
  <div class="space-y-6">
    <div v-if="isLoading" class="py-8 flex justify-center">
      <ULoadingIcon />
      <span class="ml-2">Loading connection data...</span>
    </div>
    
    <UAlert v-else-if="error" type="error" :title="error" />
    
    <div v-else-if="!connections.length" class="py-6 text-center">
      <UIcon name="i-heroicons-user-group" class="text-gray-400 mx-auto mb-3" size="36" />
      <p class="text-gray-600">No connections found for {{ year }}.</p>
      <p class="mt-2 text-sm text-gray-500">Encourage your samplers to reach out and collaborate with each other.</p>
    </div>
    
    <div v-else>
      <!-- Stats Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UCard class="bg-white">
          <div class="text-center py-2">
            <div class="text-3xl font-bold text-primary-600">{{ stats.totalConnections }}</div>
            <div class="text-sm text-gray-600">Total Connections</div>
          </div>
        </UCard>
        
        <UCard class="bg-white">
          <div class="text-center py-2">
            <div class="text-3xl font-bold text-primary-600">{{ stats.activeUsers }}</div>
            <div class="text-sm text-gray-600">Active Participants</div>
          </div>
        </UCard>
      </div>
      
      <!-- Charts -->
      <div class="grid grid-cols-1 md:grid-cols-1 gap-6">
        <!-- Monthly Connections Chart -->
        <UCard>
          <div class="h-64">
            <apexchart 
              type="bar" 
              height="100%" 
              :options="monthlyChartOptions" 
              :series="monthlyChartSeries"
            ></apexchart>
          </div>
        </UCard>
      </div>
      
      <!-- Top Connectors & Recent Connections -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Top Connectors -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Top Connectors</h3>
          </template>
          
          <div class="space-y-2">
            <div v-for="(user, index) in stats.topConnectors" :key="user.id" 
                 class="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div class="flex items-center">
                <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full">
                  {{ index + 1 }}
                </div>
                <div class="ml-3">
                  <p class="font-medium">{{ user.name }}</p>
                </div>
              </div>
              <div class="font-semibold">{{ user.count }} connections</div>
            </div>
          </div>
        </UCard>
        
        <!-- Recent Connections -->
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">Recent Connections</h3>
          </template>
          
          <div class="space-y-3">
            <div v-for="conn in connections.slice(0, 5)" :key="conn.id" 
                 class="p-2 border-l-4 border-blue-400 bg-gray-50 rounded-r-lg">
              <div class="flex justify-between">
                <div>
                  <p class="font-medium">
                    {{ conn.requesting_user_id ? `${conn.requesting_user_id.first_name} ${conn.requesting_user_id.last_name}` : 'Unknown' }} 
                    <span class="text-gray-500">→</span> 
                    {{ conn.samplerid ? `${conn.samplerid.first_name} ${conn.samplerid.last_name}` : 'Unknown' }} 
                  </p>
                  <p class="text-sm text-gray-600">
                    {{ conn.wwkyid?.wwkyid_pk ? `Site ${conn.wwkyid.wwkyid_pk}` : 'Unknown site' }}
                    {{ conn.wwkyid?.stream_name ? `(${conn.wwkyid.stream_name})` : '' }}
                  </p>
                </div>
                <div class="text-xs text-gray-500">
                  {{ formatDate(conn.date_created) }}
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>