<script setup>
const sample = ref(null);
const errorMessage = ref('');

// Assume we're getting the sample ID from the route params
const route = useRoute();
const sampleId = route.params.id;

onMounted(async () => {
  try {
    // Fetch only the necessary fields for the sample
    sample.value = await useDirectus(
      readItems('base_samples', {
        filter: { id: { _eq: sampleId } },
        fields: ['*', 'odor.*', 'water_surface.*', 'bacterial_source.*', 'water_color.*'],
      })
    );

    const photoResponse = await useDirectus(
      readItems('lu_sample_photos', {
        filter: { sample_id: { _eq: sampleId } },
      })
    );
    
    sample.value.photos = photoResponse.data;
  } catch (error) {
    console.error('Error fetching sample data:', error);
    errorMessage.value = 'Failed to load sample data. Please try again later.';
  }
});
</script>

<template>
  <div v-if="sample">
    <h1>Sample Details: {{ sample.id }}</h1>
    <!-- Display your sample data here -->
    <pre>{{ JSON.stringify(sample, null, 2) }}</pre>
  </div>
  <div v-else-if="errorMessage">
    <p>{{ errorMessage }}</p>
  </div>
  <div v-else>
    <p>Loading sample data...</p>
  </div>
</template>