<script setup lang="ts">
const loading = ref(true);
const error = ref(null);
const userData = ref(null);
const samplerData = ref(null);

const config = useRuntimeConfig();

// Check both role ID and boolean flag for each role
const isAdmin = computed(() => {
  return userData.value?.role === config.public.ADMIN_ROLE_ID || userData.value?.isAdmin;
});

const isTrainer = computed(() => {
  return userData.value?.role === config.public.TRAINER_ROLE_ID || userData.value?.isTrainer;
});

const isBasinLead = computed(() => {
  return userData.value?.role === config.public.BASIN_LEAD_ROLE_ID || userData.value?.isBasinLead;
});

const isSampler = computed(() => {
  return userData.value?.role === config.public.SAMPLER_ROLE_ID || userData.value?.isSampler;
});
const formatCounty = (county: string | null) => {
  if (!county) return 'Not specified';
  return county.charAt(0).toUpperCase() + county.slice(1).toLowerCase();
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

const formatDate = (date) => {
  if (!date) return 'Not recorded';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Fetch user data on mount
onMounted(async () => {
  try {
    // Get the current user's data
    const user = await useDirectus(readMe());
    userData.value = user;

    if (user?.id) {
      // Get the sampler data for this user, now including hub relation
      const samplerResponse = await useDirectus(readItems('sampler_data', {
        filter: {
          user_id: { _eq: user.id }
        },
        fields: ['*', {
          hub_id: ['id', 'Basin', 'Description']  // Include the fields you want from wwky_hubs
        }],
        limit: 1
      }));

      if (samplerResponse?.length > 0) {
        samplerData.value = samplerResponse[0];
      }
    }
  } catch (err) {
    error.value = 'Failed to load profile information. Please try again later.';
    console.error('Profile load error:', err);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <PortalPageHeader
      title="Account"
      :breadcrumbs="[
        {
          title: 'Portal',
          href: '/portal',
        },
        {
          title: 'Account',
        },
      ]"
    >
      <template #actions>
        <NuxtLink to="/request-password">
          <UButton
            size="sm"
            icon="i-heroicons-key-20-solid"
          >
            Change Password
          </UButton>
        </NuxtLink>
      </template>
    </PortalPageHeader>

    <div class="space-y-6 p-6">
      <!-- Loading State -->
      <div v-if="loading" class="text-center py-8">
        <ULoadingIcon />
        <p class="mt-2 text-gray-600">Loading profile information...</p>
      </div>

      <!-- Error State -->
      <UAlert
        v-else-if="error"
        type="error"
        :title="error"
        icon="i-heroicons-exclamation-triangle"
      />

      <!-- Profile Content -->
      <template v-else>
        <!-- Basic Info Card -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Account Details</h2>
          </template>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <div>
                <label class="text-sm text-gray-500">Name</label>
                <p>{{ userData?.first_name }} {{ userData?.last_name }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-500">Email</label>
                <p>{{ userData?.email }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-500">Mailing Address</label>
                <p>{{ userData?.mailing_address || 'Not specified' }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-500">Account Status</label>
                <p>
                  <UBadge
                    :color="userData?.status === 'active' ? 'green' : 'gray'"
                  >
                    {{ userData?.status }}
                  </UBadge>
                </p>
              </div>
			  <div>
				<label class="text-sm text-gray-500">Roles</label>
				<div class="flex gap-2 flex-wrap">
					<UBadge v-if="isAdmin" color="red">Admin</UBadge>
					<UBadge v-if="isSampler" color="blue">Sampler</UBadge>
					<UBadge v-if="isTrainer" color="purple">Trainer</UBadge>
					<UBadge v-if="isBasinLead" color="yellow">Basin Lead</UBadge>
				</div>
			   </div>
            </div>

            <!-- Sampling Info - Only show if samplerData exists -->
            <div v-if="samplerData" class="space-y-4">
              <div>
                <label class="text-sm text-gray-500">Phone</label>
                <p>{{ formatPhoneNumber(userData?.phone) }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-500">County</label>
                <p>{{ formatCounty(userData?.county_residence) }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-500">Support Hub</label>
                <p v-if="samplerData.hub_id">
                  {{ samplerData.hub_id.Basin }} - {{ samplerData.hub_id.Description }}
                </p>
                <p v-else>Not assigned</p>
              </div>
              <div>
                <label class="text-sm text-gray-500">Original Training Location</label>
                <p>{{ samplerData.training_location_original || 'Not specified' }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-500">Latest Training Location</label>
                <p>{{ samplerData.training_location_latest || 'Not specified' }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-500">Original Training Date</label>
                <p>{{ formatDate(samplerData.original_training_date) }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-500">Latest Training Date</label>
                <p>{{ formatDate(samplerData.training_date_latest) }}</p>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Training Card - Only show if samplerData exists -->
        <UCard v-if="samplerData">
          <template #header>
            <h2 class="text-lg font-semibold">Training Status</h2>
          </template>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div v-for="(status, type) in {
              'Field Chemistry': samplerData.training_field_chemistry,
              'R-Card': samplerData.training_r_card,
              'Habitat': samplerData.training_habitat,
              'Biological': samplerData.training_biological
            }" :key="type" class="text-center">
              <UIcon
                :name="status ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="status ? 'text-green-500' : 'text-gray-400'"
                class="text-3xl mb-2"
                size="32"
              />
              <div class="text-sm">{{ type }}</div>
            </div>
          </div>
        </UCard>

        <!-- Equipment Card - Only show if samplerData exists -->
        <UCard v-if="samplerData">
          <template #header>
            <h2 class="text-lg font-semibold">Equipment Issued</h2>
          </template>
          
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <!-- Special handling for pH Meter with expiration -->
            <div class="text-center">
              <UIcon
                :name="samplerData.equip_ph ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="samplerData.equip_ph ? 'text-blue-500' : 'text-gray-400'"
                class="text-3xl mb-2"
                size="32"
              />
              <div class="text-sm">pH Meter</div>
              <div v-if="samplerData.equip_ph && samplerData.PH_expire" 
                  class="text-xs text-gray-500 mt-1">
                Expires: {{ formatDate(samplerData.PH_expire) }}
              </div>
            </div>

            <!-- Special handling for DO Meter with expiration -->
            <div class="text-center">
              <UIcon
                :name="samplerData.equip_do ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="samplerData.equip_do ? 'text-blue-500' : 'text-gray-400'"
                class="text-3xl mb-2"
                size="32"
              />
              <div class="text-sm">DO Meter</div>
              <div v-if="samplerData.equip_do && samplerData.DO_expire" 
                  class="text-xs text-gray-500 mt-1">
                Expires: {{ formatDate(samplerData.DO_expire) }}
              </div>
            </div>

            <!-- Rest of equipment -->
            <div v-for="(has, equipment) in {
              'Conductivity': samplerData.equip_cond,
              'Thermometer': samplerData.equip_thermo,
              'Waste Container': samplerData.equip_waste,
              'Sample Pan': samplerData.equip_pan,
              'Flip Card': samplerData.equip_flip,
              'R-Card': samplerData.equip_rcard,
              'Pipette': samplerData.equip_pipette
            }" :key="equipment" class="text-center">
              <UIcon
                :name="has ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="has ? 'text-blue-500' : 'text-gray-400'"
                class="text-3xl mb-2"
                size="32"
              />
              <div class="text-sm">{{ equipment }}</div>
            </div>
          </div>
        </UCard>

        <!-- Contact Information Notice -->
        <UCard class="bg-gray-50">
          <div class="text-center text-gray-600">
            <p>Need to update your information?</p>
            <p class="mt-1">
              Please email 
              <a 
                href="mailto:contact@kywater.org" 
                class="text-blue-600 hover:text-blue-800 transition-colors"
              >
                contact@kywater.org
              </a> 
              with any changes to your account details.
            </p>
          </div>
        </UCard>
      </template>
    </div>
  </div>
</template>
