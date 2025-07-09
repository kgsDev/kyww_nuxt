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
const showWarning = ref(false);
const errorMessage = ref('');
const warningMessage = ref('');

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

// Form validation with character limits
const messageLength = computed(() => formData.message.length);
const isMessageTooLong = computed(() => messageLength.value > 1000);
const isMessageTooShort = computed(() => messageLength.value > 0 && messageLength.value < 10);

const validateForm = () => {
  clearMessages();
  
  if (!formData.message || formData.message.trim() === '') {
    errorMessage.value = 'Please enter a message to the sampler.';
    showError.value = true;
    return false;
  }
  
  if (isMessageTooShort.value) {
    errorMessage.value = 'Please enter a more detailed message (at least 10 characters).';
    showError.value = true;
    return false;
  }
  
  if (isMessageTooLong.value) {
    errorMessage.value = 'Message is too long. Please keep it under 1000 characters.';
    showError.value = true;
    return false;
  }
  
  return true;
};

const clearMessages = () => {
  showError.value = false;
  showSuccess.value = false;
  showWarning.value = false;
  errorMessage.value = '';
  warningMessage.value = '';
};

const resetForm = () => {
  formData.message = '';
  clearMessages();
  
  // Reset captcha if it exists
  if (captchaRef.value && recaptchaLoaded.value) {
    window.grecaptcha.reset();
  }
};

const retrySubmission = () => {
  clearMessages();
  handleSubmit();
};

const getErrorMessage = (response, data) => {
  switch(response.status) {
    case 400:
      return data.message || 'Please check your input and try again.';
    case 401:
      return 'Please log in again to send messages.';
    case 403:
      if (data.code === 'CONNECTION_DISABLED') {
        return 'This sampler has disabled connection requests.';
      }
      return data.message || 'You do not have permission to contact this sampler.';
    case 404:
      if (data.code === 'SAMPLER_NOT_FOUND') {
        return 'This sampler could not be found. They may have deactivated their account.';
      }
      return 'The requested resource was not found.';
    case 500:
      if (data.code === 'EMAIL_FAILED') {
        return 'We couldn\'t send your message due to an email delivery issue. Please try again.';
      }
      if (data.code === 'DELIVERY_FAILED') {
        return 'Your message couldn\'t be delivered to the sampler. Please try again later.';
      }
      return data.message || 'A server error occurred. Please try again later.';
    default:
      return data.message || 'An unexpected error occurred.';
  }
};

const handleSubmit = async () => {
  clearMessages();
  
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
        'X-User-ID': user.value?.id || ''
      },
      credentials: 'include',
      body: JSON.stringify({
        samplerId: props.samplerId,
        siteId: props.siteId,
        siteName: props.siteName,
        message: formData.message,
        captchaToken: formData.captchaToken,
        userId: user.value?.id
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      errorMessage.value = getErrorMessage(response, data);
      showError.value = true;
      return;
    }
    
    // Handle success responses from improved API
    if (data.status === 'success') {
      if (data.code === 'PARTIAL_SUCCESS') {
        // Message sent but confirmation email failed
        warningMessage.value = data.message;
        showWarning.value = true;
      } else {
        // Complete success
        showSuccess.value = true;
      }
      
      resetForm();
      emit('message-sent');
    } else {
      // Handle unexpected response format
      errorMessage.value = data.message || 'Unexpected response from server.';
      showError.value = true;
    }
    
  } catch (error) {
    console.error('Error sending message:', error);
    
    // Handle different types of errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage.value = 'Network error. Please check your connection and try again.';
    } else {
      errorMessage.value = error.message || 'An unexpected error occurred. Please try again later.';
    }
    showError.value = true;
  } finally {
    isSubmitting.value = false;
  }
};

const submitButtonText = computed(() => {
  if (isSubmitting.value) {
    return 'Sending Message...';
  }
  return 'Send Message';
});

const showRetryButton = computed(() => {
  return showError.value && (
    errorMessage.value.includes('network') || 
    errorMessage.value.includes('server') || 
    errorMessage.value.includes('try again')
  );
});
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
      <!-- Success Message -->
      <UAlert
        v-if="showSuccess"
        type="success"
        title="Message Sent!"
        description="Your message has been sent to the sampler. They will contact you via email if they're interested in connecting."
        icon="i-heroicons-check-circle"
        class="mb-4"
      />

      <!-- Warning Message (partial success) -->
      <UAlert
        v-if="showWarning"
        type="warning"
        title="Message Sent (with note)"
        :description="warningMessage"
        icon="i-heroicons-exclamation-triangle"
        class="mb-4"
      />

      <!-- Error Message -->
      <UAlert
        v-if="showError"
        type="error"
        :title="errorMessage"
        icon="i-heroicons-exclamation-triangle"
        class="mb-4"
      >
        <template #actions v-if="showRetryButton">
          <UButton
            color="red"
            variant="outline"
            size="xs"
            @click="retrySubmission"
          >
            Try Again
          </UButton>
        </template>
      </UAlert>
      
      <!-- Message Input -->
      <div>
        <label for="message" class="block text-sm font-medium text-gray-700">Your Message</label>
        <div class="mt-1">
          <textarea
            id="message"
            v-model="formData.message"
            rows="4"
            class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
            :class="{ 'border-red-500': isMessageTooLong || isMessageTooShort }"
            placeholder="Introduce yourself and explain why you'd like to connect about water sampling at this site..."
            maxlength="1000"
            required
          ></textarea>
        </div>
        <div class="mt-1 flex justify-between">
          <p class="text-xs text-gray-500">
            Your email address will be shared with the sampler so they can respond to you directly.
          </p>
          <p class="text-xs" :class="{ 'text-red-500': isMessageTooLong, 'text-gray-500': !isMessageTooLong }">
            {{ messageLength }}/1000
          </p>
        </div>
      </div>
      
      <!-- Recaptcha placeholder if needed -->
      <div v-if="recaptchaLoaded" ref="captchaRef"></div>
      
      <div class="flex justify-end">
        <UButton
          type="submit"
          :loading="isSubmitting"
          :disabled="isSubmitting || isMessageTooLong || isMessageTooShort"
          color="blue"
        >
          {{ submitButtonText }}
        </UButton>
      </div>
    </form>
  </UCard>
</template>