<script setup lang="ts">
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select-site', site: { ogc_fid: number, wwkyid: string }): void
  (e: 'close'): void
}>();

const { user } = useDirectusAuth();
const geoJsonData: Ref<any> = ref(null);
const sites: Ref<any[]> = ref([]);
const sitesLoading = ref(false);
const sitesError: Ref<Error | null> = ref(null);

const fetchSites = async () => {
  sitesLoading.value = true;
  try {
    const response = await useDirectus(
      readItems('wwkysites', {
        fields: ['wwkyid', 'ogc_fid', 'latitude', 'longitude', 'stream_name', 'wwkybasin', 'description'],
        limit: 8000
      })
    );
    sites.value = response;
    geoJsonData.value = {
      type: "FeatureCollection",
      features: sites.value.map(point => ({
        type: "Feature",
        properties: {
          ogc_fid: point.ogc_fid, //this is the relational site id
          wwkyid: parseInt(point.wwkyid, 10),  // Ensure wwkyid is an integer
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

const address = ref('');
const map = ref<mapboxgl.Map | null>(null) as Ref<mapboxgl.Map | null>;
const addressMarker = ref<mapboxgl.Marker | null>(null);
const currentPopup = ref<mapboxgl.Popup | null>(null);
const clickMarker = ref<mapboxgl.Marker | null>(null);
const highlightedSite = ref<string | null>(null);

const createSitePopup = ref<mapboxgl.Popup | null>(null);
const newSiteName = ref('');
const newSiteDescription = ref('');

const createAddSitePopup = (lngLat: mapboxgl.LngLat, placeName?: string) => {
  // Remove any existing popup
  if (currentPopup.value) {
    currentPopup.value.remove();
  }

  const popup = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: false
  })
    .setLngLat(lngLat)
    .setHTML(`
      <h3>Add New Site</h3>
      <p>Latitude: ${lngLat.lat.toFixed(6)}</p>
      <p>Longitude: ${lngLat.lng.toFixed(6)}</p>
      ${placeName ? `<p>Address: ${placeName}</p>` : ''}
      <button onclick="window.addSite(${lngLat.lng}, ${lngLat.lat})">Add Site</button>
    `)
    .addTo(map.value!);

  // Custom close button functionality
  const closeButton = popup.getElement().querySelector('.mapboxgl-popup-close-button');
  if (closeButton) {
    closeButton.addEventListener('click', (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      popup.remove();
      if (addressMarker.value) {
        addressMarker.value.remove();
        addressMarker.value = null;
      }
      if (clickMarker.value) {
        clickMarker.value.remove();
        clickMarker.value = null;
      }
    });
  }

  currentPopup.value = popup;
  return popup;
};

const initializeMap = () => {
  if (!geoJsonData.value) {
    console.error('GeoJSON data is not available');
    return;
  }

  mapboxgl.accessToken = 'pk.eyJ1IjoiZG91Z2N1cmwiLCJhIjoiY20xcWh0cHo4MDA3dTJqbjRscDdkZ2k5cyJ9.qY7F8QzGokUJTL1rUT8yeA';
  map.value = new mapboxgl.Map({
    container: 'mapElement',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-85.8,37.8], //long,lat Default center
    zoom: 6
  });

  // Add zoom and rotation controls
  map.value.addControl(new mapboxgl.NavigationControl(), 'top-left');
  map.value.addControl(new mapboxgl.GeolocateControl({
    positionOptions: {
        enableHighAccuracy: true
    },
    trackUserLocation: true,
    showUserHeading: true
  }), 'top-left');

  map.value.on('load', () => {
    //console.log('Map loaded, adding source and layer',geoJsonData);
    // Add GeoJSON source using the fetched data    
    map.value!.addSource('geojson-data', {
      type: 'geojson',
      data: geoJsonData.value
    });

    // Add a layer for all sites
    map.value!.addLayer({
      id: 'sites-layer',
      type: 'circle',
      source: 'geojson-data',
      paint: {
        'circle-radius': 6,
        'circle-color': 'rgba(255, 165, 0, 0.7)',  // Semi-transparent orange
        'circle-stroke-width': 1,
        'circle-stroke-color': '#000000'
      }
    });

    // Add a layer for the highlighted site
    map.value!.addLayer({
      id: 'highlighted-site-layer',
      type: 'circle',
      source: 'geojson-data',
      paint: {
        'circle-radius': 8,
        'circle-color': '#FFFF00',  // Yellow
        'circle-stroke-width': 2,
        'circle-stroke-color': '#000000'
      },
      filter: ['==', 'wwkyid', '']  // Initially empty filter
    });

    // Add click event for popups
    map.value!.on('click', 'sites-layer', (e) => {
      if (e.features && e.features.length > 0) {
        const coordinates = e.features[0].geometry.coordinates.slice();
        const properties = e.features[0].properties;

        // Remove any existing popup and markers
        if (currentPopup.value) {
          currentPopup.value.remove();
        }
        if (addressMarker.value) {
          addressMarker.value.remove();
          addressMarker.value = null;
        }
        if (clickMarker.value) {
          clickMarker.value.remove();
          clickMarker.value = null;
        }

        // Highlight the clicked site
        highlightedSite.value = properties.wwkyid;
        map.value!.setFilter('highlighted-site-layer', ['==', 'wwkyid', properties.wwkyid]);

        // Create popup content
        const popupContent = `
          <h3>${properties.stream_name ? properties.stream_name : 'unknown stream name'}</h3>
          <p><strong>Site ID:</strong> ${properties.ogc_fid}</p>
          <p><strong>Old Site ID (WWKY ID):</strong> ${properties.wwkyid ? properties.wwkyid : 'n/a'}</p>
          <p><strong>Basin:</strong> ${properties.wwkybasin}</p>
          <p><strong>Description:</strong> ${properties.description}</p>
          <button onclick="window.selectSite(${properties.ogc_fid}, ${properties.wwkyid})">Select Site</button>
        `;

        const popup = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false
        })
          .setLngLat(coordinates)
          .setHTML(popupContent)
          .addTo(map.value!);

       // Custom close button functionality
       const closeButton = popup.getElement().querySelector('.mapboxgl-popup-close-button');
        if (closeButton) {
          closeButton.addEventListener('click', (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            popup.remove();
            highlightedSite.value = null;
            map.value!.setFilter('highlighted-site-layer', ['==', 'wwkyid', '']);
          });
        }

        currentPopup.value = popup;
      }
    });

    // Change cursor to pointer when hovering over a point
    map.value!.on('mouseenter', 'sites-layer', () => {
      map.value!.getCanvas().style.cursor = 'pointer';
    });
    map.value!.on('mouseleave', 'sites-layer', () => {
      map.value!.getCanvas().style.cursor = 'pointer';
    });

    // Add click event for adding new sites
    map.value!.on('click', (e) => {
      const features = map.value!.queryRenderedFeatures(e.point, { layers: ['sites-layer'] });
      if (!features.length) {
        // Remove any existing markers
        if (addressMarker.value) {
          addressMarker.value.remove();
          addressMarker.value = null;
        }
        if (clickMarker.value) {
          clickMarker.value.remove();
          clickMarker.value = null;
        }

        // Add new marker
        clickMarker.value = new mapboxgl.Marker()
          .setLngLat(e.lngLat)
          .addTo(map.value!);

        createAddSitePopup(e.lngLat);
      }
    });
  });
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
    
    // Remove existing markers
    if (addressMarker.value) {
      addressMarker.value.remove();
    }
    if (clickMarker.value) {
      clickMarker.value.remove();
      clickMarker.value = null;
    }
    
    // Add new marker
    addressMarker.value = new mapboxgl.Marker()
      .setLngLat([lng, lat])
      .addTo(map.value!);

    map.value.flyTo({
      center: [lng, lat],
      zoom: 14
    });

    // Add popup to the marker
    createAddSitePopup(new mapboxgl.LngLat(lng, lat), placeName);
  } else {
    alert('Address not found');
  }
};

// Add a global function to handle the "Add Site" button click
(window as any).addSite = (lng: number, lat: number) => {
  console.log(`Add site at longitude: ${lng}, latitude: ${lat}`);
  // Implement your add site logic here
  alert(`Site would be added at longitude: ${lng}, latitude: ${lat}`);
};

// Add a global function to handle the "Add Site" button click
(window as any).selectSite = (ogc_fid: number, wwkyid: number) => {
  console.log(`Select existing site: ${wwkyid} (${ogc_fid})`);
  // Implement your add site logic here
  alert(`Select existing site: ${wwkyid} (${ogc_fid})`);
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
</style>