<template>
	<div v-auto-animate>
	  <UAlert
		v-if="error"
		type="error"
		class="mb-4"
		title="Oops! Something went wrong."
		:description="error"
		color="rose"
		variant="outline"
		icon="material-symbols:warning-rounded"
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
		  <UInput
			v-model="credentials.password"
			type="password"
			:disabled="loading"
			size="lg"
			name="password"
			label="Password"
			placeholder="Your Password"
		  />
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
  const error = ref(null);
  
  const credentials = reactive({
	email: '',
	password: '',
  });
  
  // Define the callback function for reCAPTCHA
  window.onCaptchaSubmit = async (token) => {
	if (loading.value) return;
	const { email, password } = unref(credentials);
	
	try {
	  loading.value = true;
	  error.value = null;
  
	  // Verify CAPTCHA token
	  const captchaVerification = await $fetch('/api/verify-captcha', {
		method: 'POST',
		body: { token }
	  });
  
	  if (!captchaVerification.success) {
		throw new Error('Security verification failed. Please try again.');
	  }
  
	  // If CAPTCHA passes, attempt login
	  await login(email, password);
	} catch (err) {
	  error.value = err.message;
	  // Reset reCAPTCHA on error
	  if (window.grecaptcha) {
		grecaptcha.reset();
	  }
	} finally {
	  loading.value = false;
	}
  };
  
  // Handle form submission
  const onSubmit = async () => {
	if (!credentials.email || !credentials.password) return;
	
	// Execute reCAPTCHA
	if (typeof grecaptcha !== 'undefined') {
	  grecaptcha.execute();
	} else {
	  error.value = 'Security check failed to load. Please refresh the page.';
	}
  };
  
  // Add reCAPTCHA script
  useHead({
	script: [
	  {
		src: 'https://www.google.com/recaptcha/api.js',
		async: true,
		defer: true
	  }
	]
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
