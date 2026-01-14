// Updated useKYWWMap composable for Kentucky Water Watch map functionality useKYWWMap.ts
interface Site {
  wwkyid_pk: number;
  latitude: number;
  longitude: number;
  stream_name: string;
  wwkybasin: string;
  description: string;
  sample_count?: number;
  biological_count?: number;
  habitat_count?: number;
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
  popupTemplate?: any;
}

interface MapOptions {
  center?: [number, number];
  zoom?: number;
  showSites?: boolean;
  showHubs?: boolean;
  showBiological?: boolean;
  showHabitat?: boolean;
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
  const biologicalSites = ref<any[]>([]);
  const habitatSites = ref<any[]>([]);
  const userSites = ref<any[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const mapView = ref<any>(null);

  // Layer visibility controls
  const hubsVisible = ref(true);
  const sitesVisible = ref(true);
  const biologicalVisible = ref(true);
  const habitatVisible = ref(true);
  const userSitesVisible = ref(false);
  
  // Search state
  const siteSearchQuery = ref('');
  const searchResults = ref<Site[]>([]);
  const isSearching = ref(false);

  //Map references
  let view: any = null;
  let hubsLayer: any = null;
  let sitesLayer: any = null;
  let biologicalLayer: any = null;
  let habitatLayer: any = null;
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

      // Fetch all data types
      const [sitesData, hubsData, biologicalData, habitatData] = await Promise.all([
        fetch(API_SAMPLED_SITES).then(res => res.json()),
        useDirectus(readItems('wwky_hubs', {
          sort: ['Description'],
          fields: ['*'],
          limit: -1
        })),
        useDirectus(readItems('biological_samples', {
          fields: [
            'id', 'wwky_id', 'date', 'biological_water_quality_score',
            'volunteer_id.first_name', 'volunteer_id.last_name'
          ],
          sort: ['-date'],
          limit: -1
        })),
        useDirectus(readItems('habitat_samples', {
          fields: [
            'id', 'wwky_id', 'date', 'physical_assessment_score',
            'volunteer_id.first_name', 'volunteer_id.last_name'
          ],
          sort: ['-date'],
          limit: -1
        }))
      ]);

      // Process sampled sites (stream samples)
      const processedSampledSites: Site[] = [];
      const siteMap = new Map<number, Site>();
      
      if (!sitesData.features || sitesData.features.length === 0) {
        console.warn('No sampled sites found in API response');
      } else {
        sitesData.features.forEach(feature => {
          const siteId = feature.properties.siteId;
          
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
            const existingSite = siteMap.get(siteId)!;
            existingSite.sample_count!++;
            
            if (feature.properties.sampleDate) {
              const currentDate = existingSite.latest_sample_date 
                ? new Date(existingSite.latest_sample_date) 
                : new Date(0);
              const newDate = new Date(feature.properties.sampleDate);
              
              if (newDate > currentDate) {
                existingSite.latest_sample_date = feature.properties.sampleDate;
              }
            }
            
            if (feature.properties.eColiAvg != null) {
              existingSite.ecoli_count!++;
            }
          }
        });
      }

      // Process biological sites
      const biologicalSiteMap = new Map();
      biologicalData.forEach(sample => {
        if (!biologicalSiteMap.has(sample.wwky_id)) {
          biologicalSiteMap.set(sample.wwky_id, {
            wwky_id: sample.wwky_id,
            samples: []
          });
        }
        biologicalSiteMap.get(sample.wwky_id).samples.push(sample);
      });

      // Process habitat sites
      const habitatSiteMap = new Map();
      habitatData.forEach(sample => {
        if (!habitatSiteMap.has(sample.wwky_id)) {
          habitatSiteMap.set(sample.wwky_id, {
            wwky_id: sample.wwky_id,
            samples: []
          });
        }
        habitatSiteMap.get(sample.wwky_id).samples.push(sample);
      });

      // Get site details for biological and habitat sites
      const allSampleSiteIds = new Set([
        ...Array.from(biologicalSiteMap.keys()),
        ...Array.from(habitatSiteMap.keys())
      ]);

      if (allSampleSiteIds.size > 0) {
        const siteDetails = await useDirectus(readItems('wwky_sites', {
          filter: {
            wwkyid_pk: { _in: Array.from(allSampleSiteIds) }
          },
          fields: ['wwkyid_pk', 'stream_name', 'wwkybasin', 'description', 'latitude', 'longitude'],
          limit: -1
        }));

        // Process biological sites with location data
        biologicalSites.value = siteDetails.filter(site => 
          biologicalSiteMap.has(site.wwkyid_pk)
        ).map(site => ({
          ...site,
          samples: biologicalSiteMap.get(site.wwkyid_pk).samples,
          latitude: parseFloat(site.latitude),
          longitude: parseFloat(site.longitude)
        }));

        // Process habitat sites with location data
        habitatSites.value = siteDetails.filter(site => 
          habitatSiteMap.has(site.wwkyid_pk)
        ).map(site => ({
          ...site,
          samples: habitatSiteMap.get(site.wwkyid_pk).samples,
          latitude: parseFloat(site.latitude),
          longitude: parseFloat(site.longitude)
        }));
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
  function toggleLayerVisibility(layerType: 'hubs' | 'sites' | 'biological' | 'habitat' | 'userSites') {
    switch (layerType) {
      case 'hubs':
        hubsVisible.value = !hubsVisible.value;
        if (hubsLayer) hubsLayer.visible = hubsVisible.value;
        break;
      case 'sites':
        sitesVisible.value = !sitesVisible.value;
        if (sitesLayer) sitesLayer.visible = sitesVisible.value;
        break;
      case 'biological':
        biologicalVisible.value = !biologicalVisible.value;
        if (biologicalLayer) biologicalLayer.visible = biologicalVisible.value;
        break;
      case 'habitat':
        habitatVisible.value = !habitatVisible.value;
        if (habitatLayer) habitatLayer.visible = habitatVisible.value;
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
    
    searchResults.value = results.slice(0, 20);
    isSearching.value = false;
  }

  // Initialize map with all sample types
  async function initializeMap(container: HTMLElement, options: MapOptions = {
    center: KENTUCKY_CENTER,
    zoom: KENTUCKY_ZOOM,
    showSites: true,
    showHubs: true,
    showBiological: true,
    showHabitat: true
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
  
      // Add graphics layers
      graphicsLayer = new GraphicsLayer({ id: 'mainLayer' });
      sitesLayer = new GraphicsLayer({ 
        id: 'sites',
        visible: sitesVisible.value 
      });
      biologicalLayer = new GraphicsLayer({
        id: 'biological',
        visible: biologicalVisible.value
      });
      habitatLayer = new GraphicsLayer({
        id: 'habitat', 
        visible: habitatVisible.value
      });
      hubsLayer = new GraphicsLayer({
        id: 'hubs',
        visible: hubsVisible.value
      });
      userSitesLayer = new GraphicsLayer({ 
        id: 'userSites',
        visible: userSitesVisible.value 
      });
      
      // Add stream sample sites
      if (options.showSites !== false) {
        sites.value.forEach(site => {
          if (site.longitude && site.latitude) {
            const point = new Point({
              longitude: site.longitude,
              latitude: site.latitude
            });

            const markerSymbol = {
              type: "simple-marker",
              color: [168,50,113, 0.7], // Purple - stream samples
              size: 10,
              outline: {
                color: [0, 0, 0],
                width: 1
              }
            };
            
            const popupTemplate = new PopupTemplate({
              title: `Stream Samples - Site: ${site.wwkyid_pk}`,
              content: function () {
                const container = document.createElement("div");
                container.className = "bg-gray-50 p-4 rounded";
            
                const dl = document.createElement("dl");
                dl.className = "space-y-2";
            
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
                addDetail("Stream Samples:", site.sample_count?.toString() || "0");
            
                container.appendChild(dl);
            
                const buttonContainer = document.createElement("div");
                buttonContainer.className = "mt-4";
                const button = document.createElement("button");
                button.className = "esri-button esri-button--secondary";
                button.style.cursor = "pointer";
                button.textContent = "View Site Details";
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
              attributes: site
            });

            sitesLayer.add(pointGraphic);
          }
        });
      }

      // Add biological sample sites
      if (options.showBiological !== false) {
        biologicalSites.value.forEach(site => {
          if (site.longitude && site.latitude) {
            const point = new Point({
              longitude: site.longitude,
              latitude: site.latitude
            });

            const markerSymbol = {
              type: "simple-marker",
              color: [34, 139, 34, 0.7], // Forest green - biological
              size: 8,
              outline: {
                color: [0, 0, 0],
                width: 1
              }
            };

            const popupTemplate = new PopupTemplate({
              title: `Biological Assessments - Site: ${site.wwkyid_pk}`,
              content: function () {
                const container = document.createElement("div");
                container.className = "bg-gray-50 p-4 rounded";
            
                const dl = document.createElement("dl");
                dl.className = "space-y-2";
            
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
                addDetail("Biological Assessments:", site.samples?.length?.toString() || "0");
                
                if (site.samples?.length > 0) {
                  const latestSample = site.samples[0];
                  addDetail("Latest Assessment:", new Date(latestSample.date).toLocaleDateString());
                  if (latestSample.biological_water_quality_score) {
                    addDetail("Latest Bio Score:", latestSample.biological_water_quality_score.toString());
                  }
                }
            
                container.appendChild(dl);
            
                const buttonContainer = document.createElement("div");
                buttonContainer.className = "mt-4";
                const button = document.createElement("button");
                button.className = "esri-button esri-button--secondary";
                button.style.cursor = "pointer";
                button.textContent = "View Site Details";
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
              attributes: site
            });

            biologicalLayer.add(pointGraphic);
          }
        });
      }

      // Add habitat sample sites  
      if (options.showHabitat !== false) {
        habitatSites.value.forEach(site => {
          if (site.longitude && site.latitude) {
            const point = new Point({
              longitude: site.longitude,
              latitude: site.latitude
            });

            const markerSymbol = {
              type: "simple-marker",
              color: [255, 140, 0, 0.7], // Dark orange - habitat
              size: 8,
              outline: {
                color: [0, 0, 0],
                width: 1
              }
            };

            const popupTemplate = new PopupTemplate({
              title: `Habitat Assessments - Site: ${site.wwkyid_pk}`,
              content: function () {
                const container = document.createElement("div");
                container.className = "bg-gray-50 p-4 rounded";
            
                const dl = document.createElement("dl");
                dl.className = "space-y-2";
            
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
                addDetail("Habitat Assessments:", site.samples?.length?.toString() || "0");
                
                if (site.samples?.length > 0) {
                  const latestSample = site.samples[0];
                  addDetail("Latest Assessment:", new Date(latestSample.date).toLocaleDateString());
                  if (latestSample.physical_assessment_score) {
                    addDetail("Latest Habitat Score:", latestSample.physical_assessment_score.toString());
                  }
                }
            
                container.appendChild(dl);
            
                const buttonContainer = document.createElement("div");
                buttonContainer.className = "mt-4";
                const button = document.createElement("button");
                button.className = "esri-button esri-button--secondary";
                button.style.cursor = "pointer";
                button.textContent = "View Site Details";
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
              attributes: site
            });

            habitatLayer.add(pointGraphic);
          }
        });
      }

      // Add hubs if enabled
      if (options.showHubs !== false) {
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

        const singleSitePopupTemplate = new PopupTemplate({
          title: `Site: ${site.wwkyid_pk}`,
          content: function () {
            const container = document.createElement("div");
            container.className = "bg-gray-50 p-4 rounded";
        
            const dl = document.createElement("dl");
            dl.className = "space-y-2";
        
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
        
            const buttonContainer = document.createElement("div");
            buttonContainer.className = "mt-4";
            const button = document.createElement("button");
            button.className = "esri-button esri-button--secondary";
            button.style.cursor = "pointer";
            button.textContent = "View Site Details";
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
          popupTemplate: site.popupTemplate || singleSitePopupTemplate,
          attributes: site
        });
  
        graphicsLayer.add(sitegraphic);
  
        await viewInstance.goTo({
          target: point,
          zoom: options.zoom || 14
        });
      } else {
        await viewInstance.goTo({
          center: KENTUCKY_CENTER,
          zoom: KENTUCKY_ZOOM
        });
      }
      
      // Add layers to the map in proper order
      mapInstance.addMany([graphicsLayer, hubsLayer, sitesLayer, biologicalLayer, habitatLayer, userSitesLayer]);

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

    userSitesLayer.removeAll();
  
    const { Graphic, Point, PopupTemplate } = await loadArcGISModules();
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
          title: `Your Site: ${site.stream_name || 'Unnamed Stream'}`,
          content: function () {
            const container = document.createElement("div");
            container.className = "bg-blue-50 p-4 rounded";
        
            const dl = document.createElement("dl");
            dl.className = "space-y-2";
        
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
        
            const buttonContainer = document.createElement("div");
            buttonContainer.className = "mt-4";
            const button = document.createElement("button");
            button.className = "esri-button esri-button--secondary";
            button.style.cursor = "pointer";
            button.textContent = "View Site Details";
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
  
    userSitesVisible.value = true;
    userSitesLayer.visible = true;
    
    if (validSites.length > 0) {
      const xCoords = validSites.map(c => c.longitude);
      const yCoords = validSites.map(c => c.latitude);

      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);

      const xPadding = Math.max((maxX - minX) * 0.05, 0.01);
      const yPadding = Math.max((maxY - minY) * 0.05, 0.01);

      const extent = new Extent({
        xmin: minX - xPadding,
        xmax: maxX + xPadding,
        ymin: minY - yPadding,
        ymax: maxY + yPadding,
        spatialReference: { wkid: 4326 }
      });

      await view.goTo({
        target: extent,
        options: {
          animate: true,
          duration: 1000,
          easing: "ease-out"
        }
      });

      if (validSites.length === 1) {
        await view.goTo({
          target: extent,
          zoom: 13
        });
      }
    } else {
      await view.goTo({
        center: KENTUCKY_CENTER,
        zoom: KENTUCKY_ZOOM
      });
    }
  }

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
    biologicalSites,
    habitatSites,
    userSites,
    loading,
    error,
    mapView,
    userSitesVisible,
    hubsVisible,
    sitesVisible,
    biologicalVisible,
    habitatVisible,
    fetchData,
    initializeMap,
    highlightUserSites,
    toggleUserSites,
    zoomTo,
    toggleLayerVisibility,
    searchSiteById,
    KENTUCKY_CENTER,
    KENTUCKY_ZOOM
  };
}