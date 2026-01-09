<script setup lang="ts">
import SamplingIntentForm from '~/components/SamplingIntentForm.vue';
import UserConnectionsPanel from '~/components/UserConnectionsPanel.vue';
import TrainingHistoryPanel from '~/components/TrainingHistoryPanel.vue';
import EquipmentHistoryPanel from '~/components/EquipmentHistoryPanel.vue';

const { loadGoogleMaps, isLoaded } = useGoogleMaps();
const loading = ref(true);
const error = ref(null);
const userData = ref(null);
const samplerData = ref(null);
const toast = useToast();

const isEditing = ref(false);
const isSaving = ref(false);
const mailingAddressInput = ref(null);
const address = ref({
  street: '',
  city: '',
  state: '',
  zip: ''
});

const editForm = ref({
  first_name: '',
  last_name: '',
  email: '',
  mailing_address: '',
  phone: '',
  county_residence: '',
  hub_id: '',
  allow_connections: false
});

const showConnectionsPanel = ref(true);
const showTrainingPanel = ref(true);
const showEquipmentPanel = ref(true);

// Counties data array
const counties = [
  { id: '', name: 'Select a county' },
  { id: 'adair', name: 'Adair' },
  { id: 'allen', name: 'Allen' },
  { id: 'anderson', name: 'Anderson' },
  { id: 'ballard', name: 'Ballard' },
  { id: 'barren', name: 'Barren' },
  { id: 'bath', name: 'Bath' },
  { id: 'bell', name: 'Bell' },
  { id: 'boone', name: 'Boone' },
  { id: 'bourbon', name: 'Bourbon' },
  { id: 'boyd', name: 'Boyd' },
  { id: 'boyle', name: 'Boyle' },
  { id: 'bracken', name: 'Bracken' },
  { id: 'breathitt', name: 'Breathitt' },
  { id: 'breckinridge', name: 'Breckinridge' },
  { id: 'bullitt', name: 'Bullitt' },
  { id: 'butler', name: 'Butler' },
  { id: 'caldwell', name: 'Caldwell' },
  { id: 'calloway', name: 'Calloway' },
  { id: 'campbell', name: 'Campbell' },
  { id: 'carroll', name: 'Carroll' },
  { id: 'carter', name: 'Carter' },
  { id: 'casey', name: 'Casey' },
  { id: 'christian', name: 'Christian' },
  { id: 'clark', name: 'Clark' },
  { id: 'clay', name: 'Clay' },
  { id: 'clinton', name: 'Clinton' },
  { id: 'crittenden', name: 'Crittenden' },
  { id: 'cumberland', name: 'Cumberland' },
  { id: 'daviess', name: 'Daviess' },
  { id: 'edmonson', name: 'Edmonson' },
  { id: 'elliott', name: 'Elliott' },
  { id: 'estill', name: 'Estill' },
  { id: 'fayette', name: 'Fayette' },
  { id: 'fleming', name: 'Fleming' },
  { id: 'floyd', name: 'Floyd' },
  { id: 'franklin', name: 'Franklin' },
  { id: 'fulton', name: 'Fulton' },
  { id: 'gallatin', name: 'Gallatin' },
  { id: 'garrard', name: 'Garrard' },
  { id: 'grant', name: 'Grant' },
  { id: 'graves', name: 'Graves' },
  { id: 'grayson', name: 'Grayson' },
  { id: 'green', name: 'Green' },
  { id: 'greenup', name: 'Greenup' },
  { id: 'hancock', name: 'Hancock' },
  { id: 'hardin', name: 'Hardin' },
  { id: 'harlan', name: 'Harlan' },
  { id: 'harrison', name: 'Harrison' },
  { id: 'hart', name: 'Hart' },
  { id: 'henderson', name: 'Henderson' },
  { id: 'henry', name: 'Henry' },
  { id: 'hickman', name: 'Hickman' },
  { id: 'hopkins', name: 'Hopkins' },
  { id: 'jackson', name: 'Jackson' },
  { id: 'jefferson', name: 'Jefferson' },
  { id: 'jessamine', name: 'Jessamine' },
  { id: 'johnson', name: 'Johnson' },
  { id: 'kenton', name: 'Kenton' },
  { id: 'knott', name: 'Knott' },
  { id: 'knox', name: 'Knox' },
  { id: 'larue', name: 'LaRue' },
  { id: 'laurel', name: 'Laurel' },
  { id: 'lawrence', name: 'Lawrence' },
  { id: 'lee', name: 'Lee' },
  { id: 'leslie', name: 'Leslie' },
  { id: 'letcher', name: 'Letcher' },
  { id: 'lewis', name: 'Lewis' },
  { id: 'lincoln', name: 'Lincoln' },
  { id: 'livingston', name: 'Livingston' },
  { id: 'logan', name: 'Logan' },
  { id: 'lyon', name: 'Lyon' },
  { id: 'mccracken', name: 'McCracken' },
  { id: 'mccreary', name: 'McCreary' },
  { id: 'mclean', name: 'McLean' },
  { id: 'madison', name: 'Madison' },
  { id: 'magoffin', name: 'Magoffin' },
  { id: 'marion', name: 'Marion' },
  { id: 'marshall', name: 'Marshall' },
  { id: 'martin', name: 'Martin' },
  { id: 'mason', name: 'Mason' },
  { id: 'meade', name: 'Meade' },
  { id: 'menifee', name: 'Menifee' },
  { id: 'mercer', name: 'Mercer' },
  { id: 'metcalfe', name: 'Metcalfe' },
  { id: 'monroe', name: 'Monroe' },
  { id: 'montgomery', name: 'Montgomery' },
  { id: 'morgan', name: 'Morgan' },
  { id: 'muhlenberg', name: 'Muhlenberg' },
  { id: 'nelson', name: 'Nelson' },
  { id: 'nicholas', name: 'Nicholas' },
  { id: 'ohio', name: 'Ohio' },
  { id: 'oldham', name: 'Oldham' },
  { id: 'owen', name: 'Owen' },
  { id: 'owsley', name: 'Owsley' },
  { id: 'pendleton', name: 'Pendleton' },
  { id: 'perry', name: 'Perry' },
  { id: 'pike', name: 'Pike' },
  { id: 'powell', name: 'Powell' },
  { id: 'pulaski', name: 'Pulaski' },
  { id: 'robertson', name: 'Robertson' },
  { id: 'rockcastle', name: 'Rockcastle' },
  { id: 'rowan', name: 'Rowan' },
  { id: 'russell', name: 'Russell' },
  { id: 'scott', name: 'Scott' },
  { id: 'shelby', name: 'Shelby' },
  { id: 'simpson', name: 'Simpson' },
  { id: 'spencer', name: 'Spencer' },
  { id: 'taylor', name: 'Taylor' },
  { id: 'todd', name: 'Todd' },
  { id: 'trigg', name: 'Trigg' },
  { id: 'trimble', name: 'Trimble' },
  { id: 'union', name: 'Union' },
  { id: 'warren', name: 'Warren' },
  { id: 'washington', name: 'Washington' },
  { id: 'wayne', name: 'Wayne' },
  { id: 'webster', name: 'Webster' },
  { id: 'whitley', name: 'Whitley' },
  { id: 'wolfe', name: 'Wolfe' },
  { id: 'woodford', name: 'Woodford' }
];

const hubs = ref([]);

//fetch hubs
const fetchHubs = async () => {
  try {
    const response = await useDirectus(readItems('wwky_hubs', {
      sort: ['sort','Description'],
      fields: ['hub_id', 'Basin', 'Description', 'City'],
      limit: -1
    }));
    hubs.value = response.map(hub => ({
      ...hub,
      value: hub.hub_id,
      label: `${hub.Description} - ${hub.City}`
    }));
  } catch (error) {
    console.error('Error fetching hubs:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to load support hubs',
      color: 'red'
    });
  }
};

const config = useRuntimeConfig();

const hasPolicy = (policyId) => {
  return computed(() => {
    return userData.value?.policies?.some(p => p.policy === policyId);
  });
};

const isFullAdmin = computed(() => {
  return hasPolicy(config.public.FULLADMIN_POLICY_ID).value;
});

const isWWKYAdmin = computed(() => {
  return hasPolicy(config.public.WWKYADMIN_POLICY_ID).value;
});

const isHubManager = computed(() => {
  return hasPolicy(config.public.HUB_POLICY_ID).value;
});

const isPolicyTrainer = computed(() => {
  return hasPolicy(config.public.TRAINER_POLICY_ID).value;
});

const isPolicyLeader = computed(() => {
  return hasPolicy(config.public.LEADER_POLICY_ID).value;
});

const isPolicySampler = computed(() => {
  return hasPolicy(config.public.SAMPLER_POLICY_ID).value;
});

// Create an array of policy badges for easier rendering
const userPolicies = computed(() => {
  return [
    { condition: isFullAdmin.value, label: 'Full Admin', color: 'red' },
    { condition: isWWKYAdmin.value, label: 'WWKY Admin', color: 'red' },
    { condition: isHubManager.value, label: 'Hub Manager', color: 'orange' },
    { condition: isPolicyTrainer.value, label: 'Trainer', color: 'purple' },
    { condition: isPolicyLeader.value, label: 'Basin Leader', color: 'yellow' },
    { condition: isPolicySampler.value, label: 'Sampler', color: 'blue' }
  ].filter(policy => policy.condition);
});

const formatCounty = (county: string | null) => {
  if (!county) return 'Not specified';
  return county.charAt(0).toUpperCase() + county.slice(1).toLowerCase();
};

const formatPhoneNumber = (phone: string | null) => {
  if (!phone) return 'Not specified';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length !== 10) {
    return phone;
  }
  
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

const initializeAutocomplete = () => {
  nextTick(async () => {
    if (!isLoaded.value) {
      await loadGoogleMaps();
    }
    
    if (mailingAddressInput.value && google?.maps?.places) {
      try {
        const inputElement = mailingAddressInput.value.$el.querySelector('input');
        
        if (!inputElement) {
          console.error('Input element not found');
          return;
        }

        const autocomplete = new google.maps.places.Autocomplete(inputElement, {
          types: ['address'],
          componentRestrictions: { country: 'us' }
        });

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          address.value = {
            street: '',
            city: '',
            state: '',
            zip: ''
          };

          if (place.address_components) {
            for (const component of place.address_components) {
              const type = component.types[0];
              
              switch (type) {
                case 'street_number':
                  address.value.street = component.long_name;
                  break;
                case 'route':
                  address.value.street += ' ' + component.long_name;
                  break;
                case 'locality':
                  address.value.city = component.long_name;
                  break;
                case 'administrative_area_level_1':
                  address.value.state = component.short_name;
                  break;
                case 'postal_code':
                  address.value.zip = component.long_name;
                  break;
              }
            }
          }
        });
      } catch (error) {
        console.error('Error initializing autocomplete:', error);
      }
    }
  });
};

const startEditing = () => {
  if (userData.value?.mailing_address) {
    const addressParts = userData.value.mailing_address.split(',').map(part => part.trim());
    const stateZip = addressParts[2]?.split(' ') || [];
    
    address.value = {
      street: addressParts[0] || '',
      city: addressParts[1] || '',
      state: stateZip[0] || '',
      zip: stateZip[1] || ''
    };
  }

  editForm.value = {
    first_name: userData.value?.first_name || '',
    last_name: userData.value?.last_name || '',
    phone: userData.value?.phone || '',
    county_residence: userData.value?.county_residence || '',
    hub_id: samplerData.value?.hub_id?.hub_id || '',
    allow_connections: samplerData.value?.allow_connections || false,
    ...address.value
  };
  isEditing.value = true;
};

const cancelEdit = () => {
  isEditing.value = false;
  editForm.value = {
    first_name: '',
    last_name: '',
    email: '',
    mailing_address: '',
    phone: '',
    county_residence: ''
  };
};

const saveChanges = async () => {
  try {
    isSaving.value = true;
    
    const fullAddress = `${address.value.street}, ${address.value.city}, ${address.value.state} ${address.value.zip}`.trim();
    
    await useDirectus(updateMe({
      first_name: editForm.value.first_name,
      last_name: editForm.value.last_name,
      phone: editForm.value.phone,
      mailing_address: fullAddress,
      county_residence: editForm.value.county_residence
    }));

    if (samplerData.value?.id) {
      const hubUpdateData = {
        hub_id: editForm.value.hub_id,
        last_name: userData.value?.last_name,
        allow_connections: editForm.value.allow_connections ? 1 : 0
      };

      await useDirectus(updateItem('sampler_data', samplerData.value.id, hubUpdateData));
      
      const updatedSamplerResponse = await useDirectus(readItems('sampler_data', {
        filter: {
          id: { _eq: samplerData.value.id }
        },
        fields: ['*', {
          hub_id: ['hub_id', 'Basin', 'Description']
        }],
        limit: 1
      }));

      if (updatedSamplerResponse?.length > 0) {
        samplerData.value = updatedSamplerResponse[0];
      }
    }

    userData.value = {
      ...userData.value,
      ...editForm.value,
      mailing_address: fullAddress
    };

    toast.add({
      title: 'Success',
      description: 'Your contact information has been updated.',
      color: 'green'
    });

    isEditing.value = false;
  } catch (error) {
    console.error('Failed to update profile:', error);
    toast.add({
      title: 'Error',
      description: 'Failed to update your information. Please try again.',
      color: 'red'
    });
  } finally {
    isSaving.value = false;
  }
};

const editAndScrollToForm = () => {
  startEditing();

  setTimeout(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 100);
};

// Fetch user data on mount
onMounted(async () => {
  try {
    await Promise.all([
      (async () => {
        const user = await useDirectus(readMe({
          fields: [
            '*.*'
          ]
        }))

        userData.value = user;

        if (user?.id) {
          const samplerResponse = await useDirectus(readItems('sampler_data', {
            filter: {
              user_id: { _eq: user.id }
            },
            fields: ['*', {
              hub_id: ['hub_id', 'Basin', 'Description']
            }],
            limit: 1
          }));

          if (samplerResponse?.length > 0) {
            samplerData.value = samplerResponse[0];
          }
        }
      })(),
      fetchHubs()
    ]);

    if (isEditing.value) {
      await loadGoogleMaps();
      if (isLoaded.value) {
        initializeAutocomplete();
      }
    }
  } catch (err) {
    error.value = 'Failed to load profile information. Please try again later.';
    console.error('Profile load error:', err);
  } finally {
    loading.value = false;
  }
});

watch(isEditing, (newValue) => {
  if (newValue) {
    nextTick(() => {
      initializeAutocomplete();
    });
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
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-semibold">Account Details</h2>
              <UButton
                v-if="!isEditing"
                size="sm"
                icon="i-heroicons-pencil"
                @click="startEditing"
              >
                Edit Contact Info
              </UButton>
            </div>
          </template>
          
          <div class="grid md:grid-cols-2 gap-6">
            <div class="space-y-4">
              <!-- Display or Edit mode for contact info -->
              <div v-if="!isEditing">
                <!-- Original display view -->
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
                  <label class="text-sm text-gray-500">Phone</label>
                  <p>{{ formatPhoneNumber(userData?.phone) }}</p>
                </div>
                <div>
                  <label class="text-sm text-gray-500">KY county you primarily sample or identify with</label>
                  <p>{{ formatCounty(userData?.county_residence) }}</p>
                </div>
                <div>
                  <label class="text-sm text-gray-500">Preferred Support Hub</label>
                  <p v-if="samplerData?.hub_id">
                    {{ samplerData.hub_id.Description }} - {{ samplerData.hub_id.City }}
                  </p>
                  <p v-else>Not assigned</p>
                </div>
              </div>

              <!-- Edit mode form -->
              <div v-else class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                  <UFormGroup label="First Name">
                    <UInput v-model="editForm.first_name" />
                  </UFormGroup>
                  <UFormGroup label="Last Name">
                    <UInput v-model="editForm.last_name" />
                  </UFormGroup>
                </div>

                <div>
                  <label class="text-sm text-gray-500">Email</label>
                  <p>{{ userData?.email }}</p>
                  <label class="text-xs text-gray-500">(cannot edit - contact basin manager if you need to change)</label>
                </div>

                <UFormGroup label="Street Address">
                  <UInput
                    ref="mailingAddressInput"
                    v-model="address.street"
                    placeholder="Start typing your address..."
                  />
                </UFormGroup>

                <div class="grid grid-cols-3 gap-4">
                  <UFormGroup label="City">
                    <UInput v-model="address.city" />
                  </UFormGroup>
                  <UFormGroup label="State">
                    <UInput v-model="address.state" />
                  </UFormGroup>
                  <UFormGroup label="ZIP">
                    <UInput v-model="address.zip" />
                  </UFormGroup>
                </div>
                
                <UFormGroup label="Phone">
                  <UInput v-model="editForm.phone" />
                </UFormGroup>
                
                <UFormGroup label="KY county you primarily sample or identify with">
                  <USelect
                    v-model="editForm.county_residence"
                    :options="counties"
                    option-attribute="name"
                    value-attribute="id"
                    searchable
                    placeholder="Select a county"
                  />
                </UFormGroup>

                <UFormGroup label="Preferred Support Hub">
                  <USelect
                    v-model="editForm.hub_id"
                    :options="hubs"
                    searchable
                    placeholder="Select a support hub"
                  >
                    <template #option="{ option }">
                      {{ option.Description }} - {{ option.City }}
                    </template>
                    <template #selected-option="{ option }">
                      {{ option.Description }} - {{ option.City }}
                    </template>
                  </USelect>
                </UFormGroup>

                <div class="border-t pt-4 mt-4">
                  <h3 class="font-medium text-lg mb-3">Connection Preferences</h3>
                  
                  <UFormGroup label="Sampler Connections">
                    <div class="flex items-start">
                      <UCheckbox
                        v-model="editForm.allow_connections"
                        label="Allow other samplers to contact me"
                      />
                      <UTooltip text="When enabled, other samplers can send you connection requests">
                        <UButton
                          icon="i-heroicons-information-circle"
                          color="gray"
                          variant="ghost"
                          size="xs"
                          class="ml-1"
                        />
                      </UTooltip>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">
                      Other samplers will be able to send you messages through the system to collaborate on sampling.
                      Your email address will only be shared if you respond to their request.
                    </p>
                  </UFormGroup>
                </div>

                <div class="flex justify-end space-x-2 pt-4">
                  <UButton
                    color="gray"
                    @click="cancelEdit"
                  >
                    Cancel
                  </UButton>
                  <UButton
                    color="primary"
                    :loading="isSaving"
                    @click="saveChanges"
                  >
                    Save Changes
                  </UButton>
                </div>
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
                <label class="text-sm text-gray-500">Roles & Policies</label>
                <div class="flex gap-2 flex-wrap">
                  <template v-for="policy in userPolicies" :key="policy.label">
                    <UBadge :color="policy.color">{{ policy.label }}</UBadge>
                  </template>
                </div>
              </div>
            </div>

            <!-- Sampling Info - Only show if samplerData exists -->
            <div v-if="samplerData" class="space-y-4">
              <div>
                <label class="text-sm text-gray-500">Original Training Location</label>
                <p>{{ samplerData.training_location_original || 'Not specified' }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-500">Original Training Date</label>
                <p>{{ formatDate(samplerData.original_training_date) }}</p>
              </div>
              <div>
                <label class="text-sm text-gray-500">Original Trainer</label>
                <p>{{ userData?.trainer_name }}</p>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Training History Card -->
        <UCard v-if="userData?.id">
          <template #header>
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-academic-cap" class="w-5 h-5" />
                <h2 class="text-lg font-semibold">Training History</h2>
              </div>
              <UButton
                size="sm"
                :icon="showTrainingPanel ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                color="gray"
                @click="showTrainingPanel = !showTrainingPanel"
              >
                {{ showTrainingPanel ? 'Hide' : 'Show' }}
              </UButton>
            </div>
          </template>
          
          <div v-if="showTrainingPanel">
            <TrainingHistoryPanel
              :user-id="userData.id"
              :editable="false"
              :is-trainer="isPolicyTrainer"
            />
          </div>
        </UCard>

        <!-- Equipment History Card -->
        <UCard v-if="userData?.id">
          <template #header>
            <div class="flex justify-between items-center">
              <div class="flex items-center gap-2">
                <UIcon name="i-heroicons-wrench-screwdriver" class="w-5 h-5" />
                <h2 class="text-lg font-semibold">Equipment History</h2>
              </div>
              <UButton
                size="sm"
                :icon="showEquipmentPanel ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                color="gray"
                @click="showEquipmentPanel = !showEquipmentPanel"
              >
                {{ showEquipmentPanel ? 'Hide' : 'Show' }}
              </UButton>
            </div>
          </template>
          
          <div v-if="showEquipmentPanel">
            <EquipmentHistoryPanel
              :user-id="userData.id"
              :editable="true"
            />
          </div>
        </UCard>

        <!-- Annual Sampling Plan - Only show if user is a sampler -->
        <div v-if="isPolicySampler">
          <SamplingIntentForm :userId="userData?.id" />
        </div>

        <div class="flex justify-between items-center mt-6 mb-2">
          <h2 class="text-lg font-semibold">Sampler Connections</h2>
          <UButton
            size="sm"
            :icon="showConnectionsPanel ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
            color="gray"
            @click="showConnectionsPanel = !showConnectionsPanel"
          >
            {{ showConnectionsPanel ? 'Hide Connections' : 'Show Connections' }}
          </UButton>
        </div>

        <!-- Only show the panel if showConnectionsPanel is true -->
        <div v-if="showConnectionsPanel && userData?.id">
          <UserConnectionsPanel :userId="userData.id" />
        </div>

        <UCard v-if="samplerData" class="mt-6">
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-lg font-semibold">Connection Status</h2>
              <UButton
                v-if="!isEditing"
                size="sm"
                icon="i-heroicons-pencil"
                @click="editAndScrollToForm"
              >
                Edit Preferences
              </UButton>
            </div>
          </template>
          
          <div class="space-y-4">
            <div class="flex items-center justify-center">
              <div class="text-center">
                <div class="mb-3">
                  <UIcon
                    :name="samplerData.allow_connections ? 'i-heroicons-user-group' : 'i-heroicons-user-minus'"
                    :class="samplerData.allow_connections ? 'text-green-500' : 'text-gray-400'"
                    size="48"
                  />
                </div>
                <div class="text-lg font-medium">
                  {{ samplerData.allow_connections ? 'You are accepting connection requests' : 'You are not accepting connection requests' }}
                </div>
                <div class="text-sm text-gray-600 mt-1">
                  {{ samplerData.allow_connections 
                    ? 'Other samplers can contact you through the system about sites you\'ve sampled' 
                    : 'Other samplers cannot contact you through the system' }}
                </div>
              </div>
            </div>
            
            <div class="border-t pt-4 text-sm text-gray-600">
              <p class="flex items-center">
                <UIcon name="i-heroicons-information-circle" class="mr-2 text-blue-500" />
                You can change this setting by editing your profile preferences.
              </p>
              <p class="mt-2" v-if="samplerData.allow_connections">
                Your email address is only shared if you reply to a connection request.
              </p>
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