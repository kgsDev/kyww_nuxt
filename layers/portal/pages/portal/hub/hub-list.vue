<script setup lang="ts">
const hubs = ref([]);
const sites = ref([]);
const loading = ref(true);
const error = ref(null);
const view = ref<any>(null);
let mapView: any = null;


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

// Fetch hubs data
async function fetchHubs() {
  try {
    const hubsData = await useDirectus(readItems('wwky_hubs', {
      sort: ['Description'],
      fields: ['*']
    }));
    hubs.value = hubsData;
  } catch (err) {
    error.value = 'Failed to load hubs';
    console.error('Error loading hubs:', err);
  } finally {
    loading.value = false;
  }
}

async function fetchSites() {
  try {
    const sitesData = await useDirectus(readItems('wwky_sites', {
      fields: ['wwkyid_pk','latitude', 'longitude', 'stream_name', 'wwkybasin','description'],
      limit: 8000
    }));

    sites.value = sitesData;
  } catch (err) {
    error.value = 'Failed to load sites';
    console.error('Error loading sites:', err);
  } finally {
    loading.value = false;
  }
}


async function initMap() {
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

   const viewInstance = new MapView({
    container: 'map',
    map: mapInstance,
    center: [-84.2700, 37.8393],
    zoom: 7
  });

  mapView = viewInstance; // Store in non-reactive variable
  view.value = viewInstance;

   const graphicsLayer = new GraphicsLayer();
   mapInstance.add(graphicsLayer);

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
      content: [
        {
          type: "text",
          text: `
            <h2>Site: {wwkyid_pk}</h2>
            <div class="bg-gray-50 p-4 rounded">
              <dl class="space-y-2">
                <div>
                  <dt class="font-medium">Stream Name:</dt>
                  <dd>{stream_name}</dd>
                </div>
                <div>
                  <dt class="font-medium">Basin:</dt>
                  <dd>{wwkybasin}</dd>
                </div>
                <div>
                  <dt class="font-medium">Description:</dt>
                  <dd>{description}</dd>
                </div>
                <div>
                  <dt class="font-medium">Comments:</dt>
                  <dd>{comments}</dd>
                </div>
              </dl>
            </div>
          `
        }
      ],
      outlineColor: [0, 0, 0, 0.3]
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
        content: [
          {
            type: "text",
            text: `
              <h2>Hub: {Description}</h2>
              <div class="bg-gray-50 p-4 rounded">
                <dl class="space-y-2">
                  <div>
                    <dt class="font-medium">Hub Name:</dt>
                    <dd>{Description}</dd>
                  </div>
                  <div>
                    <dt class="font-medium">Organization:</dt>
                    <dd>{organization}</dd>
                  </div>
                  <div>
                    <dt class="font-medium">Physical Address:</dt>
                    <dd>{Full_Address}</dd>
                  </div>
                  <div>
                    <dt class="font-medium">Mailing Address:</dt>
                    <dd>{mailing_address}</dd>
                  </div>
                  <div>
                    <dt class="font-medium">Contact Person:</dt>
                    <dd>{Contact_Person}</dd>
                  </div>
                  <div>
                    <dt class="font-medium">Phone:</dt>
                    <dd>{Phone}</dd>
                  </div>
                  <div>
                    <dt class="font-medium">Email:</dt>
                    <dd>{Email}</dd>
                  </div>
                  <div>
                    <dt class="font-medium">Availability:</dt>
                    <dd>{Availability}</dd>
                  </div>
                  <div>
                    <dt class="font-medium">Basin(s):</dt>
                    <dd>{Basin}</dd>
                  </div>
                  <div>
                    <dt class="font-medium">Counties:</dt>
                    <dd>{County}</dd>
                  </div>
                  ${
                    hub.Sampling_kits || hub.Incubator || hub.Biological_kit || 
                    hub.Events_and_meetings || hub.Site_selection_assist || 
                    hub.Data_entry_assistance || hub.Interpret_findings || 
                    hub.Coordinate_community || hub.Host_outreach_materials ? 
                    `<div>
                      <dt class="font-medium">Services Offered:</dt>
                      <dd>
                        <ul class="list-disc list-inside">
                          ${hub.Sampling_kits ? '<li>Host sampling kits for check-out</li>' : ''}
                          ${hub.Incubator ? '<li>Host incubator for E. coli analysis</li>' : ''}
                          ${hub.Biological_kit ? '<li>Host biological sampling kits</li>' : ''}
                          ${hub.Events_and_meetings ? '<li>Host sampler training events and meetings</li>' : ''}
                          ${hub.Site_selection_assist ? '<li>Assist with sampling site selection</li>' : ''}
                          ${hub.Data_entry_assistance ? '<li>Provide assistance with volunteer data entry</li>' : ''}
                          ${hub.Interpret_findings ? '<li>Help interpret water quality findings</li>' : ''}
                          ${hub.Coordinate_community ? '<li>Help coordinate community water projects</li>' : ''}
                          ${hub.Host_outreach_materials ? '<li>Host outreach materials</li>' : ''}
                        </ul>
                      </dd>
                    </div>` : ''
                  }
                </dl>
              </div>
            `
          }
        ],
        outlineColor: [0, 0, 0, 0.3]
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
 } catch (err) {
   console.error('Error initializing map:', err);
   error.value = 'Failed to initialize map';
 }
}

function zoomToHub(hub) {
  if (!mapView || !hub.longitude || !hub.latitude) return;
  
  mapView.goTo({
    center: [hub.longitude, hub.latitude],
    zoom: 12
  });
}

onMounted(async () => {
  await Promise.all([fetchHubs(), fetchSites()]);
  if (hubs.value.length || sites.value.length) {
    await initMap();
  }
});
</script>

<template>
  <div>
    <PortalPageHeader
      title="KYWW Hubs"
      :breadcrumbs="[
        {
          title: 'Portal',
          href: '/portal',
        },
        {
          title: 'Hubs',
          href: '/portal/hub',
        },
      ]"
    >
    </PortalPageHeader>

    <div class="container mx-auto px-4">
      <ULoadingBlock v-if="loading" class="h-64" />

      <UAlert
        v-else-if="error"
        type="error"
        :title="error"
        class="mb-4"
      />

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Map -->
        <div class="bg-white rounded-lg shadow-lg">
          <div id="map" class="w-full h-[600px] rounded-lg"></div>
        </div>

        <!-- Hub List -->
        <div class="bg-white rounded-lg shadow-lg p-6">
          <h2 class="text-xl font-semibold mb-4">Hub Locations</h2>
          <div class="space-y-4">
            <UCard
              v-for="hub in hubs"
              :key="hub.hub_id"
              class="hover:bg-gray-50 cursor-pointer"
              @click="zoomToHub(hub)"
            >
              <div class="space-y-2">
                <h3 class="text-lg font-semibold">{{ hub.Description }}</h3>
                <p class="text-gray-600">{{ hub.organization }}</p>
                <p class="text-gray-600">{{ hub.Full_Address }}</p>
                <div class="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p class="font-medium">Contact</p>
                    <p>{{ hub.Contact_Person }}</p>
                  </div>
                  <div>
                    <p class="font-medium">Phone</p>
                    <p>{{ hub.Phone }}</p>
                  </div>
                  <div class="col-span-2">
                    <p class="font-medium">Email</p>
                    <p>{{ hub.Email }}</p>
                  </div>
                  <div v-if="hub.mailing_address" class="col-span-2">
                    <p class="font-medium">Mailing Address</p>
                    <p>{{ hub.mailing_address }}</p>
                  </div>
                  <div class="col-span-2">
                    <p class="font-medium">Availability</p>
                    <p>{{ hub.Availability }}</p>
                  </div>
                  <div class="col-span-2">
                    <p class="font-medium">Basin(s)</p>
                    <p>{{ hub.Basin }}</p>
                  </div>
                  <div v-if="hub.County" class="col-span-2">
                    <p class="font-medium">Counties</p>
                    <p>{{ hub.County }}</p>
                  </div>
                  <div class="col-span-2">
                    <p class="font-medium">Services</p>
                    <ul class="list-disc list-inside">
                      <li v-if="hub.Sampling_kits">Sampling kits</li>
                      <li v-if="hub.Incubator">E. coli analysis</li>
                      <li v-if="hub.Biological_kit">Biological sampling</li>
                      <li v-if="hub.Events_and_meetings">Sampler training events</li>
                      <li v-if="hub.Site_selection_assist">Sampling site selection</li>
                      <li v-if="hub.Data_entry_assistance">Volunteer data entry</li>
                      <li v-if="hub.Interpret_findings">Interpret water quality</li>
                      <li v-if="hub.Coordinate_community">Community water projects</li>
                      <li v-if="hub.Host_outreach_materials">Outreach materials</li>
                    </ul>
                  </div>
                </div>
              </div>
            </UCard>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import "https://js.arcgis.com/4.28/@arcgis/core/assets/esri/themes/light/main.css";

.container {
  max-width: 1400px;
}

#map {
  padding: 0;
  margin: 0;
  height: 600px;
  width: 100%;
}
</style>