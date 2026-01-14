// Basic type definitions
interface Site {
  wwkyid_pk: number;
  latitude: number;
  longitude: number;
  stream_name: string;
  wwkybasin: string;
  description: string;
  sample_count?: number;
  has_samples?: boolean;
  latest_sample_date?: string | null;
  ecoli_count?: number;
}

interface Hub {
  hub_id: number;
  Description: string;
  latitude: number;
  longitude: number;
  organization: string;
  Full_Address: string;
  mailing_address: string;
  Contact_Person: string;
  Phone: string;
  Email: string;
  Availability: string;
  Basin: string;
  County: string;
  Sampling_kits?: boolean;
  kit_count?: number;
  Incubator?: boolean;
  incubator_count?: number;
  Biological_kit?: boolean;
  biokit_count?: number;
  Events_and_meetings?: boolean;
  Site_selection_assist?: boolean;
  Data_entry_assistance?: boolean;
  Interpret_findings?: boolean;
  Coordinate_community?: boolean;
  Host_outreach_materials?: boolean;
}

interface SingleSiteConfig {
  wwkyid_pk: number;
  latitude: number;
  longitude: number;
  stream_name: string;
  wwkybasin: string;
  description: string;
  sample_count?: number;
  has_samples?: boolean;
  popupTemplate?: any;
}

interface MapOptions {
  center?: [number, number];
  zoom?: number;
  showSites?: boolean;
  showHubs?: boolean;
  showSampledSitesOnly?: boolean;
  singleSite?: SingleSiteConfig;
}

// API endpoints for GeoJSON data
const API_SITES = 'https://kyww.uky.edu/api/wwky-data?mode=sites';
const API_SAMPLED_SITES = 'https://kyww.uky.edu/api/wwky-data?mode=flat';

// Add constants for Kentucky's bounds
const KENTUCKY_CENTER = [-85.8, 37.8];
const KENTUCKY_ZOOM = 7;

export function usePublicKYWWMap() {
  // State
  const hubs = ref<Hub[]>([]);
  const sampledSites = ref<Site[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const mapView = ref<any>(null);
  
  // Layer visibility controls
  const hubsVisible = ref(true);
  const sampledSitesVisible = ref(true);
  const countiesVisible = ref(true);

  // Search state
  const siteSearchQuery = ref('');
  const searchResults = ref<Site[]>([]);
  const isSearching = ref(false);
  
  // Map references
  let view: any = null;
  let hubsLayer: any = null;
  let sampledSitesLayer: any = null;
  let countiesLayer: any = null;

  // Load ArcGIS modules
  async function loadArcGISModules() {
    const [
      Map, 
      MapView, 
      GraphicsLayer,
      GeoJSONLayer, 
      Graphic, 
      Point, 
      PopupTemplate
    ] = await Promise.all([
      import('@arcgis/core/Map').then(m => m.default),
      import('@arcgis/core/views/MapView').then(m => m.default),
      import('@arcgis/core/layers/GraphicsLayer').then(m => m.default),
      import('@arcgis/core/layers/GeoJSONLayer').then(m => m.default),
      import('@arcgis/core/Graphic').then(m => m.default),
      import('@arcgis/core/geometry/Point').then(m => m.default),
      import('@arcgis/core/PopupTemplate').then(m => m.default),
    ]);

    return { 
      Map, 
      MapView, 
      GraphicsLayer,
      GeoJSONLayer, 
      Graphic, 
      Point, 
      PopupTemplate
    };
  }

  // Fetch data using the GeoJSON API endpoints
  async function fetchData() {
    try {
      loading.value = true;
      
      // Fetch sampled sites and hubs
      const [sampledSitesResponse, hubsData] = await Promise.all([
        fetch(API_SAMPLED_SITES).then(res => res.json()),
        useDirectus(readItems('wwky_hubs', {
          sort: ['Description'],
          fields: ['*'],
          limit: -1
        }))
      ]);
         
      // Process sampled sites directly
      const processedSampledSites: Site[] = [];
      const siteMap = new Map<number, Site>();
      
      // Check if features array exists and has items
      if (!sampledSitesResponse.features || sampledSitesResponse.features.length === 0) {
        console.warn('No sampled sites found in API response');
      } else {
        sampledSitesResponse.features.forEach(feature => {
          const siteId = feature.properties.siteId;
          
          // If we haven't seen this site yet, create a new site object
          if (!siteMap.has(siteId)) {
            const site: Site = {
              wwkyid_pk: siteId,
              stream_name: feature.properties.siteName || '',
              wwkybasin: feature.properties.basin?.trim() || '',
              description: feature.properties.description || '',
              longitude: feature.geometry.coordinates[0],
              latitude: feature.geometry.coordinates[1],
              sample_count: 1,
              has_samples: true,
              latest_sample_date: feature.properties.sampleDate,
              ecoli_count: feature.properties.eColiAvg ? 1 : 0
            };
            
            siteMap.set(siteId, site);
            processedSampledSites.push(site);
          } else {
            // Update existing site information
            const existingSite = siteMap.get(siteId)!;
            existingSite.sample_count!++;
            
            // Update latest sample date if this sample is newer
            if (feature.properties.sampleDate) {
              const currentDate = existingSite.latest_sample_date 
                ? new Date(existingSite.latest_sample_date) 
                : new Date(0);
              const newDate = new Date(feature.properties.sampleDate);
              
              if (newDate > currentDate) {
                existingSite.latest_sample_date = feature.properties.sampleDate;
              }
            }
            
            // Count E. coli samples
            if (feature.properties.eColiAvg != null) {
              existingSite.ecoli_count!++;
            }
          }
        });
      }
      
      // Store processed data
      sampledSites.value = processedSampledSites;
      
      // Store hub data
      hubs.value = hubsData;
      
    } catch (err) {
      console.error('Error fetching map data:', err);
      error.value = 'Failed to load map data';
    } finally {
      loading.value = false;
    }
  }
  
  // Toggle layer visibility
  function toggleLayerVisibility(layerType: 'hubs' | 'sampledSites' | 'counties') {
    switch (layerType) {
      case 'hubs':
        hubsVisible.value = !hubsVisible.value;
        if (hubsLayer) hubsLayer.visible = hubsVisible.value;
        break;
      case 'sampledSites':
        sampledSitesVisible.value = !sampledSitesVisible.value;
        if (sampledSitesLayer) {
          sampledSitesLayer.visible = sampledSitesVisible.value;
        } else {
          console.warn('Sampled sites layer is null when trying to toggle visibility');
        }
        break;
      case 'counties':
        countiesVisible.value = !countiesVisible.value;
        if (countiesLayer) countiesLayer.visible = countiesVisible.value;
        break;
    }
  }

  // Search for sites by ID
  function searchSiteById(query: string) {
    if (!query) {
      searchResults.value = [];
      isSearching.value = false;
      return;
    }
    
    isSearching.value = true;
    const results = sampledSites.value.filter(site => 
      site.wwkyid_pk.toString().includes(query) ||
      (site.stream_name && site.stream_name.toLowerCase().includes(query.toLowerCase()))
    );
    
    searchResults.value = results.slice(0, 20); // Limit to 20 results
    isSearching.value = false;
  }

  // Initialize map with GeoJSON layers
  async function initializeMap(container: HTMLElement, options: MapOptions = {
    center: KENTUCKY_CENTER,
    zoom: KENTUCKY_ZOOM,
    showSites: false,
    showHubs: true,
    showSampledSitesOnly: true
  }) {
    if (!container) {
      console.error('No container provided for map');
      return;
    }
  
    try {
      const {
        Map,
        MapView,
        GraphicsLayer,
        GeoJSONLayer,
        Graphic,
        Point,
        PopupTemplate
      } = await loadArcGISModules();
      
      const mapInstance = new Map({
        basemap: 'topo-vector'
      });
  
      // Set initial view to Kentucky right away
      const initialCenter = options.singleSite ? 
        [options.singleSite.longitude, options.singleSite.latitude] : 
        KENTUCKY_CENTER;
      
      const initialZoom = options.singleSite ? 14 : KENTUCKY_ZOOM;
  
      const viewInstance = new MapView({
        container,
        map: mapInstance,
        center: initialCenter,
        zoom: initialZoom,
        constraints: {
          rotationEnabled: false,
          minZoom: 6,
          maxZoom: 18,
          geometry: {
            type: "extent",
            xmin: -89.57,
            ymin: 36.49,
            xmax: -81.96,
            ymax: 39.15,
            spatialReference: {
              wkid: 4326
            }
          }
        }
      });
  
      await viewInstance.when();
      view = viewInstance;
      mapView.value = viewInstance;
  
      // Create GeoJSON layer for sampled sites - ALWAYS create this layer
      // Modified to ensure this runs by removing the condition
      const sampledSitesRenderer = {
        type: "simple",
        symbol: {
          type: "simple-marker",
          //color: [30, 144, 255, 0.8], // Dodger Blue for sampled sites
          color: [255, 165, 0, 0.7], // Orange for sampled sites
          size: 14, 
          outline: {
            //color: [255, 255, 255], //white outline
            color: [50, 50, 50], // Black outline
            width: 1.5
          }
        }
      };
  
      const sampledSitesLabels = {
        labelingInfo: [{
          labelExpressionInfo: {
            expression: "$feature.siteId"
          },
          symbol: {
            type: "text",
            color: "black",
            haloColor: "white",
            haloSize: 1,
            font: {
              size: 9,
              family: "sans-serif",
              weight: "normal"
            }
          },
          labelPlacement: "above-center",
          minScale: 300000,
          maxScale: 0
        }]
      };
      
      const sampledSitesPopupTemplate = {
        title: "Sampled Site: {siteId}",
        content: [
          {
            type: "fields",
            fieldInfos: [
              { fieldName: "siteName", label: "Stream Name" },
              { fieldName: "basin", label: "Basin" },
              { fieldName: "description", label: "Description" },
              { fieldName: "sampleDate", label: "Sample Date", format: { dateFormat: 'short-date' } },
              { fieldName: "waterTemperature", label: "Water Temperature (°C)" },
              { fieldName: "pH", label: "pH" },
              { fieldName: "dissolvedOxygen", label: "Dissolved Oxygen (mg/L)" },
              { fieldName: "conductivity", label: "Conductivity (μS/cm)" },
              { fieldName: "eColiAvg", label: "E. coli (CFU/100mL)" }
            ]
          },
          {
            type: "custom",
            creator: function(event) {
              const div = document.createElement("div");
              div.className = "mt-4";
              
              const button = document.createElement("button");
              button.className = "esri-button esri-button--secondary";
              button.textContent = "View Site Samples";
              button.style.cursor = "pointer";
              
              button.onclick = function() {
                const siteId = event.graphic.attributes.siteId;
                if (siteId) {
                  window.open(`/sites/${siteId}`, '_blank');
                }
              };
              
              div.appendChild(button);
              return div;
            }
          }
        ]
      };
  
      sampledSitesLayer = new GeoJSONLayer({
        url: API_SAMPLED_SITES,
        copyright: "Kentucky Water Watch",
        title: "Sampled Sites",
        outFields: ["*"],
        renderer: sampledSitesRenderer as any,
        popupTemplate: sampledSitesPopupTemplate as any,
        labelingInfo: sampledSitesLabels.labelingInfo
      });
      
      // Explicitly set to visible and log status
      sampledSitesLayer.visible = true;
      sampledSitesVisible.value = true;
      
      // Create graphics layer for hubs
      hubsLayer = new GraphicsLayer({ 
        id: 'hubsLayer',
        title: "Support Hubs",
        visible: hubsVisible.value,
        listMode: "hide"
      });
      
      // Add hubs from Directus if enabled
      if (options.showHubs) {
        hubs.value.forEach(hub => {
          if (hub.longitude && hub.latitude) {
            const point = new Point({
              longitude: hub.longitude,
              latitude: hub.latitude
            });
  
            const markerSymbol = {
              type: "simple-marker",
              size: 12,
              color: [46, 204, 113, 0.7], // Green for hubs
              outline: {
                color: [0, 0, 0],
                width: 1
              }
            };
  
            const popupTemplate = new PopupTemplate({
              title: `Hub: ${hub.Description}`,
              content: createHubPopupContent(hub)
            });
  
            const pointGraphic = new Graphic({
              geometry: point,
              symbol: markerSymbol,
              popupTemplate: popupTemplate,
              attributes: hub
            });
  
            hubsLayer.add(pointGraphic);
          }
        });
      }
      
      // Create counties layer with styling
      const countiesRenderer = {
        type: "simple",
        symbol: {
          type: "simple-fill",
          color: [0, 0, 0, 0], // Transparent fill
          outline: {
            color: [128, 128, 128, 0.5], // Light gray, semi-transparent
            width: 1
          }
        }
      };
      
      // Create a label class for county names
      const countiesLabelClass = {
        labelExpressionInfo: {
          expression: "$feature.Name"
        },
        symbol: {
          type: "text",
          color: [100, 100, 100, 0.8],
          haloColor: [255, 255, 255, 0.7],
          haloSize: 1,
          font: {
            size: 9,
            family: "sans-serif",
            weight: "normal",
            style: "italic"
          }
        },
        labelPlacement: "always-horizontal",
        minScale: 2000000,
        maxScale: 0
      };
      
      // Create the counties layer
      countiesLayer = new GeoJSONLayer({
        url: "/data/ky_counties.geojson", // Your static counties GeoJSON file
        renderer: countiesRenderer as any,
        opacity: 0.8,
        title: "Kentucky Counties",
        labelingInfo: [countiesLabelClass] as any,
        legendEnabled: false
      });
      
      // Add counties visibility state
      countiesLayer.visible = countiesVisible.value;
      
      // Add all layers to the map in the correct order (counties should be at the bottom)
      const layersToAdd = [];
      layersToAdd.push(countiesLayer);
      if (hubsLayer) layersToAdd.push(hubsLayer);
      
      // Add sampled sites layer last so it appears on top
      if (sampledSitesLayer) {
        layersToAdd.push(sampledSitesLayer);
      } else {
        console.warn('Sampled sites layer not created');
      }
      
      mapInstance.addMany(layersToAdd);
      
      // Handle single site view
      if (options.singleSite) {
        const site = options.singleSite;
        const point = new Point({
          longitude: site.longitude,
          latitude: site.latitude,
          spatialReference: viewInstance.spatialReference
        });
  
        const markerSymbol = {
          type: "simple-marker",
          color: [0, 119, 255, 0.7],
          size: 14, // Even larger for the focused site
          outline: {
            color: [255, 255, 255],
            width: 2
          }
        };
  
        const singleSitePopupTemplate = new PopupTemplate({
          title: `Site: ${site.wwkyid_pk}`,
          content: function () {
            // Create a container div
            const container = document.createElement("div");
            container.className = "bg-gray-50 p-4 rounded";
        
            // Create a description list (dl)
            const dl = document.createElement("dl");
            dl.className = "space-y-2";
        
            // Helper function to create a dt/dd pair
            function addDetail(term, detail) {
              const div = document.createElement("div");
        
              const dt = document.createElement("dt");
              dt.className = "font-medium";
              dt.textContent = term;
              div.appendChild(dt);
        
              const dd = document.createElement("dd");
              dd.textContent = detail || "No description available";
              div.appendChild(dd);
        
              dl.appendChild(div);
            }
        
            addDetail("Site ID:", site.wwkyid_pk);
            addDetail("Stream Name:", site.stream_name || "Unnamed");
            addDetail("Basin:", site.wwkybasin);
            addDetail("Description:", site.description || "No description available");
            if (site.sample_count) {
              addDetail("Sample Count:", site.sample_count);
            }
            if (site.latest_sample_date) {
              addDetail("Latest Sample:", new Date(site.latest_sample_date).toLocaleDateString());
            }
        
            container.appendChild(dl);
        
            // Only add view button if site has samples
            if (site.has_samples || site.sample_count > 0) {
              // Create a div to hold the button
              const buttonContainer = document.createElement("div");
              buttonContainer.className = "mt-4";
  
              // Create the button element
              const button = document.createElement("button");
              button.className = "esri-button esri-button--secondary";
              button.textContent = "View Site Samples";
              button.style.cursor = "pointer";
              
              button.onclick = function() {
                window.open(`/sites/${site.wwkyid_pk}`, '_blank');
              };
  
              buttonContainer.appendChild(button);
              container.appendChild(buttonContainer);
            }
  
            return container;
          }
        });
  
        const sitegraphic = new Graphic({
          geometry: point,
          symbol: markerSymbol,
          popupTemplate: site.popupTemplate || singleSitePopupTemplate,
          attributes: site
        });
  
        // Add sampledSites layer if viewing a site with samples
        if (site.has_samples) {
          if (sampledSitesLayer) {
            sampledSitesLayer.visible = true;
            sampledSitesVisible.value = true;
          }
        }
  
        // Add a dedicated graphics layer for the highlighted site
        const highlightLayer = new GraphicsLayer({
          id: 'highlightLayer'
        });
        highlightLayer.add(sitegraphic);
        mapInstance.add(highlightLayer);
  
        // Center and zoom to the site
        await viewInstance.goTo({
          target: point,
          zoom: options.zoom || 14
        });
      } else {
        // Force initial view to Kentucky if not showing a single site
        await viewInstance.goTo({
          center: KENTUCKY_CENTER,
          zoom: KENTUCKY_ZOOM
        });
      }
  
      // Add event listener to check if sampledSitesLayer loads properly
      if (sampledSitesLayer) {
        sampledSitesLayer.when(() => {
          console.log('Sampled sites layer loaded successfully');
          //console.log('Features count:', sampledSitesLayer.queryFeatureCount());
        }, (error) => {
          console.error('Error loading sampled sites layer:', error);
        });
      }
  
      return viewInstance;
    } catch (err) {
      console.error('Error initializing map:', err);
      error.value = 'Failed to initialize map';
    }
  }
  
  // Helper function to create hub popup content
  function createHubPopupContent(hub: Hub) {
    return `
      <div class="bg-gray-50 p-4 rounded">
        <dl class="space-y-2">
          <div>
            <dt class="font-medium">Organization:</dt>
            <dd>${hub.organization || 'Organization not specified'}</dd>
          </div>
          <div>
            <dt class="font-medium">Address:</dt>
            <dd>${hub.Full_Address || 'Address not available'}</dd>
          </div>
          <div>
            <dt class="font-medium">Contact:</dt>
            <dd>${hub.Contact_Person || 'Contact not specified'}</dd>
          </div>
          <div>
            <dt class="font-medium">Phone:</dt>
            <dd>${hub.Phone || 'Phone number not available'}</dd>
          </div>
          <div>
            <dt class="font-medium">Email:</dt>
            <dd>${hub.Email || 'Email not available'}</dd>
          </div>
          <div>
            <dt class="font-medium">Basin(s):</dt>
            <dd>${hub.Basin || 'Basin not specified'}</dd>
          </div>
        </dl>
      </div>
    `;
  }
  
  // Zoom function
  function zoomTo(coordinates: [number, number], zoom = 12) {
    if (!view) return;
    
    // Ensure coordinates are within Kentucky bounds
    const [longitude, latitude] = coordinates;
    if (longitude < -89.57 || longitude > -81.96 || 
        latitude < 36.49 || latitude > 39.15) {
      console.warn('Coordinates outside Kentucky bounds, defaulting to center');
      coordinates = KENTUCKY_CENTER;
    }
    
    view.goTo({
      center: coordinates,
      zoom: zoom
    });
  }

  // Cleanup
  onUnmounted(() => {
    if (view) {
      view.destroy();
      view = null;
    }
  });

  return {
    hubs,
    sampledSites,
    loading,
    error,
    mapView,
    hubsVisible,
    sampledSitesVisible,
    countiesVisible,
    siteSearchQuery,
    searchResults,
    isSearching,
    fetchData,
    initializeMap,
    zoomTo,
    toggleLayerVisibility,
    searchSiteById,
    KENTUCKY_CENTER,
    KENTUCKY_ZOOM
  };
}