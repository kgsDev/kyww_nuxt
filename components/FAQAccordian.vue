
<!-- components/FaqAccordion.vue -->
<template>
  <div class="faq-accordion">
    <!-- Debug Information -->
    <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <h3 class="text-sm font-medium text-yellow-800 mb-2">Debug Info:</h3>
      <div class="text-xs text-yellow-700 space-y-1">
        <p>Pending: {{ pending }}</p>
        <p>Error: {{ error }}</p>
        <p>FAQ Data Length: {{ faqData?.length || 0 }}</p>
        <p>Search Query: "{{ searchQuery }}"</p>
        <p>Search Results: {{ searchResults?.length || 0 }}</p>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-container mb-8">
      <div class="relative">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search FAQ..."
          class="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-2 text-gray-600">Loading FAQ...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <div class="text-red-600 mb-2">
        <svg class="h-8 w-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-red-800 mb-2">Error Loading FAQ</h3>
      <p class="text-red-600 mb-4">{{ error }}</p>
      <button @click="refresh()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
        Try Again
      </button>
    </div>

    <!-- Search Results -->
    <div v-else-if="searchQuery && searchResults" class="space-y-4">
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900">
          Search Results ({{ searchResults.length }})
        </h3>
        <button
          @click="clearSearch"
          class="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          Clear Search
        </button>
      </div>
      
      <div v-if="searchResults.length === 0" class="text-center py-8 text-gray-500">
        No results found for "{{ searchQuery }}"
      </div>
      
      <div v-else class="space-y-3">
        <FaqItem
          v-for="item in searchResults"
          :key="`search-${item.id}`"
          :item="item"
          :is-search-result="true"
        />
      </div>
    </div>

    <!-- Categories and Items -->
    <div v-else-if="faqData && faqData.length > 0" class="space-y-6">
      <div v-for="category in faqData" :key="category.id" class="faq-category">
        <div class="category-header mb-4">
          <div class="flex items-center space-x-3">
            <div v-if="category.icon" class="flex-shrink-0">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span class="text-blue-600 text-sm">{{ category.icon }}</span>
              </div>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-gray-900">{{ category.name }}</h2>
              <p v-if="category.description" class="text-gray-600 text-sm mt-1">
                {{ category.description }}
              </p>
              <p class="text-xs text-gray-500">{{ category.items.length }} items</p>
            </div>
          </div>
        </div>

        <div v-if="category.items.length === 0" class="text-gray-500 text-center py-4">
          No FAQ items in this category yet.
        </div>

        <div v-else class="space-y-3">
          <FaqItem
            v-for="item in category.items"
            :key="item.id"
            :item="item"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <div class="text-gray-400 mb-4">
        <svg class="h-16 w-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      </div>
      <h3 class="text-lg font-medium text-gray-900 mb-2">No FAQ Available</h3>
      <p class="text-gray-600">Check back later for helpful answers to common questions.</p>
      <p class="text-sm text-gray-500 mt-2">Or the FAQ collections might not be set up correctly.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { getFaqData, searchFaqItems } = useFaq()

const searchQuery = ref('')
const searchResults = ref(null)
const searchTimeout = ref(null)

// Fetch FAQ data
const { data: faqData, pending, error, refresh } = await useLazyAsyncData(
  'faq-data',
  () => getFaqData(),
  {
    default: () => [],
  }
)

// Debug: Log the data when it loads
watch(faqData, (newData) => {
  console.log('FAQ Data updated:', newData)
}, { immediate: true })

watch(pending, (newPending) => {
  console.log('Pending state:', newPending)
})

watch(error, (newError) => {
  console.log('Error state:', newError)
})

// Watch search query with debouncing
watch(searchQuery, (newQuery) => {
  if (searchTimeout.value) {
    clearTimeout(searchTimeout.value)
  }
  
  if (newQuery.trim()) {
    searchTimeout.value = setTimeout(async () => {
      try {
        searchResults.value = await searchFaqItems(newQuery.trim())
      } catch (err) {
        console.error('Search error:', err)
        searchResults.value = []
      }
    }, 300)
  } else {
    searchResults.value = null
  }
})

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = null
}
</script>

<style scoped>
.faq-accordion {
  max-width: 4xl;
  margin: 0 auto;
}

.search-container {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  padding: 1rem 0;
}

.category-header {
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}
</style>