<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  trainerId: {
    type: String,
    required: true
  }
});

const toast = useToast();
const loading = ref(true);
const myTrainees = ref([]);
const selectedUser = ref(null);
const showDetailsModal = ref(false);
const editingTraining = ref(false);
const editingEquipment = ref(false);
const savingTraining = ref(false);
const savingEquipment = ref(false);

// Inject parent's refresh function (if available)
const refreshParentData = inject('refreshTrainingData', null);

// Form states for editing
const trainingForm = ref({
  training_date: '',
  training_location: '',
  training_field_chemistry: false,
  training_r_card: false,
  training_habitat: false,
  training_biological: false
});

// Warning modal state for save confirmation
const showSaveWarning = ref(false);

const equipmentForm = ref({
  item_type: '',
  item_name: '',
  serial_number: '',
  calibration_date: '',
  expiration_date: ''
});

// Fetch all trainees associated with this trainer
const fetchMyTrainees = async () => {
  try {
    // Get all training records where this user was the trainer
    const trainingRecords = await useDirectus(readItems('training_history', {
      filter: {
        trainer_id: { _eq: props.trainerId }
      },
      fields: [
        '*',
        {
          user_id: ['id', 'first_name', 'last_name', 'email', 'status']
        }
      ],
      sort: ['-training_date'],
      limit: -1
    }));
    
    // Group by user and get unique users
    const uniqueUsers = new Map();
    trainingRecords.forEach(record => {
      if (record.user_id && !uniqueUsers.has(record.user_id.id)) {
        uniqueUsers.set(record.user_id.id, {
          ...record.user_id,
          trainingCount: 1,
          latestTraining: record.training_date,
          trainingHistory: [record]
        });
      } else if (record.user_id) {
        const existing = uniqueUsers.get(record.user_id.id);
        existing.trainingCount++;
        existing.trainingHistory.push(record);
        if (new Date(record.training_date) > new Date(existing.latestTraining)) {
          existing.latestTraining = record.training_date;
        }
      }
    });
    
    myTrainees.value = Array.from(uniqueUsers.values());
  } catch (err) {
    console.error('Error fetching my trainees:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to load your trainees',
      color: 'red'
    });
  }
};

const formatName = (user) => {
  if (!user) return 'Unknown User';
  return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unnamed User';
};

const formatDate = (date) => {
  if (!date) return 'Not recorded';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const formatDateForInput = (date) => {
  if (!date) return '';
  // Convert to YYYY-MM-DD format for input type="date"
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const viewUserDetails = async (user) => {
  selectedUser.value = user;
  
  // Fetch latest equipment record for this user (only one record now)
  try {
    console.log('Attempting to fetch equipment record for user:', user.id);
    
    const equipmentHistory = await useDirectus(readItems('equipment_history', {
      filter: {
        user_id: { _eq: user.id }
      },
      fields: [
        'id',
        'user_id',
        'equip_ph',
        'equip_do',
        'equip_cond',
        'equip_thermo',
        'equip_waste',
        'equip_pan',
        'equip_flip',
        'equip_incubator',
        'ph_expire',
        'do_expire',
        'kit_option',
        'notes',
        'date_created',
        'date_updated'
      ],
      sort: ['-date_created'],
      limit: 1  // Only get the latest one
    }));
    
    console.log('Equipment record response:', equipmentHistory);
    
    // Since we're only getting one record, just store it directly
    if (equipmentHistory && Array.isArray(equipmentHistory) && equipmentHistory.length > 0) {
      selectedUser.value.equipmentRecord = equipmentHistory[0];
    } else {
      console.warn('No equipment record found for user');
      selectedUser.value.equipmentRecord = null;
    }
  } catch (err) {
    console.error('Error fetching equipment record:', err);
    console.error('Error details:', {
      message: err.message,
      response: err.response,
      status: err.response?.status
    });
    
    // Check if it's a permission error
    if (err.response?.status === 403) {
      console.error('Permission denied for equipment_history table');
      toast.add({
        title: 'Permission Issue',
        description: 'Unable to load equipment information due to permissions. Please contact an administrator.',
        color: 'yellow',
        timeout: 5000
      });
    }
    
    selectedUser.value.equipmentRecord = null;
  }
  
  showDetailsModal.value = true;
};

const closeDetailsModal = () => {
  showDetailsModal.value = false;
  editingTraining.value = false;
  editingEquipment.value = false;
  selectedUser.value = null;
};

const startEditingTraining = (training) => {
  trainingForm.value = {
    id: training.id,
    training_date: formatDateForInput(training.training_date),
    training_location: training.training_location || '',
    training_field_chemistry: training.training_field_chemistry || false,
    training_r_card: training.training_r_card || false,
    training_habitat: training.training_habitat || false,
    training_biological: training.training_biological || false
  };
  editingTraining.value = true;
};

const confirmSaveEdit = () => {
  // Validation before showing confirmation
  if (!trainingForm.value.training_date) {
    toast.add({
      title: 'Validation Error',
      description: 'Training date is required',
      color: 'red'
    });
    return;
  }

  if (!trainingForm.value.training_location || trainingForm.value.training_location.trim() === '') {
    toast.add({
      title: 'Validation Error',
      description: 'Training location is required',
      color: 'red'
    });
    return;
  }

  // Check if at least one training type is selected
  const hasTrainingType = trainingForm.value.training_field_chemistry ||
                          trainingForm.value.training_r_card ||
                          trainingForm.value.training_habitat ||
                          trainingForm.value.training_biological;

  if (!hasTrainingType) {
    toast.add({
      title: 'Validation Error',
      description: 'At least one training type must be selected',
      color: 'red'
    });
    return;
  }

  showSaveWarning.value = true;
};

const cancelSaveWarning = () => {
  showSaveWarning.value = false;
};

const cancelEditingTraining = () => {
  editingTraining.value = false;
  trainingForm.value = {
    training_date: '',
    training_location: '',
    training_field_chemistry: false,
    training_r_card: false,
    training_habitat: false,
    training_biological: false
  };
};

const saveTraining = async () => {
  if (!trainingForm.value.id) {
    toast.add({
      title: 'Error',
      description: 'No training record selected',
      color: 'red'
    });
    return;
  }

  // Validation
  if (!trainingForm.value.training_date) {
    toast.add({
      title: 'Validation Error',
      description: 'Training date is required',
      color: 'red'
    });
    return;
  }

  if (!trainingForm.value.training_location || trainingForm.value.training_location.trim() === '') {
    toast.add({
      title: 'Validation Error',
      description: 'Training location is required',
      color: 'red'
    });
    return;
  }

  // Check if at least one training type is selected
  const hasTrainingType = trainingForm.value.training_field_chemistry ||
                          trainingForm.value.training_r_card ||
                          trainingForm.value.training_habitat ||
                          trainingForm.value.training_biological;

  if (!hasTrainingType) {
    toast.add({
      title: 'Validation Error',
      description: 'At least one training type must be selected',
      color: 'red'
    });
    return;
  }

  savingTraining.value = true;
  showSaveWarning.value = false;
  
  try {
    // Update the training record
    await useDirectus(updateItem('training_history', trainingForm.value.id, {
      user_updated: props.trainerId,
      training_date: trainingForm.value.training_date,
      training_location: trainingForm.value.training_location,
      training_field_chemistry: trainingForm.value.training_field_chemistry,
      training_r_card: trainingForm.value.training_r_card,
      training_habitat: trainingForm.value.training_habitat,
      training_biological: trainingForm.value.training_biological
    }));
    
    toast.add({
      title: 'Success',
      description: 'Training record updated successfully',
      color: 'green'
    });
    
    // Refresh the trainee data
    await fetchMyTrainees();
    
    // Update the selected user's training history to reflect changes
    if (selectedUser.value) {
      const updatedUser = myTrainees.value.find(t => t.id === selectedUser.value.id);
      if (updatedUser) {
        selectedUser.value = updatedUser;
      }
    }
    
    // Refresh parent training report page data
    if (refreshParentData) {
      await refreshParentData();
    }
    
    cancelEditingTraining();
  } catch (err) {
    console.error('Error updating training:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to update training record',
      color: 'red'
    });
  } finally {
    savingTraining.value = false;
  }
};

const addNewTraining = () => {
  trainingForm.value = {
    user_id: selectedUser.value.id,
    training_date: formatDateForInput(new Date()),
    training_location: '',
    training_field_chemistry: false,
    training_r_card: false,
    training_habitat: false,
    training_biological: false
  };
  editingTraining.value = true;
};

const saveNewTraining = async () => {
  if (!selectedUser.value) {
    toast.add({
      title: 'Error',
      description: 'No user selected',
      color: 'red'
    });
    return;
  }

  // Validation
  if (!trainingForm.value.training_date) {
    toast.add({
      title: 'Validation Error',
      description: 'Training date is required',
      color: 'red'
    });
    return;
  }

  if (!trainingForm.value.training_location || trainingForm.value.training_location.trim() === '') {
    toast.add({
      title: 'Validation Error',
      description: 'Training location is required',
      color: 'red'
    });
    return;
  }

  // Check if at least one training type is selected
  const hasTrainingType = trainingForm.value.training_field_chemistry ||
                          trainingForm.value.training_r_card ||
                          trainingForm.value.training_habitat ||
                          trainingForm.value.training_biological;

  if (!hasTrainingType) {
    toast.add({
      title: 'Validation Error',
      description: 'At least one training type must be selected',
      color: 'red'
    });
    return;
  }

  savingTraining.value = true;
  
  try {
    // Create new training record
    await useDirectus(createItem('training_history', {
      user_id: selectedUser.value.id,
      trainer_id: props.trainerId,
      user_created: props.trainerId,
      user_updated: props.trainerId,
      training_date: trainingForm.value.training_date,
      training_location: trainingForm.value.training_location,
      training_field_chemistry: trainingForm.value.training_field_chemistry,
      training_r_card: trainingForm.value.training_r_card,
      training_habitat: trainingForm.value.training_habitat,
      training_biological: trainingForm.value.training_biological
    }));
    
    toast.add({
      title: 'Success',
      description: 'Training record added successfully',
      color: 'green'
    });
    
    // Refresh the trainee data
    await fetchMyTrainees();
    
    // Update the selected user's training history to reflect the new training
    if (selectedUser.value) {
      const updatedUser = myTrainees.value.find(t => t.id === selectedUser.value.id);
      if (updatedUser) {
        selectedUser.value = updatedUser;
      }
    }
    
    // Refresh parent training report page data
    if (refreshParentData) {
      await refreshParentData();
    }
    
    cancelEditingTraining();
  } catch (err) {
    console.error('Error adding training:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to add training record',
      color: 'red'
    });
  } finally {
    savingTraining.value = false;
  }
};

// Current certifications computed from training history
const currentCertifications = computed(() => {
  if (!selectedUser.value?.trainingHistory) {
    return {
      field_chemistry: false,
      r_card: false,
      habitat: false,
      biological: false
    };
  }
  
  // Check all trainings (no longer filtering by verified)
  return {
    field_chemistry: selectedUser.value.trainingHistory.some(t => t.training_field_chemistry),
    r_card: selectedUser.value.trainingHistory.some(t => t.training_r_card),
    habitat: selectedUser.value.trainingHistory.some(t => t.training_habitat),
    biological: selectedUser.value.trainingHistory.some(t => t.training_biological)
  };
});

// Stats
const stats = computed(() => ({
  myTotalTrainees: myTrainees.value.length,
  myActiveSamplers: myTrainees.value.filter(u => u.status === 'active').length
}));

onMounted(async () => {
  loading.value = true;
  await fetchMyTrainees();
  loading.value = false;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-8">
      <ULoadingIcon />
      <p class="mt-2 text-gray-600">Loading trainees...</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Stats Summary -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="text-2xl font-bold text-blue-600">{{ stats.myTotalTrainees }}</div>
          <div class="text-sm text-blue-700">My Total Trainees</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <div class="text-2xl font-bold text-green-600">{{ stats.myActiveSamplers }}</div>
          <div class="text-sm text-green-700">My Active Samplers</div>
        </div>
      </div>

      <!-- My Trainees -->
      <div v-if="myTrainees.length === 0" class="text-center py-8 text-gray-500">
        <UIcon name="i-heroicons-users" class="mx-auto mb-2" size="48" />
        <p>No trainees found</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="trainee in myTrainees"
          :key="trainee.id"
          class="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          @click="viewUserDetails(trainee)"
        >
          <div class="flex justify-between items-start">
            <div class="flex-1">
              <h3 class="font-medium text-gray-900">{{ formatName(trainee) }}</h3>
              <p class="text-sm text-gray-600">{{ trainee.email }}</p>
              <div class="flex gap-4 mt-2 text-sm text-gray-600">
                <span>Latest Training: {{ formatDate(trainee.latestTraining) }}</span>
                <span>Sessions: {{ trainee.trainingCount }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <UBadge :color="trainee.status === 'active' ? 'green' : 'gray'">
                {{ trainee.status }}
              </UBadge>
              <UButton
                icon="i-heroicons-arrow-right"
                size="xs"
                color="gray"
                variant="ghost"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- User Details Modal -->
    <UModal v-model="showDetailsModal" :ui="{ width: 'sm:max-w-4xl' }">
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
              @click="closeDetailsModal"
            />
          </div>
        </template>

        <div class="space-y-6">
          <!-- User Basic Info -->
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span class="font-medium text-gray-700">Status:</span>
              <UBadge :color="selectedUser.status === 'active' ? 'green' : 'gray'" class="ml-2">
                {{ selectedUser.status }}
              </UBadge>
            </div>
            <div>
              <span class="font-medium text-gray-700">Training Sessions:</span>
              <span class="ml-2">{{ selectedUser.trainingCount || 0 }}</span>
            </div>
          </div>

          <!-- Current Certifications -->
          <div class="border-t pt-4">
            <h4 class="font-medium text-gray-900 mb-2">Current Certifications</h4>
            <div class="flex flex-wrap gap-2">
              <UBadge v-if="currentCertifications.field_chemistry" color="blue">Field Chemistry</UBadge>
              <UBadge v-if="currentCertifications.r_card" color="green">R-Card</UBadge>
              <UBadge v-if="currentCertifications.habitat" color="purple">Habitat</UBadge>
              <UBadge v-if="currentCertifications.biological" color="orange">Biological</UBadge>
              <span v-if="!currentCertifications.field_chemistry && !currentCertifications.r_card && !currentCertifications.habitat && !currentCertifications.biological" class="text-gray-500 text-sm">
                No current certifications
              </span>
            </div>
          </div>

          <!-- Training History -->
          <div class="border-t pt-4">
            <div class="flex justify-between items-center mb-4">
              <h4 class="font-medium text-gray-900">Training History</h4>
              <UButton
                @click="addNewTraining"
                size="sm"
                color="primary"
                icon="i-heroicons-plus"
              >
                Add Training
              </UButton>
            </div>

            <!-- Training Form (for editing or adding) -->
            <div v-if="editingTraining" class="bg-blue-50 p-4 rounded-lg mb-4">
              <h5 class="font-medium mb-3">{{ trainingForm.id ? 'Edit' : 'Add' }} Training Record</h5>
              
              <!-- Warning message for editing -->
              <UAlert
                v-if="trainingForm.id"
                color="yellow"
                variant="soft"
                icon="i-heroicons-exclamation-triangle"
                class="mb-4"
                title="Important: Editing should be rare"
              >
                <template #description>
                  <p class="text-sm">Edit existing records only to correct errors. For new trainings at different dates or locations, cancel and use "Add Training" instead.</p>
                </template>
              </UAlert>
              
              <div class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-sm font-medium text-gray-700 block mb-1">Training Date</label>
                    <UInput
                      v-model="trainingForm.training_date"
                      type="date"
                      size="sm"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium text-gray-700 block mb-1">Location</label>
                    <UInput
                      v-model="trainingForm.training_location"
                      placeholder="Training location"
                      size="sm"
                    />
                  </div>
                </div>

                <div>
                  <label class="text-sm font-medium text-gray-700 block mb-2">Training Types</label>
                  <div class="grid grid-cols-2 gap-2">
                    <label class="flex items-center gap-2">
                      <input
                        v-model="trainingForm.training_field_chemistry"
                        type="checkbox"
                        class="rounded border-gray-300"
                      />
                      <span class="text-sm">Field Chemistry</span>
                    </label>
                    <label class="flex items-center gap-2">
                      <input
                        v-model="trainingForm.training_r_card"
                        type="checkbox"
                        class="rounded border-gray-300"
                      />
                      <span class="text-sm">R-Card</span>
                    </label>
                    <label class="flex items-center gap-2">
                      <input
                        v-model="trainingForm.training_habitat"
                        type="checkbox"
                        class="rounded border-gray-300"
                      />
                      <span class="text-sm">Habitat</span>
                    </label>
                    <label class="flex items-center gap-2">
                      <input
                        v-model="trainingForm.training_biological"
                        type="checkbox"
                        class="rounded border-gray-300"
                      />
                      <span class="text-sm">Biological</span>
                    </label>
                  </div>
                </div>

                <div class="flex gap-2">
                  <UButton
                    v-if="trainingForm.id"
                    @click="confirmSaveEdit"
                    :loading="savingTraining"
                    color="yellow"
                    size="sm"
                  >
                    Save Changes
                  </UButton>
                  <UButton
                    v-else
                    @click="saveNewTraining()"
                    :loading="savingTraining"
                    color="primary"
                    size="sm"
                  >
                    Save New Training
                  </UButton>
                  <UButton
                    @click="cancelEditingTraining"
                    color="gray"
                    size="sm"
                  >
                    Cancel
                  </UButton>
                </div>
              </div>
            </div>

            <!-- Training History List -->
            <div v-if="selectedUser.trainingHistory && selectedUser.trainingHistory.length > 0" class="space-y-2">
              <div
                v-for="training in selectedUser.trainingHistory"
                :key="training.id"
                class="bg-gray-50 p-3 rounded border"
              >
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-medium text-sm">{{ formatDate(training.training_date) }}</span>
                    </div>
                    <p class="text-sm text-gray-600 mb-2">{{ training.training_location || 'Location not specified' }}</p>
                    <div class="flex flex-wrap gap-1">
                      <UBadge v-if="training.training_field_chemistry" size="xs" color="blue">FC</UBadge>
                      <UBadge v-if="training.training_r_card" size="xs" color="green">RC</UBadge>
                      <UBadge v-if="training.training_habitat" size="xs" color="purple">H</UBadge>
                      <UBadge v-if="training.training_biological" size="xs" color="orange">B</UBadge>
                    </div>
                  </div>
                  <UButton
                    @click="startEditingTraining(training)"
                    size="xs"
                    color="gray"
                    icon="i-heroicons-pencil"
                  >
                    Edit
                  </UButton>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4 text-gray-500 text-sm">
              No training history found
            </div>
          </div>

          <!-- Equipment Information -->
          <div class="border-t pt-4">
            <div class="flex justify-between items-center mb-4">
              <h4 class="font-medium text-gray-900">Current Equipment</h4>
            </div>
            
            <div v-if="selectedUser.equipmentRecord" class="bg-gray-50 p-4 rounded border">
              <div class="space-y-3">
                <!-- Equipment owned section -->
                <div>
                  <p class="text-sm font-medium text-gray-700 mb-2">Equipment Owned:</p>
                  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div v-if="selectedUser.equipmentRecord.equip_ph" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-check-circle" class="text-green-600 w-4 h-4" />
                      <span class="text-sm text-gray-700">pH Meter</span>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.equip_do" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-check-circle" class="text-green-600 w-4 h-4" />
                      <span class="text-sm text-gray-700">DO Meter</span>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.equip_cond" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-check-circle" class="text-green-600 w-4 h-4" />
                      <span class="text-sm text-gray-700">Conductivity</span>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.equip_thermo" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-check-circle" class="text-green-600 w-4 h-4" />
                      <span class="text-sm text-gray-700">Thermometer</span>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.equip_waste" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-check-circle" class="text-green-600 w-4 h-4" />
                      <span class="text-sm text-gray-700">Waste Container</span>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.equip_pan" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-check-circle" class="text-green-600 w-4 h-4" />
                      <span class="text-sm text-gray-700">Pan</span>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.equip_flip" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-check-circle" class="text-green-600 w-4 h-4" />
                      <span class="text-sm text-gray-700">Flip Chart</span>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.equip_incubator" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-check-circle" class="text-green-600 w-4 h-4" />
                      <span class="text-sm text-gray-700">Incubator</span>
                    </div>
                  </div>
                  <div v-if="!selectedUser.equipmentRecord.equip_ph && !selectedUser.equipmentRecord.equip_do && !selectedUser.equipmentRecord.equip_cond && !selectedUser.equipmentRecord.equip_thermo && !selectedUser.equipmentRecord.equip_waste && !selectedUser.equipmentRecord.equip_pan && !selectedUser.equipmentRecord.equip_flip && !selectedUser.equipmentRecord.equip_incubator" class="text-sm text-gray-500">
                    No equipment recorded
                  </div>
                </div>

                <!-- Expiration dates section -->
                <div v-if="selectedUser.equipmentRecord.ph_expire || selectedUser.equipmentRecord.do_expire" class="border-t pt-2">
                  <p class="text-sm font-medium text-gray-700 mb-2">Expiration Dates:</p>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div v-if="selectedUser.equipmentRecord.ph_expire" class="text-sm">
                      <span class="font-medium text-gray-700">pH Meter:</span>
                      <span class="ml-2" :class="new Date(selectedUser.equipmentRecord.ph_expire) < new Date() ? 'text-red-600 font-medium' : 'text-gray-600'">
                        {{ formatDate(selectedUser.equipmentRecord.ph_expire) }}
                      </span>
                      <UBadge v-if="new Date(selectedUser.equipmentRecord.ph_expire) < new Date()" color="red" size="xs" class="ml-2">
                        Expired
                      </UBadge>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.do_expire" class="text-sm">
                      <span class="font-medium text-gray-700">DO Meter:</span>
                      <span class="ml-2" :class="new Date(selectedUser.equipmentRecord.do_expire) < new Date() ? 'text-red-600 font-medium' : 'text-gray-600'">
                        {{ formatDate(selectedUser.equipmentRecord.do_expire) }}
                      </span>
                      <UBadge v-if="new Date(selectedUser.equipmentRecord.do_expire) < new Date()" color="red" size="xs" class="ml-2">
                        Expired
                      </UBadge>
                    </div>
                  </div>
                </div>

                <!-- Kit option and notes -->
                <div class="border-t pt-2 space-y-1">
                  <div v-if="selectedUser.equipmentRecord.kit_option" class="text-sm">
                    <span class="font-medium text-gray-700">Kit Option:</span>
                    <span class="ml-2 text-gray-600">{{ selectedUser.equipmentRecord.kit_option }}</span>
                  </div>
                  <div v-if="selectedUser.equipmentRecord.notes" class="text-sm">
                    <span class="font-medium text-gray-700">Notes:</span>
                    <p class="mt-1 text-gray-600 text-sm">{{ selectedUser.equipmentRecord.notes }}</p>
                  </div>
                  <div class="text-xs text-gray-500 mt-2">
                    Last Updated: {{ formatDate(selectedUser.equipmentRecord.date_updated || selectedUser.equipmentRecord.date_created) }}
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4 text-gray-500 text-sm bg-gray-50 rounded border">
              No equipment information recorded for this user
            </div>
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end">
            <UButton @click="closeDetailsModal">Close</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Save Edit Confirmation Modal -->
    <UModal v-model="showSaveWarning" :ui="{ width: 'sm:max-w-md' }">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="text-yellow-500 w-6 h-6" />
            <h3 class="text-lg font-semibold">Confirm Changes</h3>
          </div>
        </template>

        <p class="text-sm text-gray-700">
          Are you sure you want to save these changes to this training record?
        </p>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="gray"
              @click="cancelSaveWarning"
            >
              Cancel
            </UButton>
            <UButton
              color="yellow"
              @click="saveTraining"
              :loading="savingTraining"
            >
              Yes, Save Changes
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>