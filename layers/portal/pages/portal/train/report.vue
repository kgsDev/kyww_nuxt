<script setup lang="ts">
import PolicyGuard from '../../components/PolicyGuard.vue';
import TrainerTraineesManager from '~/components/TrainerTraineesManager.vue';

// Get authenticated user
const { user } = useDirectusAuth();

const loading = ref(true);
const loadingOtherInvites = ref(true);
const error = ref(null);

// Data arrays
const invites = ref([]);
const otherTraineesInvites = ref([]);

// Collapsible section states
const sectionsExpanded = ref({
  myPending: true,
  manageTrainees: true,
  othersPending: false
});

// Sorting states
const sortBy = ref('');
const sortDirection = ref('asc');

// Filter states - these will be passed to child component
const globalSearch = ref('');
const selectedDateRange = ref('all');
const selectedLocation = ref('all');
const selectedTrainingType = ref('all');

// Modal states
const processingId = ref(null);
const showDeleteModal = ref(false);
const showResendModal = ref(false);
const showEmailStatusModal = ref(false);
const selectedInvite = ref(null);
const emailStatus = ref({ success: false, message: '' });
const showScrollTop = ref(false);

// Format functions
const formatCompactDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit'
  });
};

// Filter options
const dateRangeOptions = [
  { value: 'all', label: 'All Dates' },
  { value: 'last_30', label: 'Last 30 Days' },
  { value: 'last_90', label: 'Last 90 Days' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'this_year', label: 'This Year' }
];

const trainingTypeOptions = [
  { value: 'all', label: 'All Training Types' },
  { value: 'field_chemistry', label: 'Field Chemistry' },
  { value: 'r_card', label: 'R-Card' },
  { value: 'habitat', label: 'Habitat' },
  { value: 'biological', label: 'Biological' }
];

// Dynamic filter options based on data
const locationOptions = computed(() => {
  const locations = new Set();
  locations.add('all');
  
  [...invites.value, ...otherTraineesInvites.value]
    .forEach(item => {
      if (item.training_location) {
        locations.add(item.training_location);
      }
    });
  
  return Array.from(locations).map(loc => ({
    value: loc,
    label: loc === 'all' ? 'All Locations' : loc
  }));
});

// Responsive column definitions with sorting
const responsiveInviteColumns = [
  { key: 'email', label: 'Email', sortable: true },
  { key: 'training_date', label: 'Date', sortable: true },
  { key: 'training_location', label: 'Location', sortable: true },
  { key: 'training_types', label: 'Types' },
  { key: 'invite_sent_at', label: 'Sent', sortable: true },
  { key: 'actions', label: 'Actions' }
];

const responsiveOtherInviteColumns = [
  { key: 'email', label: 'Email', sortable: true },
  { key: 'training_date', label: 'Date', sortable: true },
  { key: 'training_location', label: 'Location', sortable: true },
  { key: 'trainer', label: 'Trainer', sortable: true },
  { key: 'training_types', label: 'Types' },
  { key: 'invite_sent_at', label: 'Sent', sortable: true },
  { key: 'actions', label: 'Actions' }
];

// Sorting function
const sortData = (data, key) => {
  if (!key) return data;
  
  return [...data].sort((a, b) => {
    let aValue, bValue;
    
    switch (key) {
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'training_date':
        aValue = new Date(a.training_date || 0);
        bValue = new Date(b.training_date || 0);
        break;
      case 'training_location':
        aValue = a.training_location || '';
        bValue = b.training_location || '';
        break;
      case 'trainer':
        aValue = a.trainer ? `${a.trainer.first_name} ${a.trainer.last_name}` : a.trainer_name || '';
        bValue = b.trainer ? `${b.trainer.first_name} ${b.trainer.last_name}` : b.trainer_name || '';
        break;
      case 'invite_sent_at':
        aValue = new Date(a.invite_sent_at || 0);
        bValue = new Date(b.invite_sent_at || 0);
        break;
      default:
        aValue = a[key] || '';
        bValue = b[key] || '';
    }
    
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();
    
    if (sortDirection.value === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });
};

// Handle row selection for sorting
const onRowSelect = (row) => {
  // This function can be used if needed for row selection
};

// Helper functions for filtering
const matchesDateRange = (date) => {
  if (selectedDateRange.value === 'all') return true;
  if (!date) return false;
  
  const itemDate = new Date(date);
  const now = new Date();
  
  switch (selectedDateRange.value) {
    case 'last_30':
      return itemDate >= new Date(now.setDate(now.getDate() - 30));
    case 'last_90':
      return itemDate >= new Date(now.setDate(now.getDate() - 90));
    case 'last_year':
      return itemDate >= new Date(now.setFullYear(now.getFullYear() - 1));
    case 'this_year':
      return itemDate.getFullYear() === new Date().getFullYear();
    default:
      return true;
  }
};

const matchesTrainingType = (item) => {
  if (selectedTrainingType.value === 'all') return true;
  return item[`training_${selectedTrainingType.value}`] === true;
};

const matchesGlobalSearch = (item) => {
  if (!globalSearch.value) return true;
  const search = globalSearch.value.toLowerCase();
  
  return (
    item.email?.toLowerCase().includes(search) ||
    item.training_location?.toLowerCase().includes(search) ||
    item.trainer_name?.toLowerCase().includes(search) ||
    (item.trainer && `${item.trainer.first_name} ${item.trainer.last_name}`.toLowerCase().includes(search))
  );
};

// Filtering logic
const filteredInvites = computed(() => {
  return invites.value.filter(invite => {
    return matchesDateRange(invite.training_date) &&
           (selectedLocation.value === 'all' || invite.training_location === selectedLocation.value) &&
           matchesTrainingType(invite) &&
           matchesGlobalSearch(invite);
  });
});

const filteredOtherInvites = computed(() => {
  return otherTraineesInvites.value.filter(invite => {
    return matchesDateRange(invite.training_date) &&
           (selectedLocation.value === 'all' || invite.training_location === selectedLocation.value) &&
           matchesTrainingType(invite) &&
           matchesGlobalSearch(invite);
  });
});

// Sorted filtered data
const sortedFilteredInvites = computed(() => sortData(filteredInvites.value, sortBy.value));
const sortedFilteredOtherInvites = computed(() => sortData(filteredOtherInvites.value, sortBy.value));

// Stats computations
const stats = computed(() => ({
  myPendingInvites: invites.value.length,
  othersPendingInvites: otherTraineesInvites.value.length
}));

// Total filtered records
const totalFilteredRecords = computed(() => {
  return filteredInvites.value.length + filteredOtherInvites.value.length;
});

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return globalSearch.value !== '' ||
         selectedDateRange.value !== 'all' ||
         selectedLocation.value !== 'all' ||
         selectedTrainingType.value !== 'all';
});

// Count active filters
const activeFilterCount = computed(() => {
  let count = 0;
  if (globalSearch.value !== '') count++;
  if (selectedDateRange.value !== 'all') count++;
  if (selectedLocation.value !== 'all') count++;
  if (selectedTrainingType.value !== 'all') count++;
  return count;
});

// Clear all filters
const clearAllFilters = () => {
  globalSearch.value = '';
  selectedDateRange.value = 'all';
  selectedLocation.value = 'all';
  selectedTrainingType.value = 'all';
  sortBy.value = '';
  sortDirection.value = 'asc';
};

// Toggle section expansion
const toggleSection = (section) => {
  sectionsExpanded.value[section] = !sectionsExpanded.value[section];
};

// Export to CSV function
const exportToCSV = () => {
  const headers = [
    'Type', 'Email', 'Training Date', 'Training Location', 'Trainer',
    'Field Chemistry', 'R-Card', 'Habitat', 'Biological', 'Invite Sent'
  ];
  
  const allData = [
    ...filteredInvites.value.map(item => ({
      ...item,
      type: 'My Pending Invite',
      trainer: 'Me'
    })),
    ...filteredOtherInvites.value.map(item => ({
      ...item,
      type: 'Other Trainer Pending',
      trainer: item.trainer ? `${item.trainer.first_name} ${item.trainer.last_name}` : 'Unknown'
    }))
  ];
  
  const csvData = allData.map(row => [
    row.type,
    row.email,
    formatCompactDate(row.training_date),
    row.training_location || '',
    row.trainer,
    row.training_field_chemistry ? 'Yes' : 'No',
    row.training_r_card ? 'Yes' : 'No',
    row.training_habitat ? 'Yes' : 'No',
    row.training_biological ? 'Yes' : 'No',
    formatCompactDate(row.invite_sent_at)
  ]);
  
  const csvContent = [headers, ...csvData]
    .map(row => row.map(cell => `"${cell || ''}"`).join(','))
    .join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `training_report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

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

// Resend functionality
const processResendInvite = async () => {
  processingId.value = 'confirming-resend';
  
  try {
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

const handleScroll = () => {
  showScrollTop.value = window.scrollY > 300;
};

const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
};

// Data fetching function (extracted so it can be called from child components)
const fetchTrainingData = async () => {
  loading.value = true;
  try {
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
        'invite_token',
        'training_field_chemistry',
        'training_r_card',
        'training_habitat',
        'training_biological'
      ],
      limit: -1
    }));
    
    invites.value = invitesResponse;

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
};

// Provide refresh function and filters to child components
provide('refreshTrainingData', fetchTrainingData);
provide('filters', {
  globalSearch,
  selectedDateRange,
  selectedLocation,
  selectedTrainingType
});

// Data fetching
onMounted(async () => {
  window.addEventListener('scroll', handleScroll);
  await fetchTrainingData();
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

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

    <div class="space-y-4 p-2 sm:p-4 w-full max-w-full overflow-hidden">
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
        <!-- Training Type Key -->
        <UCard>
          <template #header>
            <h3 class="text-base sm:text-lg font-semibold">Training Type Key</h3>
          </template>
          
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="flex items-center gap-2">
              <UBadge size="sm" color="blue">FC</UBadge>
              <span class="text-sm text-gray-700">Field Chemistry</span>
            </div>
            <div class="flex items-center gap-2">
              <UBadge size="sm" color="green">RC</UBadge>
              <span class="text-sm text-gray-700">R-Card</span>
            </div>
            <div class="flex items-center gap-2">
              <UBadge size="sm" color="purple">H</UBadge>
              <span class="text-sm text-gray-700">Habitat</span>
            </div>
            <div class="flex items-center gap-2">
              <UBadge size="sm" color="orange">B</UBadge>
              <span class="text-sm text-gray-700">Biological</span>
            </div>
          </div>
        </UCard>

        <!-- Compact Summary Stats Card -->
        <UCard>
          <template #header>
            <div class="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
              <h2 class="text-base sm:text-lg font-semibold">Training Summary</h2>
              <div class="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:gap-2">
                <UButton
                  @click="clearAllFilters"
                  color="gray"
                  variant="outline"
                  size="sm"
                  icon="i-heroicons-x-mark"
                  class="text-xs"
                >
                  Clear Filters
                </UButton>
                
                <UButton
                  @click="exportToCSV"
                  icon="i-heroicons-arrow-down-tray"
                  color="primary"
                  size="sm"
                  class="text-xs"
                >
                  Export CSV
                </UButton>
              </div>
            </div>
          </template>
          
          <div class="grid grid-cols-2 gap-2 sm:gap-3">
            <div class="text-center p-2 sm:p-3 bg-yellow-50 rounded">
              <p class="text-base sm:text-lg font-bold text-yellow-600">{{ stats.myPendingInvites }}</p>
              <label class="text-xs text-gray-500">My Pending Invites</label>
            </div>
            <div class="text-center p-2 sm:p-3 bg-blue-50 rounded">
              <p class="text-base sm:text-lg font-bold text-blue-600">{{ stats.othersPendingInvites }}</p>
              <label class="text-xs text-gray-500">Others' Pending Invites</label>
            </div>
          </div>
        </UCard>

        <!-- Responsive Filter Controls -->
        <UCard>
          <template #header>
            <div class="flex flex-col space-y-1 sm:space-y-0 sm:flex-row sm:justify-between sm:items-center">
              <h3 class="text-base sm:text-lg font-semibold">Filters</h3>
              <UBadge color="blue" variant="soft" size="sm">
                Applies to all sections
              </UBadge>
            </div>
          </template>
          
          <div class="space-y-3">
            <!-- Mobile: Stack all filters -->
            <div class="grid grid-cols-1 gap-3 sm:hidden">
              <UInput
                v-model="globalSearch"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search..."
                size="sm"
              />
              
              <USelect
                v-model="selectedDateRange"
                :options="dateRangeOptions"
                size="sm"
                placeholder="Date Range"
              />

              <USelect
                v-model="selectedLocation"
                :options="locationOptions"
                size="sm"
                placeholder="Location"
              />

              <USelect
                v-model="selectedTrainingType"
                :options="trainingTypeOptions"
                size="sm"
                placeholder="Training Type"
              />

              <div class="text-center">
                <UBadge v-if="hasActiveFilters" color="orange" variant="soft" size="sm">
                  {{ activeFilterCount }} active filters
                </UBadge>
                <span v-else class="text-sm text-gray-500">No filters active</span>
              </div>
            </div>

            <!-- Desktop: Responsive grid -->
            <div class="hidden sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <UInput
                v-model="globalSearch"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search..."
                size="sm"
              />
              
              <USelect
                v-model="selectedDateRange"
                :options="dateRangeOptions"
                size="sm"
                placeholder="Date Range"
              />

              <USelect
                v-model="selectedLocation"
                :options="locationOptions"
                size="sm"
                placeholder="Location"
              />

              <USelect
                v-model="selectedTrainingType"
                :options="trainingTypeOptions"
                size="sm"
                placeholder="Training Type"
              />

              <div class="flex items-center justify-center">
                <UBadge v-if="hasActiveFilters" color="orange" variant="soft" size="sm">
                  {{ activeFilterCount }} active
                </UBadge>
                <span v-else class="text-sm text-gray-500">No filters</span>
              </div>
            </div>

            <!-- Active filters display -->
            <div v-if="hasActiveFilters" class="flex flex-wrap gap-1">
              <UBadge v-if="globalSearch" color="blue" variant="soft" @click="globalSearch = ''" class="cursor-pointer text-xs">
                "{{ globalSearch.length > 10 ? globalSearch.substring(0, 10) + '...' : globalSearch }}" ×
              </UBadge>
              
              <UBadge v-if="selectedDateRange !== 'all'" color="green" variant="soft" @click="selectedDateRange = 'all'" class="cursor-pointer text-xs">
                {{ dateRangeOptions.find(d => d.value === selectedDateRange)?.label }} ×
              </UBadge>
              
              <UBadge v-if="selectedLocation !== 'all'" color="purple" variant="soft" @click="selectedLocation = 'all'" class="cursor-pointer text-xs">
                {{ selectedLocation.length > 12 ? selectedLocation.substring(0, 12) + '...' : selectedLocation }} ×
              </UBadge>
              
              <UBadge v-if="selectedTrainingType !== 'all'" color="orange" variant="soft" @click="selectedTrainingType = 'all'" class="cursor-pointer text-xs">
                {{ trainingTypeOptions.find(t => t.value === selectedTrainingType)?.label }} ×
              </UBadge>
            </div>
          </div>
        </UCard>

        <!-- My Pending Invites Card (Collapsible) -->
        <UCard>
          <template #header>
            <button 
              @click="toggleSection('myPending')"
              class="w-full flex justify-between items-center gap-2 text-left hover:bg-gray-50 -m-4 p-4 rounded-t-lg transition-colors"
            >
              <div class="flex items-center gap-2">
                <UIcon 
                  :name="sectionsExpanded.myPending ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                  class="w-5 h-5 transition-transform"
                />
                <h2 class="text-lg font-semibold">My Pending Invites</h2>
                <UBadge color="yellow" variant="soft">
                  {{ filteredInvites.length }}
                </UBadge>
              </div>
            </button>
          </template>

          <div v-show="sectionsExpanded.myPending">
            <!-- Mobile: Card Layout -->
            <div class="block sm:hidden space-y-3">
              <div v-for="invite in sortedFilteredInvites" :key="invite.id" 
                  class="bg-gray-50 p-3 rounded-lg border">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate">{{ invite.email }}</div>
                    <div class="text-xs text-gray-600">{{ formatCompactDate(invite.training_date) }}</div>
                  </div>
                  <div class="flex gap-1 ml-2 flex-shrink-0">
                    <UButton
                      size="2xs"
                      color="primary"
                      :loading="processingId === `resend-${invite.id}`"
                      :disabled="!!processingId"
                      @click="resendInvite(invite)"
                      icon="i-heroicons-envelope"
                    />
                    <UButton
                      size="2xs"
                      color="red"
                      :loading="processingId === `delete-${invite.id}`"
                      :disabled="!!processingId"
                      @click="confirmDeleteInvite(invite)"
                      icon="i-heroicons-trash"
                    />
                  </div>
                </div>
                <div class="text-xs text-gray-600 mb-2 truncate">{{ invite.training_location }}</div>
                <div class="flex justify-between items-center">
                  <div class="flex flex-wrap gap-1">
                    <UBadge v-if="invite.training_field_chemistry" size="xs" color="blue">FC</UBadge>
                    <UBadge v-if="invite.training_r_card" size="xs" color="green">RC</UBadge>
                    <UBadge v-if="invite.training_habitat" size="xs" color="purple">H</UBadge>
                    <UBadge v-if="invite.training_biological" size="xs" color="orange">B</UBadge>
                  </div>
                  <span class="text-xs text-gray-500">Sent: {{ formatCompactDate(invite.invite_sent_at) }}</span>
                </div>
              </div>
            </div>

            <!-- Desktop: Table Layout -->
            <div class="hidden sm:block overflow-x-auto">
              <UTable 
                :columns="responsiveInviteColumns" 
                :rows="sortedFilteredInvites" 
                :loading="loading" 
                @select="onRowSelect"
                class="min-w-full"
              >
                <template #email-data="{ row }">
                  <div class="truncate max-w-[200px]" :title="row.email">
                    {{ row.email }}
                  </div>
                </template>
                
                <template #training_date-data="{ row }">
                  <span class="text-xs whitespace-nowrap">{{ formatCompactDate(row.training_date) }}</span>
                </template>
                
                <template #training_location-data="{ row }">
                  <div class="truncate max-w-[150px]" :title="row.training_location">
                    {{ row.training_location }}
                  </div>
                </template>
                
                <template #training_types-data="{ row }">
                  <div class="flex flex-wrap gap-1">
                    <UBadge v-if="row.training_field_chemistry" size="xs" color="blue">FC</UBadge>
                    <UBadge v-if="row.training_r_card" size="xs" color="green">RC</UBadge>
                    <UBadge v-if="row.training_habitat" size="xs" color="purple">H</UBadge>
                    <UBadge v-if="row.training_biological" size="xs" color="orange">B</UBadge>
                  </div>
                </template>
                
                <template #invite_sent_at-data="{ row }">
                  <span class="text-xs whitespace-nowrap">{{ formatCompactDate(row.invite_sent_at) }}</span>
                </template>
                
                <template #actions-data="{ row }">
                  <div class="flex space-x-1">
                    <UButton
                      size="2xs"
                      color="primary"
                      :loading="processingId === `resend-${row.id}`"
                      :disabled="!!processingId"
                      @click="resendInvite(row)"
                      icon="i-heroicons-envelope"
                    >
                      Resend
                    </UButton>
                    <UButton
                      size="2xs"
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
            </div>

            <div v-if="!loading && filteredInvites.length === 0" class="text-center text-gray-500 py-8">
              {{ hasActiveFilters ? 'No matching pending invites found.' : 'No pending invites found.' }}
            </div>
          </div>
        </UCard>

        <!-- Manage Trainees Card (Moved under My Pending Invites) -->
        <UCard v-if="user?.id">
          <template #header>
            <button 
              @click="toggleSection('manageTrainees')"
              class="w-full flex justify-between items-center gap-2 text-left hover:bg-gray-50 -m-4 p-4 rounded-t-lg transition-colors"
            >
              <div class="flex items-center gap-2">
                <UIcon 
                  :name="sectionsExpanded.manageTrainees ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                  class="w-5 h-5 transition-transform"
                />
                <div>
                  <h2 class="text-lg font-semibold">Manage Trainees</h2>
                  <p class="text-xs text-gray-600 mt-1">
                    View and update training records for all trainees
                  </p>
                </div>
              </div>
            </button>
          </template>
          
          <div v-show="sectionsExpanded.manageTrainees">
            <TrainerTraineesManager :trainer-id="user.id" />
          </div>
        </UCard>

        <!-- Other Trainers' Pending Invites Card (Collapsible) -->
        <UCard>
          <template #header>
            <button 
              @click="toggleSection('othersPending')"
              class="w-full flex justify-between items-center gap-2 text-left hover:bg-gray-50 -m-4 p-4 rounded-t-lg transition-colors"
            >
              <div class="flex items-center gap-2">
                <UIcon 
                  :name="sectionsExpanded.othersPending ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                  class="w-5 h-5 transition-transform"
                />
                <h2 class="text-lg font-semibold">Other Trainers' Pending Invites</h2>
                <UBadge color="blue" variant="soft">
                  {{ filteredOtherInvites.length }}
                </UBadge>
              </div>
            </button>
          </template>

          <div v-show="sectionsExpanded.othersPending">
            <!-- Mobile: Card Layout -->
            <div class="block sm:hidden space-y-3">
              <div v-for="invite in sortedFilteredOtherInvites" :key="invite.id" 
                  class="bg-gray-50 p-3 rounded-lg border">
                <div class="flex justify-between items-start mb-2">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate">{{ invite.email }}</div>
                    <div class="text-xs text-gray-600">
                      {{ formatCompactDate(invite.training_date) }} • 
                      <span v-if="invite.trainer">{{ invite.trainer.first_name }} {{ invite.trainer.last_name }}</span>
                      <span v-else>Unknown Trainer</span>
                    </div>
                  </div>
                  <UButton
                    size="2xs"
                    color="primary"
                    :loading="processingId === `resend-other-${invite.id}`"
                    :disabled="!!processingId"
                    @click="resendOtherInvite(invite)"
                    icon="i-heroicons-envelope"
                    class="flex-shrink-0 ml-2"
                  />
                </div>
                <div class="text-xs text-gray-600 mb-2 truncate">{{ invite.training_location }}</div>
                <div class="flex justify-between items-center">
                  <div class="flex flex-wrap gap-1">
                    <UBadge v-if="invite.training_field_chemistry" size="xs" color="blue">FC</UBadge>
                    <UBadge v-if="invite.training_r_card" size="xs" color="green">RC</UBadge>
                    <UBadge v-if="invite.training_habitat" size="xs" color="purple">H</UBadge>
                    <UBadge v-if="invite.training_biological" size="xs" color="orange">B</UBadge>
                  </div>
                  <span class="text-xs text-gray-500">Sent: {{ formatCompactDate(invite.invite_sent_at) }}</span>
                </div>
              </div>
            </div>

            <!-- Desktop: Table Layout -->
            <div class="hidden sm:block overflow-x-auto">
              <UTable 
                :columns="responsiveOtherInviteColumns" 
                :rows="sortedFilteredOtherInvites" 
                :loading="loadingOtherInvites"
                class="min-w-full"
              >
                <template #email-data="{ row }">
                  <div class="truncate max-w-[200px]" :title="row.email">
                    {{ row.email }}
                  </div>
                </template>
                
                <template #training_date-data="{ row }">
                  <span class="text-xs whitespace-nowrap">{{ formatCompactDate(row.training_date) }}</span>
                </template>
                
                <template #training_location-data="{ row }">
                  <div class="truncate max-w-[120px]" :title="row.training_location">
                    {{ row.training_location }}
                  </div>
                </template>
                
                <template #trainer-data="{ row }">
                  <div class="truncate max-w-[120px]" v-if="row.trainer" :title="`${row.trainer.first_name} ${row.trainer.last_name}`">
                    <span class="text-xs">{{ row.trainer.first_name }} {{ row.trainer.last_name }}</span>
                  </div>
                  <span v-else class="text-gray-500 italic text-xs">Unknown</span>
                </template>
                
                <template #training_types-data="{ row }">
                  <div class="flex flex-wrap gap-1">
                    <UBadge v-if="row.training_field_chemistry" size="xs" color="blue">FC</UBadge>
                    <UBadge v-if="row.training_r_card" size="xs" color="green">RC</UBadge>
                    <UBadge v-if="row.training_habitat" size="xs" color="purple">H</UBadge>
                    <UBadge v-if="row.training_biological" size="xs" color="orange">B</UBadge>
                  </div>
                </template>
                
                <template #invite_sent_at-data="{ row }">
                  <span class="text-xs whitespace-nowrap">{{ formatCompactDate(row.invite_sent_at) }}</span>
                </template>
                
                <template #actions-data="{ row }">
                  <UButton
                    size="2xs"
                    color="primary"
                    :loading="processingId === `resend-other-${row.id}`"
                    :disabled="!!processingId"
                    @click="resendOtherInvite(row)"
                    icon="i-heroicons-envelope"
                  >
                    Resend
                  </UButton>
                </template>
              </UTable>
            </div>

            <div v-if="!loadingOtherInvites && filteredOtherInvites.length === 0" class="text-center text-gray-500 py-8">
              {{ hasActiveFilters ? 'No matching other trainers\' invites found.' : 'No other trainers\' invites found.' }}
            </div>
          </div>
        </UCard>
      </template>
    </div>
    
    <!-- Modals remain the same... -->
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

    <!-- Email Status Modal -->
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
   <!-- Scroll to Top Button -->
    <Transition
      name="fade"
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-300"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showScrollTop"
        class="fixed bottom-4 right-4 z-50"
      >
        <UButton
          @click="scrollToTop"
          icon="i-heroicons-arrow-up"
          color="primary"
          variant="solid"
          size="lg"
          class="rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
        />
      </div>
    </Transition>
  </PolicyGuard>
</template>

<style scoped>
.max-w-full {
  max-width: 100%;
}

.overflow-hidden {
  overflow: hidden;
}

.overflow-x-auto {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.truncate {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 768px) {
  .min-w-full {
    min-width: 600px;
  }
}
</style>