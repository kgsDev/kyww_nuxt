<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  userIds: { type: Array, default: () => [] },
  year: { type: Number, default: () => new Date().getFullYear() }
});

const loading = ref(true);
const error = ref(null);
const rawData = ref({ base: [], biological: [], habitat: [] });

const fields = ['volunteer_id', 'total_volunteer_minutes', 'miles_driven', 'date'];

const fetchData = async () => {
  if (!props.userIds.length) {
    loading.value = false;
    return;
  }

  loading.value = true;
  error.value = null;

  const yearStart = `${props.year}-01-01`;
  const yearEnd = `${props.year}-12-31`;
  const dateFilter = { date: { _between: [yearStart, yearEnd] } };

  try {
    const [base, biological, habitat] = await Promise.all([
      useDirectus(readItems('base_samples', { filter: dateFilter, fields, limit: -1 })),
      useDirectus(readItems('biological_samples', { filter: dateFilter, fields, limit: -1 })),
      useDirectus(readItems('habitat_samples', { filter: dateFilter, fields, limit: -1 }))
    ]);

    rawData.value = { base: base || [], biological: biological || [], habitat: habitat || [] };
  } catch (err) {
    console.error('Error fetching volunteer activity data:', err);
    error.value = 'Failed to load activity data.';
  } finally {
    loading.value = false;
  }
};

const stats = computed(() => {
  const userIdSet = new Set(props.userIds);
  const allSamples = [
    ...rawData.value.base,
    ...rawData.value.biological,
    ...rawData.value.habitat
  ].filter(s => {
    const vid = s.volunteer_id?.id || s.volunteer_id;
    return vid && userIdSet.has(vid);
  });

  let totalMinutes = 0;
  let totalMiles = 0;
  let minuteCount = 0;  // samples with non-null minutes
  let milesCount = 0;   // samples with non-null miles

  allSamples.forEach(s => {
    if (s.total_volunteer_minutes !== null && s.total_volunteer_minutes !== undefined) {
      totalMinutes += s.total_volunteer_minutes;
      minuteCount++;
    }
    if (s.miles_driven !== null && s.miles_driven !== undefined) {
      totalMiles += s.miles_driven;
      milesCount++;
    }
  });

    const totalHours = totalMinutes / 60;
    const totalHoursFormatted = totalHours.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

    return {
    totalHours: totalHoursFormatted,
    totalHoursRaw: totalHours,
    totalMiles,
    totalSamples: allSamples.length,  // was: recordedSamples
    samplesWithMinutes: minuteCount,
    samplesWithMiles: milesCount
    };
});

watch([() => props.userIds, () => props.year], fetchData, { immediate: true });
</script>

<template>
  <div>
    <div v-if="loading" class="flex justify-center py-4">
      <ULoadingIcon />
      <span class="ml-2">Loading activity data...</span>
    </div>

    <UAlert v-else-if="error" type="error" :title="error" class="mb-4" />

    <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <UCard>
        <div class="text-center py-2">
          <div class="text-3xl font-bold text-primary-600">{{ stats.totalHours }}</div>
          <div class="text-sm text-gray-600">Volunteer Hours</div>
          <div class="text-xs text-gray-400 mt-1">{{ stats.samplesWithMinutes }} samples recorded</div>
        </div>
      </UCard>

      <UCard>
        <div class="text-center py-2">
          <div class="text-3xl font-bold text-primary-600">{{ stats.totalMiles.toLocaleString('en-US') }}</div>
          <div class="text-sm text-gray-600">Miles Driven</div>
          <div class="text-xs text-gray-400 mt-1">{{ stats.samplesWithMiles }} samples recorded</div>
        </div>
      </UCard>

      <UCard>
        <div class="text-center py-2">
          <div class="text-3xl font-bold text-primary-600">{{ stats.totalSamples.toLocaleString('en-US') }}</div>
          <div class="text-sm text-gray-600">Total Samples</div>
          <div class="text-xs text-gray-400 mt-1">across all types</div>
        </div>
      </UCard>

      <UCard>
        <div class="text-center py-2">
          <div class="text-3xl font-bold text-primary-600">
            {{ stats.totalSamples ? (stats.totalHoursRaw / stats.totalSamples).toFixed(1) : '—' }}
          </div>
          <div class="text-sm text-gray-600">Avg Hours/Sample</div>
          <div class="text-xs text-gray-400 mt-1">where recorded</div>
        </div>
      </UCard>
    </div>
  </div>
</template>