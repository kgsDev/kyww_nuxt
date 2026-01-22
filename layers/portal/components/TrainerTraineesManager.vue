<script setup lang="ts">
import { ref, computed, onMounted, inject } from 'vue';

const props = defineProps({
  trainerId: {
    type: String,
    required: true
  }
});
const config = useRuntimeConfig()
const { user } = useDirectusAuth();
const toast = useToast();
const loading = ref(true);
const myTrainees = ref([]);
const otherTrainees = ref([]);
const trainers = ref([]);
const selectedUser = ref(null);
const showDetailsModal = ref(false);
const editingTraining = ref(false);
const savingTraining = ref(false);

// Collapsible section states
const sectionsExpanded = ref({
  myTrainees: true,
  otherTrainees: false
});

// Inject parent's refresh function and filters
const refreshParentData = inject('refreshTrainingData', null);
const filters = inject('filters', {
  globalSearch: ref(''),
  selectedDateRange: ref('all'),
  selectedLocation: ref('all'),
  selectedTrainingType: ref('all')
});


  // Roles configuration
  const roles = {
    devAdmin: config.public.DEVADMIN_ROLE_ID,
    wwkyAdmin: config.public.WWKYADMIN_ROLE_ID,
  }

  // Policies configuration
  const policies = {
    fullAdmin: config.public.FULLADMIN_POLICY_ID,
    wwkyAdmin: config.public.WWKYADMIN_POLICY_ID,
    trainer: config.public.TRAINER_POLICY_ID,
    leader: config.public.LEADER_POLICY_ID,
  }

  // Check if current user is admin
  const isAdmin = computed(() => {
    const userRole = user.value?.role;
    const userPolicy = user.value?.policy;
    
    const isAdminRole = userRole === roles.wwkyAdmin || userRole === roles.devAdmin;
    const isAdminPolicy = userPolicy === policies.fullAdmin || userPolicy === policies.wwkyAdmin;
    
    return isAdminRole || isAdminPolicy;
  });

// Form states for editing
const trainingForm = ref({
  training_date: '',
  training_location: '',
  training_field_chemistry: false,
  training_r_card: false,
  training_habitat: false,
  training_biological: false,
  trainer_id: props.trainerId
});

// Warning modal state for save confirmation
const showSaveWarning = ref(false);
const showSaveNewWarning = ref(false);

// Toggle section expansion
const toggleSection = (section) => {
  sectionsExpanded.value[section] = !sectionsExpanded.value[section];
};

// Helper functions for filtering
const matchesDateRange = (date) => {
  if (filters.selectedDateRange.value === 'all') return true;
  if (!date) return false;
  
  const itemDate = new Date(date);
  const now = new Date();
  
  switch (filters.selectedDateRange.value) {
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

const matchesTrainingType = (trainee) => {
  if (filters.selectedTrainingType.value === 'all') return true;
  
  // Check if trainee has this certification
  const certKey = filters.selectedTrainingType.value;
  return trainee.current_certifications?.[certKey] === true;
};

const matchesGlobalSearch = (trainee) => {
  if (!filters.globalSearch.value) return true;
  const search = filters.globalSearch.value.toLowerCase();
  
  return (
    trainee.email?.toLowerCase().includes(search) ||
    trainee.first_name?.toLowerCase().includes(search) ||
    trainee.last_name?.toLowerCase().includes(search) ||
    `${trainee.first_name} ${trainee.last_name}`.toLowerCase().includes(search)
  );
};

const matchesLocation = (trainee) => {
  if (filters.selectedLocation.value === 'all') return true;
  
  // Check if any training in history matches the location
  return trainee.trainingHistory?.some(t => 
    t.training_location === filters.selectedLocation.value
  );
};

// Filtered trainees based on parent filters
const filteredMyTrainees = computed(() => {
  return myTrainees.value.filter(trainee => {
    return matchesDateRange(trainee.latestTraining) &&
           matchesLocation(trainee) &&
           matchesTrainingType(trainee) &&
           matchesGlobalSearch(trainee);
  });
});

const filteredOtherTrainees = computed(() => {
  return otherTrainees.value.filter(trainee => {
    return matchesDateRange(trainee.latestTraining) &&
           matchesLocation(trainee) &&
           matchesTrainingType(trainee) &&
           matchesGlobalSearch(trainee);
  });
});

// Fetch all trainers for the dropdown
const fetchTrainers = async () => {
  try {
    const { data } = await useFetch('/api/trainers', {
      query: {
        userId: user.value.id
      }
    });
    
    if (data.value?.success && data.value?.trainers) {
      trainers.value = data.value.trainers;
    } else {
      console.error('Failed to fetch trainers:', data.value?.error);
      trainers.value = [];
      toast.add({
        title: 'Error',
        description: 'Failed to load trainers list',
        color: 'red'
      });
    }
  } catch (err) {
    console.error('Error fetching trainers:', err);
    trainers.value = [];
    toast.add({
      title: 'Error',
      description: 'Failed to load trainers list',
      color: 'red'
    });
  }
};

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
          trainingHistory: [record],
          current_certifications: {
            field_chemistry: record.training_field_chemistry || false,
            r_card: record.training_r_card || false,
            habitat: record.training_habitat || false,
            biological: record.training_biological || false
          }
        });
      } else if (record.user_id) {
        const existing = uniqueUsers.get(record.user_id.id);
        existing.trainingCount++;
        existing.trainingHistory.push(record);
        if (new Date(record.training_date) > new Date(existing.latestTraining)) {
          existing.latestTraining = record.training_date;
        }
        // Update certifications if any new ones
        if (record.training_field_chemistry) existing.current_certifications.field_chemistry = true;
        if (record.training_r_card) existing.current_certifications.r_card = true;
        if (record.training_habitat) existing.current_certifications.habitat = true;
        if (record.training_biological) existing.current_certifications.biological = true;
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

// Fetch all other trainees (not trained by current user)
const fetchOtherTrainees = async () => {
  try {
    // Get all training records where trainer was NOT this user
    const trainingRecords = await useDirectus(readItems('training_history', {
      filter: {
        trainer_id: { _neq: props.trainerId }
      },
      fields: [
        '*',
        {
          user_id: ['id', 'first_name', 'last_name', 'email', 'status'],
          trainer_id: ['id', 'first_name', 'last_name']
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
          latestTrainerName: record.trainer_id ? `${record.trainer_id.first_name} ${record.trainer_id.last_name}` : 'Unknown',
          trainingHistory: [record],
          current_certifications: {
            field_chemistry: record.training_field_chemistry || false,
            r_card: record.training_r_card || false,
            habitat: record.training_habitat || false,
            biological: record.training_biological || false
          }
        });
      } else if (record.user_id) {
        const existing = uniqueUsers.get(record.user_id.id);
        existing.trainingCount++;
        existing.trainingHistory.push(record);
        if (new Date(record.training_date) > new Date(existing.latestTraining)) {
          existing.latestTraining = record.training_date;
          existing.latestTrainerName = record.trainer_id ? `${record.trainer_id.first_name} ${record.trainer_id.last_name}` : 'Unknown';
        }
        // Update certifications if any new ones
        if (record.training_field_chemistry) existing.current_certifications.field_chemistry = true;
        if (record.training_r_card) existing.current_certifications.r_card = true;
        if (record.training_habitat) existing.current_certifications.habitat = true;
        if (record.training_biological) existing.current_certifications.biological = true;
      }
    });
    
    otherTrainees.value = Array.from(uniqueUsers.values());
  } catch (err) {
    console.error('Error fetching other trainees:', err);
    toast.add({
      title: 'Error',
      description: 'Failed to load other trainees',
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

const getTrainerName = (trainerId) => {
  const trainer = trainers.value.find(t => t.id === trainerId);
  return trainer ? `${trainer.first_name} ${trainer.last_name}` : 'Unknown';
};

const viewUserDetails = async (user) => {
  selectedUser.value = user;
  
  // Fetch latest equipment record for this user (only one record now)
  try {
   
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

const getEquipmentKitOption = (val) => {
  if (!val) {
    return 'N/A';
  } else {
    switch (val.toLowerCase()) {
      case 'personal':
        return 'KYWW issued kit for individual use';
      case 'other':
        return 'Borrow (borrow from friend/other sampler)';
      case 'own':
        return 'Personal (personally bought/acquired not from KYWW)';
      case 'borrow':
        return 'Borrowed kit from Hub (either you already have it or plan to pick it up)';
      case 'none':
        return 'Non-sampler';
      default:
        return 'N/A';
    }
  } 
};

const closeDetailsModal = () => {
  showDetailsModal.value = false;
  editingTraining.value = false;
  selectedUser.value = null;
};

const startEditingTraining = (training) => {
  if (!isAdmin.value) {
    toast.add({
      title: 'Permission Denied',
      description: 'Only administrators can edit training records. Please contact an admin if changes are needed.',
      color: 'yellow',
      timeout: 5000
    });
    return;
  }

  trainingForm.value = {
    id: training.id,
    training_date: formatDateForInput(training.training_date),
    training_location: training.training_location || '',
    training_field_chemistry: training.training_field_chemistry || false,
    training_r_card: training.training_r_card || false,
    training_habitat: training.training_habitat || false,
    training_biological: training.training_biological || false,
    trainer_id: training.trainer_id || props.trainerId
  };
  editingTraining.value = true;
};

const confirmSaveNew = () => {
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

  if (!trainingForm.value.trainer_id) {
    toast.add({
      title: 'Validation Error',
      description: 'Trainer must be selected',
      color: 'red'
    });
    return;
  }

  showSaveNewWarning.value = true;
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

  if (!trainingForm.value.trainer_id) {
    toast.add({
      title: 'Validation Error',
      description: 'Trainer must be selected',
      color: 'red'
    });
    return;
  }

  showSaveWarning.value = true;
};

const cancelSaveWarning = () => {
  showSaveWarning.value = false;
  showSaveNewWarning.value = false;
};

const cancelEditingTraining = () => {
  editingTraining.value = false;
  trainingForm.value = {
    training_date: '',
    training_location: '',
    training_field_chemistry: false,
    training_r_card: false,
    training_habitat: false,
    training_biological: false,
    trainer_id: props.trainerId
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

  if (!trainingForm.value.trainer_id) {
    toast.add({
      title: 'Validation Error',
      description: 'Trainer must be selected',
      color: 'red'
    });
    return;
  }

  savingTraining.value = true;
  showSaveWarning.value = false;
  
  try {
    // Update the training record
    await useDirectus(updateItem('training_history', trainingForm.value.id, {
      user_updated: user.value.id,
      training_date: trainingForm.value.training_date,
      training_location: trainingForm.value.training_location,
      training_field_chemistry: trainingForm.value.training_field_chemistry,
      training_r_card: trainingForm.value.training_r_card,
      training_habitat: trainingForm.value.training_habitat,
      training_biological: trainingForm.value.training_biological,
      trainer_id: trainingForm.value.trainer_id
    }));
    
    // Send notification email
    try {
      const trainerName = getTrainerName(trainingForm.value.trainer_id);
      await $fetch('/api/training-notification', {
        method: 'POST',
        body: {
          userEmail: selectedUser.value.email,
          userName: `${selectedUser.value.first_name} ${selectedUser.value.last_name}`,
          trainingDate: trainingForm.value.training_date,
          trainingLocation: trainingForm.value.training_location,
          trainingTypes: {
            training_field_chemistry: trainingForm.value.training_field_chemistry,
            training_r_card: trainingForm.value.training_r_card,
            training_habitat: trainingForm.value.training_habitat,
            training_biological: trainingForm.value.training_biological
          },
          trainerName: trainerName,
          isNewTraining: false
        }
      });
    } catch (emailError) {
      console.warn('Failed to send training notification email:', emailError);
      // Continue - don't fail the whole operation if email fails
    }
    
    toast.add({
      title: 'Success',
      description: 'Training record updated successfully',
      color: 'green'
    });
    
    // Refresh the trainee data
    await fetchMyTrainees();
    await fetchOtherTrainees();
    
    // Update the selected user's training history to reflect changes
    if (selectedUser.value) {
      const allTrainees = [...myTrainees.value, ...otherTrainees.value];
      const updatedUser = allTrainees.find(t => t.id === selectedUser.value.id);
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
    training_biological: false,
    trainer_id: props.trainerId
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

  if (!trainingForm.value.trainer_id) {
    toast.add({
      title: 'Validation Error',
      description: 'Trainer must be selected',
      color: 'red'
    });
    return;
  }

  savingTraining.value = true;
  
  try {
    // Create new training record
    await useDirectus(createItem('training_history', {
      user_id: selectedUser.value.id,
      trainer_id: trainingForm.value.trainer_id,
      user_created: user.value.id,
      user_updated: user.value.id,
      training_date: trainingForm.value.training_date,
      training_location: trainingForm.value.training_location,
      training_field_chemistry: trainingForm.value.training_field_chemistry,
      training_r_card: trainingForm.value.training_r_card,
      training_habitat: trainingForm.value.training_habitat,
      training_biological: trainingForm.value.training_biological
    }));
    
    // Send notification email
    try {
      const trainerName = getTrainerName(trainingForm.value.trainer_id);
      await $fetch('/api/training-notification', {
        method: 'POST',
        body: {
          userEmail: selectedUser.value.email,
          userName: `${selectedUser.value.first_name} ${selectedUser.value.last_name}`,
          trainingDate: trainingForm.value.training_date,
          trainingLocation: trainingForm.value.training_location,
          trainingTypes: {
            training_field_chemistry: trainingForm.value.training_field_chemistry,
            training_r_card: trainingForm.value.training_r_card,
            training_habitat: trainingForm.value.training_habitat,
            training_biological: trainingForm.value.training_biological
          },
          trainerName: trainerName,
          isNewTraining: true
        }
      });
    } catch (emailError) {
      console.warn('Failed to send training notification email:', emailError);
      // Continue - don't fail the whole operation if email fails
    }
    
    toast.add({
      title: 'Success',
      description: 'Training record added successfully',
      color: 'green'
    });
    
    // Refresh the trainee data
    await fetchMyTrainees();
    await fetchOtherTrainees();
    
    // Update the selected user's training history to reflect the new training
    if (selectedUser.value) {
      const allTrainees = [...myTrainees.value, ...otherTrainees.value];
      const updatedUser = allTrainees.find(t => t.id === selectedUser.value.id);
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

// Trainer options for dropdown
const trainerOptions = computed(() => {
  return trainers.value.map(trainer => ({
    value: trainer.id,
    label: `${trainer.first_name} ${trainer.last_name}`
  }));
});

// Stats - use filtered counts
const stats = computed(() => ({
  myTotalTrainees: filteredMyTrainees.value.length,
  myActiveSamplers: filteredMyTrainees.value.filter(u => u.status === 'active').length,
  otherTotalTrainees: filteredOtherTrainees.value.length,
  otherActiveSamplers: filteredOtherTrainees.value.filter(u => u.status === 'active').length
}));

// Check if filters are active
const hasActiveFilters = computed(() => {
  return filters.globalSearch.value !== '' ||
         filters.selectedDateRange.value !== 'all' ||
         filters.selectedLocation.value !== 'all' ||
         filters.selectedTrainingType.value !== 'all';
});

onMounted(async () => {
  loading.value = true;
  await fetchTrainers();
  await fetchMyTrainees();
  await fetchOtherTrainees();
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
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-blue-50 p-4 rounded-lg">
          <div class="text-2xl font-bold text-blue-600">{{ stats.myTotalTrainees }}</div>
          <div class="text-sm text-blue-700">My Total Trainees</div>
        </div>
        <div class="bg-green-50 p-4 rounded-lg">
          <div class="text-2xl font-bold text-green-600">{{ stats.myActiveSamplers }}</div>
          <div class="text-sm text-green-700">My Active Samplers</div>
        </div>
        <div class="bg-purple-50 p-4 rounded-lg">
          <div class="text-2xl font-bold text-purple-600">{{ stats.otherTotalTrainees }}</div>
          <div class="text-sm text-purple-700">Other Trainees</div>
        </div>
        <div class="bg-orange-50 p-4 rounded-lg">
          <div class="text-2xl font-bold text-orange-600">{{ stats.otherActiveSamplers }}</div>
          <div class="text-sm text-orange-700">Other Active</div>
        </div>
      </div>

      <!-- My Trainees (Collapsible) -->
      <UCard>
        <template #header>
          <button 
            @click="toggleSection('myTrainees')"
            class="w-full flex justify-between items-center gap-2 text-left hover:bg-gray-50 -m-4 p-4 rounded-t-lg transition-colors"
          >
            <div class="flex items-center gap-2">
              <UIcon 
                :name="sectionsExpanded.myTrainees ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                class="w-5 h-5 transition-transform"
              />
              <h3 class="text-lg font-semibold">My Trainees</h3>
              <UBadge color="blue" variant="soft">
                {{ filteredMyTrainees.length }}
              </UBadge>
            </div>
          </button>
        </template>

        <div v-show="sectionsExpanded.myTrainees">
          <div v-if="filteredMyTrainees.length === 0" class="text-center py-8 text-gray-500">
            <UIcon name="i-heroicons-users" class="mx-auto mb-2" size="48" />
            <p>{{ hasActiveFilters ? 'No trainees match the current filters' : 'No trainees found' }}</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="trainee in filteredMyTrainees"
              :key="trainee.id"
              class="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              @click="viewUserDetails(trainee)"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h3 class="font-medium text-gray-900">{{ formatName(trainee) }}</h3>
                  <p class="text-sm text-gray-600">{{ trainee.email }}</p>
                  <div class="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>Latest: {{ formatDate(trainee.latestTraining) }}</span>
                    <span>Sessions: {{ trainee.trainingCount }}</span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-2">
                    <UBadge v-if="trainee.current_certifications?.field_chemistry" size="xs" color="blue">FC</UBadge>
                    <UBadge v-if="trainee.current_certifications?.r_card" size="xs" color="green">RC</UBadge>
                    <UBadge v-if="trainee.current_certifications?.habitat" size="xs" color="purple">H</UBadge>
                    <UBadge v-if="trainee.current_certifications?.biological" size="xs" color="orange">B</UBadge>
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
        </div>
      </UCard>

      <!-- Other Trainees (Collapsible) -->
      <UCard>
        <template #header>
          <button 
            @click="toggleSection('otherTrainees')"
            class="w-full flex justify-between items-center gap-2 text-left hover:bg-gray-50 -m-4 p-4 rounded-t-lg transition-colors"
          >
            <div class="flex items-center gap-2">
              <UIcon 
                :name="sectionsExpanded.otherTrainees ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
                class="w-5 h-5 transition-transform"
              />
              <h3 class="text-lg font-semibold">Other Trainees</h3>
              <UBadge color="purple" variant="soft">
                {{ filteredOtherTrainees.length }}
              </UBadge>
            </div>
          </button>
        </template>

        <div v-show="sectionsExpanded.otherTrainees">
          <div v-if="filteredOtherTrainees.length === 0" class="text-center py-8 text-gray-500">
            <UIcon name="i-heroicons-users" class="mx-auto mb-2" size="48" />
            <p>{{ hasActiveFilters ? 'No trainees match the current filters' : 'No other trainees found' }}</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="trainee in filteredOtherTrainees"
              :key="trainee.id"
              class="bg-gray-50 p-4 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              @click="viewUserDetails(trainee)"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <h3 class="font-medium text-gray-900">{{ formatName(trainee) }}</h3>
                  <p class="text-sm text-gray-600">{{ trainee.email }}</p>
                  <div class="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>Latest: {{ formatDate(trainee.latestTraining) }}</span>
                    <span>Trainer: {{ trainee.latestTrainerName }}</span>
                    <span>Sessions: {{ trainee.trainingCount }}</span>
                  </div>
                  <div class="flex flex-wrap gap-1 mt-2">
                    <UBadge v-if="trainee.current_certifications?.field_chemistry" size="xs" color="blue">FC</UBadge>
                    <UBadge v-if="trainee.current_certifications?.r_card" size="xs" color="green">RC</UBadge>
                    <UBadge v-if="trainee.current_certifications?.habitat" size="xs" color="purple">H</UBadge>
                    <UBadge v-if="trainee.current_certifications?.biological" size="xs" color="orange">B</UBadge>
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
        </div>
      </UCard>
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

            <!-- Non-Admin Edit Warning -->
            <UAlert
              v-if="!isAdmin"
              color="blue"
              variant="soft"
              icon="i-heroicons-information-circle"
              class="mb-4"
              title="Editing Restrictions"
            >
              <template #description>
                <p class="text-sm">You can add new training records, but only administrators can edit existing records. If you need to edit a training record, please contact an admin.</p>
              </template>
            </UAlert>

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
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label class="text-sm font-medium text-gray-700 block mb-1">Trainer</label>
                  <USelect
                    v-model="trainingForm.trainer_id"
                    :options="trainerOptions"
                    placeholder="Select trainer"
                    size="sm"
                  />
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
                    @click="confirmSaveNew"
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
                    <p class="text-sm text-gray-600 mb-1">{{ training.training_location || 'Location not specified' }}</p>
                    <p class="text-xs text-gray-500 mb-2">Trainer: {{ getTrainerName(training.trainer_id) }}</p>
                    <div class="flex flex-wrap gap-1">
                      <UBadge v-if="training.training_field_chemistry" size="xs" color="blue">FC</UBadge>
                      <UBadge v-if="training.training_r_card" size="xs" color="green">RC</UBadge>
                      <UBadge v-if="training.training_habitat" size="xs" color="purple">H</UBadge>
                      <UBadge v-if="training.training_biological" size="xs" color="orange">B</UBadge>
                    </div>
                  </div>
                  <UButton
                    v-if="isAdmin"
                    @click="startEditingTraining(training)"
                    size="xs"
                    color="gray"
                    icon="i-heroicons-pencil"
                  >
                    Edit
                  </UButton>
                  <UTooltip v-else text="Only admins can edit">
                    <UButton
                      size="xs"
                      color="gray"
                      icon="i-heroicons-pencil"
                      disabled
                    >
                      Edit
                    </UButton>
                  </UTooltip>
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
                      <span class="text-sm text-gray-700">Lamotte pH Meter</span>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.equip_do" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-check-circle" class="text-green-600 w-4 h-4" />
                      <span class="text-sm text-gray-700">Lamotte DO Meter</span>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.equip_cond" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-check-circle" class="text-green-600 w-4 h-4" />
                      <span class="text-sm text-gray-700">Conductivity</span>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.equip_thermo" class="flex items-center gap-1">
                      <UIcon name="i-heroicons-check-circle" class="text-green-600 w-4 h-4" />
                      <span class="text-sm text-gray-700">Thermometer</span>
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
                      <span class="font-medium text-gray-700">Lamotte pH Reagent Expiration:</span>
                      <span class="ml-2" :class="new Date(selectedUser.equipmentRecord.ph_expire) < new Date() ? 'text-red-600 font-medium' : 'text-gray-600'">
                        {{ formatDate(selectedUser.equipmentRecord.ph_expire) }}
                      </span>
                      <UBadge v-if="new Date(selectedUser.equipmentRecord.ph_expire) < new Date()" color="red" size="xs" class="ml-2">
                        Expired
                      </UBadge>
                    </div>
                    <div v-if="selectedUser.equipmentRecord.do_expire" class="text-sm">
                      <span class="font-medium text-gray-700">Lamotte DO Reagent Expiration:</span>
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
                    <span class="font-medium text-gray-700">Kit Ownership/Status:</span>
                    <span class="ml-2 text-gray-600">{{ getEquipmentKitOption(selectedUser.equipmentRecord.kit_option) }}</span>
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
            <h3 class="text-lg font-semibold">Confirm {{ trainingForm.id ? 'Changes' : 'New Training' }}</h3>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-700">
            {{ trainingForm.id ? 'Are you sure you want to save these changes to this training record?' : 'Are you sure you want to add this new training record?' }}
          </p>

          <UAlert
            type="info"
            icon="i-heroicons-envelope"
            class="mt-4"
          >
            <template #title>
              Email Notification
            </template>
            <template #description>
              <p class="text-sm">An email notification will be sent to <strong>{{ selectedUser?.email }}</strong> informing them that their training record has been {{ trainingForm.id ? 'updated' : 'added' }}.</p>
            </template>
          </UAlert>
        </div>

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

    <!-- Save New Training Confirmation Modal -->
    <UModal v-model="showSaveNewWarning" :ui="{ width: 'sm:max-w-md' }">
      <UCard>
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="text-blue-500 w-6 h-6" />
            <h3 class="text-lg font-semibold">Confirm New Training</h3>
          </div>
        </template>

        <div class="space-y-4">
          <p class="text-sm text-gray-700">
            Are you sure you want to add this training record for <strong>{{ selectedUser?.first_name }} {{ selectedUser?.last_name }}</strong>?
          </p>
          
          <UAlert
            type="info"
            icon="i-heroicons-envelope"
          >
            <template #title>
              Email Notification
            </template>
            <template #description>
              <p class="text-sm">An email notification will be sent to <strong>{{ selectedUser?.email }}</strong> with details about this new training record.</p>
            </template>
          </UAlert>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="gray"
              @click="cancelSaveWarning"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              @click="saveNewTraining"
              :loading="savingTraining"
            >
              Yes, Save and Notify
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>