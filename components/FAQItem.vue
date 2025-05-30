<!-- components/FaqItem.vue -->
<template>
  <div class="faq-item bg-white border border-gray-200 rounded-lg overflow-hidden">
    <button
      @click="toggleOpen"
      class="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
      :aria-expanded="isOpen"
    >
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-medium text-gray-900 pr-4">
          {{ item.question }}
        </h3>
        <div class="flex items-center space-x-2">
          <!-- Search result indicator -->
          <span
            v-if="isSearchResult"
            class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
          >
            {{ getCategoryName() }}
          </span>
          <!-- Expand/collapse icon -->
          <svg
            class="h-5 w-5 text-gray-500 transition-transform duration-200"
            :class="{ 'rotate-180': isOpen }"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      </div>
    </button>

    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="max-h-0 opacity-0"
      enter-to-class="max-h-96 opacity-100"
      leave-active-class="transition-all duration-300 ease-in"
      leave-from-class="max-h-96 opacity-100"
      leave-to-class="max-h-0 opacity-0"
    >
      <div v-if="isOpen" class="px-6 pb-6 overflow-hidden">
        <div class="pt-4 border-t border-gray-100">
          <!-- Answer content -->
          <div class="prose prose-sm max-w-none text-gray-700" v-html="item.answer"></div>
          
          <!-- Tags -->
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
    </Transition>
  </div>
</template>

<script setup lang="ts">
interface FaqItemProps {
  item: {
    id: number
    question: string
    answer: string
    tags?: string[]
    category: any
  }
  isSearchResult?: boolean
}

const props = defineProps<FaqItemProps>()

const isOpen = ref(false)

const toggleOpen = () => {
  isOpen.value = !isOpen.value
}

const getCategoryName = () => {
  if (typeof props.item.category === 'object' && props.item.category) {
    return props.item.category.name
  }
  return 'FAQ'
}
</script>

<style scoped>
.faq-item {
  transition: box-shadow 0.2s ease;
}

.faq-item:hover {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

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