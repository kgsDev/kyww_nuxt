<script setup lang="ts">
definePageMeta({
  layout: 'info'
});

const activeTab = ref('overview');
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 py-6 lg:px-8">
    <!-- Header -->
    <div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-sm p-8 mb-8">
      <h1 class="text-3xl font-bold text-blue-800 mb-3">Water Quality Monitoring API</h1>
      <p class="text-gray-700 max-w-3xl">
        Access Kentucky Water Watch monitoring site data and water quality samples programmatically via our GeoJSON API.
        This API provides multiple query modes for different use cases, from simple site listings to detailed historical data.
      </p>
    </div>

    <!-- Navigation Tabs -->
    <div class="mb-6 border-b border-gray-200">
      <nav class="flex space-x-8">
        <button
          @click="activeTab = 'overview'"
          :class="activeTab === 'overview' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
        >
          Overview
        </button>
        <button
          @click="activeTab = 'modes'"
          :class="activeTab === 'modes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
        >
          Query Modes
        </button>
        <button
          @click="activeTab = 'parameters'"
          :class="activeTab === 'parameters' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
        >
          Data Fields
        </button>
        <button
          @click="activeTab = 'examples'"
          :class="activeTab === 'examples' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          class="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm"
        >
          Examples
        </button>
      </nav>
    </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'">
      <UCard class="mb-6">
        <template #header>
          <h2 class="text-xl font-semibold">API Overview</h2>
        </template>
        
        <div class="space-y-4">
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Base Endpoint</h3>
            <code class="block bg-gray-100 p-3 rounded text-sm">https://kyww.uky.edu/api/wwky-data</code>
          </div>

          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Response Format</h3>
            <p class="text-gray-700 mb-2">All endpoints return data in standard GeoJSON format:</p>
            <pre class="bg-gray-100 p-4 rounded text-sm overflow-x-auto"><code>{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": 12345,
        "name": "Stream Name",
        "basin": "Basin Name"
        // Additional properties vary by mode
      },
      "geometry": {
        "type": "Point",
        "coordinates": [-84.5, 38.0]
      }
    }
  ]
}</code></pre>
          </div>

          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-2">Authentication</h3>
            <p class="text-gray-700">This is a public API and does not require authentication.</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Query Modes Tab -->
    <div v-if="activeTab === 'modes'" class="space-y-6">
      <!-- Sites Mode -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Sites Mode (Default)</h2>
        </template>
        
        <div class="space-y-3">
          <p class="text-gray-700">Returns all monitoring sites with basic information and sample counts.</p>
          
          <div>
            <h4 class="font-medium text-gray-900 mb-1">Parameters</h4>
            <ul class="list-disc list-inside text-gray-700 space-y-1">
              <li><code class="bg-gray-100 px-1">mode=sites</code> (or omit for default)</li>
            </ul>
          </div>

          <div>
            <h4 class="font-medium text-gray-900 mb-1">Example Request</h4>
            <code class="block bg-gray-100 p-3 rounded text-sm">GET https://kyww.uky.edu/api/wwky-data?mode=sites</code>
          </div>

          <div>
            <h4 class="font-medium text-gray-900 mb-1">Use Case</h4>
            <p class="text-gray-700">Display all monitoring locations on a map with sample count indicators.</p>
          </div>
        </div>
      </UCard>

      <!-- Latest Mode -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Latest Samples Mode</h2>
        </template>
        
        <div class="space-y-3">
          <p class="text-gray-700">Returns sites with their most recent water quality sample data. Only includes sites that have at least one sample.</p>
          
          <div>
            <h4 class="font-medium text-gray-900 mb-1">Parameters</h4>
            <ul class="list-disc list-inside text-gray-700 space-y-1">
              <li><code class="bg-gray-100 px-1">mode=latest</code></li>
            </ul>
          </div>

          <div>
            <h4 class="font-medium text-gray-900 mb-1">Response Includes</h4>
            <ul class="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Most recent sample date</li>
              <li>Latest measurements (temperature, pH, dissolved oxygen, conductivity, E. coli, turbidity)</li>
              <li>Reported weather and stream flow conditions</li>
              <li>Statistical summaries (min/max/avg for temperature and E. coli)</li>
            </ul>
          </div>

          <div>
            <h4 class="font-medium text-gray-900 mb-1">Example Request</h4>
            <code class="block bg-gray-100 p-3 rounded text-sm">GET https://kyww.uky.edu/api/wwky-data?mode=latest</code>
          </div>

          <div>
            <h4 class="font-medium text-gray-900 mb-1">Use Case</h4>
            <p class="text-gray-700">Show current water quality conditions across all monitoring sites.</p>
          </div>
        </div>
      </UCard>

      <!-- Nested Mode -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Nested Mode</h2>
        </template>
        
        <div class="space-y-3">
          <p class="text-gray-700">Returns sites with all samples nested within each site feature. Useful for comprehensive data analysis.</p>
          
          <div>
            <h4 class="font-medium text-gray-900 mb-1">Parameters</h4>
            <ul class="list-disc list-inside text-gray-700 space-y-1">
              <li><code class="bg-gray-100 px-1">mode=nested</code></li>
              <li><code class="bg-gray-100 px-1">limit</code> (optional): Maximum number of samples per site</li>
            </ul>
          </div>

          <div>
            <h4 class="font-medium text-gray-900 mb-1">Example Request</h4>
            <code class="block bg-gray-100 p-3 rounded text-sm">GET https://kyww.uky.edu/api/wwky-data?mode=nested&limit=50</code>
          </div>

          <div>
            <h4 class="font-medium text-gray-900 mb-1">Use Case</h4>
            <p class="text-gray-700">Download complete sampling data history for offline analysis or detailed site reports.</p>
          </div>
        </div>
      </UCard>

      <!-- Flat Mode -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Flat Mode</h2>
        </template>
        
        <div class="space-y-3">
          <p class="text-gray-700">Returns individual samples as separate GeoJSON features. Supports filtering by site, date range, and limit.</p>
          
          <div>
            <h4 class="font-medium text-gray-900 mb-1">Parameters</h4>
            <ul class="list-disc list-inside text-gray-700 space-y-1">
              <li><code class="bg-gray-100 px-1">mode=flat</code></li>
              <li><code class="bg-gray-100 px-1">site</code> (optional): Filter by specific site ID</li>
              <li><code class="bg-gray-100 px-1">from</code> (optional): Start date (YYYY-MM-DD format)</li>
              <li><code class="bg-gray-100 px-1">to</code> (optional): End date (YYYY-MM-DD format)</li>
              <li><code class="bg-gray-100 px-1">limit</code> (optional): Maximum number of records (default: 1000)</li>
            </ul>
          </div>

          <div>
            <h4 class="font-medium text-gray-900 mb-1">Example Requests</h4>
            <div class="space-y-2">
              <code class="block bg-gray-100 p-3 rounded text-sm">GET https://kyww.uky.edu/api/wwky-data?mode=flat</code>
              <code class="block bg-gray-100 p-3 rounded text-sm">GET https://kyww.uky.edu/api/wwky-data?mode=flat&site=12345</code>
              <code class="block bg-gray-100 p-3 rounded text-sm">GET https://kyww.uky.edu/api/wwky-data?mode=flat&from=2024-01-01&to=2024-12-31</code>
              <code class="block bg-gray-100 p-3 rounded text-sm">GET https://kyww.uky.edu/api/wwky-data?mode=flat&site=12345&from=2024-06-01&limit=100</code>
            </div>
          </div>

          <div>
            <h4 class="font-medium text-gray-900 mb-1">Use Case</h4>
            <p class="text-gray-700">Time-series analysis, trend visualization, or filtered data exports.</p>
          </div>
        </div>
      </UCard>
    </div>

    <!-- Data Fields Tab -->
    <div v-if="activeTab === 'parameters'">
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Water Quality Data Fields</h2>
        </template>
        
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <tr>
                <td class="px-4 py-3 text-sm font-mono">waterTemperature</td>
                <td class="px-4 py-3 text-sm">Water temperature</td>
                <td class="px-4 py-3 text-sm">°C or °F</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono">pH</td>
                <td class="px-4 py-3 text-sm">pH level</td>
                <td class="px-4 py-3 text-sm">pH units (0-14)</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono">dissolvedOxygen</td>
                <td class="px-4 py-3 text-sm">Dissolved oxygen concentration</td>
                <td class="px-4 py-3 text-sm">mg/L</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono">conductivity</td>
                <td class="px-4 py-3 text-sm">Specific conductance</td>
                <td class="px-4 py-3 text-sm">μS/cm</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono">eColiAvg</td>
                <td class="px-4 py-3 text-sm">Average E. coli count</td>
                <td class="px-4 py-3 text-sm">CFU/100mL</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono">turbidity</td>
                <td class="px-4 py-3 text-sm">Water turbidity</td>
                <td class="px-4 py-3 text-sm">NTU</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono">transparencyTube</td>
                <td class="px-4 py-3 text-sm">Transparency tube measurement</td>
                <td class="px-4 py-3 text-sm">cm</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono">rainfall</td>
                <td class="px-4 py-3 text-sm">Text description of recent rainfall</td>
                <td class="px-4 py-3 text-sm">Text</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono">weather</td>
                <td class="px-4 py-3 text-sm">Reported weather conditions</td>
                <td class="px-4 py-3 text-sm">Text</td>
              </tr>
              <tr>
                <td class="px-4 py-3 text-sm font-mono">streamFlow</td>
                <td class="px-4 py-3 text-sm">Visual assessment of stream flow</td>
                <td class="px-4 py-3 text-sm">Text</td>
              </tr>
            </tbody>
          </table>
        </div>

        <template #footer>
          <div class="text-sm text-gray-600">
            <p><strong>Note:</strong> Not all samples contain all measurements. Fields may be <code>null</code> if data was not collected.</p>
            <p class="mt-2">In <strong>Latest Mode</strong>, temperature and E. coli ranges include <code>min</code>, <code>max</code>, and <code>avg</code> values across all samples for that site.</p>
          </div>
        </template>
      </UCard>
    </div>

    <!-- Examples Tab -->
    <div v-if="activeTab === 'examples'" class="space-y-6">
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">JavaScript/Fetch Example</h2>
        </template>
        
        <pre class="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto"><code>// Fetch all sites
fetch('https://kyww.uky.edu/api/wwky-data?mode=sites')
  .then(response => response.json())
  .then(data => {
    console.log(`Found ${data.features.length} sites`);
    // Process GeoJSON features
    data.features.forEach(site => {
      console.log(site.properties.name, site.properties.sampleCount);
    });
  })
  .catch(error => console.error('Error:', error));

// Fetch latest samples with filtering
fetch('https://kyww.uky.edu/api/wwky-data?mode=flat&site=12345&from=2024-01-01')
  .then(response => response.json())
  .then(data => {
    // Process sample data
    data.features.forEach(sample => {
      console.log(sample.properties.sampleDate, 
                  sample.properties.waterTemperature);
    });
  });</code></pre>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Python Example</h2>
        </template>
        
        <pre class="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto"><code>import requests
import json

# Fetch all sites with samples
response = requests.get('https://kyww.uky.edu/api/wwky-data?mode=latest')
data = response.json()

# Process features
for feature in data['features']:
    props = feature['properties']
    print(f"Site {props['id']}: {props['name']}")
    print(f"  Latest sample: {props['sampleDate']}")
    print(f"  Temperature: {props['waterTemperature']}°")
    print(f"  pH: {props['pH']}")
    print()</code></pre>
      </UCard>

      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold">Leaflet Map Integration</h2>
        </template>
        
        <pre class="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto"><code>// Add GeoJSON layer to Leaflet map
fetch('https://kyww.uky.edu/api/wwky-data?mode=latest')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: function(feature, latlng) {
        return L.circleMarker(latlng, {
          radius: 8,
          fillColor: "#3b82f6",
          color: "#000",
          weight: 1,
          opacity: 1,
          fillOpacity: 0.8
        });
      },
      onEachFeature: function(feature, layer) {
        const props = feature.properties;
        layer.bindPopup(`
          <strong>${props.name}</strong><br>
          Latest Sample: ${props.sampleDate}<br>
          Temperature: ${props.waterTemperature}°<br>
          pH: ${props.pH}
        `);
      }
    }).addTo(map);
  });</code></pre>
      </UCard>
    </div>

    <!-- Best Practices -->
    <UCard class="mt-8">
      <template #header>
        <h2 class="text-xl font-semibold">Best Practices</h2>
      </template>
      
      <ul class="space-y-2 text-gray-700">
        <li><strong>Use the appropriate mode</strong> for your use case to minimize data transfer</li>
        <li><strong>Apply filters</strong> in flat mode when querying large datasets</li>
        <li><strong>Set reasonable limits</strong> to avoid timeouts with nested or flat modes</li>
        <li><strong>Cache responses</strong> when appropriate, especially for sites mode</li>
        <li><strong>Handle null values</strong> - not all samples contain all measurements</li>
        <li><strong>Rate limiting</strong> - Please be considerate with API usage. For bulk data needs, consider caching responses locally</li>
      </ul>
    </UCard>

    <!-- Support -->
    <UCard class="mt-8">
      <template #header>
        <h2 class="text-xl font-semibold">Support</h2>
      </template>
      
      <p class="text-gray-700">
        For questions or issues with this API, please contact the Kentucky Water Watch team or visit 
        <a href="https://www.kywater.org" target="_blank" class="text-blue-600 hover:underline">www.kywater.org</a>.
      </p>
    </UCard>
  </div>
</template>

<style scoped>
code {
  font-family: 'Courier New', Courier, monospace;
}
</style>