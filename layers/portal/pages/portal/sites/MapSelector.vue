<script setup lang="ts">
import mapboxgl from 'mapbox-gl'; //import from node_modules
import 'mapbox-gl/dist/mapbox-gl.css'; //css for mapbox

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select-site', site: { wwkyid_pk: number, stream_name: string, wwkybasin: string }): void
  (e: 'close'): void
}>();

const { user } = useDirectusAuth();
const geoJsonData: Ref<any> = ref(null);
const sites: Ref<any[]> = ref([]);
const sitesLoading = ref(false);
const sitesError: Ref<Error | null> = ref(null);

const address = ref('');
const map = ref<mapboxgl.Map | null>(null) as Ref<mapboxgl.Map | null>;
const addressMarker = ref<mapboxgl.Marker | null>(null);
const currentPopup = ref<mapboxgl.Popup | null>(null);
const clickMarker = ref<mapboxgl.Marker | null>(null);
const highlightedSite = ref<string | null>(null);

const isCreateSiteModalOpen = ref(false);
const newSiteData = ref({
  latitude: 0,
  longitude: 0,
  address: '',
  stream_name: '',
  description: '',
  wwkybasin: '',
  wwkybasin_id: '',
  comments: '',
});

const formErrors = ref({
  stream_name: false,
  description: false,
  wwkybasin_id: false,
});

const isFormValid = computed(() => {
  return newSiteData.value.stream_name.trim() !== '' &&
         newSiteData.value.description.trim() !== '' &&
         newSiteData.value.wwkybasin_id !== '';
});

const validateForm = () => {
  formErrors.value.stream_name = newSiteData.value.stream_name.trim() === '';
  formErrors.value.description = newSiteData.value.description.trim() === '';
  formErrors.value.wwkybasin_id = newSiteData.value.wwkybasin_id === '';
  return !formErrors.value.stream_name && !formErrors.value.description && !formErrors.value.wwkybasin_id;
};

const basinOptions = [
  { id: '', name: 'Select a basin' }, // Add this default option
  { id: '1', name: 'Big Sandy River' },
  { id: '2', name: 'Four Rivers' },
  { id: '4', name: 'Kentucky River' },
  { id: '5', name: 'Licking River' },
  { id: '6', name: 'Salt River' },
  { id: '7', name: 'Tradewater/Lower Green River' },
  { id: '8', name: 'Upper Cumberland River' },
  { id: '3', name: 'Upper Green River' },
];

const updateBasinName = () => {
  const selectedBasin = basinOptions.find(basin => basin.id === newSiteData.value.wwkybasin_id);
  newSiteData.value.wwkybasin = selectedBasin ? selectedBasin.name : '';
};

const fetchSites = async () => {
  sitesLoading.value = true;
  try {
    const response = await useDirectus(
      readItems('wwky_sites', {
        fields: ['wwkyid_pk','latitude', 'longitude', 'stream_name', 'wwkybasin','description'],
        limit: 8000
      })
    );
    sites.value = response;
    geoJsonData.value = {
      type: "FeatureCollection",
      features: sites.value.map(point => ({
        type: "Feature",
        properties: {
          wwkyid_pk: point.wwkyid_pk,
          stream_name: point.stream_name,
          wwkybasin: point.wwkybasin,
          description: point.description
        },
        geometry: {
          type: "Point",
          coordinates: [point.longitude, point.latitude]
        }
      }))
    };
  } catch (err) {
    console.error('Error fetching sites:', err);
    sitesError.value = err instanceof Error ? err : new Error('Unknown error occurred');
  } finally {
    sitesLoading.value = false;
  }
};

const createNewSite = async () => {
  if (!validateForm()) {
    // Show an alert for invalid form
    alert('Please fill out all required fields.');
    return;
  }

  try {
    // Update basin name before creating the site
    updateBasinName();

    const newSite = {
      latitude: newSiteData.value.latitude,
      longitude: newSiteData.value.longitude,
      stream_name: newSiteData.value.stream_name,
      description: newSiteData.value.description,
      wwkybasin: newSiteData.value.wwkybasin,
      wwkybasin_id: newSiteData.value.wwkybasin_id,
      comments: newSiteData.value.comments,
      created_by: user.value?.last_name + ', ' + user.value?.first_name,
      created_date: new Date().toISOString()
    };

    // Omit wwkyid_pk from the payload to let Directus/PostgreSQL handle it
    const response = await useDirectus(
      createItem('wwky_sites', newSite)
    );
    
    console.log('New site created:', response);
    const newSiteId = response.wwkyid_pk;
    alert(`New site created successfully!\nNew Site ID: ${newSiteId}`);
    
    // Emit the new site information
    emit('select-site', { 
      wwkyid_pk: response.wwkyid_pk, 
      stream_name: response.stream_name || "unnamed", 
      wwkybasin: response.wwkybasin 
    });

    closeCreateSiteModal();
    // Refresh the map data
    await fetchSites();
    initializeMap();
  } catch (error) {
    console.error('Error creating new site:', error);
    if (error.response && error.response.data && error.response.data.errors) {
      const errorMessage = error.response.data.errors.map(err => err.message).join(', ');
      alert(`Failed to create new site: ${errorMessage}`);
    } else {
      alert('Failed to create new site. Please try again.');
    }
  }
};

const openCreateSiteModal = () => {
  isCreateSiteModalOpen.value = true;
};

const closeCreateSiteModal = () => {
  isCreateSiteModalOpen.value = false;
};

const currentStyle = ref('streets');

const initializeMap = () => {
  if (!geoJsonData.value) {
    console.error('GeoJSON data is not available');
    return;
  }

  mapboxgl.accessToken = 'pk.eyJ1IjoiZG91Z2N1cmwiLCJhIjoiY20xcWh0cHo4MDA3dTJqbjRscDdkZ2k5cyJ9.qY7F8QzGokUJTL1rUT8yeA';
  map.value = new mapboxgl.Map({
    container: 'mapElement',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-85.8, 37.8],
    zoom: 6
  });

  map.value.addControl(new mapboxgl.NavigationControl(), 'top-left');
  map.value.addControl(new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true
  }), 'top-left');

  map.value.addControl(new BasemapControl(), 'top-right');

  map.value.on('load', () => {
    addCustomLayers();
    setupEventListeners();
  });
};

class BasemapControl {
  onAdd(map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
    this._container.innerHTML = `
      <button class="basemap-toggle" title="Toggle Basemap">
        <span class="basemap-icon"></span>
      </button>
    `;
    this._container.onclick = toggleBasemap;
    return this._container;
  }

  onRemove() {
    this._container.parentNode.removeChild(this._container);
    this._map = undefined;
  }
}

const toggleBasemap = () => {
  const newStyle = currentStyle.value === 'streets'
    ? 'mapbox://styles/mapbox/satellite-streets-v11'
    : 'mapbox://styles/mapbox/streets-v11';

  const previousStyle = map.value.getStyle();

  map.value.setStyle(newStyle);
  currentStyle.value = currentStyle.value === 'streets' ? 'satellite' : 'streets';

  map.value.once('style.load', () => {
    addCustomLayers();
    setupEventListeners();

    // Cross-fade effect
    const fadeContainer = document.createElement('div');
    fadeContainer.style.position = 'absolute';
    fadeContainer.style.top = '0';
    fadeContainer.style.left = '0';
    fadeContainer.style.width = '100%';
    fadeContainer.style.height = '100%';
    fadeContainer.style.transition = 'opacity 0.5s';
    fadeContainer.style.opacity = '1';
    fadeContainer.style.pointerEvents = 'none';

    const previousMap = new mapboxgl.Map({
      container: fadeContainer,
      style: previousStyle,
      center: map.value.getCenter(),
      zoom: map.value.getZoom(),
      bearing: map.value.getBearing(),
      pitch: map.value.getPitch(),
      interactive: false,
      attributionControl: false
    });

    map.value.getContainer().appendChild(fadeContainer);

    setTimeout(() => {
      fadeContainer.style.opacity = '0';
    }, 50);

    setTimeout(() => {
      fadeContainer.remove();
      previousMap.remove();
    }, 500);
  });
};

const addCustomLayers = () => {
  map.value.addSource('geojson-data', {
    type: 'geojson',
    data: geoJsonData.value
  });

  map.value.addLayer({
    id: 'sites-layer',
    type: 'circle',
    source: 'geojson-data',
    paint: {
      'circle-radius': 6,
      'circle-color': 'rgba(255, 165, 0, 0.7)',
      'circle-stroke-width': 1,
      'circle-stroke-color': '#000000'
    }
  });

  map.value.addLayer({
    id: 'highlighted-site-layer',
    type: 'circle',
    source: 'geojson-data',
    paint: {
      'circle-radius': 8,
      'circle-color': '#FFFF00',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#000000'
    },
    filter: ['==', 'wwkyid_pk', '']
  });

  map.value.addLayer({
    id: 'site-labels',
    type: 'symbol',
    source: 'geojson-data',
    layout: {
      'text-field': ['get', 'wwkyid_pk'],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.5,
      'text-justify': 'auto',
      'text-size': 12,
      'visibility': 'none'
    },
    paint: {
      'text-color': '#000000',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1
    }
  });
};

const setupEventListeners = () => {
  map.value.on('zoom', () => {
    if (map.value.getZoom() > 10) {
      map.value.setLayoutProperty('site-labels', 'visibility', 'visible');
    } else {
      map.value.setLayoutProperty('site-labels', 'visibility', 'none');
    }
  });

  map.value.on('click', 'sites-layer', (e) => {
    if (e.features && e.features.length > 0) {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const properties = e.features[0].properties;

      if (currentPopup.value) currentPopup.value.remove();
      if (addressMarker.value) {
        addressMarker.value.remove();
        addressMarker.value = null;
      }
      if (clickMarker.value) {
        clickMarker.value.remove();
        clickMarker.value = null;
      }

      highlightedSite.value = properties.wwkyid_pk;
      map.value.setFilter('highlighted-site-layer', ['==', 'wwkyid_pk', properties.wwkyid_pk]);

      const popupContent = `
        <h3>${properties.stream_name || 'unnamed'}</h3>
        <p><strong>Site ID:</strong> ${properties.wwkyid_pk}</p>
        <p><strong>Basin:</strong> ${properties.wwkybasin}</p>
        <p><strong>Description:</strong> ${properties.description || 'No description available'}</p>
        <button onclick="window.selectSite(${properties.wwkyid_pk}, '${properties.stream_name || 'unnamed'}', '${properties.wwkybasin}')">Select Site</button>
      `;

      currentPopup.value = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false
      })
        .setLngLat(coordinates)
        .setHTML(popupContent)
        .addTo(map.value);

      const closeButton = currentPopup.value.getElement().querySelector('.mapboxgl-popup-close-button');
      if (closeButton) {
        closeButton.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          currentPopup.value.remove();
          highlightedSite.value = null;
          map.value.setFilter('highlighted-site-layer', ['==', 'wwkyid_pk', '']);
        });
      }
    }
  });

  map.value.on('click', (e) => {
    const features = map.value.queryRenderedFeatures(e.point, { layers: ['sites-layer'] });
    if (!features.length) {
      if (addressMarker.value) {
        addressMarker.value.remove();
        addressMarker.value = null;
      }
      if (clickMarker.value) {
        clickMarker.value.remove();
        clickMarker.value = null;
      }

      clickMarker.value = new mapboxgl.Marker()
        .setLngLat(e.lngLat)
        .addTo(map.value);

      createAddSitePopup(e.lngLat);
    }
  });
};

const createAddSitePopup = (lngLat) => {
  if (currentPopup.value) currentPopup.value.remove();

  const popupContent = `
    <h3>Add New Site</h3>
    <p>Latitude: ${lngLat.lat.toFixed(6)}</p>
    <p>Longitude: ${lngLat.lng.toFixed(6)}</p>
    <button id="createSiteBtn">Create Site</button>
  `;

  const popup = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: false
  })
    .setLngLat(lngLat)
    .setHTML(popupContent)
    .addTo(map.value);

  setTimeout(() => {
    const createSiteBtn = document.getElementById('createSiteBtn');
    if (createSiteBtn) {
      createSiteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        newSiteData.value = {
          latitude: lngLat.lat,
          longitude: lngLat.lng,
          address: '',
          stream_name: '',
          description: '',
          wwkybasin: '',
          wwkybasin_id: '',
          comments: '',
        };
        isCreateSiteModalOpen.value = true;
        popup.remove();
      });
    }
  }, 0);

  currentPopup.value = popup;
};

const locateAddress = async () => {
  if (!map.value) {
    console.error('Map is not initialized');
    return;
  }

  const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address.value)}.json?access_token=${mapboxgl.accessToken}`);
  const data = await response.json();
  
  if (data.features && data.features.length > 0) {
    const [lng, lat] = data.features[0].center;
    const placeName = data.features[0].place_name;
    
    if (addressMarker.value) addressMarker.value.remove();
    if (clickMarker.value) {
      clickMarker.value.remove();
      clickMarker.value = null;
    }
    
    addressMarker.value = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .addTo(map.value);

    map.value.flyTo({
      center: [lng, lat],
      zoom: 14
    });

    createAddSitePopup(new mapboxgl.LngLat(lng, lat), placeName);
  } else {
    alert('Address not found');
  }
};

// Global functions
(window as any).selectSite = (wwkyid_pk: number, stream_name: string | undefined, wwkybasin: string) => {
  emit('select-site', { 
    wwkyid_pk, 
    stream_name: stream_name || "unnamed", 
    wwkybasin 
  });
  console.log(`Selected existing site: ${wwkyid_pk}`);
};

onMounted(async () => {
  if (typeof window !== 'undefined') {
    await fetchSites();
    initializeMap();
  }
});
</script>

<template>
  <div class="map-container">
    <h1 class="title">Select an Existing Site or Create a Site (click on map/enter address)</h1>
    <div id="mapElement" class="map"></div>
    <div class="address-bar">
      <input v-model="address" placeholder="Enter an address or coordinates (lat,lon)" class="address-input" />
      <button @click="locateAddress" class="locate-button">Locate Site</button>
    </div>

<!-- Create Site Modal -->
    <div v-if="isCreateSiteModalOpen" class="modal-overlay" @click.self="closeCreateSiteModal">
      <div class="modal-content" @click.stop>
        <h2>Create New Site</h2>
        <div class="location-info">
          <p><strong>Latitude:</strong> {{ newSiteData.latitude.toFixed(6) }}</p>
          <p><strong>Longitude:</strong> {{ newSiteData.longitude.toFixed(6) }}</p>
          <p v-if="newSiteData.address"><strong>Address:</strong> {{ newSiteData.address }}</p>
        </div>
        <form @submit.prevent="createNewSite">
          <div class="form-group" :class="{ 'has-error': formErrors.stream_name }">
            <label for="stream_name">Stream Name: <span class="required">*</span></label>
            <input id="stream_name" v-model="newSiteData.stream_name" required />
            <span v-if="formErrors.stream_name" class="error-message">Stream name is required</span>
          </div>
          <div class="form-group" :class="{ 'has-error': formErrors.description }">
            <label for="description">Description: <span class="required">*</span></label>
            <textarea id="description" v-model="newSiteData.description" required></textarea>
            <span v-if="formErrors.description" class="error-message">Description is required</span>
          </div>
          <div class="form-group select-wrapper" :class="{ 'has-error': formErrors.wwkybasin_id }">
            <label for="wwkybasin">Basin: <span class="required">*</span></label>
            <select id="wwkybasin" v-model="newSiteData.wwkybasin_id" required @change="updateBasinName">
              <option value="">Select a basin</option>
              <option v-for="basin in basinOptions" :key="basin.id" :value="basin.id">
                {{ basin.name }}
              </option>
            </select>
            <span v-if="formErrors.wwkybasin_id" class="error-message">Please select a basin</span>
          </div>
          <div class="form-actions">
            <button type="submit" :disabled="!isFormValid">Create Site</button>
            <button type="button" @click="closeCreateSiteModal">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  font-family: Arial, sans-serif;
  padding:20px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  max-width: 800px;
  margin: 0 auto;
}

.title {
  font-size: 18px;
  color: #333;
  margin-bottom: 2px;
}

.map {
  width: 100%;
  flex-grow: 1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* Set cursor to pointer for the map and its child elements */
.map,
.map * {
  cursor: pointer !important;
}

.address-bar {
  display: flex;
  margin-top: 15px;
}

.address-input {
  flex-grow: 1;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px 0 0 4px;
}

.locate-button {
  padding: 10px 20px;
  font-size: 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
  transition: background-color 0.3s;
}

.locate-button:hover {
  background-color: #45a049;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.form-group textarea {
  height: 100px;
  resize: vertical;
}

.required {
  color: #e74c3c;
  margin-left: 3px;
}

.has-error input,
.has-error textarea,
.has-error select {
  border-color: #e74c3c;
}

.error-message {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 5px;
  display: block;
}

.form-actions {
  margin-top: 20px;
  text-align: right;
}

.form-actions button {
  padding: 8px 15px;
  margin-left: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.form-actions button[type="submit"] {
  background-color: #4CAF50;
  color: white;
}

.form-actions button[type="submit"]:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
}

.form-actions button[type="button"] {
  background-color: #f44336;
  color: white;
}

.select-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.select-wrapper select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  width: 100%;
  padding: 10px 30px 10px 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: white;
  cursor: pointer;
}

.select-wrapper::after {
  content: "\25BC";
  position: absolute;
  top: 70%;
  right: 10px;
  transform: translateY(-50%);
  pointer-events: none;
}

/* Style for the default option */
.select-wrapper select option:first-child {
  color: #999;
}

/* Update popup styles */
:global(.mapboxgl-popup-content) {
  padding: 20px;
  border-radius: 8px;
  background-color: rgba(45, 45, 45, 0.9);
  color: #ffffff;
}

:global(.mapboxgl-popup-content h3) {
  margin-top: 0;
  color: #ffffff;
  margin-bottom: 15px;
}

:global(.mapboxgl-popup-content p) {
  margin: 10px 0;
}

:global(.mapboxgl-popup-content button) {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 15px;
  margin: 0px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 15px;
  font-size: 14px;
}

:global(.mapboxgl-popup-content button:hover) {
  background-color: #45a049;
}

:global(.mapboxgl-popup-close-button) {
  font-size: 20px;
  color: #ffffff;
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px 10px;
}

:global(.mapboxgl-popup-close-button:hover) {
  color: #cccccc;
}

/* Ensure pointer cursor on map controls */
:global(.mapboxgl-ctrl-group) {
  cursor: pointer;
}

:global(.mapboxgl-ctrl-group button) {
  cursor: pointer;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  max-width: 500px;
  width: 100%;
}

.location-info {
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}

.location-info p {
  margin: 5px 0;
}

.modal-content h2 {
  margin-top: 0;
}

.modal-content form > div {
  margin-bottom: 15px;
}

.modal-content label {
  display: block;
  margin-bottom: 5px;
}

.modal-content input,
.modal-content textarea,
.modal-content select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.modal-content button {
  padding: 8px 15px;
  margin-right: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.modal-content button[type="submit"] {
  background-color: #4CAF50;
  color: white;
}

.modal-content button[type="button"] {
  background-color: #f44336;
  color: white;
}

.basemap-toggle {
  width: 30px;
  height: 30px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.basemap-icon {
  display: inline-block;
  width: 20px;
  height: 20px;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z"/></svg>');
  background-repeat: no-repeat;
  background-position: center;
}
</style>