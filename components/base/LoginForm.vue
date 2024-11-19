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
  
	  <form class="grid gap-4" @submit.prevent="handleSubmit">
		<UFormGroup label="Email" required>
		  <UInput
			v-model="form.email"
			type="email"
			:disabled="isLoading"
			size="lg"
			name="email"
			label="Work Email"
			placeholder="john@example.com"
		  />
		</UFormGroup>
		
		<UFormGroup label="Password" required>
		  <div class="relative">
			<UInput
			  v-model="form.password"
			  :type="showPassword ? 'text' : 'password'"
			  :disabled="isLoading"
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
  
		<div class="flex justify-end">
		  <NuxtLink 
			to="/request-password" 
			class="text-sm text-blue-600 hover:text-blue-800 transition-colors"
		  >
			Forgot your password?
		  </NuxtLink>
		</div>
  
		<button
		  type="submit"
		  class="g-recaptcha submit-button"
		  :data-sitekey="recaptchaSiteKey"
		  data-callback="onCaptchaSubmit"
		  data-size="invisible"
		>
		  <UButton
			:loading="isLoading"
			:disabled="!isFormValid"
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
  import { ref, reactive, computed } from 'vue'
  import { useRuntimeConfig } from 'nuxt/app'
  
  const isDev = process.env.NODE_ENV === 'development'
  const recaptchaSiteKey = '6LeSlG4qAAAAAKo9KheTqBdOD1HhHGxjCAvt9Seg'
  
  const isLoading = ref(false)
  const error = ref(null)
  const showPassword = ref(false)
  
  const form = reactive({
	email: '',
	password: ''
  })
  
  const isFormValid = computed(() => {
	return form.email && form.password
  })
  
  const togglePassword = () => {
	showPassword.value = !showPassword.value
  }
  
  const getErrorMessage = (error) => {
	if (error.response?.status) {
	  switch (error.response.status) {
		case 401: return 'Invalid email or password. Please try again.'
		case 429: return 'Too many login attempts. Please try again later.'
		case 503: return 'Service is temporarily unavailable. Please try again later.'
		default: return 'Unable to sign in. Please try again.'
	  }
	}
  
	if (error.message?.toLowerCase().includes('credentials')) {
	  return 'Invalid email or password. Please try again.'
	}
  
	if (error.message?.toLowerCase().includes('network')) {
	  return 'Network error. Please check your connection and try again.'
	}
  
	return 'An error occurred while signing in. Please try again.'
  }
  
  const handleCaptchaSubmit = async (token) => {
	if (isLoading.value) return
  
	try {
	  isLoading.value = true
	  error.value = null
	  
	  const { login } = useDirectusAuth()
  
	  if (!isDev) {
		const captchaVerification = await $fetch('/api/verify-captcha', {
		  method: 'POST',
		  body: { token }
		})
  
		if (!captchaVerification.success) {
		  throw new Error('Security verification failed. Please try again.')
		}
	  }
  
	  await login(form.email, form.password)
	} catch (err) {
	  console.error('Login error:', err)
	  error.value = getErrorMessage(err)
	  if (window.grecaptcha && !isDev) {
		grecaptcha.reset()
	  }
	} finally {
	  isLoading.value = false
	}
  }
  
  const handleSubmit = async () => {
	if (!isFormValid.value) return
  
	if (isDev) {
	  await handleCaptchaSubmit('dev-mode')
	} else if (typeof window.grecaptcha !== 'undefined') {
	  window.grecaptcha.execute()
	} else {
	  error.value = 'Security check failed to load. Please refresh the page.'
	}
  }
  
  // Set up global callback for reCAPTCHA
  onMounted(() => {
	window.onCaptchaSubmit = handleCaptchaSubmit
  })
  
  // Add reCAPTCHA script only in production
  useHead({
	script: !isDev ? [{
	  src: 'https://www.google.com/recaptcha/api.js',
	  async: true,
	  defer: true
	}] : []
  })
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