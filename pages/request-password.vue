<script setup>

definePageMeta({
  layout: 'blank'
});

const email = ref('');
const message = ref('');
const loading = ref(false);
const emailError = ref('');
const recaptchaReady = ref(false);

// Email validation
const validateEmail = () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.value) {
    emailError.value = 'Email is required';
    return false;
  }
  if (!emailRegex.test(email.value)) {
    emailError.value = 'Invalid email format';
    return false;
  }
  emailError.value = '';
  return true;
};

// Handle form submission with token
const handleSubmitWithToken = async (token) => {
  if (loading.value) return;
  if (!validateEmail()) return;
  
  loading.value = true;
  message.value = '';
  
  try {
    const { data } = await useFetch('/api/request-password', {
      method: 'POST',
      body: { 
        email: email.value,
        captchaToken: token
      },
    });

    message.value = 'If an account exists, a reset link has been sent to your email.';
    email.value = '';
  } catch (error) {
    console.error('Error:', error);
    message.value = 'An error occurred. Please try again later.';
  } finally {
    loading.value = false;
    // Reset reCAPTCHA
    if (window.grecaptcha) {
      window.grecaptcha.reset();
    }
  }
};

// Initialize reCAPTCHA
const initRecaptcha = () => {
  // Create a global callback function
  window.onRecaptchaSubmit = handleSubmitWithToken;
  
  // Load reCAPTCHA script
  const script = document.createElement('script');
  script.src = 'https://www.google.com/recaptcha/api.js';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
  
  script.onload = () => {
    recaptchaReady.value = true;
  };
};

// Handle form submission
const onSubmit = async (event) => {
  event.preventDefault();
  if (!validateEmail()) return;
  
  if (window.grecaptcha) {
    window.grecaptcha.execute();
  }
};

onMounted(() => {
  initRecaptcha();
});
</script>

<template>
  <div class="page-container">
    <div class="signup-form-container">
      <div class="logo-container">
        <img class="logo" src="~/assets/KyWW_logo.png" alt="KyWW Logo" />
      </div>
      <div class="reset-request-container">
        <h2>Password Reset</h2>
        <form @submit.prevent="onSubmit">
          <div class="form-group">
            <label for="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              v-model="email" 
              @input="validateEmail"
              :disabled="loading"
              required 
            />
            <span v-if="emailError" class="error-message">{{ emailError }}</span>
          </div>
          
          <p v-if="message" :class="{ 'success-message': !message.includes('error') }">
            {{ message }}
          </p>

          <button
            type="submit"
            class="submit-button g-recaptcha"
            data-sitekey="6LeSlG4qAAAAAKo9KheTqBdOD1HhHGxjCAvt9Seg"
            data-callback="onRecaptchaSubmit"
            data-size="invisible"
            :disabled="loading || !recaptchaReady"
          >
            {{ loading ? 'Sending...' : 'Send Reset Link' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .page-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: #f4f4f9;
  }
  
  .signup-form-container {
    width: 100%;
    max-width: 500px; /* Increase form width */
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: left; /* Align text to the left */
  }
  
  .logo-container {
    display: flex;
    justify-content: center;
    margin-bottom: 1rem;
  }
  
  .logo {
    width: 8rem;
  }
  
  h1 {
    margin-bottom: 1.5rem;
    font-size: 1rem;
    color: #333;
    text-align: left; 
  }
  
  h2 {
    margin-bottom: 1.5rem;
    font-size: 1.3rem;
    color: #333;
    text-align: center; /* Center-align title */
  }

  .form-group {
    margin-bottom: 1.25rem;
    display: flex;
    flex-direction: column;
  }
  
  label {
    font-weight: bold;
    margin-bottom: 0.5rem;
    color: #666;
  }
  
  input[type="text"],
  input[type="email"],
  select,
  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-sizing: border-box;
  }
    
  .submit-button {
    margin-top: 1.5rem;
    width: 100%;
    padding: 0.75rem;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1rem;
  }
  
  .submit-button:hover {
    background-color: #45a049;
  }
  
  .message {
    margin-top: 1rem;
    color: #f00;
  }

  .info-text {
    display: block;           /* Ensures text appears on a new line */
    font-size: 0.85rem;       /* Slightly smaller font size */
    color: #6c757d;           /* Light grey color for subtlety */
    margin-top: 0.25rem;      /* Space between input and text */
  }

  .password-message {
    font-size: 0.85rem;
    color: #dc3545; /* Red color to indicate a warning */
    margin-top: 0.25rem;
  }

  .error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.success-message {
  color: #28a745;
  margin-top: 1rem;
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
  </style>