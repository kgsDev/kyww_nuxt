// Basic type definitions
interface Site {
    wwkyid_pk: number;
    latitude: number;
    longitude: number;
    stream_name: string;
    wwkybasin: string;
    description: string;
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
    Incubator?: boolean;
    Biological_kit?: boolean;
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
    popupTemplate?: any;
  }
  
  interface MapOptions {
    center?: [number, number];
    zoom?: number;
    showSites?: boolean;
    showHubs?: boolean;
    singleSite?: SingleSiteConfig;
  }
  
// Add constants for Kentucky's bounds
const KENTUCKY_CENTER = [-85.8, 37.8];
const KENTUCKY_ZOOM = 7;

  export function useKYWWMap() {
    // State
    const hubs = ref<Hub[]>([]);
    const sites = ref<Site[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
    const mapView = ref<any>(null);
    let view: any = null;
    let graphicsLayer: any = null;
  
    // Load ArcGIS modules
    async function loadArcGISModules() {
      const [Map, MapView, GraphicsLayer, Graphic, Point, PopupTemplate] = await Promise.all([
        import('@arcgis/core/Map').then(m => m.default),
        import('@arcgis/core/views/MapView').then(m => m.default),
        import('@arcgis/core/layers/GraphicsLayer').then(m => m.default),
        import('@arcgis/core/Graphic').then(m => m.default),
        import('@arcgis/core/geometry/Point').then(m => m.default),
        import('@arcgis/core/PopupTemplate').then(m => m.default)
      ]);
  
      return { Map, MapView, GraphicsLayer, Graphic, Point, PopupTemplate };
    }
  
    // Fetch data
    async function fetchData() {
      try {
        loading.value = true;
        const [hubsData, sitesData] = await Promise.all([
          useDirectus(readItems('wwky_hubs', {
            sort: ['Description'],
            fields: ['*']
          })),
          useDirectus(readItems('wwky_sites', {
            fields: ['wwkyid_pk', 'latitude', 'longitude', 'stream_name', 'wwkybasin', 'description'],
            limit: 8000
          }))
        ]);
  
        hubs.value = hubsData;
        sites.value = sitesData;
      } catch (err) {
        console.error('Error fetching map data:', err);
        error.value = 'Failed to load map data';
      } finally {
        loading.value = false;
      }
    }
  
  // Add refs for layer visibility control
  const userSitesVisible = ref(false);
  let userSitesLayer: any = null;  // Store reference to user sites layer

  // Update initialize map to use correct Kentucky coordinates
  async function initializeMap(container: HTMLElement, options: MapOptions = {
    center: KENTUCKY_CENTER,
    zoom: KENTUCKY_ZOOM,
    showSites: true,
    showHubs: true
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
        center: initialCenter,  // Use calculated initial center
        zoom: initialZoom,      // Use calculated initial zoom
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
  
      // Create separate layers for better control
      graphicsLayer = new GraphicsLayer({ id: 'mainLayer' });
      userSitesLayer = new GraphicsLayer({ 
        id: 'userSites',
        visible: userSitesVisible.value 
      });
  
      mapInstance.addMany([graphicsLayer, userSitesLayer]);
  
    // Add sites if enabled
    if (options.showSites) {
        sites.value.forEach(site => {
        if (site.longitude && site.latitude) {
            const point = new Point({
            longitude: site.longitude,
            latitude: site.latitude
            });

            const markerSymbol = {
            type: "simple-marker",
            color: [255, 165, 0, 0.7],
            outline: {
                color: [0, 0, 0],
                width: 1
            }
            };

            const popupTemplate = new PopupTemplate({
              title: `Site: ${site.wwkyid_pk}`,
              content: `
                <div class="bg-gray-50 p-4 rounded">
                  <dl class="space-y-2">
                    <div>
                      <dt class="font-medium">Stream Name:</dt>
                      <dd>${site.stream_name || 'Unnamed'}</dd>
                    </div>
                    <div>
                      <dt class="font-medium">Basin:</dt>
                      <dd>${site.wwkybasin}</dd>
                    </div>
                    <div>
                      <dt class="font-medium">Description:</dt>
                      <dd>${site.description || 'No description available'}</dd>
                    </div>
                    </dl>
                 </div>
              `
            });

            const pointGraphic = new Graphic({
            geometry: point,
            symbol: markerSymbol,
            popupTemplate: popupTemplate,
            attributes: site
            });

            graphicsLayer.add(pointGraphic);
        }
        });
    }

    // Add hubs if enabled
    if (options.showHubs) {
        hubs.value.forEach(hub => {
        if (hub.longitude && hub.latitude) {
            const point = new Point({
            longitude: hub.longitude,
            latitude: hub.latitude
            });

            const markerSymbol = {
            type: "simple-marker",
            size: 20,
            color: [46, 204, 113, 0.7],
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

            graphicsLayer.add(pointGraphic);
        }
        });
      }
  
      // Handle single site display
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
          size: 12,
          outline: {
            color: [255, 255, 255],
            width: 2
          }
        };
  
        const sitegraphic = new Graphic({
          geometry: point,
          symbol: markerSymbol,
          popupTemplate: site.popupTemplate,
          attributes: site
        });
  
        graphicsLayer.add(sitegraphic);
  
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
              <dd>${hub.organization}</dd>
            </div>
            <div>
              <dt class="font-medium">Address:</dt>
              <dd>${hub.Full_Address}</dd>
            </div>
            <div>
              <dt class="font-medium">Contact:</dt>
              <dd>${hub.Contact_Person}</dd>
            </div>
            <div>
              <dt class="font-medium">Phone:</dt>
              <dd>${hub.Phone}</dd>
            </div>
            <div>
              <dt class="font-medium">Email:</dt>
              <dd>${hub.Email}</dd>
            </div>
            <div>
              <dt class="font-medium">Basin(s):</dt>
              <dd>${hub.Basin}</dd>
            </div>
          </dl>
        </div>
      `;
    }
  
    async function highlightUserSites(userSites: any[]) {
        if (!view || !userSitesLayer) return;
      
        // Clear existing user sites
        userSitesLayer.removeAll();
      
        const { Graphic, Point, PopupTemplate } = await loadArcGISModules();
      
        userSites.forEach(site => {
          if (site.latitude && site.longitude) {
            const point = new Point({
              longitude: site.longitude,
              latitude: site.latitude
            });
      
            const markerSymbol = {
              type: "simple-marker",
              color: [0, 0, 255, 0.7],
              size: 12,
              outline: {
                color: [255, 255, 255],
                width: 2
              }
            };
      
            const popupTemplate = new PopupTemplate({
              title: `Your Sample Site: ${site.stream_name || 'Unnamed Stream'}`,
              content: `
                <div class="bg-blue-50 p-4 rounded">
                  <dl class="space-y-2">
                    <div>
                      <dt class="font-medium">Site ID:</dt>
                      <dd>${site.wwky_id}</dd>
                    </div>
                    <div>
                      <dt class="font-medium">Basin:</dt>
                      <dd>${site.wwkybasin}</dd>
                    </div>
                    <div>
                      <dt class="font-medium">Times Sampled:</dt>
                      <dd>${site.sampleCount}</dd>
                    </div>
                    <div>
                      <dt class="font-medium">Last Sampled:</dt>
                      <dd>${new Date(site.date).toLocaleDateString()}</dd>
                    </div>
                    <div>
                      <dt class="font-medium">Description:</dt>
                      <dd>${site.description || 'No description available'}</dd>
                    </div>
                  </dl>
                  <button 
                    onclick="window.location.href='/portal/samples/${site.wwky_id}'"
                    class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    View Site Details
                  </button>
                </div>
              `
            });
      
            const graphic = new Graphic({
              geometry: point,
              symbol: markerSymbol,
              popupTemplate: popupTemplate,
              attributes: site
            });
      
            userSitesLayer.add(graphic);
          }
        });
      
        // Make layer visible when sites are added
        userSitesVisible.value = true;
        userSitesLayer.visible = true;
      }
    
      // Add toggle function for user sites
      function toggleUserSites(visible?: boolean) {
        if (!userSitesLayer) return;
        
        if (visible !== undefined) {
          userSitesVisible.value = visible;
        } else {
          userSitesVisible.value = !userSitesVisible.value;
        }
        
        userSitesLayer.visible = userSitesVisible.value;
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
        sites,
        loading,
        error,
        mapView,
        userSitesVisible,  // Export the visibility state
        fetchData,
        initializeMap,
        highlightUserSites,
        toggleUserSites,   // Export the toggle function
        zoomTo,
        KENTUCKY_CENTER,
        KENTUCKY_ZOOM
      };
  }