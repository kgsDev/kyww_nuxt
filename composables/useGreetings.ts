interface DashboardMessage {
    id: number;
    message: string;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
    sort_order: number;
  }
  
  export function useGreetings() {
    const messages = ref<DashboardMessage[]>([]);
    const loading = ref(true);
    const error = ref<string | null>(null);
  
    async function fetchMessages() {
      try {
        const currentDate = new Date().toISOString();
        
        const fetchedMessages = await useDirectus(readItems('dashboard_messages', {
          filter: {
            is_active: {
              _eq: true
            },
            _or: [
              // Case 1: No dates set (evergreen messages)
              {
                _and: [
                  {
                    start_date: {
                      _null: true
                    }
                  },
                  {
                    end_date: {
                      _null: true
                    }
                  }
                ]
              },
              // Case 2: Date-specific messages that are currently valid
              {
                _and: [
                  {
                    start_date: {
                      _lte: currentDate
                    }
                  },
                  {
                    end_date: {
                      _gte: currentDate
                    }
                  }
                ]
              }
            ]
          },
          sort: ['sort_order']
        }));
        
        messages.value = fetchedMessages;
        console.log('Fetched messages:', fetchedMessages); // Debug log
      } catch (err) {
        console.error('Error fetching dashboard messages:', err);
        error.value = 'Failed to load dashboard messages';
      } finally {
        loading.value = false;
      }
    }
  
    function getTodaysMessage(): string {
      if (!messages.value || messages.value.length === 0) {
        return 'Welcome back!';
      }
  
      const now = new Date();
      const start = new Date(now.getFullYear(), 0, 0);
      const difference = now.getTime() - start.getTime();
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYear = Math.floor(difference / oneDay);
      const messageIndex = dayOfYear % messages.value.length;
  
      return messages.value[messageIndex].message;
    }
  
    onMounted(() => {
      fetchMessages();
    });
  
    return {
      messages,
      loading,
      error,
      getTodaysMessage,
      fetchMessages
    };
  }