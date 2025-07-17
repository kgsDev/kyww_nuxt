<script setup lang="ts">
//users/index.vue - display and manage users in the Kentucky Watershed Watch portal
import { ref, computed, onMounted } from 'vue'
import PolicyGuard from '../../components/PolicyGuard.vue'
import SamplingIntentSummary from '~/components/SamplingIntentSummary.vue'
import UserSamplingIntent from '~/components/UserSamplingIntent.vue'
import ConnectionsDashboard from '~/components/ConnectionsDashboard.vue'

const config = useRuntimeConfig()
const loading = ref(true)
const error = ref(null)
const users = ref([])
const showHubInfo = ref({})
const currentYear = ref(new Date().getFullYear())
const samplersWithPlans = ref(0) // Track samplers with plans
const actualSamplingData = ref([]) // Track actual sampling sites

// Search and filter states
const searchQuery = ref('')
const selectedStatus = ref('all')
const selectedHub = ref('all')
const selectedTraining = ref('all')
const selectedRole = ref('all') // NEW: Role/Group filter
const selectedSamplingActivity = ref('all')
const siteSearchQuery = ref('')
const sortBy = ref('name')
const sortDirection = ref('asc')

// Get unique hubs for filter dropdown
const uniqueHubs = computed(() => {
  const hubs = new Set(users.value.map(user => user.sampler_data?.hub_id?.Description).filter(Boolean))
  return ['all', ...Array.from(hubs)]
})

const samplingActivityOptions = [
  { value: 'all', label: 'All Users' },
  { value: 'active_samplers', label: 'Active Samplers (Has Samples)' },
  { value: 'inactive_samplers', label: 'No Samples Yet' },
  { value: 'high_activity', label: 'High Activity (5+ Samples)' },
  { value: 'multiple_sites', label: 'Multiple Sites (2+ Sites)' }
]

// Training options
const trainingOptions = [
  { value: 'all', label: 'All Training' },
  { value: 'field_chemistry', label: 'Field Chemistry' },
  { value: 'r_card', label: 'R-Card' },
  { value: 'habitat', label: 'Habitat' },
  { value: 'biological', label: 'Biological' }
]

// Group definitions with icons and descriptions
const userGroups = {
  wwkyadmin: {
    title: 'WWKY Administrators',
    icon: 'i-heroicons-building-library',
    description: 'Manage all users and activities',
    policyId: config.public.WWKYADMIN_POLICY_ID
  },
  leader: {
    title: 'Basin Leaders',
    icon: 'i-heroicons-user-group',
    description: 'Manage basin-specific activities and users',
    policyId: config.public.LEADER_POLICY_ID
  },
  hubmanager: {
    title: 'Hub Managers',
    icon: 'material-symbols:hub-outline',
    description: 'Manage hub-specific activities and users',
    policyId: config.public.HUB_POLICY_ID
  },
  trainer: {
    title: 'Trainers',
    icon: 'i-heroicons-academic-cap',
    description: 'Can manage training sessions and invite new users',
    policyId: config.public.TRAINER_POLICY_ID
  },
  sampler: {
    title: 'Samplers',
    icon: 'i-heroicons-beaker',
    description: 'Collect and submit water samples',
    policyId: config.public.SAMPLER_POLICY_ID
  }
}

// NEW: Role options based on userGroups
const roleOptions = computed(() => [
  { value: 'all', label: 'All Roles' },
  ...Object.entries(userGroups).map(([key, group]) => ({
    value: key,
    label: group.title
  }))
])

// Sorting functions
const getSortValue = (user, field) => {
  switch (field) {
    case 'name':
      return formatName(user).toLowerCase()
    case 'email':
      return user.email?.toLowerCase() || ''
    case 'hub':
      return user.sampler_data?.hub_id?.Description?.toLowerCase() || ''
    case 'status':
      return user.status || ''
    default:
      return ''
  }
}

// Filter and sort users
const filteredAndSortedUsers = computed(() => {
  return users.value.filter(user => {
    // Existing filters
    const matchesSearch = searchQuery.value === '' ||
      formatName(user).toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchesStatus = selectedStatus.value === 'all' || user.status === selectedStatus.value
    
    const matchesHub = selectedHub.value === 'all' || 
      user.sampler_data?.hub_id?.Description === selectedHub.value
    
    const matchesTraining = selectedTraining.value === 'all' || 
      user.sampler_data?.[`training_${selectedTraining.value}`]

    // NEW: Role/Group filter
    const matchesRole = selectedRole.value === 'all' || 
      user.policies?.some(p => p.policy?.id === userGroups[selectedRole.value]?.policyId)

    // Sampling activity filter
    const userSampleCount = getUserSamplingCount(user.id)
    const userSiteCount = getUserUniqueSites(user.id).length
    
    let matchesSamplingActivity = true
    switch (selectedSamplingActivity.value) {
      case 'active_samplers':
        matchesSamplingActivity = userSampleCount > 0
        break
      case 'inactive_samplers':
        matchesSamplingActivity = userSampleCount === 0
        break
      case 'high_activity':
        matchesSamplingActivity = userSampleCount >= 5
        break
      case 'multiple_sites':
        matchesSamplingActivity = userSiteCount >= 2
        break
      case 'all':
      default:
        matchesSamplingActivity = true
    }

    // Site search filter
    const matchesSiteSearch = siteSearchQuery.value === '' || 
      getUserUniqueSites(user.id).some(site => 
        site.toLowerCase().includes(siteSearchQuery.value.toLowerCase())
      )
    
    return matchesSearch && matchesStatus && matchesHub && matchesTraining && 
           matchesRole && matchesSamplingActivity && matchesSiteSearch
  }).sort((a, b) => {
    const aValue = getSortValue(a, sortBy.value)
    const bValue = getSortValue(b, sortBy.value)
    return sortDirection.value === 'asc' 
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue)
  })
})

const filterStats = computed(() => {
  const totalUsers = users.value.length
  const activeSamplers = users.value.filter(user => getUserSamplingCount(user.id) > 0).length
  const inactiveSamplers = totalUsers - activeSamplers
  const highActivitySamplers = users.value.filter(user => getUserSamplingCount(user.id) >= 5).length
  const multipleSiteSamplers = users.value.filter(user => getUserUniqueSites(user.id).length >= 2).length
  
  return {
    totalUsers,
    activeSamplers,
    inactiveSamplers,
    highActivitySamplers,
    multipleSiteSamplers
  }
})

// Get user IDs for sampling intent summary
const filteredUserIds = computed(() => {
  return filteredAndSortedUsers.value.map(user => user.id);
});

const clearAllFilters = () => {
  searchQuery.value = ''
  selectedStatus.value = 'all'
  selectedHub.value = 'all'
  selectedTraining.value = 'all'
  selectedRole.value = 'all' // NEW: Clear role filter
  selectedSamplingActivity.value = 'all'
  siteSearchQuery.value = ''
  sortBy.value = 'name'
  sortDirection.value = 'asc'
}

// Handle count update from the SamplingIntentSummary component
const updateSamplersCount = (count) => {
  samplersWithPlans.value = count;
};

// Function to fetch samplers with plans count
const fetchSamplersWithPlansCount = async () => {
  try {
    // Query the sampling_intent table to count unique users with plans for the current year
    const response = await useDirectus(readItems('sampling_intent', {
      filter: {
        year: { _eq: currentYear.value }
      },
      fields: ['user_id'],
      limit: -1
    }));
    
    // Count unique user IDs
    const uniqueUserIds = new Set(response.map(plan => plan.user_id));
    samplersWithPlans.value = uniqueUserIds.size;
  } catch (err) {
    console.error('Error fetching samplers with plans count:', err);
    samplersWithPlans.value = 0;
  }
};

// Fetch actual sampling data for the current year
const fetchActualSamplingData = async () => {
  try {
    const response = await useDirectus(readItems('base_samples', {
      filter: {
        date: { 
          _gte: `${currentYear.value}-01-01`, 
          _lte: `${currentYear.value}-12-31` 
        }
      },
      fields: [
        'volunteer_id.id',  // Get the actual ID
        'volunteer_id.first_name',
        'volunteer_id.last_name', 
        'wwky_id.description',
        'wwky_id.wwkyid_pk',
        'date'
      ],
      limit: -1
    }));
    
    actualSamplingData.value = response;
  } catch (err) {
    console.error('Error fetching actual sampling data:', err);
    actualSamplingData.value = [];
  }
};

// Update the getUserSamplingCount function:
const getUserSamplingCount = (userId) => {
  return actualSamplingData.value.filter(sample => {
    // Handle both cases: volunteer_id as object or direct ID
    const sampleVolunteerId = sample.volunteer_id?.id || sample.volunteer_id;
    return sampleVolunteerId === userId;
  }).length;
};

// Fixed: getUserUniqueSites function  
const getUserUniqueSites = (userId) => {
  const userSamples = actualSamplingData.value.filter(sample => {
    // Handle both cases: volunteer_id as object or direct ID
    const sampleVolunteerId = sample.volunteer_id?.id || sample.volunteer_id;
    return sampleVolunteerId === userId;
  });
  
  const uniqueSites = new Set(
    userSamples
      .map(sample => {
        if (sample.wwky_id?.wwkyid_pk && sample.wwky_id?.description) {
          return `${sample.wwky_id.wwkyid_pk}: ${sample.wwky_id.description}`;
        }
        return sample.wwky_id?.wwkyid_pk || sample.wwky_id?.description || sample.wwky_id;
      })
      .filter(Boolean)
  );
  return Array.from(uniqueSites);
};

const getUserUniqueSiteIds = (userId) => {
  const userSamples = actualSamplingData.value.filter(sample => {
    // Handle both cases: volunteer_id as object or direct ID
    const sampleVolunteerId = sample.volunteer_id?.id || sample.volunteer_id;
    return sampleVolunteerId === userId;
  });
  
  const uniqueSiteIds = new Set(
    userSamples
      .map(sample => sample.wwky_id?.wwkyid_pk)
      .filter(Boolean)
  );
  return Array.from(uniqueSiteIds);
};

// Export to CSV function with sampling intent data AND actual sampling data
const exportToCSV = async () => {
  // Define months for consistency
  const months = [
    { name: 'January', abbr: 'Jan', key: 'jan' },
    { name: 'February', abbr: 'Feb', key: 'feb' },
    { name: 'March', abbr: 'Mar', key: 'mar' },
    { name: 'April', abbr: 'Apr', key: 'apr' },
    { name: 'May', abbr: 'May', key: 'may' },
    { name: 'June', abbr: 'Jun', key: 'jun' },
    { name: 'July', abbr: 'Jul', key: 'jul' },
    { name: 'August', abbr: 'Aug', key: 'aug' },
    { name: 'September', abbr: 'Sep', key: 'sep' },
    { name: 'October', abbr: 'Oct', key: 'oct' },
    { name: 'November', abbr: 'Nov', key: 'nov' },
    { name: 'December', abbr: 'Dec', key: 'dec' }
  ];
  
  // Set up headers
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Status',
    'Hub',
    'Roles', // NEW: Add roles column
    'Street',
    'City',
    'State',
    'ZIP',
    'Training Field Chemistry',
    'Training R-Card',
    'Training Habitat',
    'Training Biological',
    'Original Training Date',
    'Latest Training Date',
    'Actual Samples Collected',
    'Unique Sites Sampled',
    'Sites List'
  ];

  // Add sampling intent columns for each month
  months.forEach(month => {
    headers.push(`${month.abbr} Sites (Planned)`);
    headers.push(`${month.abbr} E.coli Cards (Planned)`);
  });

  // First, fetch all sampling intent data for the current year in one query
  let samplingIntentData = [];
  try {
    const response = await useDirectus(readItems('sampling_intent', {
      filter: {
        year: { _eq: currentYear.value }
      },
      fields: ['*'],
      limit: -1
    }));
    samplingIntentData = response;
  } catch (err) {
    console.error('Error fetching sampling intent data for CSV:', err);
    // Continue with what we have
  }

  // Create a lookup map for quicker access
  const intentByUserId = {};
  samplingIntentData.forEach(intent => {
    intentByUserId[intent.user_id] = intent;
  });

  // NEW: Helper function to get user roles
  const getUserRoles = (user) => {
    const userRoles = [];
    Object.entries(userGroups).forEach(([key, group]) => {
      if (user.policies?.some(p => p.policy?.id === group.policyId)) {
        userRoles.push(group.title);
      }
    });
    return userRoles.join(' | ');
  };

  // Process user data and combine with sampling intent and actual sampling
  const csvData = filteredAndSortedUsers.value.map(user => {
    // Basic user data
    const userData = [
      user.first_name,
      user.last_name,
      user.email,
      formatPhoneNumber(user.phone),
      user.status,
      user.sampler_data?.hub_id?.Description,
      getUserRoles(user), // NEW: Add user roles
      user.street,
      user.city,
      user.state,
      user.zip,
      user.sampler_data?.training_field_chemistry ? 'Yes' : 'No',
      user.sampler_data?.training_r_card ? 'Yes' : 'No',
      user.sampler_data?.training_habitat ? 'Yes' : 'No',
      user.sampler_data?.training_biological ? 'Yes' : 'No',
      formatDate(user.sampler_data?.original_training_date),
      formatDate(user.sampler_data?.training_date_latest),
      getUserSamplingCount(user.id),
      getUserUniqueSites(user.id).length,
      getUserUniqueSiteIds(user.id).join(' | ') // Changed to use site IDs with pipe separation
    ];

    // Get sampling intent data for this user
    const userIntent = intentByUserId[user.id] || null;
    
    // Add sampling intent data for each month
    months.forEach(month => {
      const key = month.key;
      userData.push(userIntent ? (userIntent[`${key}_sites`] || 0) : 0);
      userData.push(userIntent ? (userIntent[`${key}_ecoli`] || 0) : 0);
    });

    return userData;
  });

  // Create CSV content
  const csvContent = [headers, ...csvData]
    .map(row => row.map(cell => `"${(cell !== undefined && cell !== null) ? cell : ''}"`).join(','))
    .join('\n');

  // Create and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `users_export_${currentYear.value}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const visibleGroups = ref(Object.keys(userGroups).reduce((acc, key) => {
  acc[key] = true; // All groups visible by default
  return acc;
}, {}));

// Year selection buttons
const changeYear = (newYear) => {
  currentYear.value = newYear;
  fetchSamplersWithPlansCount();
  fetchActualSamplingData();
};

const fetchUsers = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const nuxtApp = useNuxtApp();
    const response = await nuxtApp.$directus.request(readItems('sampler_data', {
      fields: [
        '*',
        'user_id.*.*',
        'hub_id.*.*',
        'user_id.policies.*.*'
      ],
      limit: -1,
    }));

    // Transform the response to handle user_id structure
    const transformedUsers = response
      .filter(item => item.user_id) // Filter items with user data
      .map(item => ({
        ...item.user_id,  // Spread the user_id data
        id: item.user_id.id,
        policies: item.user_id.policies,
        sampler_data: {
          training_field_chemistry: item.training_field_chemistry,
          training_r_card: item.training_r_card,
          training_habitat: item.training_habitat,
          training_biological: item.training_biological,
          hub_id: item.hub_id,
          status: item.status,
          id: item.id,
          original_training_date: item.original_training_date,
          training_date_latest: item.training_date_latest,
          equip_ph: item.equip_ph,
          equip_do: item.equip_do,
          equip_cond: item.equip_cond,
          equip_thermo: item.equip_thermo,
          equip_waste: item.equip_waste,
          equip_pan: item.equip_pan,
          equip_flip: item.equip_flip,
          equip_incubator: item.equip_incubator,
          kitOption: item.kitOption,
          DO_expire: item.DO_expire,
          PH_expire: item.PH_expire
        }
      }));
    
    users.value = transformedUsers;
  } catch (err) {
    console.error('Error fetching users:', err);
    error.value = 'Failed to load users';
  } finally {
    loading.value = false;
  }
};

// Update the getUsersByPolicy computed function:
const getUsersByPolicy = (policyId) => {
  return computed(() => {
    return filteredAndSortedUsers.value.filter(user => 
      user.policies?.some(p => p.policy?.id === policyId)
    ).sort((a, b) => {
      const lastNameA = a.last_name?.toLowerCase() || '';
      const lastNameB = b.last_name?.toLowerCase() || '';
      return lastNameA.localeCompare(lastNameB);
    });
  });
};

const toggleGroupVisibility = (groupKey) => {
  visibleGroups.value[groupKey] = !visibleGroups.value[groupKey];
};

// Format functions
const formatDate = (date) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString();
};

const formatName = (user) => {
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed User';
};

const formatPhoneNumber = (phone: string | null) => {
  if (!phone) return 'Not specified';
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  // Check if we have the right number of digits
  if (cleaned.length !== 10) {
    return phone; // Return original if not valid
  }
  // Format as (XXX) XXX-XXXX
  return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
};

// Get count of samplers (users with the sampler policy)
const samplerCount = computed(() => {
  return users.value.filter(user => 
    user.policies?.some(p => p.policy?.id === config.public.SAMPLER_POLICY_ID)
  ).length;
});

// Navigate to sampling dashboard
const goToSamplingIntentDashboard = () => {
  navigateTo('/portal/SamplingIntentDashboard');
};

// Load data on mount
onMounted(() => {
  fetchUsers();
  fetchSamplersWithPlansCount();
  fetchActualSamplingData();
});
</script>

<template>
  <PolicyGuard path="/portal/users">
    <div>
      <PortalPageHeader
        title="Kentucky Watershed Watch Users"
        :breadcrumbs="[
          { title: 'Portal', href: '/portal' },
          { title: 'Users', href: '/portal/users' }
        ]"
      />

      <div class="container mx-auto px-4 space-y-6">
        <ULoadingBlock v-if="loading" class="h-64" />

        <UAlert
          v-else-if="error"
          type="error"
          :title="error"
          class="mb-4"
        />
       
        <template v-else>
          <!-- Filter Controls -->
         <UCard>
          <div class="space-y-4">
            <div class="flex justify-between items-center mb-2">
              <div class="flex items-center gap-4">
                <h3 class="text-lg font-semibold">Filters</h3>
                <UBadge color="blue" variant="soft">
                  {{ filteredAndSortedUsers.length }} of {{ users.length }} users
                </UBadge>
              </div>
              
              <!-- Year selection -->
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">Current Year:</span>
                <UButtonGroup size="sm">
                  <UButton
                    :color="currentYear === currentYear - 1 ? 'primary' : 'gray'"
                    @click="changeYear(currentYear - 1)"
                  >
                    {{ currentYear - 1 }}
                  </UButton>
                  <UButton
                    :color="currentYear === currentYear ? 'primary' : 'gray'"
                    @click="changeYear(currentYear)"
                  >
                    {{ currentYear }}
                  </UButton>
                  <UButton
                    :color="currentYear === currentYear + 1 ? 'primary' : 'gray'"
                    :disabled="currentYear + 1 > new Date().getFullYear() + 1"
                    @click="changeYear(currentYear + 1)"
                  >
                    {{ currentYear + 1 }}
                  </UButton>
                </UButtonGroup>
              </div>
            </div>

            <!-- Filter Statistics -->
            <div class="bg-gray-50 p-3 rounded-lg">
              <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div class="text-center">
                  <div class="font-semibold text-green-600">{{ filterStats.activeSamplers }}</div>
                  <div class="text-gray-600">Active Samplers</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-gray-600">{{ filterStats.inactiveSamplers }}</div>
                  <div class="text-gray-600">No Samples Yet</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-blue-600">{{ filterStats.highActivitySamplers }}</div>
                  <div class="text-gray-600">High Activity (5+)</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-purple-600">{{ filterStats.multipleSiteSamplers }}</div>
                  <div class="text-gray-600">Multiple Sites</div>
                </div>
                <div class="text-center">
                  <div class="font-semibold text-orange-600">{{ users.length }}</div>
                  <div class="text-gray-600">Total Users</div>
                </div>
              </div>
            </div>

            <!-- Main Filters - First Row -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <!-- Search -->
              <UInput
                v-model="searchQuery"
                icon="i-heroicons-magnifying-glass"
                placeholder="Search users..."
              />

              <!-- Status Filter -->
              <USelect
                v-model="selectedStatus"
                :options="[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' }
                ]"
              />

              <!-- Hub Filter -->
              <USelect
                v-model="selectedHub"
                :options="uniqueHubs.map(hub => ({
                  value: hub,
                  label: hub === 'all' ? 'All Hubs' : hub
                }))"
              />

              <!-- NEW: Role/Group Filter -->
              <USelect
                v-model="selectedRole"
                :options="roleOptions"
                placeholder="Filter by role"
              >
                <template #label>
                  <UIcon name="i-heroicons-user-group" class="w-4 h-4 mr-1" />
                  Role
                </template>
              </USelect>

              <!-- Training Filter -->
              <USelect
                v-model="selectedTraining"
                :options="trainingOptions"
              />
            </div>

            <!-- Second Row - Sampling Filters -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Sampling Activity Filter -->
              <USelect
                v-model="selectedSamplingActivity"
                :options="samplingActivityOptions"
                placeholder="Filter by sampling activity"
              >
                <template #label>
                  <UIcon name="i-heroicons-beaker" class="w-4 h-4 mr-1" />
                  Sampling Activity
                </template>
              </USelect>

              <!-- Site Search -->
              <UInput
                v-model="siteSearchQuery"
                icon="i-heroicons-map-pin"
                placeholder="Search by site ID or description..."
              >
                <template #label>
                  Site Search
                </template>
              </UInput>
            </div>

            <!-- Controls Row -->
            <div class="flex justify-between items-center">
              <!-- Sort Controls -->
              <div class="flex items-center gap-2">
                <USelect
                  v-model="sortBy"
                  :options="[
                    { value: 'name', label: 'Sort by Name' },
                    { value: 'email', label: 'Sort by Email' },
                    { value: 'hub', label: 'Sort by Hub' },
                    { value: 'status', label: 'Sort by Status' }
                  ]"
                  class="w-40"
                />
                <UButton
                  @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'"
                  :icon="sortDirection === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
                  color="gray"
                  variant="ghost"
                />
              </div>

              <!-- Action Buttons -->
              <div class="flex items-center gap-2">
                <!-- Clear Filters -->
                <UButton
                  @click="clearAllFilters"
                  color="gray"
                  variant="outline"
                  size="sm"
                  icon="i-heroicons-x-mark"
                >
                  Clear Filters
                </UButton>

                <!-- Export Button -->
                <UButton
                  @click="exportToCSV"
                  icon="i-heroicons-arrow-down-tray"
                  color="primary"
                >
                  Export to CSV
                </UButton>
              </div>
            </div>

            <!-- Active Filters Display -->
            <div v-if="searchQuery || selectedStatus !== 'all' || selectedHub !== 'all' || selectedTraining !== 'all' || selectedRole !== 'all' || selectedSamplingActivity !== 'all' || siteSearchQuery" class="flex flex-wrap gap-2">
              <span class="text-sm text-gray-600">Active filters:</span>
              
              <UBadge v-if="searchQuery" color="blue" variant="soft" @click="searchQuery = ''" class="cursor-pointer">
                Search: "{{ searchQuery }}" ×
              </UBadge>
              
              <UBadge v-if="selectedStatus !== 'all'" color="green" variant="soft" @click="selectedStatus = 'all'" class="cursor-pointer">
                Status: {{ selectedStatus }} ×
              </UBadge>
              
              <UBadge v-if="selectedHub !== 'all'" color="purple" variant="soft" @click="selectedHub = 'all'" class="cursor-pointer">
                Hub: {{ selectedHub }} ×
              </UBadge>
              
              <UBadge v-if="selectedRole !== 'all'" color="indigo" variant="soft" @click="selectedRole = 'all'" class="cursor-pointer">
                Role: {{ userGroups[selectedRole]?.title }} ×
              </UBadge>
              
              <UBadge v-if="selectedTraining !== 'all'" color="orange" variant="soft" @click="selectedTraining = 'all'" class="cursor-pointer">
                Training: {{ trainingOptions.find(t => t.value === selectedTraining)?.label }} ×
              </UBadge>
              
              <UBadge v-if="selectedSamplingActivity !== 'all'" color="red" variant="soft" @click="selectedSamplingActivity = 'all'" class="cursor-pointer">
                Activity: {{ samplingActivityOptions.find(a => a.value === selectedSamplingActivity)?.label }} ×
              </UBadge>
              
              <UBadge v-if="siteSearchQuery" color="gray" variant="soft" @click="siteSearchQuery = ''" class="cursor-pointer">
                Site: "{{ siteSearchQuery }}" ×
              </UBadge>
            </div>
          </div>
        </UCard>

          <!-- Sampling Intent Summary -->
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-chart-bar" class="w-5 h-5" />
                  <h2 class="text-xl font-semibold">{{ currentYear }} Sampling Plans Summary</h2>
                </div>
              </div>
              <p class="text-sm text-gray-600 mt-1">
                Overview of planned sampling sites and E. coli card usage for {{ filteredAndSortedUsers.length }} users
              </p>
            </template>
            
            <SamplingIntentSummary
              :user-ids="filteredUserIds"
              :year="currentYear"
              @update:count="updateSamplersCount"
            />
          </UCard>

          <!-- Stats Overview -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-users" class="w-5 h-5" />
                <h2 class="text-xl font-semibold">User Statistics</h2>
              </div>
              <div>
                <p class="text-sm text-gray-600 mt-1">Users may belong to more than one group</p>
              </div>
            </template>
            
            <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div 
                v-for="(group, key) in userGroups" 
                :key="key" 
                class="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                @click="toggleGroupVisibility(key)"
              >
                <div class="flex items-center justify-between mb-2">
                  <UIcon :name="group.icon" class="w-8 h-8 text-primary-500" />
                  <UIcon 
                    :name="visibleGroups[key] ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'" 
                    class="w-5 h-5 text-gray-500"
                  />
                </div>
                <div class="text-2xl font-bold">
                  {{ getUsersByPolicy(group.policyId).value.length }}
                </div>
                <div class="text-sm text-gray-600">{{ group.title }}</div>
              </div>
              
              <!-- Sampling plan summary card -->
              <div class="p-4 bg-gray-50 rounded-lg">
                <div class="mb-2">
                  <UIcon name="i-heroicons-document-chart-bar" class="w-8 h-8 text-blue-500" />
                </div>
                <div class="text-2xl font-bold text-blue-600">
                  {{ samplersWithPlans }}
                </div>
                <div class="text-sm text-gray-600">Samplers with Plans</div>
                <div class="text-xs text-gray-500 mt-1" v-if="samplersWithPlans > 0">
                  For {{ currentYear }}
                </div>
              </div>
            </div>
          </UCard>

          <!-- Connections Dashboard -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-chat-bubble-left-right" class="w-5 h-5" />
                <h2 class="text-xl font-semibold">Sampler Connections Analytics</h2>
              </div>
              <p class="text-sm text-gray-600 mt-1">Visualizing collaboration between samplers for {{ currentYear }}</p>
            </template>
            
            <ConnectionsDashboard 
              :user-ids="filteredUserIds" 
              :year="currentYear"
            />
          </UCard>

          <!-- User Lists by Type -->
          <div v-for="(group, key) in userGroups" :key="key">
            <UCard 
              v-if="getUsersByPolicy(group.policyId).value.length && visibleGroups[key]"
              class="transition-all duration-300"
            >
              <template #header>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <UIcon :name="group.icon" class="w-5 h-5" />
                    <h2 class="text-xl font-semibold">{{ group.title }}</h2>
                  </div>
                  <div class="flex items-center gap-2">
                    <UBadge>{{ getUsersByPolicy(group.policyId).value.length }}</UBadge>
                    <UButton
                      icon="i-heroicons-eye-slash"
                      color="gray"
                      variant="ghost"
                      size="sm"
                      @click="toggleGroupVisibility(key)"
                    />
                  </div>
                </div>
                <p class="text-sm text-gray-600 mt-1">{{ group.description }}</p>
              </template>

              <div class="grid gap-4">
                <div v-for="user in getUsersByPolicy(group.policyId).value"
                  :key="user.id"
                  class="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div class="space-y-4">
                    <!-- Basic Info -->
                    <div class="flex justify-between items-start">
                      <div>
                        <h3 class="font-medium text-lg">{{ formatName(user) }}</h3>
                        <p class="text-sm text-gray-600">{{ user.email }}</p>
                        <p class="text-sm text-gray-600">{{ formatPhoneNumber(user.phone) }}</p>
                      </div>
                      <UBadge :color="user.status === 'active' ? 'green' : 'yellow'">
                        {{ user.status }}
                      </UBadge>
                    </div>

                    <!-- Address -->
                    <div class="text-sm">
                      <p class="text-gray-900 font-medium">Address:</p>
                      <p class="text-gray-600">{{ user.street }}</p>
                      <p class="text-gray-600">{{ user.city }}, {{ user.state }} {{ user.zip }}</p>
                    </div>

                    <!-- Role and Hub -->
                    <div class="text-sm">
                      <p class="text-gray-900 font-medium">
                        User Type: {{ user?.role?.name }}
                      </p>
                      <p class="text-gray-900 font-medium">
                        Role(s): {{ user?.policies?.map(p => p.policy?.name).filter(Boolean).join(', ') || 'No Role' }}
                      </p>
                      <div class="mt-1 flex items-center gap-2">
                        <p class="text-gray-900 font-medium">
                          Preferred Hub: {{ user.sampler_data?.hub_id?.Description || 'None' }}
                        </p>
                        <!-- Show info button only if there's a hub -->
                        <UButton
                          v-if="user.sampler_data?.hub_id?.Description"
                          icon="i-heroicons-information-circle"
                          color="gray"
                          variant="ghost"
                          size="xs"
                          @click="showHubInfo[user.id] = true"
                        />
                      </div>
                    </div>

                    <!-- Hub Info Modal -->
                    <UModal
                      v-if="user.sampler_data?.hub_id?.Description"
                      v-model="showHubInfo[user.id]"
                      :ui="{
                        overlay: {
                          background: 'bg-gray-300/50',  // This makes it 50% transparent
                          transition: {
                            enter: 'ease-out duration-300',
                            enterFrom: 'opacity-0',
                            enterTo: 'opacity-100',
                            leave: 'ease-in duration-200',
                            leaveFrom: 'opacity-100',
                            leaveTo: 'opacity-0'
                          }
                        },
                        width: 'sm:max-w-lg'  // Controls modal width
                      }"
                    >
                      <UCard>
                        <template #header>
                          <div class="flex justify-between items-center">
                            <h3 class="text-lg font-medium">Hub Information</h3>
                            <UButton
                              icon="i-heroicons-x-mark"
                              color="gray"
                              variant="ghost"
                              @click="showHubInfo[user.id] = false"
                            />
                          </div>
                        </template>

                        <div class="space-y-4">
                          <div>
                            <h4 class="font-medium text-lg">{{ user.sampler_data.hub_id.Description }}</h4>
                            <p class="text-sm text-gray-600">{{ user.sampler_data.hub_id.Full_Address }}</p>
                          </div>

                          <div class="text-sm space-y-2">
                            <p><span class="font-medium">Contact:</span> {{ user.sampler_data.hub_id.Contact_Person }}</p>
                            <p><span class="font-medium">Phone:</span> {{ user.sampler_data.hub_id.Phone }}</p>
                            <p><span class="font-medium">Email:</span> {{ user.sampler_data.hub_id.Email }}</p>
                          </div>

                          <div v-if="user.sampler_data.hub_id.Availability" class="text-sm">
                            <p class="font-medium">Availability:</p>
                            <p>{{ user.sampler_data.hub_id.Availability }}</p>
                          </div>
                        </div>
                      </UCard>
                    </UModal>
                    
                    <!-- Sampler Information -->
                    <div v-if="user.sampler_data" class="text-sm border-t pt-3 mt-3">
                      <p class="font-medium mb-2">Sampler Information:</p>
                      
                      <!-- Training -->
                      <div class="mb-2">
                        <p class="text-gray-900">Training Completed:</p>
                        <ul class="list-disc list-inside text-gray-600 ml-2">
                          <li v-if="user.sampler_data.training_field_chemistry">Field Chemistry</li>
                          <li v-if="user.sampler_data.training_r_card">R-Card</li>
                          <li v-if="user.sampler_data.training_habitat">Habitat</li>
                          <li v-if="user.sampler_data.training_biological">Biological</li>
                        </ul>
                        <p class="text-gray-600 mt-1">
                          Original Training: {{ formatDate(user.sampler_data.original_training_date) }}
                        </p>
                        <p class="text-gray-600">
                          Latest Training: {{ formatDate(user.sampler_data.training_date_latest) }}
                        </p>
                      </div>

                      <!-- Equipment -->
                      <div class="mb-2">
                        <p class="text-gray-900">Equipment:</p>
                        <ul class="list-disc list-inside text-gray-600 ml-2">
                          <li v-if="user.sampler_data.equip_ph">pH Meter</li>
                          <li v-if="user.sampler_data.equip_do">DO Meter</li>
                          <li v-if="user.sampler_data.equip_cond">Conductivity Meter</li>
                          <li v-if="user.sampler_data.equip_thermo">Thermometer</li>
                          <li v-if="user.sampler_data.equip_waste">Waste Container</li>
                          <li v-if="user.sampler_data.equip_pan">Pan</li>
                          <li v-if="user.sampler_data.equip_flip">Flip</li>
                          <li v-if="user.sampler_data.equip_incubator">Incubator</li>
                        </ul>
                      </div>

                      <!-- Kit Information -->
                      <div class="mb-2">
                        <p class="text-gray-900">Kit Option: {{ user.sampler_data.kitOption || 'None' }}</p>
                        <p v-if="user.sampler_data.DO_expire" class="text-gray-600">
                          DO Expiration: {{ formatDate(user.sampler_data.DO_expire) }}
                        </p>
                        <p v-if="user.sampler_data.PH_expire" class="text-gray-600">
                          pH Expiration: {{ formatDate(user.sampler_data.PH_expire) }}
                        </p>
                      </div>

                      <!-- Actual Sampling Activity -->
                      <div class="mb-2">
                        <p class="text-gray-900">{{ currentYear }} Sampling Activity:</p>
                        <div class="bg-blue-50 p-2 rounded mt-1">
                          <p class="text-blue-800 font-medium">
                            Samples Collected: {{ getUserSamplingCount(user.id) }}
                          </p>
                          <p class="text-blue-700">
                            Unique Sites: {{ getUserUniqueSites(user.id).length }}
                          </p>
                          <div v-if="getUserUniqueSites(user.id).length > 0" class="mt-1">
                            <p class="text-blue-700 text-xs">Sites:</p>
                            <div class="text-blue-600 text-xs">
                              <div v-for="site in getUserUniqueSites(user.id)" :key="site" class="mb-1">
                                {{ site }}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <!-- Sampling Plans -->
                      <div>
                        <p class="text-gray-900">Sampling Plans:</p>
                        <div class="mt-1 border-l-4 border-blue-200 pl-3 py-1">
                          <UserSamplingIntent 
                            :user-id="user.id"
                            :year="currentYear"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </UCard>
          </div>
        </template>
      </div>
    </div>
  </PolicyGuard>
</template>

<style scoped>
.container {
  max-width: 1400px;
}
</style>