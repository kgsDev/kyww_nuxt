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

const API_SAMPLED_SITES = 'https://kyww.uky.edu/api/wwky-data?mode=flat';

export function useKYWWMap() {
  // State
  const hubs = ref<Hub[]>([]);
  const sites = ref<Site[]>([]);
  const userSites = ref<any[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const mapView = ref<any>(null);

  // Layer visibility controls
  const hubsVisible = ref(true);
  const sitesVisible = ref(true);
  const userSitesVisible = ref(false);
  
  // Search state
  const siteSearchQuery = ref('');
  const searchResults = ref<Site[]>([]);
  const isSearching = ref(false);

  //Map references
  let view: any = null;
  let hubsLayer: any = null;
  let sitesLayer: any = null;
  let userSitesLayer: any = null;
  let graphicsLayer: any = null;

  // Load ArcGIS modules
  async function loadArcGISModules() {
    const [Map, MapView, GraphicsLayer, Graphic, Point, PopupTemplate] = await Promise.all([
      import('@arcgis/core/Map').then(m => m.default),
      import('@arcgis/core/views/MapView').then(m => m.default),
      import('@arcgis/core/layers/GraphicsLayer').then(m => m.default),
      import('@arcgis/core/Graphic').then(m => m.default),
      import('@arcgis/core/geometry/Point').then(m => m.default),
      import('@arcgis/core/PopupTemplate').then(m => m.default),
    ]);

    return { Map, MapView, GraphicsLayer, Graphic, Point, PopupTemplate };
  }
  
  // Fetch data
  async function fetchData() {
    try {
      loading.value = true;

      // Fetch sampled sites and hubs
      const [sitesData, hubsData] = await Promise.all([
        fetch(API_SAMPLED_SITES).then(res => res.json()),
        useDirectus(readItems('wwky_hubs', {
          sort: ['Description'],
          fields: ['*']
        }))
      ]);

      // Process sampled sites directly
      const processedSampledSites: Site[] = [];
      const siteMap = new Map<number, Site>();
      
      // Check if features array exists and has items
      if (!sitesData.features || sitesData.features.length === 0) {
        console.warn('No sampled sites found in API response');
      } else {
        sitesData.features.forEach(feature => {
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
      sites.value = processedSampledSites;
      hubs.value = hubsData;

    } catch (err) {
      console.error('Error fetching map data:', err);
      error.value = 'Failed to load map data';
    } finally {
      loading.value = false;
    }
  }
  
    // Toggle layer visibility
    function toggleLayerVisibility(layerType: 'hubs' | 'sites' | 'userSites') {
      switch (layerType) {
        case 'hubs':
          hubsVisible.value = !hubsVisible.value;
          if (hubsLayer) hubsLayer.visible = hubsVisible.value;
          break;
        case 'sites':
          sitesVisible.value = !sitesVisible.value;
          if (sitesLayer) sitesLayer.visible = sitesVisible.value;
          break;
        case 'userSites':
          userSitesVisible.value = !userSitesVisible.value;
          if (userSitesLayer) userSitesLayer.visible = userSitesVisible.value;
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
      const results = sites.value.filter(site => 
        site.wwkyid_pk.toString().includes(query) ||
        (site.stream_name && site.stream_name.toLowerCase().includes(query.toLowerCase()))
      );
      
      searchResults.value = results.slice(0, 20); // Limit to 20 results
      isSearching.value = false;
    }

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
        PopupTemplate,
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
  
      // Add graphics layers
      graphicsLayer = new GraphicsLayer({ id: 'mainLayer' });
      sitesLayer = new GraphicsLayer({ 
        id: 'sites',
        visible: sitesVisible.value 
      });
      hubsLayer = new GraphicsLayer({
        id: 'hubs',
        visible: hubsVisible.value
      });
      userSitesLayer = new GraphicsLayer({ 
        id: 'userSites',
        visible: userSitesVisible.value 
      });
      
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
            //color: [255, 165, 0, 0.7], // Orange color - all sites - not used here
            color: [168,50,113, 0.7], //purple - sampled site
            outline: {
                color: [0, 0, 0],
                width: 1
            }
            };
            
            const popupTemplate = new PopupTemplate({
              title: `Site: ${site.wwkyid_pk}`,
              // Instead of an HTML string, use a function to generate a DOM node.
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
            
                addDetail("Stream Name:", site.stream_name || "Unnamed");
                addDetail("Basin:", site.wwkybasin);
                addDetail("Description:", site.description || "No description available");
            
                container.appendChild(dl);
            
                // Create a div to hold the button
                const buttonContainer = document.createElement("div");
                buttonContainer.className = "mt-4";

                // Create the button element
                const button = document.createElement("button");
                button.className = "esri-button esri-button--secondary";
                button.style.cursor = "pointer";
                button.textContent = "View Site Samples";
                
                // Add onclick event to navigate
                button.onclick = function () {
                  navigateTo(`/portal/sites/${site.wwkyid_pk}`);
                };

                buttonContainer.appendChild(button);
                container.appendChild(buttonContainer);

                return container;
              }
            });

          const pointGraphic = new Graphic({
              geometry: point,
              symbol: markerSymbol,
              popupTemplate: popupTemplate,
              attributes: {
                ...site,  // Spread all site attributes
                wwkyid_pk: site.wwkyid_pk  // Ensure this specific attribute is present
              }
            });

            sitesLayer.add(pointGraphic);
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
            size: 16,
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

            hubsLayer.add(pointGraphic);
        }
        });
      }
      
      // Zoom to extent if valid sites are available
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

        const singleSitePopupTemplate = new PopupTemplate({
          title: `Site: ${site.wwkyid_pk}`,
          // Instead of an HTML string, use a function to generate a DOM node.
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
        
            addDetail("Stream Name:", site.stream_name || "Unnamed");
            addDetail("Basin:", site.wwkybasin);
            addDetail("Description:", site.description || "No description available");
        
            container.appendChild(dl);
        
            // Create a div to hold the button
            const buttonContainer = document.createElement("div");
            buttonContainer.className = "mt-4";

            // Create the button element
            const button = document.createElement("button");
            button.className = "esri-button esri-button--secondary";
            button.style.cursor = "pointer";
            button.textContent = "View Site Samples";
            
            // Add onclick event to navigate
            button.onclick = function () {
              navigateTo(`/portal/sites/${site.wwkyid_pk}`);
            };

            buttonContainer.appendChild(button);
            container.appendChild(buttonContainer);

            return container;
          }
        });

        const sitegraphic = new Graphic({
          geometry: point,
          symbol: markerSymbol,
          popupTemplate: site.popupTemplate || singleSitePopupTemplate, // Allow custom template override
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
      // Add layers to the map  
      mapInstance.addMany([graphicsLayer, hubsLayer, sitesLayer, userSitesLayer ]);

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
  
    async function highlightUserSites(userSites: any[]) {
        if (!view || !userSitesLayer) return;

        // Clear existing user sites
        userSitesLayer.removeAll();
      
        const { Graphic, Point, PopupTemplate } = await loadArcGISModules();
      
        //load extent for calculating boundary extents
        const Extent = await import('@arcgis/core/geometry/Extent').then(m => m.default);

        const validSites: Array<{longitude: number, latitude: number}> = [];

        userSites.forEach(site => {
          if (site.latitude && site.longitude) {
            validSites.push({
              longitude: site.longitude,
              latitude: site.latitude
            });

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
              // Instead of an HTML string, use a function to generate a DOM node.
              content: function () {
                // Create a container div
                const container = document.createElement("div");
                container.className = "bg-blue-50 p-4 rounded";
            
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
            
                addDetail("Stream Name:", site.stream_name || "Unnamed");
                addDetail("Basin:", site.wwkybasin);
                addDetail("Description:", site.description || "No description available");
            
                container.appendChild(dl);
            
               // Create a div to hold the button
                const buttonContainer = document.createElement("div");
                buttonContainer.className = "mt-4";

                // Create the button element
                const button = document.createElement("button");
                button.className = "esri-button esri-button--secondary";
                button.style.cursor = "pointer";
                button.textContent = "View Site Samples";
                
                // Add onclick event to navigate
                button.onclick = function () {
                  navigateTo(`/portal/sites/${site.wwkyid_pk}`);
                };

                buttonContainer.appendChild(button);
                container.appendChild(buttonContainer);

                return container;
              }
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
        
        // Calculate and zoom to extent if we have valid sites
        if (validSites.length > 0) {
          const xCoords = validSites.map(c => c.longitude);
          const yCoords = validSites.map(c => c.latitude);

          const minX = Math.min(...xCoords);
          const maxX = Math.max(...xCoords);
          const minY = Math.min(...yCoords);
          const maxY = Math.max(...yCoords);

          // Add padding to the extent (10% of the range)
          const xPadding = Math.max((maxX - minX) * 0.05, 0.01); // Minimum 0.01 degrees
          const yPadding = Math.max((maxY - minY) * 0.05, 0.01); // Minimum 0.01 degrees

          const extent = new Extent({
            xmin: minX - xPadding,
            xmax: maxX + xPadding,
            ymin: minY - yPadding,
            ymax: maxY + yPadding,
            spatialReference: { wkid: 4326 }
          });

          // Add options to the goTo for tighter zoom
          await view.goTo({
            target: extent,
            options: {
              animate: true,
              duration: 1000,
              easing: "ease-out"
            }
          });

          // If it's a single site, zoom in further
          if (validSites.length === 1) {
            await view.goTo({
              target: extent,
              zoom: 13 // Closer zoom for single site
            });
          }
        } else {
          // If no valid sites, zoom to Kentucky
          await view.goTo({
            center: KENTUCKY_CENTER,
            zoom: KENTUCKY_ZOOM
          });
        }
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
        userSites,
        loading,
        error,
        mapView,
        userSitesVisible,  // Export the visibility state
        hubsVisible,
        sitesVisible,
        fetchData,
        initializeMap,
        highlightUserSites,
        toggleUserSites,   // Export the toggle function
        zoomTo,
        toggleLayerVisibility,
        searchSiteById,
        KENTUCKY_CENTER,
        KENTUCKY_ZOOM
      };
  }