<!-- components/DashboardBadges.vue -->
<script setup lang="ts">
import { useBadges } from '~/composables/useBadges';

const props = defineProps<{ userId: string }>();

const {
  loading, error, load,
  trainingBadges, roleBadges, completeSampler,
  seasonal, superSampler, siteExplorer,
} = useBadges();

// Full literal class strings so Tailwind's JIT keeps them (never build `bg-${x}` dynamically).
const COLOR_CLASSES: Record<string, string> = {
  amber:  'bg-amber-50 text-amber-700',
  orange: 'bg-orange-50 text-orange-700',
  sky:    'bg-sky-50 text-sky-700',
  green:  'bg-green-50 text-green-700',
  cyan:   'bg-cyan-50 text-cyan-700',
  teal:   'bg-teal-50 text-teal-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  violet: 'bg-violet-50 text-violet-700',
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

      <!-- Sampling Disciplines (Complete Sampler progression) -->
      <div>
        <h3 class="text-sm font-medium text-gray-500 mb-2">Sampling Disciplines</h3>
        <div class="flex flex-wrap items-center gap-3">
          <div
            class="flex items-center gap-2 px-3 py-2 rounded-lg"
            :class="completeSampler.earned
              ? 'bg-gradient-to-r from-amber-100 to-emerald-100 text-emerald-800 ring-1 ring-emerald-200'
              : 'bg-gray-50 text-gray-600'"
          >
            <UIcon
              :name="completeSampler.earned ? 'mdi:star-circle' : 'mdi:flask-outline'"
              class="w-6 h-6"
              :class="completeSampler.earned ? 'text-amber-500' : 'text-gray-400'"
            />
            <div>
              <div class="font-semibold">{{ completeSampler.label || 'No samples yet' }}</div>
              <div class="text-xs">
                <template v-if="completeSampler.earned">All three sampling types — a complete sampler!</template>
                <template v-else>{{ completeSampler.count }} of {{ completeSampler.total }} sampling types</template>
              </div>
            </div>
          </div>
          <div class="flex gap-1">
            <span
              v-for="d in completeSampler.disciplines"
              :key="d.key"
              class="px-2 h-8 rounded-full flex items-center text-xs font-medium border"
              :class="d.done ? 'bg-green-500 text-white border-green-500' : 'bg-gray-50 text-gray-400 border-gray-200'"
              :title="d.done ? `${d.label} sampled` : `${d.label} not yet sampled`"
            >{{ d.label }}</span>
          </div>
        </div>
      </div>

      <!-- Seasonal participation -->
      <div>
        <h3 class="text-sm font-medium text-gray-500 mb-2">
          Seasonal Participation (May · July · September - any participation counts)
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
        <h3 class="text-sm font-medium text-gray-500 mb-2">Super Sampler (you were lead sampler at a single site)</h3>
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

      <!-- Site Explorer -->
      <div>
        <h3 class="text-sm font-medium text-gray-500 mb-2">Site Explorer (different sites sampled - any sampling/participation counts)</h3>
        <div v-if="siteExplorer.earned" class="flex flex-wrap items-center gap-3">
          <div class="flex items-center gap-2 px-3 py-2 rounded-lg" :class="COLOR_CLASSES[siteExplorer.tier.color]">
            <UIcon :name="siteExplorer.tier.icon" class="w-6 h-6" />
            <div>
              <div class="font-semibold">{{ siteExplorer.tier.label }}</div>
              <div class="text-xs">
                {{ siteExplorer.distinct }} different {{ siteExplorer.distinct === 1 ? 'site' : 'sites' }} sampled
              </div>
            </div>
          </div>
          <div v-if="siteExplorer.nextTier" class="text-xs text-gray-500">
            {{ siteExplorer.nextTier.min - siteExplorer.distinct }} more
            {{ siteExplorer.nextTier.min - siteExplorer.distinct === 1 ? 'site' : 'sites' }} to reach
            “{{ siteExplorer.nextTier.label }}”
          </div>
        </div>
        <div v-else class="text-sm text-gray-500">
          Sample a second site to earn “Branching Out.”
          <template v-if="siteExplorer.distinct === 1"> (You've sampled 1 site so far.)</template>
        </div>
      </div>

    </div>
  </UCard>
</template>