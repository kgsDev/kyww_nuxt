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
  },
  isTrainer: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['training-updated']);

const toast = useToast();
const loading = ref(true);
const trainingHistory = ref([]);
const showEditModal = ref(false);
const selectedTraining = ref(null);
const isSubmitting = ref(false);

const editForm = ref({
  training_date: '',
  training_location: '',
  training_field_chemistry: false,
  training_r_card: false,
  training_habitat: false,
  training_biological: false,
  notes: ''
});

// Computed properties for training summary
const latestTraining = computed(() => {
  if (!trainingHistory.value.length) return null;
  return [...trainingHistory.value].sort((a, b) => 
    new Date(b.training_date) - new Date(a.training_date)
  )[0];
});

const originalTraining = computed(() => {
  if (!trainingHistory.value.length) return null;
  return [...trainingHistory.value].sort((a, b) => 
    new Date(a.training_date) - new Date(b.training_date)
  )[0];
});

// Training expires 3 years from last training date
const TRAINING_EXPIRATION_YEARS = 3;

const getTrainingStatus = (trainingType) => {
  const trainings = trainingHistory.value.filter(
    t => t[`training_${trainingType}`]
  );
  
  if (!trainings.length) {
    return { certified: false, expires: null, status: 'none' };
  }
  
  // Get most recent training for this type
  const latestTraining = trainings.sort((a, b) => 
    new Date(b.training_date) - new Date(a.training_date)
  )[0];
  
  const trainingDate = new Date(latestTraining.training_date);
  const expirationDate = new Date(trainingDate);
  expirationDate.setFullYear(expirationDate.getFullYear() + TRAINING_EXPIRATION_YEARS);
  
  const today = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(today.getMonth() + 6);
  
  let status = 'valid';
  if (expirationDate < today) {
    status = 'expired';
  } else if (expirationDate < sixMonthsFromNow) {
    status = 'expiring';
  }
  
  return {
    certified: true,
    expires: expirationDate,
    status: status,
    daysUntilExpiration: Math.floor((expirationDate - today) / (1000 * 60 * 60 * 24))
  };
};

const currentTrainingStatus = computed(() => {
  if (!trainingHistory.value.length) return {
    field_chemistry: getTrainingStatus('field_chemistry'),
    r_card: getTrainingStatus('r_card'),
    habitat: getTrainingStatus('habitat'),
    biological: getTrainingStatus('biological')
  };
  
  return {
    field_chemistry: getTrainingStatus('field_chemistry'),
    r_card: getTrainingStatus('r_card'),
    habitat: getTrainingStatus('habitat'),
    biological: getTrainingStatus('biological')
  };
});

// Check if any training is expired or expiring soon
const trainingWarnings = computed(() => {
  const warnings = [];
  const statuses = currentTrainingStatus.value;
  
  Object.keys(statuses).forEach(type => {
    const status = statuses[type];
    if (status.status === 'expired') {
      warnings.push({
        type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        status: 'expired',
        expires: status.expires,
        severity: 'error'
      });
    } else if (status.status === 'expiring') {
      warnings.push({
        type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        status: 'expiring',
        expires: status.expires,
        daysRemaining: status.daysUntilExpiration,
        severity: 'warning'
      });
    }
  });
  
  return warnings;
});

const fetchTrainingHistory = async () => {
  loading.value = true;
  try {
    const response = await useDirectus(readItems('training_history', {
      filter: {
        user_id: { _eq: props.userId }
      },
      fields: [
        '*',
        'trainer_id.first_name',
        'trainer_id.last_name',
        'user_created.first_name',
        'user_created.last_name',
        'user_updated.first_name',
        'user_updated.last_name'
      ],
      sort: ['-training_date'],
      limit: -1
    }));
    
    trainingHistory.value = response || [];
  } catch (err) {
    console.error('Error fetching training history:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to load training history',
      color: 'red'
    });
  } finally {
    loading.value = false;
  }
};

const formatDate = (date) => {
  if (!date) return 'Not recorded';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const formatDateShort = (date) => {
  if (!date) return 'Not recorded';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const getTrainingTypes = (training) => {
  const types = [];
  if (training.training_field_chemistry) types.push('Field Chemistry');
  if (training.training_r_card) types.push('R-Card');
  if (training.training_habitat) types.push('Habitat');
  if (training.training_biological) types.push('Biological');
  return types;
};

const editTraining = (training) => {
  selectedTraining.value = training;
  editForm.value = {
    training_date: training.training_date,
    training_location: training.training_location,
    training_field_chemistry: training.training_field_chemistry,
    training_r_card: training.training_r_card,
    training_habitat: training.training_habitat,
    training_biological: training.training_biological,
    notes: training.notes || ''
  };
  showEditModal.value = true;
};

const saveTrainingEdit = async () => {
  if (!selectedTraining.value) return;
  
  isSubmitting.value = true;
  try {
    await useDirectus(updateItem('training_history', selectedTraining.value.id, {
      ...editForm.value,
      date_updated: new Date().toISOString()
    }));
    
    toast.add({
      title: 'Success',
      description: 'Training record updated successfully',
      color: 'green'
    });
    
    showEditModal.value = false;
    await fetchTrainingHistory();
    emit('training-updated');
  } catch (err) {
    console.error('Error updating training:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to update training record',
      color: 'red'
    });
  } finally {
    isSubmitting.value = false;
  }
};

const closeEditModal = () => {
  showEditModal.value = false;
  selectedTraining.value = null;
  editForm.value = {
    training_date: '',
    training_location: '',
    training_field_chemistry: false,
    training_r_card: false,
    training_habitat: false,
    training_biological: false,
    notes: ''
  };
};

// Watch for userId changes
watch(() => props.userId, (newValue) => {
  if (newValue) {
    fetchTrainingHistory();
  }
}, { immediate: true });

onMounted(() => {
  if (props.userId) {
    fetchTrainingHistory();
  }
});
</script>

<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <ULoadingIcon />
      <span class="ml-2 text-gray-600">Loading training history...</span>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Expiration Warnings -->
      <UAlert
        v-if="trainingWarnings.length > 0"
        :type="trainingWarnings.some(w => w.severity === 'error') ? 'error' : 'warning'"
        class="mb-4"
      >
        <template #title>
          Training Certification Alert
        </template>
        <template #description>
          <ul class="list-disc list-inside space-y-1">
            <li v-for="warning in trainingWarnings" :key="warning.type">
              <span class="font-medium">{{ warning.type }}</span>
              {{ warning.status === 'expired' ? 'expired on' : 'expires on' }}
              {{ formatDateShort(warning.expires) }}
              <span v-if="warning.daysRemaining" class="text-sm">
                ({{ warning.daysRemaining }} days remaining)
              </span>
            </li>
          </ul>
        </template>
      </UAlert>

      <!-- Training Summary Card -->
      <div class="bg-blue-50 p-4 rounded-lg">
        <h3 class="font-semibold text-blue-900 mb-3">Current Training Status</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div v-for="(status, type) in currentTrainingStatus" :key="type" class="text-center">
            <div class="relative">
              <UIcon
                :name="status.certified ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
                :class="{
                  'text-green-600': status.status === 'valid',
                  'text-orange-600': status.status === 'expiring',
                  'text-red-600': status.status === 'expired',
                  'text-gray-400': status.status === 'none'
                }"
                size="24"
                class="mx-auto mb-1"
              />
              <UBadge
                v-if="status.status === 'expiring'"
                color="orange"
                size="xs"
                class="absolute -top-1 -right-1"
              >
                !
              </UBadge>
              <UBadge
                v-if="status.status === 'expired'"
                color="red"
                size="xs"
                class="absolute -top-1 -right-1"
              >
                !!
              </UBadge>
            </div>
            <div class="text-sm capitalize">
              {{ type.replace('_', ' ') }}
            </div>
            <div v-if="status.expires" class="text-xs mt-1" :class="{
              'text-green-700': status.status === 'valid',
              'text-orange-700': status.status === 'expiring',
              'text-red-700': status.status === 'expired'
            }">
              {{ status.status === 'expired' ? 'Expired' : 'Expires' }}
              {{ formatDateShort(status.expires) }}
            </div>
          </div>
        </div>
        
        <div class="mt-4 pt-4 border-t border-blue-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span class="text-blue-700 font-medium">Original Training:</span>
            <span class="text-blue-900 ml-2">
              {{ originalTraining ? formatDateShort(originalTraining.training_date) : 'No training recorded' }}
            </span>
          </div>
          <div>
            <span class="text-blue-700 font-medium">Latest Training:</span>
            <span class="text-blue-900 ml-2">
              {{ latestTraining ? formatDateShort(latestTraining.training_date) : 'No training recorded' }}
            </span>
          </div>
        </div>
        
        <div class="mt-3 pt-3 border-t border-blue-200">
          <p class="text-xs text-blue-700">
            <UIcon name="i-heroicons-information-circle" class="inline w-4 h-4" />
            Training certifications expire 3 years from the training date
          </p>
        </div>
      </div>

      <!-- Training History List -->
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="font-semibold text-gray-900">Training History</h3>
          <UBadge color="blue" variant="soft">
            {{ trainingHistory.length }} session{{ trainingHistory.length !== 1 ? 's' : '' }}
          </UBadge>
        </div>

        <!-- No Training Message -->
        <div v-if="trainingHistory.length === 0" class="text-center py-8 text-gray-500">
          <UIcon name="i-heroicons-academic-cap" class="mx-auto mb-2" size="48" />
          <p>No training history recorded yet</p>
        </div>

        <!-- Training Sessions -->
        <div v-else class="space-y-3">
          <div
            v-for="training in trainingHistory"
            :key="training.id"
            class="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
          >
            <div class="flex justify-between items-start mb-3">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <h4 class="font-medium text-gray-900">{{ formatDate(training.training_date) }}</h4>
                </div>
                <p class="text-sm text-gray-600">{{ training.training_location }}</p>
              </div>
              
              <UButton
                v-if="editable && isTrainer"
                icon="i-heroicons-pencil"
                size="xs"
                color="gray"
                variant="ghost"
                @click="editTraining(training)"
              />
            </div>

            <!-- Training Types -->
            <div class="flex flex-wrap gap-2 mb-3">
              <UBadge
                v-for="type in getTrainingTypes(training)"
                :key="type"
                color="blue"
                variant="soft"
                size="sm"
              >
                {{ type }}
              </UBadge>
            </div>

            <!-- Trainer Info -->
            <div class="text-sm text-gray-600 space-y-1">
              <div v-if="training.trainer_id">
                <span class="font-medium">Trainer:</span>
                {{ training.trainer_id.first_name }} {{ training.trainer_id.last_name }}
              </div>
              <div v-else-if="training.trainer_name">
                <span class="font-medium">Trainer:</span>
                {{ training.trainer_name }}
              </div>
            </div>

            <!-- Notes -->
            <div v-if="training.notes" class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-sm text-gray-700">
                <span class="font-medium">Notes:</span> {{ training.notes }}
              </p>
            </div>

            <!-- Metadata -->
            <div class="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 grid grid-cols-2 gap-2">
              <div v-if="training.user_created">
                Created by: {{ training.user_created.first_name }} {{ training.user_created.last_name }}
              </div>
              <div v-if="training.date_created">
                {{ formatDateShort(training.date_created) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Edit Training Modal -->
    <UModal v-model="showEditModal" :ui="{ width: 'sm:max-w-2xl' }">
      <UCard>
        <template #header>
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">Edit Training Record</h3>
            <UButton
              icon="i-heroicons-x-mark"
              color="gray"
              variant="ghost"
              @click="closeEditModal"
            />
          </div>
        </template>

        <div class="space-y-4">
          <!-- Training Date -->
          <UFormGroup label="Training Date" required>
            <UInput
              v-model="editForm.training_date"
              type="date"
            />
          </UFormGroup>

          <!-- Training Location -->
          <UFormGroup label="Training Location" required>
            <UInput
              v-model="editForm.training_location"
              placeholder="Enter training location"
            />
          </UFormGroup>

          <!-- Training Types -->
          <UFormGroup label="Training Types Completed">
            <div class="space-y-2">
              <UCheckbox
                v-model="editForm.training_field_chemistry"
                label="Field Chemistry"
              />
              <UCheckbox
                v-model="editForm.training_r_card"
                label="R-Card"
              />
              <UCheckbox
                v-model="editForm.training_habitat"
                label="Habitat Assessment"
              />
              <UCheckbox
                v-model="editForm.training_biological"
                label="Biological Assessment"
              />
            </div>
          </UFormGroup>

          <!-- Notes -->
          <UFormGroup label="Notes">
            <UTextarea
              v-model="editForm.notes"
              :rows="3"
              placeholder="Optional notes about this training session..."
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
              @click="saveTrainingEdit"
            >
              Save Changes
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>