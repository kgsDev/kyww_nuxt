<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

const props = defineProps({
  userId: {
    type: String,
    required: true
  }
});

const loading = ref(true);
const trainingHistory = ref([]);
const TRAINING_EXPIRATION_YEARS = 3;

const getTrainingStatus = (trainingType) => {
  const verifiedTrainings = trainingHistory.value.filter(
    t => t.verified && t[`training_${trainingType}`]
  );
  
  if (!verifiedTrainings.length) {
    return { certified: false, expires: null, status: 'none' };
  }
  
  // Get most recent training for this type
  const latestTraining = verifiedTrainings.sort((a, b) => 
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

const trainingStatuses = computed(() => {
  return {
    field_chemistry: getTrainingStatus('field_chemistry'),
    r_card: getTrainingStatus('r_card'),
    habitat: getTrainingStatus('habitat'),
    biological: getTrainingStatus('biological')
  };
});

// Get warnings for trainings that are expired or expiring soon
const expirationAlerts = computed(() => {
  const alerts = [];
  const statuses = trainingStatuses.value;
  
  Object.keys(statuses).forEach(type => {
    const status = statuses[type];
    if (status.status === 'expired' || status.status === 'expiring') {
      alerts.push({
        type: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        status: status.status,
        expires: status.expires,
        daysRemaining: status.daysUntilExpiration,
        severity: status.status === 'expired' ? 'error' : 'warning'
      });
    }
  });
  
  // Sort by severity (expired first) then by days remaining
  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'error' ? -1 : 1;
    }
    return (a.daysRemaining || 0) - (b.daysRemaining || 0);
  });
});

const hasAlerts = computed(() => expirationAlerts.value.length > 0);

const alertType = computed(() => {
  if (expirationAlerts.value.some(a => a.severity === 'error')) {
    return 'error';
  }
  return 'warning';
});

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const fetchTrainingHistory = async () => {
  loading.value = true;
  try {
    const response = await useDirectus(readItems('training_history', {
      filter: {
        user_id: { _eq: props.userId }
      },
      fields: [
        'training_date',
        'training_field_chemistry',
        'training_r_card',
        'training_habitat',
        'training_biological',
        'verified'
      ],
      sort: ['-training_date'],
      limit: -1
    }));
    
    trainingHistory.value = response || [];
  } catch (err) {
    console.error('Error fetching training history:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (props.userId) {
    fetchTrainingHistory();
  }
});
</script>

<template>
  <div v-if="!loading && hasAlerts">
    <UAlert
      :type="alertType"
      :title="alertType === 'error' ? '⚠️ Training Certification Expired' : '⚠️ Training Certification Expiring Soon'"
      icon="i-heroicons-exclamation-triangle"
    >
      <template #description>
        <div class="space-y-2">
          <p class="font-medium">
            {{ alertType === 'error' 
              ? 'Your training certification has expired for:' 
              : 'Your training certification is expiring soon for:' 
            }}
          </p>
          <ul class="list-disc list-inside space-y-1 pl-2">
            <li v-for="alert in expirationAlerts" :key="alert.type">
              <span class="font-medium">{{ alert.type }}</span>
              <span v-if="alert.status === 'expired'">
                - expired on {{ formatDate(alert.expires) }}
              </span>
              <span v-else>
                - expires {{ formatDate(alert.expires) }} 
                <span class="text-sm">({{ alert.daysRemaining }} days remaining)</span>
              </span>
            </li>
          </ul>
          <div class="mt-3 pt-3 border-t border-current border-opacity-20">
            <p class="text-sm">
              Please contact your basin leader or trainer to schedule a refresher training.
              Training certifications expire 3 years from the training date.
            </p>
            <div class="mt-2">
              <NuxtLink to="/portal/account">
                <UButton size="sm" color="white" variant="solid">
                  View Training History
                </UButton>
              </NuxtLink>
            </div>
          </div>
        </div>
      </template>
    </UAlert>
  </div>
</template>