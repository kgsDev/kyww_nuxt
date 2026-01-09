<script setup lang="ts">
  //users/index.vue - display and manage users in the Kentucky Watershed Watch portal
  import { ref, computed, onMounted, watch } from 'vue'
  import PolicyGuard from '../../components/PolicyGuard.vue'
  import SamplingIntentSummary from '~/components/SamplingIntentSummary.vue'
  import UserSamplingIntent from '~/components/UserSamplingIntent.vue'
  import ConnectionsDashboard from '~/components/ConnectionsDashboard.vue'
  import TrainingHistoryPanel from '~/components/TrainingHistoryPanel.vue';
  import EquipmentHistoryPanel from '~/components/EquipmentHistoryPanel.vue';

  const config = useRuntimeConfig()
  const loading = ref(true)
  const error = ref(null)
  const users = ref([])
  const showHubInfo = ref({})
  const currentYear = ref(new Date().getFullYear())
  const samplersWithPlans = ref(0)
  const actualSamplingData = ref([])
  const equipmentData = ref({}) // Map of userId -> equipment info
  const trainingHistoryData = ref({}) // Map of userId -> training history

  // Search and filter states
  const searchQuery = ref('')
  const selectedStatus = ref('all')
  const selectedHub = ref('all')
  const selectedTraining = ref('all')
  const selectedRole = ref('all')
  const selectedSamplingActivity = ref('all')
  const siteSearchQuery = ref('')
  const sortBy = ref('name')
  const sortDirection = ref('asc')

  // Group definitions with icons and descriptions - MUST BE DEFINED FIRST
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

  // NEW: Collapsible sections state - NOW userGroups is defined
  const collapsedSections = ref(Object.keys(userGroups).reduce((acc, key) => {
    acc[key] = true; // All sections collapsed by default
    return acc;
  }, {}));

  const toggleSection = (groupKey) => {
    collapsedSections.value[groupKey] = !collapsedSections.value[groupKey];
  };

  // NEW: Modal for user details
  const showUserModal = ref(false);
  const selectedUser = ref(null);

  const openUserModal = (user) => {
    selectedUser.value = user;
    showUserModal.value = true;
  };

  const closeUserModal = () => {
    showUserModal.value = false;
    selectedUser.value = null;
  };

  // Table columns configuration - Compact design with stacked info
  const tableColumns = [
    { key: 'user', label: 'User Info' },
    { key: 'location', label: 'Location' },
    { key: 'training', label: 'Training' },
    { key: 'activity', label: 'Activity' },
    { key: 'actions', label: '' }
  ];

  // Sort field mapping for stacked columns
  const tableSortBy = ref('user');
  const tableSortDirection = ref('asc');

  const sortTable = (column) => {
    if (column === tableSortBy.value) {
      tableSortDirection.value = tableSortDirection.value === 'asc' ? 'desc' : 'asc';
    } else {
      tableSortBy.value = column;
      tableSortDirection.value = 'asc';
    }
  };

  const getSortValueForTable = (user, field) => {
    switch (field) {
      case 'user':
        // Sort by last name, then first name
        return `${user.last_name?.toLowerCase() || 'zzz'}_${user.first_name?.toLowerCase() || ''}`;
      case 'location':
        return user.city?.toLowerCase() || '';
      case 'hub':
        return user.sampler_data?.hub_id?.Description?.toLowerCase() || 'zzz';
      case 'activity':
        return getUserSamplingCount(user.id);
      default:
        return '';
    }
  };

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

  // Role options based on userGroups
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
      case 'city':
        return user.city?.toLowerCase() || ''
      case 'sites':
        return getUserUniqueSites(user.id).length
      case 'samples':
        return getUserSamplingCount(user.id)
      default:
        return ''
    }
  }

  // Filter and sort users
  const filteredAndSortedUsers = computed(() => {
    return users.value.filter(user => {
      const matchesSearch = searchQuery.value === '' ||
        formatName(user).toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.value.toLowerCase())
      
      const matchesStatus = selectedStatus.value === 'all' || user.status === selectedStatus.value
      
      const matchesHub = selectedHub.value === 'all' || 
        user.sampler_data?.hub_id?.Description === selectedHub.value
      
      const matchesTraining = selectedTraining.value === 'all' || 
        user.sampler_data?.[`training_${selectedTraining.value}`]

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

      const matchesSiteSearch = siteSearchQuery.value === '' || 
        getUserUniqueSites(user.id).some(site => 
          site.toLowerCase().includes(siteSearchQuery.value.toLowerCase())
        )
      
      return matchesSearch && matchesStatus && matchesHub && matchesTraining && 
            matchesRole && matchesSamplingActivity && matchesSiteSearch
    }).sort((a, b) => {
      const aValue = getSortValue(a, sortBy.value)
      const bValue = getSortValue(b, sortBy.value)
      
      // Handle numeric sorting for sites and samples
      if (sortBy.value === 'sites' || sortBy.value === 'samples') {
        return sortDirection.value === 'asc' ? aValue - bValue : bValue - aValue
      }
      
      return sortDirection.value === 'asc' 
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue))
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
    selectedRole.value = 'all'
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
      const response = await useDirectus(readItems('sampling_intent', {
        filter: {
          year: { _eq: currentYear.value }
        },
        fields: ['user_id'],
        limit: -1
      }));
      
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
          'volunteer_id.id',
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

  // Fetch equipment history for all users
  const fetchEquipmentData = async () => {
    try {
      const response = await useDirectus(readItems('equipment_history', {
        fields: ['user_id', 'kit_option', 'date_created'],
        sort: ['-date_created'],
        limit: -1
      }));
      
      // Get most recent equipment for each user
      const equipmentMap = {};
      response.forEach(item => {
        if (!equipmentMap[item.user_id]) {
          equipmentMap[item.user_id] = item;
        }
      });
      equipmentData.value = equipmentMap;
    } catch (err) {
      console.error('Error fetching equipment data:', err);
      equipmentData.value = {};
    }
  };

  // Fetch training history for all users
  const fetchTrainingHistoryData = async () => {
    try {
      const response = await useDirectus(readItems('training_history', {
        fields: ['user_id', 'training_date', 'training_field_chemistry', 'training_r_card', 'training_habitat', 'training_biological'],
        sort: ['-training_date'],
        limit: -1
      }));
      
      // Group by user and get latest training
      const trainingMap = {};
      response.forEach(item => {
        if (!trainingMap[item.user_id]) {
          trainingMap[item.user_id] = [];
        }
        trainingMap[item.user_id].push(item);
      });
      trainingHistoryData.value = trainingMap;
    } catch (err) {
      console.error('Error fetching training history:', err);
      trainingHistoryData.value = {};
    }
  };

  const getUserSamplingCount = (userId) => {
    return actualSamplingData.value.filter(sample => {
      const sampleVolunteerId = sample.volunteer_id?.id || sample.volunteer_id;
      return sampleVolunteerId === userId;
    }).length;
  };

  const getUserUniqueSites = (userId) => {
    const userSamples = actualSamplingData.value.filter(sample => {
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

  // Get training status summary for table display
  const getTrainingStatusSummary = (user) => {
    const userId = user.id;
    const history = trainingHistoryData.value[userId];
    
    if (!history || history.length === 0) {
      return { status: 'None', lastDate: null, types: [] };
    }
    
    // Aggregate ALL training types from ALL history records
    const allTypes = new Set();
    let mostRecentDate = null;
    
    history.forEach(record => {
      if (record.training_field_chemistry) allTypes.add('FC');
      if (record.training_r_card) allTypes.add('R');
      if (record.training_habitat) allTypes.add('H');
      if (record.training_biological) allTypes.add('B');
      
      // Track most recent date
      const recordDate = new Date(record.training_date);
      if (!mostRecentDate || recordDate > mostRecentDate) {
        mostRecentDate = recordDate;
      }
    });
    
    const types = Array.from(allTypes);
    
    return {
      status: types.length > 0 ? types.join(', ') : 'None',
      lastDate: mostRecentDate,
      types: types
    };
  };

  // Get equipment kit option for table display
  const getEquipmentKitOption = (user) => {
    const userId = user.id;
    const equipment = equipmentData.value[userId];
    
    if (!equipment || !equipment.kit_option) {
      return 'N/A';
    }
    
    return equipment.kit_option.charAt(0).toUpperCase() + equipment.kit_option.slice(1);
  };

  // Export to CSV function
  const exportToCSV = async () => {
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
    
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Status',
      'Hub',
      'Roles',
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

    months.forEach(month => {
      headers.push(`${month.abbr} Sites (Planned)`);
      headers.push(`${month.abbr} E.coli Cards (Planned)`);
    });

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
    }

    const intentByUserId = {};
    samplingIntentData.forEach(intent => {
      intentByUserId[intent.user_id] = intent;
    });

    const getUserRoles = (user) => {
      const userRoles = [];
      Object.entries(userGroups).forEach(([key, group]) => {
        if (user.policies?.some(p => p.policy?.id === group.policyId)) {
          userRoles.push(group.title);
        }
      });
      return userRoles.join(' | ');
    };

    const csvData = filteredAndSortedUsers.value.map(user => {
      const userData = [
        user.first_name,
        user.last_name,
        user.email,
        formatPhoneNumber(user.phone),
        user.status,
        user.sampler_data?.hub_id?.Description,
        getUserRoles(user),
        user.street,
        user.city,
        user.state,
        user.zip,
        user.sampler_data?.training_field_chemistry ? 'Yes' : 'No',
        user.sampler_data?.training_r_card ? 'Yes' : 'No',
        user.sampler_data?.training_habitat ? 'Yes' : 'No',
        user.sampler_data?.training_biological ? 'Yes' : 'No',
        formatDate(user.sampler_data?.original_training_date),
        formatDate(user.sampler_data?.latest_training_date),
        getUserSamplingCount(user.id),
        getUserUniqueSites(user.id).length,
        getUserUniqueSiteIds(user.id).join(' | ')
      ];

      const userIntent = intentByUserId[user.id] || null;
      
      months.forEach(month => {
        const key = month.key;
        userData.push(userIntent ? (userIntent[`${key}_sites`] || 0) : 0);
        userData.push(userIntent ? (userIntent[`${key}_ecoli`] || 0) : 0);
      });

      return userData;
    });

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${(cell !== undefined && cell !== null) ? cell : ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `users_export_${currentYear.value}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const visibleGroups = ref(Object.keys(userGroups).reduce((acc, key) => {
    acc[key] = true;
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

      const transformedUsers = response
        .filter(item => item.user_id)
        .map(item => ({
          ...item.user_id,
          id: item.user_id.id,
          policies: item.user_id.policies,
          sampler_data: {
            hub_id: item.hub_id,
            status: item.status,
            id: item.id,
            original_training_date: item.original_training_date,
            training_field_chemistry: item.training_field_chemistry,
            training_r_card: item.training_r_card,
            training_habitat: item.training_habitat,
            training_biological: item.training_biological,
            kit_option: item.kit_option
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

  const getUsersByPolicy = (policyId) => {
    return computed(() => {
      return filteredAndSortedUsers.value
        .filter(user => user.policies?.some(p => p.policy?.id === policyId))
        .sort((a, b) => {
          const aValue = getSortValueForTable(a, tableSortBy.value);
          const bValue = getSortValueForTable(b, tableSortBy.value);
          
          // Handle numeric sorting for activity
          if (tableSortBy.value === 'activity') {
            return tableSortDirection.value === 'asc' ? aValue - bValue : bValue - aValue;
          }
          
          return tableSortDirection.value === 'asc' 
            ? String(aValue).localeCompare(String(bValue))
            : String(bValue).localeCompare(String(aValue));
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
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length !== 10) {
      return phone;
    }
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  };

  const samplerCount = computed(() => {
    return users.value.filter(user => 
      user.policies?.some(p => p.policy?.id === config.public.SAMPLER_POLICY_ID)
    ).length;
  });

  const goToSamplingIntentDashboard = () => {
    navigateTo('/portal/SamplingIntentDashboard');
  };

  // Load data on mount
  onMounted(() => {
    fetchUsers();
    fetchSamplersWithPlansCount();
    fetchActualSamplingData();
    fetchEquipmentData();
    fetchTrainingHistoryData();
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
            <div class="space-y-4">
              <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div class="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                  <h3 class="text-lg font-semibold">Filters</h3>
                  <UBadge color="blue" variant="soft" size="sm">
                    {{ filteredAndSortedUsers.length }} of {{ users.length }} users
                  </UBadge>
                </div>
                
                <!-- Year selection -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                  <span class="text-sm text-gray-600">Current Year:</span>
                  <UButtonGroup size="sm">
                    <UButton
                      :color="currentYear === new Date().getFullYear() - 1 ? 'primary' : 'gray'"
                      @click="changeYear(new Date().getFullYear() - 1)"
                      size="sm"
                    >
                      {{ new Date().getFullYear() - 1 }}
                    </UButton>
                    <UButton
                      :color="currentYear === new Date().getFullYear() ? 'primary' : 'gray'"
                      @click="changeYear(new Date().getFullYear())"
                      size="sm"
                    >
                      {{ new Date().getFullYear() }}
                    </UButton>
                    <UButton
                      :color="currentYear === new Date().getFullYear() + 1 ? 'primary' : 'gray'"
                      :disabled="new Date().getFullYear() + 1 > new Date().getFullYear() + 1"
                      @click="changeYear(new Date().getFullYear() + 1)"
                      size="sm"
                    >
                      {{ new Date().getFullYear() + 1 }}
                    </UButton>
                  </UButtonGroup>
                </div>
              </div>

              <!-- Filter Statistics -->
              <div class="bg-gray-50 p-4 rounded-lg">
                <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
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
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <!-- Search -->
                <div class="md:col-span-2 lg:col-span-1">
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
                />

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
                />

                <!-- Site Search -->
                <UInput
                  v-model="siteSearchQuery"
                  icon="i-heroicons-map-pin"
                  placeholder="Search by site ID or description..."
                />
              </div>

              <!-- Controls Row -->
              <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
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
                  size="sm"
                >
                  Export CSV
                </UButton>
              </div>

              <!-- Active Filters Display -->
              <div v-if="searchQuery || selectedStatus !== 'all' || selectedHub !== 'all' || selectedTraining !== 'all' || selectedRole !== 'all' || selectedSamplingActivity !== 'all' || siteSearchQuery" 
                   class="flex flex-wrap gap-2">
                <span class="text-sm text-gray-600 mr-2">Active filters:</span>
                
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
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-chart-bar" class="w-5 h-5" />
                  <h2 class="text-xl font-semibold">{{ currentYear }} Sampling Plans</h2>
                </div>
              </div>
              <p class="text-sm text-gray-600 mt-1">
                Overview for {{ filteredAndSortedUsers.length }} users
              </p>
            </template>
            
            <div class="overflow-x-auto">
              <SamplingIntentSummary
                :user-ids="filteredUserIds"
                :year="currentYear"
                @update:count="updateSamplersCount"
              />
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

          <!-- Training Key Legend -->
          <UCard>
            <template #header>
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-academic-cap" class="w-5 h-5" />
                <h2 class="text-lg font-semibold">Training Abbreviations Key</h2>
              </div>
            </template>
            
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="flex items-center gap-2">
                <UBadge color="blue" variant="soft" size="sm">FC</UBadge>
                <span class="text-sm text-gray-700">Field Chemistry</span>
              </div>
              <div class="flex items-center gap-2">
                <UBadge color="blue" variant="soft" size="sm">R</UBadge>
                <span class="text-sm text-gray-700">R-Card</span>
              </div>
              <div class="flex items-center gap-2">
                <UBadge color="blue" variant="soft" size="sm">H</UBadge>
                <span class="text-sm text-gray-700">Habitat Assessment</span>
              </div>
              <div class="flex items-center gap-2">
                <UBadge color="blue" variant="soft" size="sm">B</UBadge>
                <span class="text-sm text-gray-700">Biological Assessment</span>
              </div>
            </div>
            
            <div class="mt-4 pt-4 border-t border-gray-200">
              <p class="text-xs text-gray-600">
                <UIcon name="i-heroicons-information-circle" class="inline w-4 h-4" />
                Training badges show all certifications a user has received across their training history. The "Last" date indicates the most recent training session.
              </p>
            </div>
          </UCard>

          <!-- User Lists by Type with Tables -->
          <div v-for="(group, key) in userGroups" :key="key">
            <UCard 
              v-if="getUsersByPolicy(group.policyId).value.length && visibleGroups[key]"
              class="transition-all duration-300"
            >
              <template #header>
                <div 
                  class="flex justify-between items-center cursor-pointer"
                  @click="toggleSection(key)"
                >
                  <div class="flex items-center gap-2">
                    <UIcon :name="group.icon" class="w-5 h-5" />
                    <h2 class="text-xl font-semibold">{{ group.title }}</h2>
                    <UBadge>{{ getUsersByPolicy(group.policyId).value.length }}</UBadge>
                  </div>
                  <UIcon 
                    :name="collapsedSections[key] ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-up'"
                    class="w-5 h-5 text-gray-500 transition-transform"
                  />
                </div>
                <p class="text-sm text-gray-600 mt-1">{{ group.description }}</p>
              </template>

              <!-- Collapsible Table Content -->
              <div v-show="!collapsedSections[key]">
                <!-- Sort Controls -->
                <div class="flex flex-wrap gap-2 mb-4 px-2">
                  <span class="text-sm text-gray-600 mr-2">Sort by:</span>
                  <UButton
                    size="xs"
                    :color="tableSortBy === 'user' ? 'primary' : 'gray'"
                    :variant="tableSortBy === 'user' ? 'solid' : 'outline'"
                    @click="sortTable('user')"
                  >
                    Name
                    <UIcon 
                      v-if="tableSortBy === 'user'"
                      :name="tableSortDirection === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
                      class="ml-1"
                    />
                  </UButton>
                  <UButton
                    size="xs"
                    :color="tableSortBy === 'location' ? 'primary' : 'gray'"
                    :variant="tableSortBy === 'location' ? 'solid' : 'outline'"
                    @click="sortTable('location')"
                  >
                    Location
                    <UIcon 
                      v-if="tableSortBy === 'location'"
                      :name="tableSortDirection === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
                      class="ml-1"
                    />
                  </UButton>
                  <UButton
                    size="xs"
                    :color="tableSortBy === 'hub' ? 'primary' : 'gray'"
                    :variant="tableSortBy === 'hub' ? 'solid' : 'outline'"
                    @click="sortTable('hub')"
                  >
                    Hub
                    <UIcon 
                      v-if="tableSortBy === 'hub'"
                      :name="tableSortDirection === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
                      class="ml-1"
                    />
                  </UButton>
                  <UButton
                    size="xs"
                    :color="tableSortBy === 'activity' ? 'primary' : 'gray'"
                    :variant="tableSortBy === 'activity' ? 'solid' : 'outline'"
                    @click="sortTable('activity')"
                  >
                    Samples
                    <UIcon 
                      v-if="tableSortBy === 'activity'"
                      :name="tableSortDirection === 'asc' ? 'i-heroicons-arrow-up' : 'i-heroicons-arrow-down'"
                      class="ml-1"
                    />
                  </UButton>
                </div>

                <!-- Responsive Table -->
                <div class="overflow-hidden">
                  <UTable
                    :columns="tableColumns"
                    :rows="getUsersByPolicy(group.policyId).value"
                    :ui="{
                      wrapper: 'overflow-visible',
                      base: 'w-full',
                      divide: 'divide-y divide-gray-200',
                      thead: 'bg-gray-50',
                      tbody: 'divide-y divide-gray-200 bg-white',
                      tr: {
                        base: 'hover:bg-gray-50'
                      },
                      th: { 
                        base: 'px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                        padding: 'px-3 py-3'
                      },
                      td: { 
                        base: 'px-3 py-4',
                        padding: 'px-3 py-4'
                      }
                    }"
                  >
                    <!-- User Info Column - Stacked -->
                    <template #user-data="{ row }">
                      <div class="space-y-1">
                        <div class="font-medium text-gray-900">{{ formatName(row) }}</div>
                        <div class="text-xs text-gray-500 flex items-center gap-1">
                          <UIcon name="i-heroicons-envelope" class="w-3 h-3" />
                          {{ row.email }}
                        </div>
                        <div class="text-xs text-gray-500 flex items-center gap-1">
                          <UIcon name="i-heroicons-phone" class="w-3 h-3" />
                          {{ formatPhoneNumber(row.phone) }}
                        </div>
                      </div>
                    </template>

                    <!-- Location Column - Stacked -->
                    <template #location-data="{ row }">
                      <div class="space-y-1">
                        <div class="text-sm font-medium text-gray-900">
                          {{ row.city || 'N/A' }}, {{ row.state || '' }}
                        </div>
                        <div class="text-xs text-gray-500 flex items-center gap-1">
                          <UIcon name="material-symbols:hub-outline" class="w-3 h-3" />
                          {{ row.sampler_data?.hub_id?.Description || 'No Hub' }}
                        </div>
                        <UBadge 
                          :color="row.status === 'active' ? 'green' : 'yellow'" 
                          size="xs"
                          variant="soft"
                        >
                          {{ row.status }}
                        </UBadge>
                      </div>
                    </template>

                    <!-- Training Column - Stacked -->
                    <template #training-data="{ row }">
                      <div class="space-y-1">
                        <div class="flex flex-wrap gap-1">
                          <UBadge 
                            v-if="getTrainingStatusSummary(row).types.length > 0"
                            v-for="type in getTrainingStatusSummary(row).types"
                            :key="type"
                            color="blue" 
                            variant="soft" 
                            size="xs"
                          >
                            {{ type }}
                          </UBadge>
                          <UBadge v-else color="gray" variant="soft" size="xs">
                            None
                          </UBadge>
                        </div>
                        <div v-if="getTrainingStatusSummary(row).lastDate" class="text-xs text-gray-500">
                          Last: {{ new Date(getTrainingStatusSummary(row).lastDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) }}
                        </div>
                        <div class="text-xs text-gray-500 flex items-center gap-1">
                          <UIcon name="i-heroicons-wrench-screwdriver" class="w-3 h-3" />
                          Kit: 
                          <UBadge 
                            v-if="getEquipmentKitOption(row) !== 'N/A'"
                            color="purple" 
                            variant="soft" 
                            size="xs"
                          >
                            {{ getEquipmentKitOption(row) }}
                          </UBadge>
                          <span v-else>N/A</span>
                        </div>
                      </div>
                    </template>

                    <!-- Activity Column - Stacked -->
                    <template #activity-data="{ row }">
                      <div class="space-y-2">
                        <div class="flex items-center gap-2">
                          <div class="text-center">
                            <UBadge color="blue" variant="soft">
                              {{ getUserSamplingCount(row.id) }}
                            </UBadge>
                            <div class="text-xs text-gray-500 mt-1">Samples</div>
                          </div>
                          <div class="text-center">
                            <UBadge color="green" variant="soft">
                              {{ getUserUniqueSites(row.id).length }}
                            </UBadge>
                            <div class="text-xs text-gray-500 mt-1">Sites</div>
                          </div>
                        </div>
                      </div>
                    </template>

                    <!-- Actions Column -->
                    <template #actions-data="{ row }">
                      <UButton
                        icon="i-heroicons-eye"
                        size="sm"
                        color="primary"
                        variant="ghost"
                        @click="openUserModal(row)"
                      />
                    </template>
                  </UTable>
                </div>
              </div>
            </UCard>
          </div>
        </template>
      </div>

      <!-- User Detail Modal -->
      <UModal v-model="showUserModal" :ui="{ width: 'sm:max-w-4xl' }">
        <UCard v-if="selectedUser">
          <template #header>
            <div class="flex justify-between items-center">
              <div>
                <h3 class="text-lg font-semibold">{{ formatName(selectedUser) }}</h3>
                <p class="text-sm text-gray-600">{{ selectedUser.email }}</p>
              </div>
              <UButton
                icon="i-heroicons-x-mark"
                color="gray"
                variant="ghost"
                @click="closeUserModal"
              />
            </div>
          </template>

          <div class="space-y-6">
            <!-- Basic Info -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Contact Information</h4>
                <div class="text-sm space-y-1">
                  <p><span class="font-medium">Phone:</span> {{ formatPhoneNumber(selectedUser.phone) }}</p>
                  <p><span class="font-medium">Email:</span> {{ selectedUser.email }}</p>
                </div>
              </div>
              <div>
                <h4 class="font-medium text-gray-900 mb-2">Address</h4>
                <div class="text-sm space-y-1">
                  <p>{{ selectedUser.street }}</p>
                  <p>{{ selectedUser.city }}, {{ selectedUser.state }} {{ selectedUser.zip }}</p>
                </div>
              </div>
            </div>

            <!-- Role and Hub -->
            <div>
              <h4 class="font-medium text-gray-900 mb-2">Role & Hub</h4>
              <div class="text-sm space-y-2">
                <p>
                  <span class="font-medium">Role(s):</span>
                  {{ selectedUser.policies?.map(p => p.policy?.name).filter(Boolean).join(', ') || 'No Role' }}
                </p>
                <p>
                  <span class="font-medium">Status:</span>
                  <UBadge :color="selectedUser.status === 'active' ? 'green' : 'yellow'" size="xs" class="ml-2">
                    {{ selectedUser.status }}
                  </UBadge>
                </p>
                <p>
                  <span class="font-medium">Preferred Hub:</span>
                  {{ selectedUser.sampler_data?.hub_id?.Description || 'None' }}
                </p>
              </div>
            </div>

            <!-- Sampling Activity -->
            <div>
              <h4 class="font-medium text-gray-900 mb-2">{{ currentYear }} Sampling Activity</h4>
              <div class="bg-blue-50 p-4 rounded">
                <div class="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p class="text-blue-800 font-medium">Samples Collected</p>
                    <p class="text-2xl font-bold text-blue-600">{{ getUserSamplingCount(selectedUser.id) }}</p>
                  </div>
                  <div>
                    <p class="text-blue-800 font-medium">Unique Sites</p>
                    <p class="text-2xl font-bold text-blue-600">{{ getUserUniqueSites(selectedUser.id).length }}</p>
                  </div>
                </div>
                <div v-if="getUserUniqueSites(selectedUser.id).length > 0">
                  <p class="text-blue-700 text-sm font-medium mb-1">Sites:</p>
                  <div class="text-blue-600 text-sm space-y-1">
                    <div v-for="site in getUserUniqueSites(selectedUser.id)" :key="site">
                      {{ site }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Training History -->
            <div>
              <h4 class="font-medium text-gray-900 mb-3">Training History</h4>
              <TrainingHistoryPanel
                :user-id="selectedUser.id"
                :editable="false"
                :is-trainer="false"
              />
            </div>

            <!-- Equipment History -->
            <div>
              <h4 class="font-medium text-gray-900 mb-3">Equipment Status</h4>
              <EquipmentHistoryPanel
                :user-id="selectedUser.id"
                :editable="false"
              />
            </div>

            <!-- Sampling Plans -->
            <div>
              <h4 class="font-medium text-gray-900 mb-3">Sampling Plans</h4>
              <UserSamplingIntent 
                :user-id="selectedUser.id"
                :year="currentYear"
              />
            </div>
          </div>
        </UCard>
      </UModal>
    </div>
  </PolicyGuard>
</template>

<style scoped>
.container {
  max-width: 1400px;
}

html {
  scroll-behavior: smooth;
}

/* Mobile-specific improvements */
@media (max-width: 640px) {
  .container {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }
  
  /* Make table cells more compact on mobile */
  :deep(td) {
    padding: 0.75rem !important;
  }
  
  :deep(th) {
    padding: 0.75rem !important;
    font-size: 0.75rem;
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
</style>