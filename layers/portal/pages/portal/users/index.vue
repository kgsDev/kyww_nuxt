<script setup lang="ts">
  //users/index.vue - display and manage users in the Kentucky Watershed Watch portal
  import { ref, computed, onMounted, watch } from 'vue'
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

  // NEW: Collapsible cards functionality
  const expandedUsers = ref(new Set()) // Track which user cards are expanded
  const allExpanded = ref(true) // Track if all are expanded by default
  const showScrollTop = ref(false) // Track scroll position for back-to-top button

  // NEW: Initialize all users as expanded by default
  watch(users, (newUsers) => {
    if (newUsers.length > 0 && expandedUsers.value.size === 0) {
      newUsers.forEach(user => {
        expandedUsers.value.add(user.id)
      })
    }
  }, { immediate: true })

  // NEW: Scroll handling
  const handleScroll = () => {
    showScrollTop.value = window.scrollY > 300
  }

  // NEW: Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // NEW: Toggle individual user card
  const toggleUserCard = (userId) => {
    if (expandedUsers.value.has(userId)) {
      expandedUsers.value.delete(userId)
    } else {
      expandedUsers.value.add(userId)
    }
  }

  // NEW: Expand all user cards
  const expandAllCards = () => {
    filteredAndSortedUsers.value.forEach(user => {
      expandedUsers.value.add(user.id)
    })
    allExpanded.value = true
  }

  // NEW: Collapse all user cards
  const collapseAllCards = () => {
    expandedUsers.value.clear()
    allExpanded.value = false
  }

  // NEW: Toggle all cards
  const toggleAllCards = () => {
    if (allExpanded.value) {
      collapseAllCards()
    } else {
      expandAllCards()
    }
  }

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
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
  });

  // Cleanup scroll listener
  onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
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


      <div class="container mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
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
          <div class="space-y-3 sm:space-y-4">
            <div class="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:justify-between sm:items-start">
              <div class="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:gap-4">
                <h3 class="text-base sm:text-lg font-semibold">Filters</h3>
                <UBadge color="blue" variant="soft" size="sm">
                  {{ filteredAndSortedUsers.length }} of {{ users.length }} users
                </UBadge>
              </div>
              
              <!-- Year selection -->
              <div class="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:gap-2">
                <span class="text-xs sm:text-sm text-gray-600">Current Year:</span>
                <UButtonGroup size="sm" class="flex">
                  <UButton
                    :color="currentYear === currentYear - 1 ? 'primary' : 'gray'"
                    @click="changeYear(currentYear - 1)"
                    size="sm"
                    class="text-xs"
                  >
                    {{ currentYear - 1 }}
                  </UButton>
                  <UButton
                    :color="currentYear === currentYear ? 'primary' : 'gray'"
                    @click="changeYear(currentYear)"
                    size="sm"
                    class="text-xs"
                  >
                    {{ currentYear }}
                  </UButton>
                  <UButton
                    :color="currentYear === currentYear + 1 ? 'primary' : 'gray'"
                    :disabled="currentYear + 1 > new Date().getFullYear() + 1"
                    @click="changeYear(currentYear + 1)"
                    size="sm"
                    class="text-xs"
                  >
                    {{ currentYear + 1 }}
                  </UButton>
                </UButtonGroup>
              </div>
            </div>

            <!-- Filter Statistics -->
            <div class="bg-gray-50 p-3 rounded-lg">
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                <div class="text-center p-2 bg-white rounded shadow-sm">
                  <div class="text-2xl font-bold text-green-600">{{ filterStats.activeSamplers }}</div>
                  <div class="text-gray-600 text-xs">Active Samplers</div>
                </div>
                <div class="text-center p-2 bg-white rounded shadow-sm">
                  <div class="text-2xl font-bold text-gray-600">{{ filterStats.inactiveSamplers }}</div>
                  <div class="text-gray-600 text-xs">No Samples Yet</div>
                </div>
                <div class="text-center p-2 bg-white rounded shadow-sm">
                  <div class="text-2xl font-bold text-blue-600">{{ filterStats.highActivitySamplers }}</div>
                  <div class="text-gray-600 text-xs">High Activity (5+)</div>
                </div>
                <div class="text-center p-2 bg-white rounded shadow-sm">
                  <div class="text-2xl font-bold text-purple-600">{{ filterStats.multipleSiteSamplers }}</div>
                  <div class="text-gray-600 text-xs">Multiple Sites</div>
                </div>
                <div class="text-center p-2 bg-white rounded shadow-sm">
                  <div class="text-2xl font-bold text-orange-600">{{ users.length }}</div>
                  <div class="text-gray-600 text-xs">Total Users</div>
                </div>
              </div>
            </div>

<!-- Main Filters - First Row -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <!-- Search -->
              <div class="sm:col-span-2 lg:col-span-1">
                <UInput
                  v-model="searchQuery"
                  icon="i-heroicons-magnifying-glass"
                  placeholder="Search users..."
                />
              </div>

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

              <!-- Role/Group Filter -->
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
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            <div class="flex flex-col space-y-3 sm:space-y-0 sm:flex-row sm:justify-between sm:items-start">
              <!-- Sort Controls -->
              <div class="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:gap-2">
                <USelect
                  v-model="sortBy"
                  :options="[
                    { value: 'name', label: 'Sort by Name' },
                    { value: 'email', label: 'Sort by Email' },
                    { value: 'hub', label: 'Sort by Hub' },
                    { value: 'status', label: 'Sort by Status' }
                  ]"
                  size="sm"
                  class="w-full sm:w-36"
                />
                <UButton
                  @click="sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'"
                  :icon="sortDirection === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
                  color="gray"
                  variant="ghost"
                  size="sm"
                />
              </div>

              <!-- Action Buttons -->
              <div class="flex flex-col space-y-2 sm:space-y-0 sm:flex-row sm:items-center sm:gap-2">
                <!-- Clear Filters -->
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

                <!-- Export Button -->
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

            <!-- Active Filters Display -->
            <div v-if="searchQuery || selectedStatus !== 'all' || selectedHub !== 'all' || selectedTraining !== 'all' || selectedRole !== 'all' || selectedSamplingActivity !== 'all' || siteSearchQuery" class="flex flex-wrap gap-1 sm:gap-2">
              <span class="text-xs sm:text-sm text-gray-600 mr-1">Active filters:</span>
              
              <UBadge v-if="searchQuery" color="blue" variant="soft" @click="searchQuery = ''" class="cursor-pointer text-xs" size="sm">
                Search: "{{ searchQuery.length > 10 ? searchQuery.substring(0, 10) + '...' : searchQuery }}" ×
              </UBadge>
              
              <UBadge v-if="selectedStatus !== 'all'" color="green" variant="soft" @click="selectedStatus = 'all'" class="cursor-pointer text-xs" size="sm">
                Status: {{ selectedStatus }} ×
              </UBadge>
              
              <UBadge v-if="selectedHub !== 'all'" color="purple" variant="soft" @click="selectedHub = 'all'" class="cursor-pointer text-xs" size="sm">
                Hub: {{ selectedHub.length > 15 ? selectedHub.substring(0, 15) + '...' : selectedHub }} ×
              </UBadge>
              
              <UBadge v-if="selectedRole !== 'all'" color="indigo" variant="soft" @click="selectedRole = 'all'" class="cursor-pointer text-xs" size="sm">
                Role: {{ userGroups[selectedRole]?.title }} ×
              </UBadge>
              
              <UBadge v-if="selectedTraining !== 'all'" color="orange" variant="soft" @click="selectedTraining = 'all'" class="cursor-pointer text-xs" size="sm">
                Training: {{ trainingOptions.find(t => t.value === selectedTraining)?.label }} ×
              </UBadge>
              
              <UBadge v-if="selectedSamplingActivity !== 'all'" color="red" variant="soft" @click="selectedSamplingActivity = 'all'" class="cursor-pointer text-xs" size="sm">
                Activity: {{ samplingActivityOptions.find(a => a.value === selectedSamplingActivity)?.label.length > 12 ? samplingActivityOptions.find(a => a.value === selectedSamplingActivity)?.label.substring(0, 12) + '...' : samplingActivityOptions.find(a => a.value === selectedSamplingActivity)?.label }} ×
              </UBadge>
              
              <UBadge v-if="siteSearchQuery" color="gray" variant="soft" @click="siteSearchQuery = ''" class="cursor-pointer text-xs" size="sm">
                Site: "{{ siteSearchQuery.length > 10 ? siteSearchQuery.substring(0, 10) + '...' : siteSearchQuery }}" ×
              </UBadge>
            </div>
          </div>
        </UCard>

          <!-- Sampling Intent Summary -->
          <UCard>
            <template #header>
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-chart-bar" class="w-5 h-5" />
                  <h2 class="text-base sm:text-lg lg:text-xl font-semibold">{{ currentYear }} Sampling Plans</h2>
                </div>
              </div>
              <p class="text-xs sm:text-sm text-gray-600 mt-1">
                Overview for {{ filteredAndSortedUsers.length }} users
              </p>
            </template>
            
            <!-- Mobile: Hide the table on very small screens -->
            <div class="hidden sm:block overflow-x-auto">
              <SamplingIntentSummary
                :user-ids="filteredUserIds"
                :year="currentYear"
                @update:count="updateSamplersCount"
              />
            </div>
            
            <!-- Mobile: Show simplified view -->
            <div class="sm:hidden">
              <div class="text-center py-8 text-gray-500">
                <UIcon name="i-heroicons-device-phone-mobile" class="w-12 h-12 mx-auto mb-2" />
                <p class="text-sm">Detailed sampling plans available on larger screens</p>
                <p class="text-xs mt-1">{{ samplersWithPlans }} samplers have plans for {{ currentYear }}</p>
              </div>
            </div>
          </UCard>

                      <!-- Stats Overview -->
           <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div 
                v-for="(group, key) in userGroups" 
                :key="key" 
                class="p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                @click="toggleGroupVisibility(key)"
              >
                <div class="flex items-center justify-between mb-2">
                  <UIcon :name="group.icon" class="w-6 h-6 sm:w-8 sm:h-8 text-primary-500" />
                  <UIcon 
                    :name="visibleGroups[key] ? 'i-heroicons-eye' : 'i-heroicons-eye-slash'" 
                    class="w-4 h-4 sm:w-5 sm:h-5 text-gray-500"
                  />
                </div>
                <div class="text-xl sm:text-2xl font-bold">
                  {{ getUsersByPolicy(group.policyId).value.length }}
                </div>
                <div class="text-xs sm:text-sm text-gray-600 break-words">{{ group.title }}</div>
              </div>
              
              <!-- Sampling plan summary card -->
              <div class="p-4 bg-gray-50 rounded-lg">
                <div class="mb-2">
                  <UIcon name="i-heroicons-document-chart-bar" class="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
                </div>
                <div class="text-xl sm:text-2xl font-bold text-blue-600">
                  {{ samplersWithPlans }}
                </div>
                <div class="text-xs sm:text-sm text-gray-600 break-words">Samplers with Plans</div>
                <div class="text-xs text-gray-500 mt-1" v-if="samplersWithPlans > 0">
                  For {{ currentYear }}
                </div>
              </div>
            </div>

          <!-- Connections Dashboard -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-chat-bubble-left-right" class="w-5 h-5" />
                <h2 class="text-lg sm:text-xl font-semibold">Sampler Connections Analytics</h2>
              </div>
              <p class="text-sm text-gray-600 mt-1">Visualizing collaboration between samplers for {{ currentYear }}</p>
            </template>
            
            <ConnectionsDashboard 
              :user-ids="filteredUserIds" 
              :year="currentYear"
            />
          </UCard>

          <!-- NEW: Card Control Section -->
          <UCard>
            <template #header>
              <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-rectangle-group" class="w-5 h-5" />
                  <h2 class="text-lg sm:text-xl font-semibold">User Details</h2>
                  <UBadge color="gray" variant="soft">
                    {{ Object.values(userGroups).reduce((total, group) => total + getUsersByPolicy(group.policyId).value.length, 0) }} total cards
                  </UBadge>
                </div>
                <div class="flex flex-col sm:flex-row gap-2">
                  <UButton
                    @click="expandAllCards"
                    icon="i-heroicons-chevron-down"
                    color="green"
                    variant="outline"
                    size="sm"
                    class="w-full sm:w-auto"
                  >
                    Expand All
                  </UButton>
                  <UButton
                    @click="collapseAllCards"
                    icon="i-heroicons-chevron-up"
                    color="red"
                    variant="outline"
                    size="sm"
                    class="w-full sm:w-auto"
                  >
                    Collapse All
                  </UButton>
                </div>
              </div>
            </template>
            <div class="text-sm text-gray-600">
              Click on individual user cards to expand or collapse them. Use the buttons above to control all cards at once.
            </div>
          </UCard>

          <!-- User Lists by Type -->
          <div v-for="(group, key) in userGroups" :key="key">
            <UCard 
              v-if="getUsersByPolicy(group.policyId).value.length && visibleGroups[key]"
              class="transition-all duration-300"
            >
              <template #header>
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div class="flex items-center gap-2">
                    <UIcon :name="group.icon" class="w-5 h-5" />
                    <h2 class="text-lg sm:text-xl font-semibold">{{ group.title }}</h2>
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

              <div class="grid gap-3 sm:gap-4">
                <div v-for="user in getUsersByPolicy(group.policyId).value"
                  :key="user.id"
                  class="bg-gray-50 rounded-lg hover:bg-gray-100 transition-all duration-200 border border-gray-200 hover:border-gray-300">
                  
                  <!-- NEW: Collapsible Header -->
                  <div 
                    class="p-3 sm:p-4 cursor-pointer select-none"
                    @click="toggleUserCard(user.id)"
                  >
                    <div class="flex justify-between items-center">
                      <!-- Basic Info -->
                      <div class="flex-1 min-w-0">
                        <div class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                          <h3 class="font-medium text-lg truncate">{{ formatName(user) }}</h3>
                          <div class="flex flex-wrap items-center gap-2">
                            <UBadge :color="user.status === 'active' ? 'green' : 'yellow'">
                              {{ user.status }}
                            </UBadge>
                            <span class="text-sm text-gray-600 hidden sm:inline">{{ user.email }}</span>
                          </div>
                        </div>
                        <div class="text-sm text-gray-600 mt-1 sm:hidden">{{ user.email }}</div>
                        
                        <!-- Quick stats for collapsed view -->
                        <div class="flex flex-wrap gap-4 text-xs text-gray-500 mt-2">
                          <span>{{ getUserSamplingCount(user.id) }} samples</span>
                          <span>{{ getUserUniqueSites(user.id).length }} sites</span>
                          <span v-if="user.sampler_data?.hub_id?.Description">{{ user.sampler_data.hub_id.Description }}</span>
                        </div>
                      </div>
                      
                      <!-- Expand/Collapse Icon -->
                      <div class="flex-shrink-0 ml-4">
                        <UIcon 
                          :name="expandedUsers.has(user.id) ? 'i-heroicons-chevron-up' : 'i-heroicons-chevron-down'" 
                          class="w-5 h-5 text-gray-400 transition-transform duration-200"
                          :class="{ 'transform rotate-180': !expandedUsers.has(user.id) }"
                        />
                      </div>
                    </div>
                  </div>

                  <!-- NEW: Collapsible Content -->
                  <Transition
                    name="slide-fade"
                    enter-active-class="transition-all duration-300 ease-out"
                    leave-active-class="transition-all duration-300 ease-in"
                    enter-from-class="opacity-0 max-h-0"
                    enter-to-class="opacity-100 max-h-[2000px]"
                    leave-from-class="opacity-100 max-h-[2000px]"
                    leave-to-class="opacity-0 max-h-0"
                  >
                    <div v-if="expandedUsers.has(user.id)" class="px-3 sm:px-4 pb-3 sm:pb-4 border-t border-gray-200 overflow-hidden">
                      <div class="space-y-3 sm:space-y-4 pt-3 sm:pt-4">
                        <!-- Contact Info -->
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                          <div>
                            <p class="text-gray-900 font-medium">Contact:</p>
                            <p class="text-gray-600">{{ formatPhoneNumber(user.phone) }}</p>
                          </div>
                          <div>
                            <p class="text-gray-900 font-medium">Address:</p>
                            <p class="text-gray-600">{{ user.street }}</p>
                            <p class="text-gray-600">{{ user.city }}, {{ user.state }} {{ user.zip }}</p>
                          </div>
                        </div>

                        <!-- Role and Hub -->
                        <div class="text-sm">
                          <p class="text-gray-900 font-medium">
                            User Type: {{ user?.role?.name }}
                          </p>
                          <p class="text-gray-900 font-medium">
                            Role(s): {{ user?.policies?.map(p => p.policy?.name).filter(Boolean).join(', ') || 'No Role' }}
                          </p>
                          <div class="mt-1 flex flex-col sm:flex-row sm:items-center gap-2">
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
                              @click.stop="showHubInfo[user.id] = true"
                            />
                          </div>
                        </div>

                        <!-- Hub Info Modal -->
                        <UModal
                          v-if="user.sampler_data?.hub_id?.Description"
                          v-model="showHubInfo[user.id]"
                          :ui="{
                            overlay: {
                              background: 'bg-gray-300/50',
                              transition: {
                                enter: 'ease-out duration-300',
                                enterFrom: 'opacity-0',
                                enterTo: 'opacity-100',
                                leave: 'ease-in duration-200',
                                leaveFrom: 'opacity-100',
                                leaveTo: 'opacity-0'
                              }
                            },
                            width: 'sm:max-w-lg'
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
                        <div v-if="user.sampler_data" class="text-sm border-t pt-3 mt-3 space-y-3">
                          <p class="font-medium">Sampler Information:</p>
                          
                          <!-- Training -->
                          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                              <p class="text-gray-900 font-medium">Training Completed:</p>
                              <ul class="list-disc list-inside text-gray-600 ml-2 space-y-1">
                                <li v-if="user.sampler_data.training_field_chemistry">Field Chemistry</li>
                                <li v-if="user.sampler_data.training_r_card">R-Card</li>
                                <li v-if="user.sampler_data.training_habitat">Habitat</li>
                                <li v-if="user.sampler_data.training_biological">Biological</li>
                              </ul>
                              <div class="mt-2 space-y-1">
                                <p class="text-gray-600">
                                  Original Training: {{ formatDate(user.sampler_data.original_training_date) }}
                                </p>
                                <p class="text-gray-600">
                                  Latest Training: {{ formatDate(user.sampler_data.training_date_latest) }}
                                </p>
                              </div>
                            </div>

                            <!-- Equipment -->
                            <div>
                              <p class="text-gray-900 font-medium">Equipment:</p>
                              <ul class="list-disc list-inside text-gray-600 ml-2 space-y-1">
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
                          </div>

                          <!-- Kit Information -->
                          <div>
                            <p class="text-gray-900 font-medium">Kit Information:</p>
                            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-gray-600">
                              <p>Kit Option: {{ user.sampler_data.kitOption || 'None' }}</p>
                              <p v-if="user.sampler_data.DO_expire">
                                DO Expiration: {{ formatDate(user.sampler_data.DO_expire) }}
                              </p>
                              <p v-if="user.sampler_data.PH_expire">
                                pH Expiration: {{ formatDate(user.sampler_data.PH_expire) }}
                              </p>
                            </div>
                          </div>

                          <!-- Actual Sampling Activity -->
                          <div>
                            <p class="text-gray-900 font-medium">{{ currentYear }} Sampling Activity:</p>
                            <div class="bg-blue-50 p-3 rounded mt-1">
                              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <p class="text-blue-800 font-medium">
                                  Samples Collected: {{ getUserSamplingCount(user.id) }}
                                </p>
                                <p class="text-blue-700">
                                  Unique Sites: {{ getUserUniqueSites(user.id).length }}
                                </p>
                              </div>
                              <div v-if="getUserUniqueSites(user.id).length > 0" class="mt-2">
                                <p class="text-blue-700 text-xs font-medium">Sites:</p>
                                <div class="text-blue-600 text-xs grid grid-cols-1 lg:grid-cols-2 gap-1 mt-1">
                                  <div v-for="site in getUserUniqueSites(user.id)" :key="site">
                                    {{ site }}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <!-- Sampling Plans -->
                          <div>
                            <p class="text-gray-900 font-medium">Sampling Plans:</p>
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
                  </Transition>
                </div>
              </div>
            </UCard>
          </div>
        </template>
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
    </div>
  </PolicyGuard>
</template>

<style scoped>
.container {
  max-width: 1400px;
}

/* Custom transitions for collapsible content */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.slide-fade-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  opacity: 1;
  max-height: 2000px;
  transform: translateY(0);
}

/* Smooth scroll behavior */
html {
  scroll-behavior: smooth;
}

/* Improved hover effects */
.bg-gray-50:hover {
  background-color: rgb(249 250 251);
}

/* Mobile-specific improvements */
@media (max-width: 640px) {
  .container {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
  
  /* Better touch targets on mobile */
  .cursor-pointer {
    min-height: 44px;
  }
  
  /* Prevent horizontal overflow */
  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  /* Mobile-friendly modal */
  :deep(.modal) {
    margin: 1rem;
  }
}

/* Tablet-specific adjustments */
@media (min-width: 640px) and (max-width: 1024px) {
  .container {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

/* Desktop optimizations */
@media (min-width: 1024px) {
  .container {
    padding-left: 1.5rem;
    padding-right: 1.5rem;
  }
}

/* Focus states for accessibility */
.cursor-pointer:focus {
  outline: 2px solid rgb(59 130 246);
  outline-offset: 2px;
}

/* Loading state improvements */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Card border animations */
.border-gray-200:hover {
  border-color: rgb(209 213 219);
}

/* Improved scroll area for long lists */
.max-h-32 {
  scrollbar-width: thin;
  scrollbar-color: rgb(156 163 175) transparent;
}

.max-h-32::-webkit-scrollbar {
  width: 4px;
}

.max-h-32::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-32::-webkit-scrollbar-thumb {
  background-color: rgb(156 163 175);
  border-radius: 2px;
}

/* Button scaling for different screen sizes */
@media (max-width: 640px) {
  .fixed .rounded-full {
    transform: scale(0.9);
  }
}

@media (min-width: 1024px) {
  .fixed .rounded-full {
    transform: scale(1.1);
  }
}

/* Enhanced spacing for better visual hierarchy */
.space-y-3 > * + * {
  margin-top: 0.75rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

/* Custom grid gaps for responsive design */
.gap-2 {
  gap: 0.5rem;
}

.gap-3 {
  gap: 0.75rem;
}

.gap-4 {
  gap: 1rem;
}

/* Ensure proper text wrapping on small screens */
@media (max-width: 480px) {
  .text-xs {
    font-size: 0.7rem;
  }
  
  .leading-tight {
    line-height: 1.25;
  }
}
</style>