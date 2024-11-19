// Create a composable: composables/useGoogleMaps.ts
export function useGoogleMaps() {
    const isLoaded = ref(false);
    const isLoading = ref(false);
  
    async function loadGoogleMaps() {
      if (isLoaded.value || isLoading.value) return;
      
      isLoading.value = true;
      const config = useRuntimeConfig();
      
      try {
        if (!window.google) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${config.public.GOOGLE_MAPS_API_KEY}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        isLoaded.value = true;
      } finally {
        isLoading.value = false;
      }
    }
  
    return {
      loadGoogleMaps,
      isLoaded,
      isLoading
    };
  }