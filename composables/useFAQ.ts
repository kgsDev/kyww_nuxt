// composables/useFaq.ts
// Fixed composable for your existing Directus setup

interface FaqCategory {
  id: number
  status: 'published' | 'draft' | 'archived'
  sort: number
  name: string
  description?: string
  icon?: string
  date_created: string
  date_updated: string
}

interface FaqItem {
  id: number
  status: 'published' | 'draft' | 'archived'
  sort: number
  category: number | FaqCategory
  question: string
  answer: string
  tags?: string[]
  date_created: string
  date_updated: string
}

export const useFaq = () => {
  // Get all FAQ categories with their items
  const getFaqData = async () => {
    try {
      
      // First get categories
      const categoriesResponse = await useDirectus(readItems('faq_categories', {
        filter: { status: { _eq: 'published' } },
        sort: ['sort', 'name'],
        limit: -1
      }))
      
     
      // Then get items
      const itemsResponse = await useDirectus(readItems('faq_items', {
        filter: { status: { _eq: 'published' } },
        sort: ['category', 'sort', 'question'],
        fields: ['*', 'category.name', 'category.icon'],
        limit: -1,
      }))
      
     
      // Group items by category
      const categoriesWithItems = categoriesResponse.map(category => ({
        ...category,
        items: itemsResponse.filter(item => {
          // Handle both object and ID references for category
          if (typeof item.category === 'object' && item.category) {
            // If category is an object, match by name (since that's what we're getting)
            return item.category.name === category.name
          } else {
            // If category is just an ID, match by ID
            return item.category === category.id
          }
        }),
      }))
      
      console.log('Final FAQ data:', categoriesWithItems)
      return categoriesWithItems
      
    } catch (error) {
      console.error('Error fetching FAQ data:', error)
      throw error
    }
  }
  
  // Search FAQ items
  const searchFaqItems = async (query: string) => {
    try {
      console.log('Searching FAQ for:', query)
      
      const searchResponse = await useDirectus(readItems('faq_items', {
        filter: {
          _and: [
            { status: { _eq: 'published' } },
            {
              _or: [
                { question: { _icontains: query } },
                { answer: { _icontains: query } },
                { tags: { _contains: query } },
              ],
            },
          ],
        },
        fields: ['*', 'category.name', 'category.icon'],
        sort: ['category', 'sort', 'question'],
        limit: -1
      }))

      return searchResponse
      
    } catch (error) {
      console.error('Error searching FAQ items with complex query:', error)
      
      // Fallback search - try simpler queries one by one
      try {
        
        // Try searching just questions
        const questionResults = await useDirectus(readItems('faq_items', {
          filter: {
            _and: [
              { status: { _eq: 'published' } },
              { question: { _icontains: query } }
            ],
          },
          fields: ['*', 'category.name', 'category.icon'],
          limit: -1,
        }))
        
        
        // Try searching just answers
        const answerResults = await useDirectus(readItems('faq_items', {
          filter: {
            _and: [
              { status: { _eq: 'published' } },
              { answer: { _icontains: query } }
            ],
          },
          fields: ['*', 'category.name', 'category.icon'],
          limit: -1,
        }))
        
        
        // Combine and deduplicate results
        const combinedResults = [...questionResults, ...answerResults]
        const uniqueResults = combinedResults.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        )
        

        return uniqueResults
        
      } catch (fallbackError) {
        console.error('All search methods failed:', fallbackError)
        throw error
      }
    }
  }
  
  return {
    getFaqData,
    searchFaqItems,
  }
}