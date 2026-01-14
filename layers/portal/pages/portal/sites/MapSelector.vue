<script setup lang="ts">
//this is the MapSelector component for selecting sites on a map
import mapboxgl from 'mapbox-gl'; //import from node_modules
import 'mapbox-gl/dist/mapbox-gl.css'; //css for mapbox

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select-site', site: { wwkyid_pk: number, stream_name: string, wwkybasin: string }): void
  (e: 'close'): void
}>();

const { user } = useDirectusAuth();
const config = useRuntimeConfig();

const geoJsonData: Ref<any> = ref(null);
const sites: Ref<any[]> = ref([]);
const sitesLoading = ref(false);
const sitesError: Ref<Error | null> = ref(null);

// Add new ref for WFS data
const selectedBasinInfo = ref<{ id: string; name: string } | null>(null);

const address = ref('');
const map = ref<mapboxgl.Map | null>(null) as Ref<mapboxgl.Map | null>;
const addressMarker = ref<mapboxgl.Marker | null>(null);
const currentPopup = ref<mapboxgl.Popup | null>(null);
const clickMarker = ref<mapboxgl.Marker | null>(null);
const highlightedSite = ref<string | null>(null);

// Add these refs for popup pagination
const currentPage = ref(1);
const lastClickedHub = ref<any>(null);

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

// Add new ref for hubs data
const hubsData: Ref<any> = ref(null);

const searchType = ref(''); // Options: 'siteId', 'address', 'coordinates'
const toast = useToast();

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
  { id: '7', name: 'Tradewater and Lower Green River' },
  { id: '8', name: 'Upper Cumberland River' },
  { id: '3', name: 'Upper Green River' },
];

const updateBasinName = () => {
  const basinId = newSiteData.value.wwkybasin_id;
  if (!basinId) {
    newSiteData.value.wwkybasin = '';
    return;
  }

  const selectedBasin = basinOptions.find(basin => basin.id === basinId);
  if (selectedBasin) {
    newSiteData.value.wwkybasin = selectedBasin.name;
  }
};

// Add to your component setup section
const renderHubPopupContent = (properties: any) => {
  const getCheckmark = (value: boolean) => value ? '✓' : '✗';

  const page1Content = `
    <div class="hub-popup">
      <h3>Water Quality Hub</h3>
      <div class="hub-info-grid">
        <div class="hub-row">
          <span class="info-label">Name:</span>
          <span class="info-value">${properties.description || 'N/A'}</span>
        </div>
        <div class="hub-row">
          <span class="info-label">Organization:</span>
          <span class="info-value">${properties.organization || 'N/A'}</span>
        </div>
        <div class="hub-row">
          <span class="info-label">Basin:</span>
          <span class="info-value">${properties.basin || 'N/A'}</span>
        </div>
        <div class="hub-row">
          <span class="info-label">Physical Address:</span>
          <span class="info-value">${properties.address || 'N/A'}</span>
        </div>
        <div class="hub-row">
          <span class="info-label">Mailing Address:</span>
          <span class="info-value">${properties.mailing_address || 'N/A'}</span>
        </div>
        <div class="hub-row">
          <span class="info-label">Contact:</span>
          <span class="info-value">${properties.contact || 'N/A'}</span>
        </div>
        <div class="hub-row">
          <span class="info-label">Phone:</span>
          <span class="info-value">${properties.phone || 'N/A'}</span>
        </div>
        <div class="hub-row">
          <span class="info-label">Email:</span>
          <span class="info-value">${properties.email || 'N/A'}</span>
        </div>
        <div class="hub-row">
          <span class="info-label">Availability:</span>
          <span class="info-value">${properties.availability || 'N/A'}</span>
        </div>
      </div>
      <div class="popup-pagination">
        <span>Page 1/2</span>
        <button onclick="event.stopPropagation(); window.showHubPage(2)" class="pagination-btn">Next →</button>
      </div>
    </div>
  `;

  const page2Content = `
    <div class="hub-popup">
      <h3>Available Services</h3>
      <div class="hub-services-grid">
        <div class="hub-row">
          <span class="service-label">Sampling Kits:</span>
          <span class="service-value">${getCheckmark(properties.sampling_kits)}</span>
        </div>
        <div class="hub-row">
          <span class="service-label">Kit Count:</span>
          <span class="service-value">${properties.kit_count || 0}</span>
        </div>
        <div class="hub-row">
          <span class="service-label">Incubator:</span>
          <span class="service-value">${getCheckmark(properties.incubator)}</span>
        </div>
        <div class="hub-row">
          <span class="service-label">Incubator Count:</span>
          <span class="service-value">${properties.incubator_count || 0}</span>
        </div>
        <div class="hub-row">
          <span class="service-label">Biological Kit:</span>
          <span class="service-value">${getCheckmark(properties.biological_kit)}</span>
        </div>
        <div class="hub-row">
          <span class="service-label">Biological Kit Count:</span>
          <span class="service-value">${properties.biokit_count || 0}</span>
        </div>
        <div class="hub-row">
          <span class="service-label">Events & Meetings:</span>
          <span class="service-value">${getCheckmark(properties.events_meetings)}</span>
        </div>
        <div class="hub-row">
          <span class="service-label">Site Selection:</span>
          <span class="service-value">${getCheckmark(properties.site_selection)}</span>
        </div>
        <div class="hub-row">
          <span class="service-label">Data Entry:</span>
          <span class="service-value">${getCheckmark(properties.data_entry)}</span>
        </div>
        <div class="hub-row">
          <span class="service-label">Interpret Findings:</span>
          <span class="service-value">${getCheckmark(properties.interpret_findings)}</span>
        </div>
        <div class="hub-row">
          <span class="service-label">Community Coordination:</span>
          <span class="service-value">${getCheckmark(properties.coordinate_community)}</span>
        </div>
        <div class="hub-row">
          <span class="service-label">Host Outreach:</span>
          <span class="service-value">${getCheckmark(properties.host_outreach)}</span>
        </div>
      </div>
      <div class="popup-pagination">
        <button onclick="event.stopPropagation(); window.showHubPage(1)" class="pagination-btn">← Back</button>
        <span>Page 2/2</span>
      </div>
    </div>
  `;

  return currentPage.value === 1 ? page1Content : page2Content;
};

const renderSitePopupContent = (properties: any) => {
  return `
    <div class="site-popup">
      <h3>${properties.stream_name || 'unnamed'}</h3>
      <p><strong>Site ID:</strong> ${properties.wwkyid_pk}</p>
      <p><strong>Basin:</strong> ${properties.wwkybasin}</p>
      <p><strong>Sampling Location Description:</strong> ${properties.description || 'No description available'}</p>
      <button onclick="event.stopPropagation(); window.selectSite(${properties.wwkyid_pk}, '${properties.stream_name || 'unnamed'}', '${properties.wwkybasin}')">Select Site</button>
    </div>
  `;
};

const renderCreateSitePopupContent = (coordinates: { lat: number, lng: number }, basinInfo?: { id: string; name: string }, placeName?: string) => {
  return `
    <div class="site-popup">
      <h3>Add New Site</h3>
      <p><strong>Latitude:</strong> ${coordinates.lat.toFixed(6)}</p>
      <p><strong>Longitude:</strong> ${coordinates.lng.toFixed(6)}</p>
      ${placeName ? `<p><strong>Address:</strong> ${placeName}</p>` : ''}
      ${basinInfo ? `<p><strong>Basin:</strong> ${basinInfo.name}</p>` : ''}
      <button onclick="event.stopPropagation();" id="createSiteBtn">Create Site</button>
    </div>
  `;
};

// Add global function for page switching
(window as any).showHubPage = (pageNumber: number) => {
  currentPage.value = pageNumber;
  if (lastClickedHub.value) {
    currentPopup.value?.setHTML(renderHubPopupContent(lastClickedHub.value.properties));
  }
};

// Add function to fetch WFS data
const addBasinWMSLayer = () => {
  if (!map.value) return;

  // Add WMS source and layer with corrected layer ID
  map.value.addSource('basin-wms', {
    type: 'raster',
    tiles: [
      'https://kgs.uky.edu/arcgis/services/WaterWatch/WWKYMainBasins/MapServer/WMSServer?' +
      'SERVICE=WMS&' +
      'VERSION=1.3.0&' +
      'REQUEST=GetMap&' +
      'FORMAT=image/png&' +
      'TRANSPARENT=true&' +
      'LAYERS=2&' +  // Using layer ID instead of name
      'CRS=EPSG:3857&' +
      'STYLES=&' +
      'WIDTH=256&' +
      'HEIGHT=256&' +
      'BBOX={bbox-epsg-3857}'
    ],
    tileSize: 256
  });

  map.value.addLayer({
    id: 'basin-wms-layer',
    type: 'raster',
    source: 'basin-wms',
    paint: {
      'raster-opacity': 0.3  // Increased opacity slightly
    }
  }, 'sites-layer');
};

const fetchSites = async () => {
  sitesLoading.value = true;
  try {
    const response = await useDirectus(
      readItems('wwky_sites', {
        fields: ['wwkyid_pk','latitude', 'longitude', 'stream_name', 'wwkybasin','description'],
        limit: -1
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

// Add to your existing fetchSites function or create a new one
const fetchHubs = async () => {
  try {
    const response = await useDirectus(
      readItems('wwky_hubs', {
        fields: ['*'],
        limit: 1000
      })
    );
    hubsData.value = {
      type: "FeatureCollection",
      features: response.map(hub => ({
        type: "Feature",
        properties: {
          hub_id: hub.hub_id,
          description: hub.Description,
          organization: hub.organization,
          basin: hub.Basin,
          address: hub.Full_Address,
          mailing_address: hub.mailing_address,
          contact: hub.Contact_Person,
          phone: hub.Phone,
          email: hub.Email,
          availability: hub.Availability,
          sampling_kits: hub.Sampling_kits,
          kit_count: hub.kit_count,
          incubator: hub.Incubator,
          incubator_count: hub.incubator_count,
          biological_kit: hub.Biological_kit,
          biokit_count: hub.biokit_count,
          events_meetings: hub.Events_and_meetings,
          site_selection: hub.Site_selection_assist,
          data_entry: hub.Data_entry_assistance,
          interpret_findings: hub.Interpret_findings,
          coordinate_community: hub.Coordinate_community,
          host_outreach: hub.Host_outreach_materials
        },
        geometry: {
          type: "Point",
          coordinates: [hub.longitude, hub.latitude]
        }
      }))
    };
  } catch (err) {
    console.error('Error fetching hubs:', err);
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

const openCreateSiteModal = (basinData = null) => {
  isCreateSiteModalOpen.value = true;
};

const closeCreateSiteModal = () => {
  // Only reset form when explicitly closing
  isCreateSiteModalOpen.value = false;
  newSiteData.value = {
    latitude: 0,
    longitude: 0,
    address: '',
    stream_name: '',
    description: '',
    wwkybasin: '',
    wwkybasin_id: '',
    comments: '',
  };
};

const currentStyle = ref('streets');

const initializeMap = () => {
  if (!geoJsonData.value) {
    console.error('GeoJSON data is not available');
    return;
  }

  mapboxgl.accessToken = config.public.MAPBOX_ACCESS_TOKEN;
  
  map.value = new mapboxgl.Map({
    container: 'mapElement',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [-85.8, 37.8],
    zoom: 6,
    attributionControl: false  // Remove default attribution control
  });

  // Add custom attribution without "Improve this map"
  map.value.addControl(new mapboxgl.AttributionControl({
    customAttribution: '© Mapbox © OpenStreetMap',
    compact: true
  }));

  map.value.addControl(new mapboxgl.NavigationControl(), 'top-left');
  map.value.addControl(new mapboxgl.GeolocateControl({
    positionOptions: { enableHighAccuracy: true },
    trackUserLocation: true,
    showUserHeading: true
  }), 'top-left');

  map.value.addControl(new BasemapControl(), 'top-right');

  map.value.on('load', () => {
    addCustomLayers();
    addBasinWMSLayer();
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
  // Add your existing sources and layers first
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

  // Add hub source and layer
  if (hubsData.value) {
    map.value.addSource('hubs-data', {
      type: 'geojson',
      data: hubsData.value
    });

    map.value.addLayer({
      id: 'hubs-layer',
      type: 'circle',
      source: 'hubs-data',
      paint: {
        'circle-radius': 12,
        'circle-color': 'rgba(46, 204, 113, 0.7)',
        'circle-stroke-width': 2,
        'circle-stroke-color': '#000000'
      }
    });
  }

  // Add your other existing layers
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

// Function to get basin at clicked point
const getBasinAtPoint = async (lngLat: { lng: number, lat: number }) => {
  const mapCanvas = map.value.getCanvas();
  const bounds = map.value.getBounds();
  try {
    const response = await fetch(
      'https://kgs.uky.edu/arcgis/rest/services/WaterWatch/WWKYMainBasins/MapServer/identify?' +
      'geometry=%22x%22%3A' + lngLat.lng + '%2C%22y%22%3A' + lngLat.lat + '%2C%22' +
      '&geometryType=esriGeometryPoint' +
      '&sr=%22wkid%22%3A4326' +
      '&layers=0' + // Using layer 2 for Watershed Watch Main Basins
      '&tolerance=3' +
      '&mapExtent=' + bounds.getWest() + '%2C' + 
                     bounds.getSouth() + '%2C' + 
                     bounds.getEast() + '%2C' + 
                     bounds.getNorth() +
      '&imageDisplay=' + mapCanvas.width + '%2C' + 
                        mapCanvas.height + '%2C96' +
      '&returnGeometry=false' +
      '&returnZ=false' +
      '&returnM=false' +
      '&returnUnformattedValues=false' +
      '&returnFieldName=false' +
      '&f=pjson'
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      let basinName = data.results[0].attributes.BASIN_NAME;
      if (basinName) {
        // Remove the word "Basin" and any trailing spaces
        basinName = basinName.replace(/\s+Basin\s*$/i, '').trim();
        
        // Handle special cases and standardize names
        const nameMap = {
          'Tradewater/Lower Green': 'Tradewater and Lower Green River',
          'Four Rivers Basin': 'Four Rivers',
          'Big Sandy': 'Big Sandy River',
          'Kentucky': 'Kentucky River',
          'Licking': 'Licking River',
          'Salt': 'Salt River',
          'Upper Cumberland': 'Upper Cumberland River',
          'Upper Green': 'Upper Green River'
        };

        // Use mapped name if it exists, otherwise use original
        const standardizedName = nameMap[basinName] || basinName;

        const basinOption = basinOptions.find(option => {
          const optionNameLower = option.name.toLowerCase();
          const standardizedNameLower = standardizedName.toLowerCase();
          const isMatch = optionNameLower === standardizedNameLower;
          return isMatch;
        });

        if (basinOption) {
          // Make sure we're returning an object with both id and name
          return {
            id: basinOption.id,
            name: basinOption.name
          };
        }
      }
    }
    
    return null;
  } catch (err) {
    console.error('Error getting basin info from REST:', err);
    return null;
  }
};

const createPopup = (coordinates: mapboxgl.LngLat, content: string, isHub: boolean = false) => {
  if (currentPopup.value) currentPopup.value.remove();
  
  currentPopup.value = new mapboxgl.Popup({
    closeButton: true,
    closeOnClick: false,
    className: isHub ? 'hub-popup' : ''
  })
    .setLngLat(coordinates)
    .setHTML(content)
    .addTo(map.value);

  // Add click handler to close button after popup is added
  setTimeout(() => {
    // Handle close button
    const closeButton = document.querySelector('.mapboxgl-popup-close-button');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        currentPopup.value?.remove();
        highlightedSite.value = null;
        map.value?.setFilter('highlighted-site-layer', ['==', 'wwkyid_pk', '']);
      });
    }

    // Handle create site button
    const createSiteBtn = document.getElementById('createSiteBtn');
    if (createSiteBtn) {
      createSiteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        newSiteData.value = {
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          address: '',
          stream_name: '',
          description: '',
          wwkybasin: selectedBasinInfo.value?.name || '',
          wwkybasin_id: selectedBasinInfo.value?.id || '',
          comments: '',
        };
        isCreateSiteModalOpen.value = true;
        currentPopup.value?.remove();
      });
    }
  }, 0);
};

// Also add a watcher to debug when the value changes
watch(
  () => newSiteData.value.wwkybasin_id,
  (newVal, oldVal) => {
    console.log('wwkybasin_id changed:', { old: oldVal, new: newVal });
  }
);

// Modify the setupEventListeners function:
const setupEventListeners = () => {
  map.value.on('click', async (e) => {  // Added async here
    const siteFeatures = map.value.queryRenderedFeatures(e.point, { layers: ['sites-layer'] });
    const hubFeatures = map.value.queryRenderedFeatures(e.point, { layers: ['hubs-layer'] });
    
    // If we clicked a hub
    if (hubFeatures.length > 0) {
      const hubFeature = hubFeatures[0];
      lastClickedHub.value = hubFeature;
      currentPage.value = 1;
      
      createPopup(
        new mapboxgl.LngLat(hubFeature.geometry.coordinates[0], hubFeature.geometry.coordinates[1]),
        renderHubPopupContent(hubFeature.properties),
        true
      );
    }
    // If we clicked a site
    else if (siteFeatures.length > 0) {
      const siteFeature = siteFeatures[0];
      const coordinates = new mapboxgl.LngLat(
        siteFeature.geometry.coordinates[0], 
        siteFeature.geometry.coordinates[1]
      );

      highlightedSite.value = siteFeature.properties.wwkyid_pk;
      map.value.setFilter('highlighted-site-layer', ['==', 'wwkyid_pk', siteFeature.properties.wwkyid_pk]);

      createPopup(coordinates, renderSitePopupContent(siteFeature.properties));
    }
    // If we clicked empty space
    else {
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

      // Get basin info first
      const basinInfo = await getBasinAtPoint(e.lngLat);
      selectedBasinInfo.value = basinInfo;  // Store the basin info

      // Show popup with basin info
      createPopup(e.lngLat, renderCreateSitePopupContent(e.lngLat, basinInfo));
    }
  });

  // Keep the zoom event handler
  map.value.on('zoom', () => {
    if (map.value.getZoom() > 10) {
      map.value.setLayoutProperty('site-labels', 'visibility', 'visible');
    } else {
      map.value.setLayoutProperty('site-labels', 'visibility', 'none');
    }
  });
};

const searchSiteById = async (siteId: string) => {
  try {
    // Try to parse the site ID as a number
    const numericSiteId = parseInt(siteId);
    if (isNaN(numericSiteId)) return null;

    const response = await useDirectus(
      readItems('wwky_sites', {
        filter: {
          wwkyid_pk: { _eq: numericSiteId }
        },
        fields: ['wwkyid_pk', 'latitude', 'longitude', 'stream_name', 'wwkybasin', 'description']
      })
    );

    if (response && response.length > 0) {
      return response[0];
    }
    return null;
  } catch (error) {
    console.error('Error searching for site:', error);
    return null;
  }
};

const searchPlaceholder = computed(() => {
  switch (searchType.value) {
    case '':
      return 'Select a search type...';
    case 'siteId':
      return 'Enter Site ID (e.g., 3253)';
    case 'address':
      return 'Enter street address';
    case 'coordinates':
      return 'Enter coordinates (lat,lon)';
    default:
      return 'Search...';
  }
});

const locateAddress = async () => {
  if (!map.value || !address.value) {
    console.error('Map is not initialized or address is empty');
    return;
  }

  // Clear existing markers
  if (addressMarker.value) addressMarker.value.remove();
  if (clickMarker.value) {
    clickMarker.value.remove();
    clickMarker.value = null;
  }

  switch (searchType.value) {
    case 'siteId':
      await handleSiteIdSearch();
      break;
    case 'coordinates':
      await handleCoordinatesSearch();
      break;
    case 'address':
      await handleAddressSearch();
      break;
  }
};

const handleSiteIdSearch = async () => {
  const siteResult = await searchSiteById(address.value);
  
  if (siteResult) {
    const coordinates = new mapboxgl.LngLat(siteResult.longitude, siteResult.latitude);
    
    addressMarker.value = new mapboxgl.Marker()
      .setLngLat(coordinates)
      .addTo(map.value);

    map.value.flyTo({
      center: [siteResult.longitude, siteResult.latitude],
      zoom: 14
    });

    highlightedSite.value = siteResult.wwkyid_pk;
    map.value.setFilter('highlighted-site-layer', ['==', 'wwkyid_pk', siteResult.wwkyid_pk]);

    createPopup(coordinates, renderSitePopupContent({
      wwkyid_pk: siteResult.wwkyid_pk,
      stream_name: siteResult.stream_name,
      wwkybasin: siteResult.wwkybasin,
      description: siteResult.description
    }));
  } else {
    toast.add({ 
      title: 'Site Not Found', 
      description: 'No matching site ID found', 
      color: 'yellow'
    });
  }
};

const handleCoordinatesSearch = async () => {
  const coords = address.value.split(',').map(coord => parseFloat(coord.trim()));
  
  if (coords.length !== 2 || isNaN(coords[0]) || isNaN(coords[1])) {
    toast.add({ 
      title: 'Invalid Coordinates', 
      description: 'Please enter coordinates in format: latitude,longitude', 
      color: 'yellow'
    });
    return;
  }

  const [lat, lon] = coords;
  
  // Basic validation for lat/lon ranges
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    toast.add({ 
      title: 'Invalid Coordinates', 
      description: 'Coordinates out of valid range', 
      color: 'yellow'
    });
    return;
  }

  const lngLat = new mapboxgl.LngLat(lon, lat);
  addressMarker.value = new mapboxgl.Marker()
    .setLngLat(lngLat)
    .addTo(map.value);

  map.value.flyTo({
    center: [lon, lat],
    zoom: 14
  });

  const basinInfo = await getBasinAtPoint({ lng: lon, lat });
  createAddSitePopup(lngLat);
};

const handleAddressSearch = async () => {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address.value)}.json?` +
      `access_token=${mapboxgl.accessToken}&` +
      'bbox=-89.571067,36.497129,-81.964788,39.147732' // Bounding box for Kentucky
    );
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      const placeName = data.features[0].place_name;
      
      addressMarker.value = new mapboxgl.Marker()
        .setLngLat([lng, lat])
        .addTo(map.value);

      map.value.flyTo({
        center: [lng, lat],
        zoom: 14
      });

      createAddSitePopup(new mapboxgl.LngLat(lng, lat), placeName);
    } else {
      toast.add({ 
        title: 'Location Not Found', 
        description: 'No matching address found', 
        color: 'yellow'
      });
    }
  } catch (error) {
    console.error('Error in address search:', error);
    toast.add({ 
      title: 'Search Error', 
      description: 'Error searching for address', 
      color: 'red'
    });
  }
};

// Also update the locateAddress function to use the new createPopup
const createAddSitePopup = async (lngLat: mapboxgl.LngLat, placeName?: string) => {
  //await setupNewSiteData(lngLat);
  const basinInfo = await getBasinAtPoint(lngLat);
  selectedBasinInfo.value = basinInfo;  // Store the basin info
  createPopup(lngLat, renderCreateSitePopupContent(lngLat, basinInfo, placeName));
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
    await Promise.all([fetchSites(), fetchHubs()]);
    initializeMap();
  }
});
</script>

<template>
  <div class="map-container">
    <h1 class="title">Select an Existing Site or Create a Site (click on map/enter address)</h1>
    <div id="mapElement" class="map"></div>
    <div id="map-legend" class="legend">
      <h4>Map Legend</h4>
      <div class="legend-item">
        <span class="legend-symbol site-symbol"></span>
        <span>Sampling Sites</span>
      </div>
      <div class="legend-item">
        <span class="legend-symbol hub-symbol"></span>
        <span>Water Quality Hubs</span>
      </div>
    </div>
    <div class="address-bar">
      <select v-model="searchType" class="search-type-select">
        <option value="">Select Search Type</option>
        <option value="siteId">Site ID</option>
        <option value="address">Address</option>
        <option value="coordinates">Coordinates</option>
      </select>
      <input 
        v-model="address" 
        :placeholder="searchPlaceholder" 
        class="address-input" 
      />
      <button @click="locateAddress" class="locate-button">Locate</button>
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
            <label for="description">Sampling Location Description: <span class="required">*</span></label>
            <textarea id="description" v-model="newSiteData.description" required></textarea>
            <span v-if="formErrors.description" class="error-message">Description is required</span>
          </div>
          <div class="form-group select-wrapper" :class="{ 'has-error': formErrors.wwkybasin_id }">
            <label for="wwkybasin">Basin: <span class="required">*</span></label>
            <select 
              id="wwkybasin" 
              :value="newSiteData.wwkybasin_id"
              @input="newSiteData.wwkybasin_id = $event.target.value; updateBasinName()"
              required 
            >
              <option value="">Select a basin</option>
              <option 
                v-for="basin in basinOptions" 
                :key="basin.id" 
                :value="basin.id"
                :selected="basin.id === newSiteData.wwkybasin_id"
              >
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
/* Container and Layout */
.map-container {
  font-family: Arial, sans-serif;
  padding: 20px;
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

/* Map and Legend */
.map {
  width: 100%;
  flex-grow: 1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.map, .map * {
  cursor: pointer !important;
}

.legend {
  position: absolute;
  top: 75px;
  right: 525px;  /* Positioned just right of the map buttons */
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  padding: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1;
}

/* Make legend more compact for top positioning */
.legend h4 {
  margin: 0 0 5px 0;
  font-size: 12px;
  font-weight: bold;
}

.legend-item {
  display: flex;
  align-items: center;
  margin-bottom: 3px;  /* Reduced spacing between items */
  font-size: 11px;     /* Slightly smaller font */
}

.legend-symbol {
  width: 16px;         /* Slightly smaller symbols */
  height: 16px;
  border-radius: 50%;
  margin-right: 6px;   /* Reduced spacing */
  border: 1px solid #000;
}

.site-symbol {
  background-color: rgba(255, 165, 0, 0.7);
}

.hub-symbol {
  background-color: rgba(46, 204, 113, 0.7);
}

/* Address Search Bar */
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

/* Form Elements */
.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input,
.form-group textarea,
.form-group select,
.modal-content input,
.modal-content textarea,
.modal-content select {
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

/* Buttons */
.form-actions {
  margin-top: 20px;
  text-align: right;
}

.form-actions button,
.modal-content button {
  padding: 8px 15px;
  margin-left: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.form-actions button[type="submit"],
.modal-content button[type="submit"] {
  background-color: #4CAF50;
  color: white;
}

.form-actions button[type="submit"]:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
}

.form-actions button[type="button"],
.modal-content button[type="button"] {
  background-color: #f44336;
  color: white;
}

/* Modal */
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

/* Popup Styles */
:global(.mapboxgl-popup-content) {
  padding: 20px;
  border-radius: 8px;
  background-color: rgba(45, 45, 45, 0.9);
  color: #ffffff;
  max-height: 400px;
  overflow-y: auto;
  min-width: 300px;
  max-width: 350px !important;
}

:global(.mapboxgl-popup-content h3) {
  margin-top: 0;
  color: #ffffff;
  margin-bottom: 15px;
  text-align: center;
}

:global(.mapboxgl-popup-content p) {
  margin: 10px 0;
}

:global(.mapboxgl-popup-content button) {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 8px 15px;
  margin: 15px 8px 0;
  border-radius: 4px;
  cursor: pointer;
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

/* Hub and Site Popup Specific */
.hub-popup :global(.mapboxgl-popup-content) {
  min-width: 300px;
  max-width: 500px !important;
}

/* Rest of your popup styles */
.hub-info-grid,
.hub-services-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.hub-row {
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 15px;
  align-items: baseline;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.hub-row:last-child {
  border-bottom: none;
}

.info-label,
.service-label {
  font-weight: bold;
  color: #2ecc71;
  text-align: right;
  white-space: nowrap;
}

.info-value,
.service-value {
  text-align: left;
  word-break: break-word;
}

.hub-popup h3 {
  margin: 0 0 15px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #2ecc71;
  text-align: center;
  font-size: 1.2em;
}

.service-value {
  font-size: 1.1em;
  font-weight: bold;
}

.site-popup,
.hub-popup {
  padding: 10px;
}

.site-popup h3,
.hub-popup h3 {
  margin: 0 0 10px 0;
  padding-bottom: 8px;
}

.site-popup h3 {
  border-bottom: 2px solid #ffa500;
}

.hub-popup h3 {
  border-bottom: 2px solid #2ecc71;
}

/* Pagination */
.popup-pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
}

.pagination-btn {
  background-color: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  padding: 5px 10px !important;
  margin: 0 !important;
  font-size: 12px !important;
}

.pagination-btn:hover {
  background-color: rgba(255, 255, 255, 0.2) !important;
}

/* Mapbox Controls */
:global(.mapboxgl-ctrl-group) {
  cursor: pointer;
}

:global(.mapboxgl-ctrl-group button) {
  cursor: pointer;
}

/* Basemap Toggle */
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

.search-type-select {
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ccc;
  border-radius: 4px 0 0 4px;
  background-color: #fff;
  cursor: pointer;
}

.address-input {
  border-radius: 0;
  border-left: none;
}

.locate-button {
  border-radius: 0 4px 4px 0;
}
</style>