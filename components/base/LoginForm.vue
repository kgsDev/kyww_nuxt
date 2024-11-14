<template>
	<div v-auto-animate>
		<UAlert
			v-if="error"
			type="error"
			class="mb-4"
			:title="error"
			color="rose"
			variant="soft"
			icon="i-heroicons-exclamation-circle"
		/>
  
	  <form class="grid gap-4" @submit.prevent="onSubmit">
		<UFormGroup label="Email" required>
		  <UInput
			v-model="credentials.email"
			type="email"
			:disabled="loading"
			size="lg"
			name="email"
			label="Work Email"
			placeholder="john@example.com"
		  />
		</UFormGroup>
		<UFormGroup label="Password" required>
		  <div class="relative">
			<UInput
			  v-model="credentials.password"
			  :type="showPassword ? 'text' : 'password'"
			  :disabled="loading"
			  size="lg"
			  name="password"
			  label="Password"
			  placeholder="Your Password"
			/>
			<button
			  type="button"
			  class="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
			  @click="togglePassword"
			>
			  <UIcon
				:name="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
				class="w-5 h-5"
			  />
			</button>
		  </div>
		</UFormGroup>
		
		<!-- Forgot Password Link -->
		<div class="flex justify-end">
		  <NuxtLink 
			to="/request-password" 
			class="text-sm text-blue-600 hover:text-blue-800 transition-colors"
		  >
			Forgot your password?
		  </NuxtLink>
		</div>
  
		<!-- reCAPTCHA button -->
		<button
		  type="submit"
		  class="g-recaptcha submit-button"
		  data-sitekey="6LeSlG4qAAAAAKo9KheTqBdOD1HhHGxjCAvt9Seg"
		  data-callback="onCaptchaSubmit"
		  data-size="invisible"
		>
		  <UButton
			:loading="loading"
			:disabled="!credentials.email || !credentials.password"
			size="lg"
			label="Sign In"
			trailing-icon="material-symbols:arrow-forward"
			block
		  />
		</button>
	  </form>
	</div>
  </template>
  
<script setup>
	const { login } = useDirectusAuth();
	const loading = ref(false);
	const error = ref(false);
	const isDev = process.env.NODE_ENV === 'development';
	const showPassword = ref(false);
	
	const credentials = reactive({
		email: '',
		password: '',
	});
	
	// Add toggle password function
	const togglePassword = () => {
	showPassword.value = !showPassword.value;
	console.log('Password visibility:', showPassword.value); // Debug log
	};

	function getErrorMessage(error) {
	// Check if it's an API error with status code
	if (error.response?.status) {
		switch (error.response.status) {
		case 401:
			return 'Invalid email or password. Please try again.';
		case 429:
			return 'Too many login attempts. Please try again later.';
		case 503:
			return 'Service is temporarily unavailable. Please try again later.';
		default:
			return 'Unable to sign in. Please try again.';
		}
	}

	// Check for specific error messages from Directus
	if (error.message?.toLowerCase().includes('credentials')) {
		return 'Invalid email or password. Please try again.';
	}

	if (error.message?.toLowerCase().includes('network')) {
		return 'Network error. Please check your connection and try again.';
	}

	// Default error message
	return 'An error occurred while signing in. Please try again.';
	}

  // Define the callback function for reCAPTCHA
  window.onCaptchaSubmit = async (token) => {
	if (loading.value) return;
	const { email, password } = unref(credentials);
	
	try {
		loading.value = true;
		error.value = null;

		// Skip CAPTCHA verification in development
		if (!isDev) {
			const captchaVerification = await $fetch('/api/verify-captcha', {
				method: 'POST',
				body: { token }
			});

			if (!captchaVerification.success) {
				throw new Error('Security verification failed. Please try again.');
			}
		}

		// Attempt login
		await login(email, password);
	} catch (err) {
		console.error('Login error:', err); // Add debugging
		error.value = getErrorMessage(err);
		if (window.grecaptcha && !isDev) {
		grecaptcha.reset();
		}
	} finally {
		loading.value = false;
	}
};
  
  // Handle form submission
  const onSubmit = async () => {
  if (!credentials.email || !credentials.password) return;
  
  if (isDev) {
    // In development, skip reCAPTCHA and call callback directly
    await onCaptchaSubmit('dev-mode');
  } else {
    // In production, use reCAPTCHA
    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.execute();
    } else {
      error.value = 'Security check failed to load. Please refresh the page.';
    }
  }
};

// Only add reCAPTCHA script in production
useHead({
  script: !isDev ? [
    {
      src: 'https://www.google.com/recaptcha/api.js',
      async: true,
      defer: true
    }
  ] : []
});
  </script>
  
  <style scoped>
  .grid {
	position: relative;
  }
  
  .submit-button {
	width: 100%;
	background: none;
	border: none;
	padding: 0;
	margin: 0;
  }
  
  .grecaptcha-badge {
	visibility: hidden;
  }
  </style>
