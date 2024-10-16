<script setup lang="ts">
import {onMounted} from 'vue';

const sites = ref(null);
const sitesLoading = ref(false);
const sitesError = ref(null);
const mapElement = ref(null);
const map = ref(null);
const newSite = ref({
  description: '',
  stream_name: '',
  wwkybasin: '',
  countyname: '',
  comments: '',
});
const error = ref(null);

const fetchSites = async () => {
  sitesLoading.value = true;
  try {
    const response = useDirectus(
      readItems('wwkysites', {
        fields: ['wwkyid', 'latitude', 'longitude', 'description'],
      })
    );
    console.log('Fetched sites:', response.data); // Debugging log
    sites.value = response.data;
  } catch (err) {
    console.error('Error fetching sites:', err); // Debugging log
    sitesError.value = err;
  } finally {
    sitesLoading.value = false;
  }
};

const initLeaflet = async () => {
  try {
    const L = await import('leaflet');
    await import('leaflet/dist/leaflet.css');
    window.$L = L;
    initMap();
  } catch (e) {
    console.error('Failed to load Leaflet:', e); // Debugging log
    error.value = 'Failed to load map library';
  }
};

const initMap = () => {
  if (!mapElement.value || !window.$L) return;

  try {
    map.value = window.$L.map(mapElement.value).setView([37.8, -85.8], 7); // Center on Kentucky
    window.$L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map.value);
    addMarkersToMap();
    map.value.on('click', onMapClick);
  } catch (e) {
    console.error('Error initializing map:', e); // Debugging log
    error.value = 'Failed to initialize map';
  }
};

const addMarkersToMap = () => {
  if (!map.value || !window.$L || !sites.value) {
    console.log('Map or sites data not ready'); // Debugging log
    return;
  }
  sites.value.forEach(site => {
    console.log('Adding marker for site:', site); // Debugging log
    window.$L.marker([site.latitude, site.longitude])
      .addTo(map.value)
      .bindPopup(`ID: ${site.wwkyid}<br>Description: ${site.description}`)
      .on('click', () => selectSite(site.wwkyid));
  });
};

const selectSite = (wwkyid) => {
  emit('update:modelValue', wwkyid);
  emit('close');
};

const onMapClick = (e) => {
  newSite.value.latitude = e.latlng.lat;
  newSite.value.longitude = e.latlng.lng;
  // Open a form or modal to enter new site details
};

onMounted(async () => {
  if (process.client) {
    await fetchSites();
    await initLeaflet();
  }
});
</script>

<template>
  <div class="map-selector">
    <div v-if="error || sitesError" class="error">{{ error || sitesError }}</div>
    <div v-else-if="sitesLoading" class="loading">Loading...</div>
    <div v-else>
      <div ref="mapElement" style="height: 400px;"></div>
    </div>
  </div>
</template>

<style scoped>
/* Your styles here */
</style>