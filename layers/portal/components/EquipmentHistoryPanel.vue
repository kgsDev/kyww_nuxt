<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';

const props = defineProps({
  userId: {
    type: String,
    required: true
  },
  editable: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['equipment-updated']);

const toast = useToast();
const loading = ref(true);
const currentEquipment = ref(null);
const showEditModal = ref(false);
const isSubmitting = ref(false);

const equipmentForm = ref({
  equip_ph: false,
  equip_do: false,
  equip_cond: false,
  equip_thermo: false,
  equip_incubator: false,
  ph_expire: '',
  do_expire: '',
  kit_option: '',
  notes: '',
  status: 'published'
});

// Check which equipment is currently active
const activeEquipment = computed(() => {
  if (!currentEquipment.value) return {};
  return {
    ph: currentEquipment.value.equip_ph,
    do: currentEquipment.value.equip_do,
    cond: currentEquipment.value.equip_cond,
    thermo: currentEquipment.value.equip_thermo,
    incubator: currentEquipment.value.equip_incubator
  };
});

// Equipment expiration warnings
const expirationWarnings = computed(() => {
  if (!currentEquipment.value) return [];
  
  const warnings = [];
  const today = new Date();
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(today.getDate() + 30);
  
  // Check pH expiration
  if (currentEquipment.value.equip_ph && currentEquipment.value.ph_expire) {
    const phExpire = new Date(currentEquipment.value.ph_expire);
    if (phExpire < today) {
      warnings.push({ type: 'pH Meter', status: 'expired', date: currentEquipment.value.ph_expire });
    } else if (phExpire < thirtyDaysOut) {
      warnings.push({ type: 'pH Meter', status: 'expiring', date: currentEquipment.value.ph_expire });
    }
  }
  
  // Check DO expiration
  if (currentEquipment.value.equip_do && currentEquipment.value.do_expire) {
    const doExpire = new Date(currentEquipment.value.do_expire);
    if (doExpire < today) {
      warnings.push({ type: 'DO Meter', status: 'expired', date: currentEquipment.value.do_expire });
    } else if (doExpire < thirtyDaysOut) {
      warnings.push({ type: 'DO Meter', status: 'expiring', date: currentEquipment.value.do_expire });
    }
  }
  
  return warnings;
});

const fetchCurrentEquipment = async () => {
  loading.value = true;
  try {
    const response = await useDirectus(readItems('equipment_history', {
      filter: {
        user_id: { _eq: props.userId }
      },
      fields: [
        '*',
        'user_created.first_name',
        'user_created.last_name'
      ],
      sort: ['-date_created'],
      limit: 1
    }));
    
    currentEquipment.value = response?.[0] || null;
  } catch (err) {
    console.error('Error fetching equipment:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to load equipment information',
      color: 'red'
    });
  } finally {
    loading.value = false;
  }
};

const formatDate = (date) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateShort = (date) => {
  if (!date) return 'Not set';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const openEditModal = () => {
  if (currentEquipment.value) {
    equipmentForm.value = {
      equip_ph: currentEquipment.value.equip_ph,
      equip_do: currentEquipment.value.equip_do,
      equip_cond: currentEquipment.value.equip_cond,
      equip_thermo: currentEquipment.value.equip_thermo,
      equip_incubator: currentEquipment.value.equip_incubator,
      ph_expire: currentEquipment.value.ph_expire || '',
      do_expire: currentEquipment.value.do_expire || '',
      kit_option: currentEquipment.value.kit_option || '',
      notes: '',
      status: 'published'
    };
  }
  showEditModal.value = true;
};

  const getEquipmentKitOption = (val) => {
    if (!val) {
      return 'N/A';
    }else {
      switch (val.toLowerCase()) {
        case 'own':
          return 'KYWW issued kit (you own it)';
        case 'other':
          return 'Borrow (borrow from friend/other sampler)';
        case 'personal':
          return 'Personal (personally bought/acquired not from KYWW)';
        case 'borrow':
          return 'Borrowed kit from Hub';
        default:
          return 'N/A';
      }
    } 
  };

const saveEquipmentUpdate = async () => {
  isSubmitting.value = true;
  try {
    const { user } = useDirectusAuth();
    
    // Create new equipment record
    await useDirectus(createItem('equipment_history', {
      user_id: props.userId,
      ...equipmentForm.value,
      status: 'published'
    }), {});
    
    toast.add({
      title: 'Success',
      description: 'Equipment updated successfully',
      color: 'green'
    });
    
    showEditModal.value = false;
    await fetchCurrentEquipment();
    emit('equipment-updated');
  } catch (err) {
    console.error('Error updating equipment:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to update equipment',
      color: 'red'
    });
  } finally {
    isSubmitting.value = false;
  }
};

const closeEditModal = () => {
  showEditModal.value = false;
  equipmentForm.value = {
    equip_ph: false,
    equip_do: false,
    equip_cond: false,
    equip_thermo: false,
    equip_incubator: false,
    ph_expire: '',
    do_expire: '',
    kit_option: '',
    notes: '',
    status: 'published'
  };
};

// Watch for userId changes
watch(() => props.userId, (newValue) => {
  if (newValue) {
    fetchCurrentEquipment();
  }
}, { immediate: true });

onMounted(() => {
  if (props.userId) {
    fetchCurrentEquipment();
  }
});
</script>

<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <ULoadingIcon />
      <span class="ml-2 text-gray-600">Loading equipment information...</span>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Expiration Warnings -->
      <UAlert
        v-if="expirationWarnings.length > 0"
        :type="expirationWarnings.some(w => w.status === 'expired') ? 'error' : 'warning'"
        class="mb-4"
      >
        <template #title>
          Equipment Expiration Alert
        </template>
        <template #description>
          <ul class="list-disc list-inside space-y-1">
            <li v-for="warning in expirationWarnings" :key="warning.type">
              <span class="font-medium">{{ warning.type }}</span>
              {{ warning.status === 'expired' ? 'expired on' : 'expires on' }}
              {{ formatDateShort(warning.date) }}
            </li>
          </ul>
        </template>
      </UAlert>

      <!-- Current Equipment Status -->
      <div class="bg-gray-50 p-4 rounded-lg">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-semibold text-gray-900">Current Equipment</h3>
          <UButton
            v-if="editable"
            icon="i-heroicons-pencil"
            size="xs"
            @click="openEditModal"
          >
            Update Equipment
          </UButton>
        </div>

        <div v-if="currentEquipment" class="space-y-3">
          <!-- Equipment Grid -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div v-for="(has, type) in activeEquipment" :key="type" class="text-center">
              <UIcon
                :name="has ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="has ? 'text-blue-600' : 'text-gray-400'"
                size="24"
                class="mx-auto mb-1"
              />
              <div class="text-sm capitalize">
                {{ type === 'ph' ? 'pH Meter' : 
                   type === 'do' ? 'DO Meter' : 
                   type === 'cond' ? 'Conductivity' :
                   type === 'thermo' ? 'Thermometer' :
                   type === 'incubator' ? 'Incubator' :
                   type.replace('_', ' ') }}
              </div>
            </div>
          </div>

          <!-- Expiration Dates -->
          <div v-if="currentEquipment.equip_ph || currentEquipment.equip_do" 
               class="pt-3 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div v-if="currentEquipment.equip_ph">
              <span class="text-gray-700 font-medium">pH Meter Expires:</span>
              <span class="ml-2" :class="{
                'text-red-600': expirationWarnings.some(w => w.type === 'pH Meter' && w.status === 'expired'),
                'text-orange-600': expirationWarnings.some(w => w.type === 'pH Meter' && w.status === 'expiring'),
                'text-gray-900': !expirationWarnings.some(w => w.type === 'pH Meter')
              }">
                {{ formatDateShort(currentEquipment.ph_expire) }}
              </span>
            </div>
            <div v-if="currentEquipment.equip_do">
              <span class="text-gray-700 font-medium">DO Meter Expires:</span>
              <span class="ml-2" :class="{
                'text-red-600': expirationWarnings.some(w => w.type === 'DO Meter' && w.status === 'expired'),
                'text-orange-600': expirationWarnings.some(w => w.type === 'DO Meter' && w.status === 'expiring'),
                'text-gray-900': !expirationWarnings.some(w => w.type === 'DO Meter')
              }">
                {{ formatDateShort(currentEquipment.do_expire) }}
              </span>
            </div>
          </div>

          <!-- Kit Option -->
          <div v-if="currentEquipment.kit_option" class="pt-3 border-t border-gray-200 text-sm">
            <span class="text-gray-700 font-medium">Kit Ownership/Status:</span>
            <span class="ml-2 text-gray-900 capitalize">{{ getEquipmentKitOption(currentEquipment.kit_option) }}</span>
          </div>
          <div v-if="currentEquipment.notes" class="text-sm">
            <span class="font-medium text-gray-700">Notes:</span>
            <p class="mt-1 text-gray-600 text-sm">{{ currentEquipment.notes }}</p>
          </div>

          <!-- Last Updated -->
          <div class="pt-3 border-t border-gray-200 text-xs text-gray-500">
            Last updated: {{ formatDate(currentEquipment.date_created) }}
            <span v-if="currentEquipment.user_created">
              by {{ currentEquipment.user_created.first_name }} {{ currentEquipment.user_created.last_name }}
            </span>
          </div>
        </div>

        <div v-else class="text-center py-4 text-gray-500">
          <UIcon name="i-heroicons-wrench-screwdriver" class="mx-auto mb-2" size="48" />
          <p>No equipment recorded yet</p>
        </div>
      </div>
    </template>

    <!-- Edit Equipment Modal -->
    <UModal v-model="showEditModal" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">Update Equipment</h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="gray"
              variant="ghost"
              @click="closeEditModal"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Equipment Checkboxes -->
          <UFormGroup label="Equipment">
            <div class="grid grid-cols-2 gap-3">
              <UCheckbox v-model="equipmentForm.equip_ph" label="Lamotte pH Meter" />
              <UCheckbox v-model="equipmentForm.equip_do" label="Lamotte DO Meter" />
              <UCheckbox v-model="equipmentForm.equip_cond" label="Conductivity Meter" />
              <UCheckbox v-model="equipmentForm.equip_thermo" label="Thermometer" />
              <UCheckbox v-model="equipmentForm.equip_incubator" label="Incubator" />
            </div>
          </UFormGroup>

          <!-- Expiration Dates -->
          <div class="grid grid-cols-2 gap-4">
            <UFormGroup 
              v-if="equipmentForm.equip_ph"
              label="Lamotte pH Meter Expiration"
            >
              <UInput
                v-model="equipmentForm.ph_expire"
                type="date"
              />
            </UFormGroup>

            <UFormGroup 
              v-if="equipmentForm.equip_do"
              label="DO Meter Expiration"
            >
              <UInput
                v-model="equipmentForm.do_expire"
                type="date"
              />
            </UFormGroup>
          </div>

          <!-- Kit Option -->
          <UFormGroup label="Kit Ownership/Status">
            <USelect
              v-model="equipmentForm.kit_option"
              :options="[
                { value: 'own', label: 'KYWW issued kit (you own it)' },
                { value: 'other', label: 'Borrow (borrow from friend/other sampler)' },
                { value: 'personal', label: 'Personal (personally bought/acquired not from KYWW)' },
                { value: 'borrow', label: 'Borrowed kit from Hub' },

              ]"
              placeholder="Select kit ownership/status"
            />
          </UFormGroup>

          <!-- Notes -->
          <UFormGroup label="Notes">
            <UTextarea
              v-model="equipmentForm.notes"
              :rows="3"
              placeholder="Optional notes about this equipment update..."
            />
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="gray"
              variant="ghost"
              @click="closeEditModal"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :loading="isSubmitting"
              @click="saveEquipmentUpdate"
            >
              Save Changes
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>