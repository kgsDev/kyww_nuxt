<!-- components/DashboardBadges.vue -->
<script setup lang="ts">
import { useBadges } from '~/composables/useBadges';

const props = defineProps<{ userId: string }>();

const {
  loading, error, load,
  trainingBadges, roleBadges, seasonal, superSampler,
} = useBadges();

// Full literal class strings so Tailwind's JIT keeps them (never build `bg-${x}` dynamically).
const COLOR_CLASSES: Record<string, string> = {
  amber:  'bg-amber-50 text-amber-700',
  orange: 'bg-orange-50 text-orange-700',
  sky:    'bg-sky-50 text-sky-700',
  green:  'bg-green-50 text-green-700',
};
const MONTH_ABBR = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

onMounted(() => load(props.userId));
watch(() => props.userId, (id) => { if (id) load(id); });
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-2">
        <UIcon name="mdi:medal-outline" class="w-5 h-5 text-amber-500" />
        <h2 class="text-lg font-semibold">Your Recognition</h2>
      </div>
    </template>

    <div v-if="loading" class="py-6 flex items-center justify-center text-gray-500">
      <ULoadingIcon /><span class="ml-2">Loading badges…</span>
    </div>

    <UAlert v-else-if="error" type="error" :title="error" />

    <div v-else class="space-y-6">
      <!-- Training & roles -->
      <div>
        <h3 class="text-sm font-medium text-gray-500 mb-2">Training &amp; Roles</h3>
        <div class="flex flex-wrap gap-2">
          <UBadge
            v-for="b in trainingBadges" :key="b.id"
            :color="b.earned ? b.color : 'gray'"
            :variant="b.earned ? 'solid' : 'soft'"
            :class="b.earned ? '' : 'opacity-40'"
            size="md"
          >
            <UIcon :name="b.icon" class="w-4 h-4 mr-1" />{{ b.label }}
          </UBadge>

          <UBadge v-for="b in roleBadges" :key="b.id" :color="b.color" variant="solid" size="md">
            <UIcon :name="b.icon" class="w-4 h-4 mr-1" />{{ b.label }}
          </UBadge>
        </div>
      </div>

      <!-- Seasonal participation -->
      <div>
        <h3 class="text-sm font-medium text-gray-500 mb-2">
          Seasonal Participation (May · July · September)
        </h3>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg" :class="COLOR_CLASSES[seasonal.color]">
            <UIcon :name="seasonal.icon" class="w-6 h-6" />
            <div>
              <div class="font-semibold">{{ seasonal.label }}</div>
              <div class="text-xs">
                <template v-if="seasonal.earned">All three core months sampled this year — nice work!</template>
                <template v-else-if="!seasonal.seasonComplete">
                  You're making progress! {{ seasonal.hitCount }} of {{ seasonal.target }} core months so far.
                </template>
                <template v-else>
                  {{ seasonal.hitCount }} of {{ seasonal.target }} core months — there's always next season!
                </template>
              </div>
            </div>
          </div>
          <div class="flex gap-1">
            <span
              v-for="m in [5, 7, 9]" :key="m"
              class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium border"
              :class="seasonal.hitMonths.includes(m)
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-gray-50 text-gray-400 border-gray-200'"
            >{{ MONTH_ABBR[m] }}</span>
          </div>
        </div>
      </div>

      <!-- Super Sampler -->
      <div>
        <h3 class="text-sm font-medium text-gray-500 mb-2">Super Sampler (samples at a single site)</h3>
        <div v-if="superSampler.earned" class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg" :class="COLOR_CLASSES[superSampler.tier.color]">
            <UIcon :name="superSampler.tier.icon" class="w-6 h-6" />
            <div>
              <div class="font-semibold">{{ superSampler.tier.label }}</div>
              <div class="text-xs">{{ superSampler.count }} samples at {{ superSampler.siteName }}</div>
            </div>
          </div>
          <div v-if="superSampler.nextTier" class="text-xs text-gray-500">
            {{ superSampler.nextTier.min - superSampler.count }} more at one site to reach
            “{{ superSampler.nextTier.label }}”
          </div>
        </div>
        <div v-else class="text-sm text-gray-500">
          Collect 3 samples at any one site to earn your first “Great Start” badge.
          <template v-if="superSampler.count > 0"> (Best so far: {{ superSampler.count }}.)</template>
        </div>
      </div>
    </div>
  </UCard>
</template>