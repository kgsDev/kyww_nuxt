<template>
  <div>
    <PortalPageHeader
      title="Training Report"
      :breadcrumbs="[
        { title: 'Portal', href: '/portal' },
        { title: 'Trainer', href: '/portal/train' },
        { title: 'Report' }
      ]"
    />

    <div class="space-y-6 p-6">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <ULoadingIcon />
        <p class="mt-2 text-gray-600">Loading training data...</p>
      </div>

      <!-- Error State -->
      <UAlert
        v-else-if="error"
        type="error"
        :title="error"
        icon="i-heroicons-exclamation-triangle"
      />

      <template v-else>
        <!-- Summary Stats Card -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Training Summary</h2>
          </template>
          
          <div class="grid md:grid-cols-3 gap-6">
            <div>
              <label class="text-sm text-gray-500">Total Invites Sent</label>
              <p class="text-2xl font-bold">{{ stats.totalInvites }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Completed Signups</label>
              <p class="text-2xl font-bold text-green-600">{{ stats.completedSignups }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Pending Invites</label>
              <p class="text-2xl font-bold text-yellow-600">{{ stats.pendingInvites }}</p>
            </div>
          </div>
        </UCard>

        <!-- Pending Invites Card -->
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-semibold">Pending Invites</h2>
              <UInput
                v-model="inviteSearch"
                placeholder="Search invites..."
                class="w-64"
              />
            </div>
          </template>

          <UTable :columns="inviteColumns" :rows="filteredInvites" :loading="loading">
            <template #invite_sent_at-data="{ row }">
              {{ formatDateTime(row.invite_sent_at) }}
            </template>
            <template #training_date-data="{ row }">
              {{ formatDateTime(row.training_date) }}
            </template>
            <template #status-data="{ row }">
              <UBadge :color="row.status === 'completed' ? 'green' : 'yellow'">
                {{ row.status }}
              </UBadge>
            </template>
          </UTable>
        </UCard>

        <!-- Registered Users Card -->
        <UCard class="mt-6">
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-semibold">Registered Users</h2>
              <UInput
                v-model="userSearch"
                placeholder="Search users..."
                class="w-64"
              />
            </div>
          </template>

          <UTable :columns="registeredColumns" :rows="filteredUsers" :loading="loading">
            <template #display_name-data="{ row }">
              {{ row.first_name }} {{ row.last_name }}
            </template>
            <template #training_date-data="{ row }">
              {{ formatDateTime(row.training_date) }}
            </template>
          </UTable>
        </UCard>

        <!-- No Data States -->
        <div v-if="!loading && filteredInvites.length === 0" class="text-center text-gray-500 my-4">
          No pending invites found.
        </div>
        <div v-if="!loading && filteredUsers.length === 0" class="text-center text-gray-500 my-4">
          No registered users found.
        </div>
      </template>
    </div>
  </div>
</template>
  
<script setup>
const loading = ref(true);
const error = ref(null);
const search = ref('');
const invites = ref([]);
const registeredUsers = ref([]);

// Format functions
const formatDateTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

// Column definitions
const inviteColumns = [
  { key: 'email', label: 'Email' },
  { key: 'training_date', label: 'Training Date' },
  { key: 'training_location', label: 'Location' },
  { key: 'invite_sent_at', label: 'Invited On' },
  { key: 'status', label: 'Status' }
];

const registeredColumns = [
  { 
    key: 'display_name', 
    label: 'Name',
    render: (row) => `${row.first_name} ${row.last_name}`
  },
  { key: 'email', label: 'Email' },
  { key: 'training_date', label: 'Training Date' },
  { key: 'training_location', label: 'Training Location' }
];
// Stats computations
const stats = computed(() => ({
  totalInvites: invites.value.length,
  pendingInvites: invites.value.filter(i => i.status === 'pending').length,
  completedSignups: registeredUsers.value.length
}));

// Filtering
const filteredInvites = computed(() => {
  if (!search.value) return invites.value;
  const searchTerm = search.value.toLowerCase();
  return invites.value.filter(invite => 
    invite.email.toLowerCase().includes(searchTerm) ||
    invite.training_location.toLowerCase().includes(searchTerm)
  );
});

const filteredUsers = computed(() => {
  if (!search.value) return registeredUsers.value;
  const searchTerm = search.value.toLowerCase();
  return registeredUsers.value.filter(user => 
    user.email.toLowerCase().includes(searchTerm) ||
    user.display_name.toLowerCase().includes(searchTerm)
  );
});

// Fetch data
onMounted(async () => {
  try {
    const { user } = useDirectusAuth();
    
    // Fetch pending invites (this stays the same)
    const invitesResponse = await useDirectus(readItems('user_invites', {
      filter: {
        trainer_id: { _eq: user.value.id }
      },
      sort: ['-invite_sent_at'],
      fields: [
        'id',
        'email',
        'invite_sent_at',
        'training_date',
        'training_location',
        'invite_token'
      ]
    }));
    
    invites.value = invitesResponse.map(invite => ({
      ...invite,
      status: invite.invite_token ? 'pending' : 'completed'
    }));

    // Get users data
    const { data: reportData } = await useFetch('/api/trainer-report', {
      query: {
        trainerId: user.value.id
      }
    });

    // Initialize empty array if no users found
    if (!reportData.value?.users || reportData.value.users.length === 0) {
      registeredUsers.value = [];
      return; // Exit early if no users
    }

    // Only fetch sampler data if we have users
    const userIds = reportData.value.users.map(user => user.id);
    if (userIds.length > 0) {
      const samplerDataResponse = await useDirectus(readItems('sampler_data', {
        filter: {
          user_id: { _in: userIds }
        },
        fields: [
          'user_id',
          'original_training_date',
          'training_location_original',
          'training_date_latest',
          'training_location_latest'
        ]
      }));

      // Combine user data with sampler data
      registeredUsers.value = reportData.value.users.map(user => {
        const samplerInfo = samplerDataResponse.find(s => s.user_id === user.id) || {};
        return {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          display_name: user.display_name || `${user.first_name} ${user.last_name}`,
          training_date: samplerInfo.original_training_date || samplerInfo.training_date_latest,
          training_location: samplerInfo.training_location_original || samplerInfo.training_location_latest
        };
      });
    } else {
      registeredUsers.value = [];
    }

  } catch (err) {
    error.value = 'Failed to load training data';
    console.error('Training report error:', err);
  } finally {
    loading.value = false;
  }
});
</script>