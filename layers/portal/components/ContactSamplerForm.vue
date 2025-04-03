<script setup>
const emit = defineEmits(['message-sent']);

const props = defineProps({
  samplerName: {
    type: String,
    required: true
  },
  samplerId: {
    type: String,
    required: true
  },
  siteId: {
    type: String,
    required: true
  },
  siteName: {
    type: String,
    default: 'this site'
  }
});

const isSubmitting = ref(false);
const showSuccess = ref(false);
const showError = ref(false);
const errorMessage = ref('');

const formData = reactive({
  message: '',
  captchaToken: ''
});

// Get current user info from Directus auth
const { user } = useDirectusAuth();

const captchaRef = ref(null);
const recaptchaLoaded = ref(false);

onMounted(() => {
  // Initialize reCAPTCHA if needed
  if (process.client && window.grecaptcha) {
    recaptchaLoaded.value = true;
  }
});

const validateForm = () => {
  if (!formData.message || formData.message.trim() === '') {
    errorMessage.value = 'Please enter a message to the sampler.';
    showError.value = true;
    return false;
  }
  
  return true;
};

const resetForm = () => {
  formData.message = '';
  showError.value = false;
  errorMessage.value = '';
  
  // Reset captcha if it exists
  if (captchaRef.value && recaptchaLoaded.value) {
    window.grecaptcha.reset();
  }
};

const handleSubmit = async () => {
  showError.value = false;
  showSuccess.value = false;
  
  if (!validateForm()) return;
  
  // Get captcha token if available
  if (captchaRef.value && recaptchaLoaded.value) {
    try {
      formData.captchaToken = await window.grecaptcha.execute();
    } catch (error) {
      console.error('Captcha error:', error);
      errorMessage.value = 'Could not verify captcha. Please try again.';
      showError.value = true;
      return;
    }
  }
  
  isSubmitting.value = true;
  
  try {
    
    const response = await fetch('/api/contact-sampler', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': user.value?.id || '' // Include user ID in header as fallback
      },
      credentials: 'include', // Important: Include cookies for authentication
      body: JSON.stringify({
        samplerId: props.samplerId,
        siteId: props.siteId,
        siteName: props.siteName,
        message: formData.message,
        captchaToken: formData.captchaToken,
        userId: user.value?.id // Include user ID in request body as well
      })
    });
    
    const data = await response.json();
    
    // Check both HTTP status and response body status
    if (!response.ok || (data.status && data.status !== 'success')) {
      // If there's an error message in the response, use it
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }
    
    // At this point both checks passed, so the API call was truly successful
    showSuccess.value = true;
    resetForm();
    
    // Emit event to notify parent component that message was sent
    emit('message-sent');
  } catch (error) {
    console.error('Error sending message:', error);
    errorMessage.value = error.message || 'An error occurred while sending your message. Please try again later.';
    showError.value = true;
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <UCard>
    <template #header>
      <h3 class="text-lg font-semibold">Contact Sampler</h3>
      <p class="text-sm text-gray-600">Connect with {{ samplerName }} about sampling at {{ siteName }}</p>
    </template>
    
    <div v-if="!user" class="py-4 text-center">
      <p class="text-gray-600 mb-2">You need to be logged in to contact samplers.</p>
      <NuxtLink to="/auth/signin" class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
        Sign In
      </NuxtLink>
    </div>
    
    <form v-else @submit.prevent="handleSubmit" class="space-y-4">
      <UAlert
        v-if="showSuccess"
        type="success"
        title="Message Sent!"
        description="Your message has been sent to the sampler. They will contact you via email if they're interested in connecting."
        icon="i-heroicons-check-circle"
        class="mb-4"
      />
      
      <UAlert
        v-if="showError"
        type="error"
        :title="errorMessage"
        icon="i-heroicons-exclamation-triangle"
        class="mb-4"
      />
      
      <div>
        <label for="message" class="block text-sm font-medium text-gray-700">Your Message</label>
        <div class="mt-1">
          <textarea
            id="message"
            v-model="formData.message"
            rows="4"
            class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Introduce yourself and explain why you'd like to connect about water sampling at this site..."
            required
          ></textarea>
        </div>
        <p class="mt-1 text-xs text-gray-500">
          Your email address will be shared with the sampler so they can respond to you directly.
        </p>
      </div>
      
      <!-- Recaptcha placeholder if needed -->
      <div v-if="recaptchaLoaded" ref="captchaRef"></div>
      
      <div class="flex justify-end">
        <UButton
          type="submit"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          color="blue"
        >
          Send Message
        </UButton>
      </div>
    </form>
  </UCard>
</template>