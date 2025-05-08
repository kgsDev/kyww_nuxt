<script setup lang="ts">
import PolicyGuard from '../../components/PolicyGuard.vue';
import { ref, computed, onMounted } from 'vue'

const config = useRuntimeConfig()
const loading = ref(true)
const error = ref(null)
const users = ref([])
const showHubInfo = ref({})

// Search and filter states
const searchQuery = ref('')
const selectedStatus = ref('all')
const selectedHub = ref('all')
const selectedTraining = ref('all')
const sortBy = ref('name')
const sortDirection = ref('asc')

// Get unique hubs for filter dropdown
const uniqueHubs = computed(() => {
  const hubs = new Set(users.value.map(user => user.sampler_data?.hub_id?.Description).filter(Boolean))
  return ['all', ...Array.from(hubs)]
})

// Training options
const trainingOptions = [
  { value: 'all', label: 'All Training' },
  { value: 'field_chemistry', label: 'Field Chemistry' },
  { value: 'r_card', label: 'R-Card' },
  { value: 'habitat', label: 'Habitat' },
  { value: 'biological', label: 'Biological' }
]

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
    const matchesSearch = searchQuery.value === '' ||
      formatName(user).toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchesStatus = selectedStatus.value === 'all' || user.status === selectedStatus.value
    
    const matchesHub = selectedHub.value === 'all' || 
      user.sampler_data?.hub_id?.Description === selectedHub.value
    
    const matchesTraining = selectedTraining.value === 'all' || 
      user.sampler_data?.[`training_${selectedTraining.value}`]
    
    return matchesSearch && matchesStatus && matchesHub && matchesTraining
  }).sort((a, b) => {
    const aValue = getSortValue(a, sortBy.value)
    const bValue = getSortValue(b, sortBy.value)
    return sortDirection.value === 'asc' 
      ? aValue.localeCompare(bValue)
      : bValue.localeCompare(aValue)
  })
})

// Export to CSV function
const exportToCSV = () => {
  const headers = [
    'First Name',
    'Last Name',
    'Email',
    'Phone',
    'Status',
    'Hub',
    'Street',
    'City',
    'State',
    'ZIP',
    'Training Field Chemistry',
    'Training R-Card',
    'Training Habitat',
    'Training Biological',
    'Original Training Date',
    'Latest Training Date'
  ]

  const csvData = filteredAndSortedUsers.value.map(user => [
    user.first_name,
    user.last_name,
    user.email,
    formatPhoneNumber(user.phone),
    user.status,
    user.sampler_data?.hub_id?.Description,
    user.street,
    user.city,
    user.state,
    user.zip,
    user.sampler_data?.training_field_chemistry ? 'Yes' : 'No',
    user.sampler_data?.training_r_card ? 'Yes' : 'No',
    user.sampler_data?.training_habitat ? 'Yes' : 'No',
    user.sampler_data?.training_biological ? 'Yes' : 'No',
    formatDate(user.sampler_data?.original_training_date),
    formatDate(user.sampler_data?.training_date_latest)
  ])

  const csvContent = [headers, ...csvData]
    .map(row => row.map(cell => `"${cell || ''}"`).join(','))
    .join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.setAttribute('download', `users_export_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Group definitions with icons and descriptions
const userGroups = {
  hubmanager:{
    title: 'Hub Managers',
    icon: 'material-symbols:hub-outline',
    description: 'Manage hub-specific activities and users',
    policyId: config.public.HUB_POLICY_ID
  },
  sampler: {
    title: 'Samplers',
    icon: 'i-heroicons-beaker',
    description: 'Collect and submit water samples',
    policyId: config.public.SAMPLER_POLICY_ID
  }
}

const visibleGroups = ref(Object.keys(userGroups).reduce((acc, key) => {
  acc[key] = true // All groups visible by default
  return acc
}, {}))


const fetchUsers = async () => {
  loading.value = true
  error.value = null
  
  try {
    const nuxtApp = useNuxtApp()
    const response = await nuxtApp.$directus.request(readItems('sampler_data', {
      fields: [
        '*',
        'user_id.*.*',
        'hub_id.*.*',
        'user_id.policies.*.*'
      ],
      limit: -1
    }))

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
      }))
    
    users.value = transformedUsers
  } catch (err) {
    console.error('Error fetching users:', err)
    error.value = 'Failed to load users'
  } finally {
    loading.value = false
  }
}

// Update the getUsersByPolicy computed function:
const getUsersByPolicy = (policyId) => {
  return computed(() => {
    return filteredAndSortedUsers.value.filter(user => 
      user.policies?.some(p => p.policy?.id === policyId)
    ).sort((a, b) => {
      const lastNameA = a.last_name?.toLowerCase() || ''
      const lastNameB = b.last_name?.toLowerCase() || ''
      return lastNameA.localeCompare(lastNameB)
    })
  })
}

const toggleGroupVisibility = (groupKey) => {
  visibleGroups.value[groupKey] = !visibleGroups.value[groupKey]
}

// Format functions
const formatDate = (date) => {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString()
}

const formatName = (user) => {
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed User'
}

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

// Load users on mount
onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <PolicyGuard path="/portal/hub/hub-samplers">
    <div>
      <PortalPageHeader
        title="Hub Samplers"
        :breadcrumbs="[
          { title: 'Portal', href: '/portal' },
          { title: 'Hub Samplers', href: '/portal/hub/hub-samplers' }
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
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

                <!-- Training Filter -->
                <USelect
                  v-model="selectedTraining"
                  :options="trainingOptions"
                />
              </div>

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
            
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            </div>
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
                <div v-for="user in filteredAndSortedUsers.filter(u => 
                  u.policies?.some(p => p.policy?.id === group.policyId)
                )"
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
                                User Type: {{ user?.role.name }}
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
                        <div>
                            <p class="text-gray-900">Kit Option: {{ user.sampler_data.kitOption || 'None' }}</p>
                            <p v-if="user.sampler_data.DO_expire" class="text-gray-600">
                            DO Expiration: {{ formatDate(user.sampler_data.DO_expire) }}
                            </p>
                            <p v-if="user.sampler_data.PH_expire" class="text-gray-600">
                            pH Expiration: {{ formatDate(user.sampler_data.PH_expire) }}
                            </p>
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