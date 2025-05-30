<!-- pages/portal/help/index.vue -->
<script setup lang="ts">
// SEO and meta
useSeoMeta({
  title: 'Help Center - Frequently Asked Questions',
  description: 'Find answers to common questions and get help with our platform.',
  ogTitle: 'Help Center - FAQ',
  ogDescription: 'Find answers to common questions and get help with our platform.',
})

// Import the composable directly
const { getFaqData, searchFaqItems } = useFaq()

// Test data loading
const { data: faqData, pending, error, refresh } = await useLazyAsyncData(
  'faq-data',
  () => getFaqData(),
  {
    default: () => [],
  }
)

const searchQuery = ref('')
const searchResults = ref(null)

// Simple search function
const performSearch = async () => {
  if (searchQuery.value.trim()) {
    try {
      searchResults.value = await searchFaqItems(searchQuery.value.trim())
    } catch (err) {
      console.error('Search error:', err)
      searchResults.value = []
    }
  } else {
    searchResults.value = null
  }
}

// Fix search - need to handle the different data structure for search results
const performSearchFixed = async () => {
  if (searchQuery.value.trim()) {
    try {
      const results = await searchFaqItems(searchQuery.value.trim())
      searchResults.value = results
    } catch (err) {
      console.error('Search error:', err)
      searchResults.value = []
    }
  } else {
    searchResults.value = null
  }
}

// Watch for search changes
watch(searchQuery, () => {
  if (searchQuery.value.trim()) {
    performSearchFixed()
  } else {
    searchResults.value = null
  }
})

// Expandable state for FAQ items
const expandedItems = ref(new Set())

const toggleItem = (itemId) => {
  if (expandedItems.value.has(itemId)) {
    expandedItems.value.delete(itemId)
  } else {
    expandedItems.value.add(itemId)
  }
}

// Print functionality
const printFAQs = () => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank')
  
  if (!printWindow) {
    alert('Please allow pop-ups to print the FAQ')
    return
  }
  
  // Generate HTML content for printing
  let printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Kentucky Watershed Watch - FAQ</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 40px; 
          line-height: 1.6;
          color: #333;
        }
        .header {
          text-align: center;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        .header h1 {
          color: #2563eb;
          margin: 0;
          font-size: 28px;
        }
        .header p {
          margin: 10px 0 0 0;
          color: #666;
        }
        .category {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .category-title {
          background-color: #f3f4f6;
          padding: 15px;
          border-left: 4px solid #2563eb;
          margin-bottom: 20px;
        }
        .category-title h2 {
          margin: 0;
          color: #1f2937;
          font-size: 20px;
        }
        .category-description {
          margin: 5px 0 0 0;
          font-style: italic;
          color: #6b7280;
        }
        .faq-item {
          margin-bottom: 25px;
          padding: 20px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          page-break-inside: avoid;
        }
        .question {
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .answer {
          color: #374151;
          line-height: 1.7;
        }
        .answer p {
          margin-bottom: 12px;
        }
        .answer ol, .answer ul {
          margin: 12px 0;
          padding-left: 20px;
        }
        .answer li {
          margin-bottom: 8px;
        }
        .answer a {
          color: #2563eb;
          text-decoration: underline;
        }
        .tags {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
        }
        .tag {
          display: inline-block;
          background-color: #f3f4f6;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          margin-right: 8px;
          margin-bottom: 4px;
          color: #6b7280;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
          color: #6b7280;
          font-size: 14px;
        }
        @media print {
          body { margin: 20px; }
          .category { page-break-before: auto; }
          .faq-item { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Kentucky Watershed Watch</h1>
        <p>Frequently Asked Questions</p>
        <p>Generated on ${new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
      </div>
  `

  // Add each category and its items
  if (faqData.value && faqData.value.length > 0) {
    faqData.value.forEach(category => {
      printContent += `
        <div class="category">
          <div class="category-title">
            <h2>${category.name}</h2>
            ${category.description ? `<p class="category-description">${category.description}</p>` : ''}
          </div>
      `
      
      if (category.items && category.items.length > 0) {
        category.items.forEach(item => {
          printContent += `
            <div class="faq-item">
              <div class="question">Q: ${item.question}</div>
              <div class="answer">
                <strong>A:</strong> ${item.answer}
              </div>
              ${item.tags && item.tags.length > 0 ? `
                <div class="tags">
                  <strong>Tags:</strong>
                  ${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          `
        })
      } else {
        printContent += '<p><em>No FAQ items in this category.</em></p>'
      }
      
      printContent += '</div>'
    })
  }

  printContent += `
      <div class="footer">
        <p>For more information, visit <strong>www.kywater.org</strong></p>
        <p>Contact: contact@kywater.org</p>
      </div>
    </body>
    </html>
  `

  // Write content to print window
  printWindow.document.write(printContent)
  printWindow.document.close()
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.print()
    printWindow.close()
  }
}

const getCategoryName = (item) => {
  if (typeof item.category === 'object' && item.category) {
    return item.category.name
  }
  return 'FAQ'
}
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <PortalPageHeader
      title="Help Center"
      :breadcrumbs="[
        {
          title: 'Dashboard',
          href: '/portal',
        },
        {
          title: 'Help Center',
        },
      ]"
    >
    </PortalPageHeader>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Hero Section -->
      <div class="text-center mb-12">
        <h1 class="text-3xl font-bold text-gray-900 mb-4">
          FAQ's
        </h1>
        <p class="text-lg text-gray-600 max-w-2xl mx-auto">
          Browse our frequently asked questions or search for specific topics to find the answers you need.
        </p>
      </div>

      <!-- Search Bar with Print Button -->
      <div class="mb-8">
        <div class="flex flex-col sm:flex-row gap-4 items-center">
          <div class="relative flex-1 max-w-2xl">
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
          
          <!-- Print Button -->
          <button
            @click="printFAQs"
            class="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-7a2 2 0 00-2-2H9a2 2 0 00-2 2v7a2 2 0 002 2z"></path>
            </svg>
            Print FAQ
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="pending" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p class="mt-2 text-gray-600">Loading FAQ...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-50 border border-red-200 rounded-lg p-6 text-center mb-8">
        <h3 class="text-lg font-medium text-red-800 mb-2">Error Loading FAQ</h3>
        <p class="text-red-600 mb-4">{{ error }}</p>
        <button @click="refresh()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
          Try Again
        </button>
      </div>

      <!-- Search Results -->
      <div v-else-if="searchQuery && searchResults" class="space-y-4 mb-8">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900">
            Search Results ({{ searchResults.length }})
          </h3>
          <button
            @click="searchQuery = ''"
            class="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Clear Search
          </button>
        </div>
        
        <div v-if="searchResults.length === 0" class="text-center py-8 text-gray-500">
          No results found for "{{ searchQuery }}"
        </div>
        
        <!-- Search Results Items -->
        <div v-else class="space-y-3">
          <div
            v-for="item in searchResults"
            :key="`search-${item.id}`"
            class="bg-white border border-gray-200 rounded-lg overflow-hidden"
          >
            <button
              @click="toggleItem(`search-${item.id}`)"
              class="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
            >
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-medium text-gray-900 pr-4">
                  {{ item.question }}
                </h3>
                <div class="flex items-center space-x-2">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {{ getCategoryName(item) }}
                  </span>
                  <svg
                    class="h-5 w-5 text-gray-500 transition-transform duration-200"
                    :class="{ 'rotate-180': expandedItems.has(`search-${item.id}`) }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
            </button>

            <div v-if="expandedItems.has(`search-${item.id}`)" class="px-6 pb-6">
              <div class="pt-4 border-t border-gray-100">
                <div class="prose prose-sm max-w-none text-gray-700" v-html="item.answer"></div>
                <div v-if="item.tags && item.tags.length > 0" class="mt-4">
                  <div class="flex flex-wrap gap-2">
                    <span
                      v-for="tag in item.tags"
                      :key="tag"
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                    >
                      {{ tag }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Categories and Items -->
      <div v-else-if="faqData && faqData.length > 0" class="space-y-8">
        <div v-for="category in faqData" :key="category.id" class="faq-category">
          <!-- Category Header -->
          <div class="mb-6">
            <div class="flex items-center space-x-3">
              <div v-if="category.icon" class="flex-shrink-0">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DirectusIcon :name="category.icon" size="w-6 h-6" color="text-blue-600" />
                </div>
              </div>
              <div>
                <h2 class="text-2xl font-semibold text-gray-900">{{ category.name }}</h2>
                <p v-if="category.description" class="text-gray-600 mt-1">
                  {{ category.description }}
                </p>
                <p class="text-sm text-gray-500 mt-1">{{ category.items.length }} questions</p>
              </div>
            </div>
          </div>

          <!-- Category Items -->
          <div v-if="category.items.length === 0" class="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
            No FAQ items in this category yet.
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="item in category.items"
              :key="item.id"
              class="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm"
            >
              <button
                @click="toggleItem(item.id)"
                class="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
              >
                <div class="flex items-center justify-between">
                  <h3 class="text-lg font-medium text-gray-900 pr-4">
                    {{ item.question }}
                  </h3>
                  <svg
                    class="h-5 w-5 text-gray-500 transition-transform duration-200"
                    :class="{ 'rotate-180': expandedItems.has(item.id) }"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </button>

              <div v-if="expandedItems.has(item.id)" class="px-6 pb-6">
                <div class="pt-4 border-t border-gray-100">
                  <div class="prose prose-sm max-w-none text-gray-700" v-html="item.answer"></div>
                  <div v-if="item.tags && item.tags.length > 0" class="mt-4">
                    <div class="flex flex-wrap gap-2">
                      <span
                        v-for="tag in item.tags"
                        :key="tag"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {{ tag }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
      </div>

      <!-- Additional Help Section -->
      <div class="mt-16 bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div class="text-center">
          <div class="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-gray-900 mb-2">
            Still need help?
          </h3>
          <p class="text-gray-600 mb-6">
            For questions or feedback, email <a href="mailto:contact@kywater.org" class="text-blue-600 hover:text-blue-800">contact@kywater.org</a>
          </p>
          <div class="p-1">
            <div class="flex flex-col items-center text-center">
              <div class="p-4">
                <img 
                  src="/assets/KyWW_logo.png" 
                  alt="Kentucky Watershed Watch Logo" 
                  class="w-48 h-auto"
                />
              </div>
              <div class="p-2">
                <h2 class="text-md">
                  Visit
                  <a href="https://www.kywater.org" target="_blank" class="text-blue-600 hover:text-blue-800">www.kywater.org</a>
                  to view data.
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.prose {
  color: inherit;
}

.prose p {
  margin-bottom: 1rem;
}

.prose p:last-child {
  margin-bottom: 0;
}

.prose ul, .prose ol {
  margin: 1rem 0;
  padding-left: 1.5rem;
}

.prose a {
  color: #2563eb;
  text-decoration: underline;
}

.prose a:hover {
  color: #1d4ed8;
}
</style>