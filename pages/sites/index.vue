<script setup lang="ts">
//THis is the public-facing site index page for KYWW. It shows a map of all sites, and a table of
//sampled sites (chemistry, biological, and habitat) with filters and search functionality.
import { usePublicKYWWMap } from '~/composables/usePublicKYWWMap';
import * as turf from '@turf/turf';

definePageMeta({
  layout: 'info'
});

const mapContainer = ref(null);
const containerReady = ref(false);
const legendVisible = ref(true);
const siteSearchQuery = ref('');
const basinFilter = ref('');
const dateRangeFilter = ref('all');
const hasEcoliFilter = ref(false);
const sampleTypeFilter = ref('all');

// Pagination
const currentPage = ref(1);
const itemsPerPage = ref(25);
const pagesToShow = 7;

// Site data
const loading = ref(true);
const error = ref(null);

const {
  loading: mapLoading,
  error: mapError,
  hubs,
  sampledSites,
  biologicalSites,
  habitatSites,
  hubsVisible,
  sampledSitesVisible,
  countiesVisible,
  biologicalVisible,
  habitatVisible,
  fetchData,
  initializeMap,
  zoomTo,
  toggleLayerVisibility,
  searchSiteById,
  siteSearchQuery: mapSearchQuery,
  searchResults: mapSearchResults,
  isSearching: mapIsSearching
} = usePublicKYWWMap();

const countyFilter = ref('');
const countiesData = ref(null);
const countiesLoaded = ref(false);
const loadingCounties = ref(false);
const countyBySite = ref(new Map());

const KY_COUNTIES_PATH = '/data/ky_counties.geojson';

async function loadCountiesData() {
  if (countiesLoaded.value) return;

  try {
    loadingCounties.value = true;
    const response = await fetch(KY_COUNTIES_PATH);
    countiesData.value = await response.json();

    processSitesCounties();
    countiesLoaded.value = true;
  } catch (error) {
    console.error('Error loading counties data:', error);
  } finally {
    loadingCounties.value = false;
  }
}

// Resolve a county for every site across all three sample types.
// Results go in a Map keyed by site id rather than mutating the source arrays.
function processSitesCounties() {
  if (!countiesData.value?.features) return;

  const resolved = new Map();

  const assign = (list) => {
    for (const site of list || []) {
      const id = site?.wwkyid_pk ?? site?.wwky_id;
      if (id == null || resolved.has(id)) continue;
      if (!site.longitude || !site.latitude) continue;

      const point = turf.point([site.longitude, site.latitude]);

      for (const feature of countiesData.value.features) {
        try {
          if (turf.booleanPointInPolygon(point, feature.geometry)) {
            resolved.set(id, feature.properties.NAME);
            break;
          }
        } catch (e) {
          console.error('Error in point-in-polygon test for site', id, e);
        }
      }
    }
  };

  assign(sampledSites.value);
  assign(biologicalSites.value);
  assign(habitatSites.value);

  countyBySite.value = resolved;
}

// Merge chemistry, biological, and habitat into one row per site.
// Chemistry sites seed the rows (they carry ecoli_count and sample dates);
// bio/habitat-only sites get appended so they aren't invisible in the table.
const allSiteRows = computed(() => {
  const rows = new Map();

  for (const site of sampledSites.value || []) {
    if (site?.wwkyid_pk == null) continue;
    rows.set(site.wwkyid_pk, {
      ...site,
      chem_count: site.sample_count || 0,
      bio_count: 0,
      hab_count: 0
    });
  }

  const merge = (list, countKey) => {
    for (const entry of list || []) {
      const id = entry?.wwkyid_pk ?? entry?.wwky_id;
      if (id == null) continue;

      if (!rows.has(id)) {
        rows.set(id, {
          wwkyid_pk: id,
          stream_name: entry.stream_name || '',
          wwkybasin: (entry.wwkybasin || '').trim(),
          description: entry.description || '',
          longitude: entry.longitude,
          latitude: entry.latitude,
          has_samples: true,
          ecoli_count: 0,
          latest_sample_date: null,
          chem_count: 0,
          bio_count: 0,
          hab_count: 0
        });
      }

      const row = rows.get(id);

      // Tolerate either shape: one entry per site carrying a samples array,
      // or one entry per individual sample.
      const samples = Array.isArray(entry.samples) ? entry.samples : [entry];
      row[countKey] += samples.length;

      for (const s of samples) {
        const d = s?.date;
        if (!d) continue;
        if (!row.latest_sample_date || new Date(d) > new Date(row.latest_sample_date)) {
          row.latest_sample_date = d;
        }
      }
    }
  };

  merge(biologicalSites.value, 'bio_count');
  merge(habitatSites.value, 'hab_count');

  const counties = countyBySite.value;

  return [...rows.values()].map(row => ({
    ...row,
    county: counties.get(row.wwkyid_pk) || null,
    total_count: row.chem_count + row.bio_count + row.hab_count
  }));
});

const availableCounties = computed(() => {
  const set = new Set();
  for (const row of allSiteRows.value) {
    if (row.county) set.add(row.county);
  }
  return Array.from(set).sort();
});

const availableBasins = computed(() => {
  const set = new Set();
  for (const row of allSiteRows.value) {
    if (row.wwkybasin) set.add(row.wwkybasin);
  }
  return Array.from(set).sort();
});

const sortField = ref('wwkyid_pk');
const sortDirection = ref('asc');

function toggleSort(field) {
  if (sortField.value === field) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortField.value = field;
    // Counts are more useful highest-first on the initial click.
    sortDirection.value =
      ['chem_count', 'bio_count', 'hab_count', 'total_count', 'ecoli_count'].includes(field)
        ? 'desc'
        : 'asc';
  }
}

const customSearchQuery = ref('');
const customSearchResults = ref([]);

function handleCustomSearch() {
  if (!customSearchQuery.value || customSearchQuery.value.length < 2) {
    customSearchResults.value = [];
    return;
  }

  const query = customSearchQuery.value.toLowerCase();

  const results = allSiteRows.value.filter(site =>
    site.wwkyid_pk.toString().includes(query) ||
    (site.stream_name && site.stream_name.toLowerCase().includes(query))
  );

  customSearchResults.value = results.slice(0, 10);
}

function selectSearchResult(site) {
  if (site.longitude && site.latitude) {
    zoomTo([site.longitude, site.latitude], 14);

    // Make sure a layer this site actually appears on is visible.
    if (site.chem_count > 0 && !sampledSitesVisible.value) {
      toggleLayerVisibility('sampledSites');
    } else if (site.bio_count > 0 && !biologicalVisible.value) {
      toggleLayerVisibility('biological');
    } else if (site.hab_count > 0 && !habitatVisible.value) {
      toggleLayerVisibility('habitat');
    }

    customSearchResults.value = [];
    customSearchQuery.value = '';
  }
}

const filteredSites = computed(() => {
  const filtered = allSiteRows.value.filter(site => {
    const searchMatch = !siteSearchQuery.value ||
      (site.stream_name && site.stream_name.toLowerCase().includes(siteSearchQuery.value.toLowerCase())) ||
      (site.wwkyid_pk && site.wwkyid_pk.toString().includes(siteSearchQuery.value)) ||
      (site.description && site.description.toLowerCase().includes(siteSearchQuery.value.toLowerCase()));

    const basinMatch = !basinFilter.value || site.wwkybasin === basinFilter.value;
    const countyMatch = !countyFilter.value || site.county === countyFilter.value;
    const ecoliMatch = !hasEcoliFilter.value || (site.ecoli_count && site.ecoli_count > 0);

    let typeMatch = true;
    if (sampleTypeFilter.value === 'chemistry') typeMatch = site.chem_count > 0;
    else if (sampleTypeFilter.value === 'biological') typeMatch = site.bio_count > 0;
    else if (sampleTypeFilter.value === 'habitat') typeMatch = site.hab_count > 0;

    let dateMatch = true;
    if (dateRangeFilter.value !== 'all' && site.latest_sample_date) {
      const latestDate = new Date(site.latest_sample_date);
      const now = new Date();

      if (dateRangeFilter.value === 'last30') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        dateMatch = latestDate >= thirtyDaysAgo;
      } else if (dateRangeFilter.value === 'last90') {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);
        dateMatch = latestDate >= ninetyDaysAgo;
      } else if (dateRangeFilter.value === 'last365') {
        const yearAgo = new Date();
        yearAgo.setDate(now.getDate() - 365);
        dateMatch = latestDate >= yearAgo;
      }
    } else if (dateRangeFilter.value !== 'all') {
      dateMatch = false;
    }

    return searchMatch && basinMatch && ecoliMatch && dateMatch && countyMatch && typeMatch;
  });

  return [...filtered].sort((a, b) => {
    let aValue = a[sortField.value];
    let bValue = b[sortField.value];

    if (sortField.value === 'latest_sample_date') {
      aValue = aValue ? new Date(aValue).getTime() : 0;
      bValue = bValue ? new Date(bValue).getTime() : 0;
    } else if (typeof aValue === 'string' || typeof bValue === 'string') {
      aValue = aValue ? String(aValue).toLowerCase() : '';
      bValue = bValue ? String(bValue).toLowerCase() : '';
    } else {
      aValue = aValue || 0;
      bValue = bValue || 0;
    }

    if (aValue === bValue) return 0;
    return sortDirection.value === 'asc'
      ? (aValue > bValue ? 1 : -1)
      : (aValue < bValue ? 1 : -1);
  });
});

const paginatedSites = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  return filteredSites.value.slice(startIndex, startIndex + itemsPerPage.value);
});

const totalPages = computed(() => {
  return Math.ceil(filteredSites.value.length / itemsPerPage.value);
});

// Reset to page 1 whenever the result set shrinks out from under the cursor.
watch(filteredSites, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = 1;
  }
});

const paginationItems = computed(() => {
  if (totalPages.value <= pagesToShow) {
    return Array.from({ length: totalPages.value }, (_, i) => i + 1);
  }

  const items = [];
  const halfWay = Math.floor(pagesToShow / 2);

  items.push(1);

  if (currentPage.value <= halfWay + 1) {
    for (let i = 2; i <= pagesToShow - 1; i++) {
      items.push(i);
    }
    items.push('ellipsis');
    items.push(totalPages.value);
  } else if (currentPage.value >= totalPages.value - halfWay) {
    items.push('ellipsis');
    const startPage = totalPages.value - pagesToShow + 2;
    for (let i = startPage; i < totalPages.value; i++) {
      items.push(i);
    }
    items.push(totalPages.value);
  } else {
    items.push('ellipsis');
    const startPage = currentPage.value - Math.floor(halfWay / 2);
    const endPage = currentPage.value + Math.floor(halfWay / 2);
    for (let i = startPage; i <= endPage; i++) {
      items.push(i);
    }
    items.push('ellipsis');
    items.push(totalPages.value);
  }

  return items;
});

watch(mapContainer, async (newValue) => {
  if (newValue && !mapLoading.value) {
    containerReady.value = true;
    await initializeMap(newValue, {
      showSites: true,
      showSampledSitesOnly: false,
      showHubs: true,
      showBiological: true,
      showHabitat: true
    });
  }
});

function handleZoom({ lng, lat, zoom }: { lng: number; lat: number; zoom: number }) {
  zoomTo([lng, lat], zoom);
  mapContainer.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function goToPage(page) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    const tableElement = document.getElementById('sites-table');
    if (tableElement) {
      tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function zoomToSite(site) {
  if (site.longitude && site.latitude) {
    zoomTo([site.longitude, site.latitude]);
  }
}

function formatDate(dateString) {
  if (!dateString) return 'No data';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function resetFilters() {
  siteSearchQuery.value = '';
  basinFilter.value = '';
  countyFilter.value = '';
  dateRangeFilter.value = 'all';
  hasEcoliFilter.value = false;
  sampleTypeFilter.value = 'all';
  currentPage.value = 1;
}

onMounted(async () => {
  loading.value = true;
  await fetchData();
  await loadCountiesData();
  loading.value = false;
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-6 lg:px-8">
    <!-- Hero section -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm p-8 mb-8">
      <h1 class="text-3xl font-bold text-blue-800 mb-3">Kentucky Watershed Watch Sampling Data</h1>
      <p class="text-gray-700 max-w-3xl">
        Explore water quality data collected by trained volunteers at monitoring sites across Kentucky watersheds. View sample data, water quality metrics, and see where volunteer water monitoring efforts are making a difference.
        <br><br>
        If you're interested in volunteering to collect water quality data, please find more information on the <a href="https://www.kywater.org" target="_blank">Kentucky Watershed Watch website</a> or contact your local support hub.
      </p>
    </div>
    
    <!-- Loading States -->
    <div v-if="loading" class="flex flex-col items-center justify-center h-64">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] mb-3"></div>
      <span>Loading sampling site map and data...</span>
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      type="error"
      :title="error"
      icon="i-heroicons-exclamation-triangle"
    />

    <!-- Content -->
    <template v-else>

        <div class="w-full mb-2">
            <div class="relative rounded-md shadow-sm">
                <input
                type="text"
                v-model="customSearchQuery"
                placeholder="Search sites by ID or name"
                class="block w-full rounded-md border-gray-300 px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                @input="handleCustomSearch"
                />
                <div v-if="customSearchResults.length > 0" class="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto">
                <ul class="py-1">
                    <li 
                    v-for="site in customSearchResults" 
                    :key="site.wwkyid_pk"
                    @click="selectSearchResult(site)"
                    class="px-4 py-2 hover:bg-blue-100 cursor-pointer"
                    >
                    {{ site.wwkyid_pk }} - {{ site.stream_name || 'Unnamed Stream' }} ({{ site.wwkybasin || 'Unknown Basin' }})
                    </li>
                </ul>
                </div>
            </div>
        </div>

      <!-- Map Section -->
      <UCard class="w-full mb-8">
        <template #header>
          <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold">Map of Sampling Sites</h2>
            <UButton
              v-if="legendVisible"
              icon="i-heroicons-map"
              variant="ghost"
              @click="legendVisible = !legendVisible"
            >
              Hide Legend
            </UButton>
            <UButton
              v-else
              icon="i-heroicons-map"
              variant="ghost"
              @click="legendVisible = !legendVisible"
            >
              Show Legend
            </UButton>
          </div>
        </template>

        <div class="relative w-full h-[400px]">
          <div 
            ref="mapContainer" 
            class="w-full h-full rounded-lg relative"
          >
            <!-- Loading overlay -->
            <div 
              v-if="!containerReady" 
              class="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg"
            >
              <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
              <span class="ml-2">Loading map...</span>
            </div>
          </div>

          <!-- Interactive Legend -->
          <div 
            v-if="legendVisible && containerReady"
            class="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10 min-w-[200px]"
          >
            <h3 class="font-semibold mb-2">Map Legend</h3>
            <div class="space-y-2">
              <!-- Interactive legend items with checkboxes -->
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  :checked="sampledSitesVisible" 
                  @change="toggleLayerVisibility('sampledSites')"
                  class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div class="w-[12px] h-[12px] rounded-full bg-[#F97316] opacity-70 mr-2"></div> <!-- Chemistry -->
                <span>Chemistry Sampled Sites ({{ sampledSites?.length || 0 }})</span>
              </div>
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  :checked="biologicalVisible" 
                  @change="toggleLayerVisibility('biological')"
                  class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div class="w-[12px] h-[12px] rounded-full bg-[#8B5CF6] opacity-70 mr-2"></div> <!-- Biological -->
                <span>Biological Sampled Sites ({{ biologicalSites?.length || 0 }})</span>
              </div>
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  :checked="habitatVisible" 
                  @change="toggleLayerVisibility('habitat')"
                  class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div class="w-[12px] h-[12px] rounded-full bg-[#DB2777] opacity-70 mr-2"></div> <!-- Habitat -->
                <span>Habitat Sampled Sites ({{ habitatSites?.length || 0 }})</span>
              </div>
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  :checked="hubsVisible" 
                  @change="toggleLayerVisibility('hubs')"
                  class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div class="w-[16px] h-[16px] rounded-full bg-[#2ECC71] opacity-70 mr-2"></div> <!-- Hubs (portal size) -->
                <span>Support Hubs ({{ hubs?.length || 0 }})</span>
              </div>
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  :checked="countiesVisible" 
                  @change="toggleLayerVisibility('counties')"
                  class="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div class="w-4 h-4 border border-gray-400 mr-2"></div>
                <span>County Boundaries</span>
              </div>
            </div>
            <div class="mt-4 text-xs text-gray-500">
              <p>Click the checkboxes to show/hide each layer</p>
              <p>Sampling data in this portal started in 2024.</p>
            </div>
          </div>
        </div>
      </UCard>

      <RecognitionBoards context="public" class="mt-6" @zoom="handleZoom" />
    
      <!-- Filter Section -->
      <UCard class="w-full mb-8">
        <template #header>
          <h2 class="text-xl font-semibold">Search and Filter Sampled Sites</h2>
        </template>
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <!-- Search box -->
          <div>
            <label for="site-search" class="block text-sm font-medium text-gray-700 mb-1">
              Search sites
            </label>
            <input
              id="site-search"
              v-model="siteSearchQuery"
              type="text"
              placeholder="Search ID, stream name, or description"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <!-- Sample type filter -->
          <div>
            <label for="type-filter" class="block text-sm font-medium text-gray-700 mb-1">
              Filter by sample type
            </label>
            <select
              id="type-filter"
              v-model="sampleTypeFilter"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Sample Types</option>
              <option value="chemistry">Has Chemistry Samples</option>
              <option value="biological">Has Biological Assessments</option>
              <option value="habitat">Has Habitat Assessments</option>
            </select>
          </div>

          <!-- Basin filter -->
          <div>
            <label for="basin-filter" class="block text-sm font-medium text-gray-700 mb-1">
              Filter by basin
            </label>
            <select
              id="basin-filter"
              v-model="basinFilter"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Basins</option>
              <option v-for="basin in availableBasins" :key="basin" :value="basin">
                {{ basin }}
              </option>
            </select>
          </div>

          <!-- County filter -->
          <div>
            <label for="county-filter" class="block text-sm font-medium text-gray-700 mb-1">
              Filter by county
            </label>
            <select
              id="county-filter"
              v-model="countyFilter"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              :disabled="!countiesLoaded"
            >
              <option value="">All Counties</option>
              <option v-for="county in availableCounties" :key="county" :value="county">
                {{ county }}
              </option>
            </select>
            <div v-if="loadingCounties" class="text-xs text-gray-500 mt-1">
              Loading counties data...
            </div>
          </div>

          <!-- Date range filter -->
          <div>
            <label for="date-filter" class="block text-sm font-medium text-gray-700 mb-1">
              Filter by sample date
            </label>
            <select
              id="date-filter"
              v-model="dateRangeFilter"
              class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="last365">Last Year</option>
            </select>
          </div>

          <!-- E. coli filter -->
          <div class="flex items-end">
            <div class="flex items-center h-10">
              <input
                id="ecoli-filter"
                v-model="hasEcoliFilter"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label for="ecoli-filter" class="ml-2 block text-sm text-gray-700">
                Has E. coli data
              </label>
            </div>

            <UButton
              class="ml-auto"
              size="sm"
              variant="ghost"
              @click="resetFilters"
            >
              Reset Filters
            </UButton>
          </div>
        </div>

        <div class="mt-2">
          <p class="text-sm text-gray-600">
            Showing {{ filteredSites.length }} of {{ allSiteRows.length }} monitoring sites
          </p>
        </div>
      </UCard>

      <!-- Sites Table -->
      <UCard id="sites-table" class="w-full">
        <template #header>
          <h2 class="text-xl font-semibold">Sampled Monitoring Sites</h2>
        </template>
        
        <div v-if="filteredSites.length === 0" class="text-center py-6 text-gray-500">
          No sites match your filters. Try adjusting your search criteria.
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
           <thead>
              <tr>
                <th @click="toggleSort('wwkyid_pk')"
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  Site ID
                  <span v-if="sortField === 'wwkyid_pk'" class="ml-1">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('stream_name')"
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  Stream Name
                  <span v-if="sortField === 'stream_name'" class="ml-1">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('wwkybasin')"
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  Basin
                  <span v-if="sortField === 'wwkybasin'" class="ml-1">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('county')"
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  County
                  <span v-if="sortField === 'county'" class="ml-1">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('chem_count')"
                    class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  Chemistry
                  <span v-if="sortField === 'chem_count'" class="ml-1">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('bio_count')"
                    class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  Biological
                  <span v-if="sortField === 'bio_count'" class="ml-1">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('hab_count')"
                    class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  Habitat
                  <span v-if="sortField === 'hab_count'" class="ml-1">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('latest_sample_date')"
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  Latest Sample
                  <span v-if="sortField === 'latest_sample_date'" class="ml-1">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th @click="toggleSort('ecoli_count')"
                    class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                  E. coli Data
                  <span v-if="sortField === 'ecoli_count'" class="ml-1">{{ sortDirection === 'asc' ? '▲' : '▼' }}</span>
                </th>
                <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-for="site in paginatedSites" :key="site.wwkyid_pk" class="hover:bg-gray-50">
                <td class="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {{ site.wwkyid_pk }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                  {{ site.stream_name || 'Unnamed Stream' }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                  {{ site.wwkybasin || 'N/A' }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                  {{ site.county || 'Unknown' }}
                </td>
                <td class="px-4 py-3 text-center text-sm">
                  <NuxtLink v-if="site.chem_count" :to="`/sites/${site.wwkyid_pk}?tab=stream`">
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200">
                      {{ site.chem_count }}
                    </span>
                  </NuxtLink>
                  <span v-else class="text-gray-300">&mdash;</span>
                </td>
                <td class="px-4 py-3 text-center text-sm">
                  <NuxtLink v-if="site.bio_count" :to="`/sites/${site.wwkyid_pk}?tab=biological`">
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 hover:bg-purple-200">
                      {{ site.bio_count }}
                    </span>
                  </NuxtLink>
                  <span v-else class="text-gray-300">&mdash;</span>
                </td>
                <td class="px-4 py-3 text-center text-sm">
                  <NuxtLink v-if="site.hab_count" :to="`/sites/${site.wwkyid_pk}?tab=habitat`">
                    <span class="px-2 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800 hover:bg-pink-200">
                      {{ site.hab_count }}
                    </span>
                  </NuxtLink>
                  <span v-else class="text-gray-300">&mdash;</span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                  {{ formatDate(site.latest_sample_date) }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-700">
                  <span
                    :class="site.ecoli_count ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'"
                    class="px-2 py-1 rounded-full text-xs font-medium"
                  >
                    {{ site.ecoli_count ? site.ecoli_count + ' samples' : 'None' }}
                  </span>
                </td>
                <td class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex justify-center space-x-2">
                    <UButton
                      size="xs"
                      variant="soft"
                      @click="zoomToSite(site)"
                      icon="i-heroicons-map-pin"
                    >
                      Locate
                    </UButton>
                    <NuxtLink :to="`/sites/${site.wwkyid_pk}`">
                      <UButton size="xs" variant="soft" color="blue" icon="i-heroicons-eye">
                        View
                      </UButton>
                    </NuxtLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Improved Pagination -->
        <div v-if="totalPages > 1" class="mt-6">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-700">
              Showing {{ Math.min(filteredSites.length, 1 + (currentPage - 1) * itemsPerPage) }}
              to {{ Math.min(currentPage * itemsPerPage, filteredSites.length) }}
              of {{ filteredSites.length }} sites
            </div>
            
            <div class="flex items-center space-x-1">
              <!-- First page button -->
              <UButton
                variant="soft"
                size="sm"
                icon="i-heroicons-chevron-double-left"
                :disabled="currentPage === 1"
                @click="goToPage(1)"
              />
              
              <!-- Previous page button -->
              <UButton
                variant="soft"
                size="sm"
                icon="i-heroicons-chevron-left"
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1)"
              />
              
              <!-- Page numbers -->
              <div v-for="(item, index) in paginationItems" :key="index" class="mx-0.5">
                <UButton
                  v-if="item !== 'ellipsis'"
                  variant="soft"
                  size="sm"
                  :color="item === currentPage ? 'blue' : 'gray'"
                  @click="goToPage(item)"
                >
                  {{ item }}
                </UButton>
                <span v-else class="px-2 text-gray-500">...</span>
              </div>
              
              <!-- Next page button -->
              <UButton
                variant="soft"
                size="sm"
                icon="i-heroicons-chevron-right"
                :disabled="currentPage === totalPages"
                @click="goToPage(currentPage + 1)"
              />
              
              <!-- Last page button -->
              <UButton
                variant="soft"
                size="sm"
                icon="i-heroicons-chevron-double-right"
                :disabled="currentPage === totalPages"
                @click="goToPage(totalPages)"
              />
            </div>
          </div>
          
          <!-- Page size selector -->
          <div class="mt-4 flex items-center justify-end">
            <label for="items-per-page" class="text-sm text-gray-700 mr-2">Items per page:</label>
            <select
              id="items-per-page"
              v-model="itemsPerPage"
              class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              @change="currentPage = 1"
            >
              <option :value="25">25</option>
              <option :value="50">50</option>
              <option :value="100">100</option>
            </select>
          </div>
        </div>
        
        <template #footer>
          <div class="text-sm text-gray-600">
            <p>Use the map to explore all sites. Blue markers show sites that have been sampled.</p>
            <p class="mt-1">The table shows only sites with sampling data. Click on "View" to see detailed information for each site.</p>
          </div>
        </template>
      </UCard>
    </template>
  </div>
</template>

<style scoped>
@import "https://js.arcgis.com/4.28/@arcgis/core/assets/esri/themes/light/main.css";

/* Fix table alignment */
th, td {
  vertical-align: middle;
}

/* Add responsive tweaks */
@media (max-width: 768px) {
  .table-responsive {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>