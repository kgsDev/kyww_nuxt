<template>
  <PolicyGuard path="/portal/train/report">
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
          
          <div class="grid md:grid-cols-4 gap-6">
            <div>
              <label class="text-sm text-gray-500">My Total Invites Sent</label>
              <p class="text-2xl font-bold">{{ stats.totalInvites }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-500">My Completed Signups</label>
              <p class="text-2xl font-bold text-green-600">{{ stats.completedSignups }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-500">My Pending Invites</label>
              <p class="text-2xl font-bold text-yellow-600">{{ stats.pendingInvites }}</p>
            </div>
            <div>
              <label class="text-sm text-gray-500">Other Trainers' Invites</label>
              <p class="text-2xl font-bold text-blue-600">{{ otherTraineesInvites.length }}</p>
            </div>
          </div>
        </UCard>

        <!-- Pending Invites Card -->
        <UCard>
          <template #header>
            <div class="flex justify-between items-center gap-4">
              <h2 class="text-lg font-semibold flex-shrink-0">My Pending Invites</h2>
              <div class="relative flex-grow max-w-64">
                <UInput
                  v-model="inviteSearch"
                  icon="i-heroicons-magnifying-glass"
                  placeholder="Search invites..."
                  class="w-full"
                />
              </div>
            </div>
          </template>

          <UTable :columns="inviteColumns" :rows="filteredInvites" :loading="loading">
            <template #invite_sent_at-data="{ row }">
              {{ formatDateTime(row.invite_sent_at) }}
            </template>
            <template #training_date-data="{ row }">
              {{ formatDateTime(row.training_date) }}
            </template>
            <template #actions-data="{ row }">
              <div class="flex space-x-2">
                <UButton
                  size="xs"
                  color="primary"
                  :loading="processingId === `resend-${row.id}`"
                  :disabled="!!processingId"
                  @click="resendInvite(row)"
                  icon="i-heroicons-envelope"
                >
                  Resend
                </UButton>
                <UButton
                  size="xs"
                  color="red"
                  :loading="processingId === `delete-${row.id}`"
                  :disabled="!!processingId"
                  @click="confirmDeleteInvite(row)"
                  icon="i-heroicons-trash"
                >
                  Delete
                </UButton>
              </div>
            </template>
          </UTable>
        </UCard>

        <!-- Other Trainers' Invites Card -->
        <UCard class="mt-6">
          <template #header>
            <div class="flex justify-between items-center gap-4">
              <h2 class="text-lg font-semibold flex-shrink-0">Other Trainers' Pending Invites</h2>
              <div class="relative flex-grow max-w-64">
                <UInput
                  v-model="otherInviteSearch"
                  icon="i-heroicons-magnifying-glass"
                  placeholder="Search other invites..."
                  class="w-full"
                />
              </div>
            </div>
          </template>

          <UTable :columns="otherInviteColumns" :rows="filteredOtherInvites" :loading="loadingOtherInvites">
            <template #invite_sent_at-data="{ row }">
              {{ formatDateTime(row.invite_sent_at) }}
            </template>
            <template #training_date-data="{ row }">
              {{ formatDateTime(row.training_date) }}
            </template>
            <template #trainer-data="{ row }">
              <span v-if="row.trainer">
                {{ row.trainer.first_name }} {{ row.trainer.last_name }}
              </span>
              <span v-else class="text-gray-500 italic">
                Unknown
              </span>
            </template>
            <template #actions-data="{ row }">
              <div class="flex space-x-2">
                <UButton
                  size="xs"
                  color="primary"
                  :loading="processingId === `resend-other-${row.id}`"
                  :disabled="!!processingId"
                  @click="resendOtherInvite(row)"
                  icon="i-heroicons-envelope"
                >
                  Resend
                </UButton>
              </div>
            </template>
          </UTable>
        </UCard>

        <!-- Registered Users Card -->
        <UCard class="mt-6">
          <template #header>
            <div class="flex justify-between items-center gap-4">
              <h2 class="text-lg font-semibold flex-shrink-0">My Completed Signups (These Are Now Registered Users)</h2>
              <div class="relative flex-grow max-w-64">
                <UInput
                  v-model="userSearch"
                  icon="i-heroicons-magnifying-glass"
                  placeholder="Search users..."
                  class="w-full"
                />
              </div>
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
        {{ inviteSearch ? 'No matching invites found.' : 'No pending invites found.' }}
      </div>
      <div v-if="!loadingOtherInvites && filteredOtherInvites.length === 0" class="text-center text-gray-500 my-4">
        {{ otherInviteSearch ? 'No matching invites found.' : 'No other trainers\' invites found.' }}
      </div>
      <div v-if="!loading && filteredUsers.length === 0" class="text-center text-gray-500 my-4">
        {{ userSearch ? 'No matching users found.' : 'No registered users found.' }}
      </div>
      </template>
    </div>
    
    <!-- Delete Confirmation Modal -->
    <UModal v-model="showDeleteModal" :ui="{ width: 'sm:max-w-md', rounded: 'rounded-lg' }">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="text-red-500" />
            <h3 class="text-lg font-semibold">Delete Invitation</h3>
          </div>
        </template>
        
        <p>Are you sure you want to delete the invitation sent to <span class="font-semibold">{{ selectedInvite?.email }}</span>?</p>
        <p class="text-sm text-gray-600 mt-2">This action cannot be undone.</p>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" @click="closeDeleteModal">Cancel</UButton>
            <UButton 
              color="red" 
              :loading="processingId === 'confirming-delete'"
              @click="deleteInvite"
            >
              Delete
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
    
    <!-- Resend Confirmation Modal -->
    <UModal v-model="showResendModal" :ui="{ width: 'sm:max-w-lg', rounded: 'rounded-lg' }">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-envelope" class="text-blue-500" />
            <h3 class="text-lg font-semibold">Resend Invitation</h3>
          </div>
        </template>
        
        <div class="space-y-4">
          <p>Are you sure you want to resend the invitation to <span class="font-semibold">{{ selectedInvite?.email }}</span>?</p>
          
          <UAlert
            type="info"
            title="This will generate a new invitation link and send an email to the trainee."
            icon="i-heroicons-information-circle"
          />

          <div class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm font-semibold mb-2">Manual Backup Link:</p>
            <p class="text-sm text-gray-600 mb-2">
              If email delivery fails, you can send this link directly to the trainee:
            </p>
            <div class="bg-white p-2 rounded border text-xs font-mono break-all">
              https://kyww.uky.edu/signup/?token={{ selectedInvite?.invite_token }}
            </div>
          </div>

          <UAlert
            type="warning"
            title="Email Delivery Issues"
            description="Some email systems (hotmail.com, outlook.com, and some personal domains) may block our emails. Advise trainees to use Gmail if they don't receive the invitation."
            icon="i-heroicons-exclamation-triangle"
          />
        </div>
        
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="gray" @click="closeResendModal">Cancel</UButton>
            <UButton 
              color="primary" 
              :loading="processingId === 'confirming-resend'"
              @click="processResendInvite"
            >
              Resend Invitation
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Email Status Modal for showing detailed feedback -->
    <UModal v-model="showEmailStatusModal" :ui="{ width: 'sm:max-w-md', rounded: 'rounded-lg' }">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon 
              :name="emailStatus.success ? 'i-heroicons-check-circle' : 'i-heroicons-exclamation-triangle'" 
              :class="emailStatus.success ? 'text-green-500' : 'text-yellow-500'" 
            />
            <h3 class="text-lg font-semibold">
              {{ emailStatus.success ? 'Email Sent' : 'Email Issue' }}
            </h3>
          </div>
        </template>
        
        <div class="space-y-4">
          <p>{{ emailStatus.message }}</p>
          
          <div v-if="!emailStatus.success && selectedInvite" class="bg-gray-50 p-4 rounded-lg">
            <p class="text-sm font-semibold mb-2">Manual Backup Link:</p>
            <p class="text-sm text-gray-600 mb-2">
              You can send this link directly to the trainee:
            </p>
            <div class="bg-white p-2 rounded border text-xs font-mono break-all">
              https://kyww.uky.edu/signup/?token={{ selectedInvite?.invite_token }}
            </div>
          </div>
        </div>
        
        <template #footer>
          <div class="flex justify-end">
            <UButton @click="closeEmailStatusModal">Close</UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
  </PolicyGuard>
</template>
  
<script setup>
import PolicyGuard from '../../components/PolicyGuard.vue';

const loading = ref(true);
const loadingOtherInvites = ref(true);
const error = ref(null);
const inviteSearch = ref('');
const otherInviteSearch = ref('');
const userSearch = ref('');
const invites = ref([]);
const registeredUsers = ref([]);
const otherTraineesInvites = ref([]);

// Modal states
const processingId = ref(null);
const showDeleteModal = ref(false);
const showResendModal = ref(false);
const showEmailStatusModal = ref(false);
const selectedInvite = ref(null);
const emailStatus = ref({ success: false, message: '' });

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
  { key: 'actions', label: 'Actions' }
];

const otherInviteColumns = [
  { key: 'email', label: 'Email' },
  { key: 'training_date', label: 'Training Date' },
  { key: 'training_location', label: 'Location' },
  { key: 'trainer', label: 'Trainer' },
  { key: 'invite_sent_at', label: 'Invited On' },
  { key: 'actions', label: 'Actions' }
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
  totalInvites: invites.value.length + registeredUsers.value.length,
  pendingInvites: invites.value.length,
  completedSignups: registeredUsers.value.length
}));

// Filtering
const filteredInvites = computed(() => {
  if (!inviteSearch.value) return invites.value;
  const searchTerm = inviteSearch.value.toLowerCase();
  return invites.value.filter(invite => 
    invite.email.toLowerCase().includes(searchTerm) ||
    invite.training_location?.toLowerCase().includes(searchTerm)
  );
});

const filteredOtherInvites = computed(() => {
  if (!otherInviteSearch.value) return otherTraineesInvites.value;
  const searchTerm = otherInviteSearch.value.toLowerCase();
  return otherTraineesInvites.value.filter(invite => 
    invite.email.toLowerCase().includes(searchTerm) ||
    invite.training_location?.toLowerCase().includes(searchTerm) ||
    (invite.trainer && `${invite.trainer.first_name} ${invite.trainer.last_name}`.toLowerCase().includes(searchTerm))
  );
});

const filteredUsers = computed(() => {
  if (!userSearch.value) return registeredUsers.value;
  const searchTerm = userSearch.value.toLowerCase();
  return registeredUsers.value.filter(user => 
    user.email.toLowerCase().includes(searchTerm) ||
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm)
  );
});

// Toast notifications
const toast = useToast();

const showToast = (message, type = 'success') => {
  toast.add({
    title: type === 'success' ? 'Success' : type === 'warning' ? 'Warning' : 'Error',
    description: message,
    color: type,
    timeout: type === 'warning' ? 5000 : 3000,
    icon: type === 'success' ? 'i-heroicons-check-circle' : 
          type === 'warning' ? 'i-heroicons-exclamation-triangle' : 
          'i-heroicons-exclamation-circle'
  });
};

// Modal management
const confirmDeleteInvite = (invite) => {
  selectedInvite.value = invite;
  showDeleteModal.value = true;
};

const closeDeleteModal = () => {
  showDeleteModal.value = false;
  setTimeout(() => {
    selectedInvite.value = null;
  }, 150);
};

const resendInvite = (invite) => {
  selectedInvite.value = invite;
  showResendModal.value = true;
};

const resendOtherInvite = (invite) => {
  selectedInvite.value = invite;
  showResendModal.value = true;
};

const closeResendModal = () => {
  showResendModal.value = false;
  setTimeout(() => {
    selectedInvite.value = null;
  }, 150);
};

const closeEmailStatusModal = () => {
  showEmailStatusModal.value = false;
  setTimeout(() => {
    emailStatus.value = { success: false, message: '' };
  }, 150);
};

// Delete functionality
const deleteInvite = async () => {
  processingId.value = 'confirming-delete';
  
  try {
    const { user } = useDirectusAuth();
    const { data, error } = await useFetch('/api/trainer-report', {
      method: 'DELETE',
      body: {
        trainerId: user.value.id,
        inviteId: selectedInvite.value.id
      }
    });
    
    if (error.value) {
      throw new Error(error.value.data?.message || 'Failed to delete invitation');
    }
    
    if (!data.value?.success) {
      throw new Error(data.value?.message || 'Failed to delete invitation');
    }
    
    // Remove from local list
    invites.value = invites.value.filter(invite => invite.id !== selectedInvite.value.id);
    
    showToast('Invitation deleted successfully');
  } catch (err) {
    console.error('Error deleting invitation:', err);
    showToast(err.message || 'Failed to delete invitation', 'error');
  } finally {
    processingId.value = null;
    closeDeleteModal();
  }
};

// Resend functionality with improved email handling
const processResendInvite = async () => {
  processingId.value = 'confirming-resend';
  
  try {
    const { user } = useDirectusAuth();
    const isOtherTrainerInvite = otherTraineesInvites.value.some(invite => invite.id === selectedInvite.value.id);
    
    const { data, error } = await useFetch('/api/trainer-report', {
      method: 'POST',
      body: {
        trainerId: isOtherTrainerInvite ? selectedInvite.value.trainer_id : user.value.id,
        inviteId: selectedInvite.value.id,
        email: selectedInvite.value.email
      }
    });
    
    if (error.value) {
      // Handle specific error types from improved API
      const errorMessage = error.value.data?.message || 'Failed to resend invitation';
      if (error.value.statusCode === 500 && errorMessage.includes('email')) {
        showToast('Invitation updated but email delivery failed. Use the manual link below.', 'warning');
        emailStatus.value = {
          success: false,
          message: 'The invitation was updated but we couldn\'t send the email. You can copy the manual link below and send it directly to the trainee.'
        };
        showEmailStatusModal.value = true;
      } else {
        throw new Error(errorMessage);
      }
    } else if (data.value?.success) {
      // Update invite sent timestamp for the appropriate list
      if (isOtherTrainerInvite) {
        const updatedInvites = [...otherTraineesInvites.value];
        const inviteIndex = updatedInvites.findIndex(item => item.id === selectedInvite.value.id);
        
        if (inviteIndex !== -1) {
          updatedInvites[inviteIndex] = {
            ...updatedInvites[inviteIndex],
            invite_sent_at: new Date().toISOString()
          };
          otherTraineesInvites.value = updatedInvites;
        }
      } else {
        const updatedInvites = [...invites.value];
        const inviteIndex = updatedInvites.findIndex(item => item.id === selectedInvite.value.id);
        
        if (inviteIndex !== -1) {
          updatedInvites[inviteIndex] = {
            ...updatedInvites[inviteIndex],
            invite_sent_at: new Date().toISOString()
          };
          invites.value = updatedInvites;
        }
      }
      
      showToast('Invitation resent successfully');
    } else {
      throw new Error(data.value?.message || 'Failed to resend invitation');
    }
    
  } catch (err) {
    console.error('Error resending invitation:', err);
    showToast(err.message || 'Failed to resend invitation', 'error');
  } finally {
    processingId.value = null;
    closeResendModal();
  }
};

// Data fetching
onMounted(async () => {
  try {
    const { user } = useDirectusAuth();
    
    // Fetch pending invites
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
    
    invites.value = invitesResponse;

    // Get users data
    const { data: reportData } = await useFetch('/api/trainer-report', {
      query: {
        trainerId: user.value.id
      }
    });

    // Initialize empty array if no users found
    if (!reportData.value?.users || reportData.value.users.length === 0) {
      registeredUsers.value = [];
    } else {
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
          ],
          limit: -1
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
    }

    // Fetch other trainers' invites
    loadingOtherInvites.value = true;
    
    const { data: otherInvitesData } = await useFetch('/api/other-trainer-invites', {
      query: {
        userId: user.value.id
      }
    });
    
    if (otherInvitesData.value?.invites) {
      otherTraineesInvites.value = otherInvitesData.value.invites;
    } else {
      otherTraineesInvites.value = [];
    }
    
    loadingOtherInvites.value = false;

  } catch (err) {
    error.value = 'Failed to load training data';
    console.error('Training report error:', err);
  } finally {
    loading.value = false;
  }
});
</script>