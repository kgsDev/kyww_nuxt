<!-- components/RecognitionBoards.vue -->
<script setup lang="ts">
withDefaults(defineProps<{ context?: 'public' | 'portal' }>(), { context: 'public' });
const emit = defineEmits<{ zoom: [payload: { lng: number; lat: number; zoom: number }] }>();

const currentYear = new Date().getFullYear();
const yearOptions = [
  { label: 'All time', value: 'all' },
  ...Array.from({ length: currentYear - 2019 }, (_, i) => {
    const y = String(currentYear - i);
    return { label: y, value: y };
  }),
];
const selectedYear = ref('all');

const loading = ref(true);
const error = ref<string | null>(null);
const boards = ref<any>({ topCounties: [], topBasins: [], topHubs: [], topSites: [] });

async function load() {
  loading.value = true; error.value = null;
  try {
    boards.value = await $fetch('/api/recognition', {
      query: selectedYear.value === 'all' ? {} : { year: selectedYear.value },
    });
  } catch {
    error.value = 'Unable to load recognition data.';
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(selectedYear, load);

const RANK_CLASSES = [
  'bg-yellow-400 text-yellow-900 ring-1 ring-yellow-500',   // gold
  'bg-slate-300 text-slate-800 ring-1 ring-slate-400', // silver
  'bg-amber-700 text-white ring-1 ring-amber-800',     // bronze
];
const rankClass = (i: number) =>
  RANK_CLASSES[i] ?? 'bg-transparent text-gray-400 ring-0';

// Point boards get a zoom level; basins have no single point, so they're not clickable.
const countBoards = computed(() => [
  { key: 'topCounties', title: 'Top Counties', icon: 'mdi:map-marker-outline',      nameKey: 'county',  metaKey: 'siteCount',    metaLabel: 'sites',    zoom: 9,  clickable: true  },
  { key: 'topBasins',   title: 'Top Basins',   icon: 'mdi:waves',                    nameKey: 'basin',   metaKey: 'siteCount',    metaLabel: 'sites',    zoom: 0,  clickable: false },
  { key: 'topHubs',     title: 'Top Hubs',     icon: 'material-symbols:hub-outline', nameKey: 'hubName', metaKey: 'samplerCount', metaLabel: 'samplers', zoom: 11, clickable: true  },
]);

function goTo(row: any, zoom: number) {
  if (row?.lng != null && row?.lat != null) {
    emit('zoom', { lng: Number(row.lng), lat: Number(row.lat), zoom });
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <UIcon name="mdi:trophy-outline" class="w-5 h-5 text-amber-500" />
          <h2 class="text-lg font-semibold">Sampling Recognition</h2>
        </div>
        <USelect v-model="selectedYear" :options="yearOptions" size="sm" class="w-40" />
      </div>
    </template>

    <div v-if="loading" class="py-8 flex items-center justify-center text-gray-500">
      <ULoadingIcon /><span class="ml-2">Loading recognition…</span>
    </div>
    <UAlert v-else-if="error" type="error" :title="error" />

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      <!-- Counties / Basins / Hubs -->
      <div v-for="def in countBoards" :key="def.key">
        <div class="flex items-center gap-2 mb-3">
          <UIcon :name="def.icon" class="w-4 h-4 text-gray-500" />
          <h3 class="font-semibold text-gray-700">{{ def.title }}</h3>
        </div>
        <ol class="space-y-1">
          <li
            v-for="(row, i) in boards[def.key]"
            :key="i"
            class="flex items-center gap-2 px-1 -mx-1 rounded"
            :class="def.clickable && row.lng != null ? 'cursor-pointer hover:bg-primary-50 group' : ''"
            :role="def.clickable && row.lng != null ? 'button' : undefined"
            @click="def.clickable && goTo(row, def.zoom)"
          >
            <span class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold" :class="rankClass(i)">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <div class="truncate font-medium" :title="row[def.nameKey]">{{ row[def.nameKey] }}</div>
              <div class="text-xs text-gray-500">{{ row[def.metaKey] }} {{ def.metaLabel }}</div>
            </div>
            <UIcon
              v-if="def.clickable && row.lng != null"
              name="i-heroicons-map-pin"
              class="w-4 h-4 text-gray-300 group-hover:text-primary-500 shrink-0"
            />
            <span class="font-semibold text-primary-600 w-12 text-right">{{ row.sampleCount.toLocaleString() }}</span>
          </li>
          <li v-if="!boards[def.key].length" class="text-sm text-gray-400 italic px-1">No data yet</li>
        </ol>
      </div>

      <!-- Top Sites -->
      <div>
        <div class="flex items-center gap-2 mb-3">
          <UIcon name="mdi:map-marker-star-outline" class="w-4 h-4 text-gray-500" />
          <h3 class="font-semibold text-gray-700">Top Sites</h3>
        </div>
        <ol class="space-y-1">
          <li
            v-for="(row, i) in boards.topSites"
            :key="row.siteId"
            class="flex items-center gap-2 px-1 -mx-1 rounded"
            :class="row.lng != null ? 'cursor-pointer hover:bg-primary-50 group' : ''"
            :role="row.lng != null ? 'button' : undefined"
            @click="goTo(row, 13)"
          >
            <span class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold" :class="rankClass(i)">{{ i + 1 }}</span>
            <div class="flex-1 min-w-0">
              <div class="truncate font-medium" :title="row.siteName">{{ row.siteName }}</div>
              <div class="text-xs text-gray-500 truncate" :title="`#${row.siteId} · ${row.basin}`">
                #{{ row.siteId }} · {{ row.basin }}
              </div>
            </div>
            <UIcon
              v-if="row.lng != null"
              name="i-heroicons-map-pin"
              class="w-4 h-4 text-gray-300 group-hover:text-primary-500 shrink-0"
            />
            <span class="font-semibold text-primary-600 w-12 text-right">{{ row.sampleCount.toLocaleString() }}</span>
          </li>
          <li v-if="!boards.topSites.length" class="text-sm text-gray-400 italic px-1">No data yet</li>
        </ol>
      </div>
    </div>

    <template #footer>
      <p class="text-xs text-gray-400">
        Counts include stream, biological, and habitat samples{{ selectedYear === 'all' ? ' (all years)' : ` in ${selectedYear}` }}.
        <span class="hidden sm:inline">Click a site, hub, or county to zoom the map.</span>
      </p>
    </template>
  </UCard>
</template>