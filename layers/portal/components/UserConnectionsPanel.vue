<script setup>
const props = defineProps({
  userId: {
    type: String,
    required: true
  }
});

const connections = ref([]);
const isLoading = ref(true);
const error = ref(null);
const toast = useToast();
const showConnectionsPanel = ref(true);

// Fetch user's connections
const fetchUserConnections = async () => {
  isLoading.value = true;
  error.value = null;
  
  try {
    // Fetch outgoing connections (ones the user initiated)
    const outgoingResponse = await useDirectus(
      readItems('sampler_connections', {
        filter: {
          requesting_user_id: { _eq: props.userId }
        },
        fields: [
          '*',
          'samplerid.last_name',
          'samplerid.first_name',
          'wwkyid.wwkyid_pk',
          'wwkyid.stream_name'
        ],
        sort: ['-date_created']
      })
    );
    
    // Fetch incoming connections (where others contacted this user)
    const incomingResponse = await useDirectus(
      readItems('sampler_connections', {
        filter: {
          samplerid: { _eq: props.userId }
        },
        fields: [
          '*',
          'requesting_user_id.first_name',
          'requesting_user_id.last_name',
          'wwkyid.wwkyid_pk',
          'wwkyid.stream_name'
        ],
        sort: ['-date_created']
      })
    );
    
    // Process outgoing connections to add metadata
    const processedOutgoing = outgoingResponse.map(conn => {
      return {
        ...conn,
        direction: 'outgoing',
        // Add any additional properties for display
        displayName: conn.samplerid?.first_name + ' ' + conn.samplerid?.last_name || 'Unknown sampler',
        siteDisplay: `Site ${conn.wwkyid?.wwkyid_pk || '?'}${conn.wwkyid?.stream_name ? ` (${conn.wwkyid.stream_name})` : ''}`
      };
    });
    
    // Process incoming connections to add metadata
    const processedIncoming = incomingResponse.map(conn => {
      return {
        ...conn,
        direction: 'incoming',
        // Add any additional properties for display
        displayName: conn.requesting_user_id ? 
          `${conn.requesting_user_id.first_name} ${conn.requesting_user_id.last_name}` : 
          'Unknown user',
        siteDisplay: `Site ${conn.site_id?.wwkyid_pk || '?'}${conn.site_id?.stream_name ? ` (${conn.site_id.stream_name})` : ''}`
      };
    });
    
    // Combine and sort by date
    connections.value = [
      ...processedOutgoing,
      ...processedIncoming
    ].sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
    
  } catch (err) {
    console.error('Error fetching connections:', err);
    error.value = 'Failed to load connection data';
    toast.add({
      title: 'Error',
      description: 'Failed to load your connection history',
      color: 'red'
    });
  } finally {
    isLoading.value = false;
  }
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// When the userId changes, fetch the connections
watch(() => props.userId, (newValue) => {
  if (newValue) {
    fetchUserConnections();
  }
}, { immediate: true });
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold">Sampler Connections</h2>
        <UButton 
          v-if="connections.length > 0"
          size="xs" 
          icon="i-heroicons-arrow-path" 
          variant="ghost"
          @click="fetchUserConnections"
          :loading="isLoading"
        >
          Refresh
        </UButton>
      </div>
    </template>
    
    <!-- Loading state -->
    <div v-if="isLoading" class="py-8 flex justify-center">
      <ULoadingIcon />
      <span class="ml-2">Loading your connections...</span>
    </div>
    
    <!-- Error state -->
    <UAlert v-else-if="error" type="error" :title="error" />
    
    <!-- Empty state -->
    <div v-else-if="connections.length === 0" class="py-6 text-center">
      <UIcon name="i-heroicons-user-group" class="text-gray-400 mx-auto mb-3" size="36" />
      <p class="text-gray-600">You haven't connected with any other samplers yet.</p>
      <p class="mt-2 text-sm text-gray-500">Visit site pages and click "Connect" to reach out to other samplers.</p>
    </div>
    
    <!-- Connections list -->
    <div v-else>
      <ul class="divide-y divide-gray-200">
        <li v-for="connection in connections" :key="connection.id" class="py-4">
          <div class="flex items-start justify-between">
            <div class="flex items-start space-x-2">
              <!-- Direction indicator -->
              <div class="mt-1">
                <UIcon
                  v-if="connection.direction === 'outgoing'"
                  name="i-heroicons-paper-airplane"
                  class="text-blue-500"
                  size="18"
                />
                <UIcon
                  v-else
                  name="i-heroicons-envelope"
                  class="text-green-500"
                  size="18"
                />
              </div>
              
              <!-- Connection details -->
              <div>
                <p class="font-medium">
                  {{ connection.direction === 'outgoing' 
                    ? `You reached out to ${connection.displayName}` 
                    : `${connection.displayName} contacted you` }}
                </p>
                <p class="text-sm text-gray-600">
                  {{ connection.siteDisplay }}
                </p>
                <p class="text-xs text-gray-500 mt-1">{{ formatDate(connection.date_created) }}</p>
              </div>
            </div>
            
            <!-- Status badge -->
            <UBadge :color="connection.status === 'sent' ? 'blue' : 'green'">
              {{ connection.status }}
            </UBadge>
          </div>
          
          <!-- Message preview -->
          <div v-if="connection.message" class="mt-2 text-sm text-gray-700 border-l-4 border-gray-200 pl-3 ml-7">
            <p class="line-clamp-2">{{ connection.message }}</p>
          </div>
        </li>
      </ul>
    </div>
  </UCard>
</template>