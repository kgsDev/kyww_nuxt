<script setup>
definePageMeta({
  layout: 'blank'
});

const route = useRoute();
const router = useRouter();

const password = ref('');
const confirmPassword = ref('');
const message = ref('');
const loading = ref(false);
const tokenValid = ref(false);
const validationErrors = ref({
  password: '',
  confirmPassword: ''
});

// Password requirements
const passwordRequirements = {
  minLength: 8,
  hasUpperCase: /[A-Z]/,
  hasLowerCase: /[a-z]/,
  hasNumber: /[0-9]/,
  hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/
};

// Validate token on page load
onMounted(async () => {
  console.log('Component mounted, starting token verification');
  const token = route.query.token;
  
  if (!token) {
    console.log('No token in route query');
    message.value = 'Invalid or missing reset token.';
    return;
  }

  console.log('Found token in query:', token);

  try {
    console.log('Making verification request...');
    const response = await fetch('/api/verify-reset-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token })
    });

    console.log('Raw response:', response);
    const data = await response.json();
    console.log('Parsed response data:', data);

    if (data.valid) {
      console.log('Token is valid');
      tokenValid.value = true;
    } else {
      console.log('Token is invalid');
      message.value = 'This reset link has expired or is invalid. Please request a new one.';
    }
  } catch (error) {
    console.error('Token verification error:', error);
    message.value = 'Error verifying reset token. Please try again.';
  }
});

// Password validation
const validatePassword = () => {
  validationErrors.value.password = '';
  
  if (!password.value) {
    validationErrors.value.password = 'Password is required';
    return false;
  }

  const errors = [];
  
  if (password.value.length < passwordRequirements.minLength) {
    errors.push(`At least ${passwordRequirements.minLength} characters`);
  }
  if (!passwordRequirements.hasUpperCase.test(password.value)) {
    errors.push('One uppercase letter');
  }
  if (!passwordRequirements.hasLowerCase.test(password.value)) {
    errors.push('One lowercase letter');
  }
  if (!passwordRequirements.hasNumber.test(password.value)) {
    errors.push('One number');
  }
  if (!passwordRequirements.hasSpecialChar.test(password.value)) {
    errors.push('One special character');
  }

  if (errors.length > 0) {
    validationErrors.value.password = `Password must contain: ${errors.join(', ')}`;
    return false;
  }

  return true;
};

// Confirm password validation
const validateConfirmPassword = () => {
  validationErrors.value.confirmPassword = '';
  
  if (!confirmPassword.value) {
    validationErrors.value.confirmPassword = 'Please confirm your password';
    return false;
  }
  
  if (password.value !== confirmPassword.value) {
    validationErrors.value.confirmPassword = 'Passwords do not match';
    return false;
  }
  
  return true;
};

/// Handle form submission
const onSubmit = async () => {
  if (loading.value || !tokenValid.value) return;
  
  // Validate both fields
  const isPasswordValid = validatePassword();
  const isConfirmValid = validateConfirmPassword();
  
  if (!isPasswordValid || !isConfirmValid) return;
  
  loading.value = true;
  message.value = '';

  try {
    const { data, error } = await useFetch('/api/reset-password', {
      method: 'POST',
      body: {
        token: route.query.token,
        password: password.value,
      }
    });

    if (error.value) throw error.value;

    message.value = 'Password successfully reset! You will be redirected to login...';
    
    // Clear form
    password.value = '';
    confirmPassword.value = '';
    
    // Redirect to login after 1 seconds
    setTimeout(() => {
      router.push('/auth/signin');
    }, 3000);
  } catch (error) {
    console.error('Reset error:', error);
    message.value = 'An error occurred while resetting your password. Please try again.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="page-container">
    <div class="signup-form-container">
      <div class="logo-container">
        <img class="logo" src="~/assets/KyWW_logo.png" alt="KyWW Logo" />
      </div>
      
      <div class="reset-password-container">
        <h2>Reset Password</h2>
        
        <div v-if="!tokenValid" class="message-container">
          <p class="error-message">{{ message }}</p>
          <nuxt-link to="/request-password" class="link-button">
            Request New Reset Link
          </nuxt-link>
        </div>

        <form v-else @submit.prevent="onSubmit">
          <div class="form-group">
            <label for="password">New Password</label>
            <input
              type="password"
              id="password"
              v-model="password"
              @input="validatePassword"
              :disabled="loading"
              autocomplete="new-password"
              required
            />
            <span v-if="validationErrors.password" class="error-message">
              {{ validationErrors.password }}
            </span>
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              v-model="confirmPassword"
              @input="validateConfirmPassword"
              :disabled="loading"
              autocomplete="new-password"
              required
            />
            <span v-if="validationErrors.confirmPassword" class="error-message">
              {{ validationErrors.confirmPassword }}
            </span>
          </div>

          <p v-if="message" :class="{ 
            'success-message': !message.includes('error'), 
            'error-message': message.includes('error') 
          }">
            {{ message }}
          </p>

          <button
            type="submit"
            class="submit-button"
            :disabled="loading"
          >
            {{ loading ? 'Resetting Password...' : 'Reset Password' }}
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
  
.message-container {
  text-align: center;
  margin: 2rem 0;
}

.link-button {
  display: inline-block;
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #4CAF50;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.link-button:hover {
  background-color: #45a049;
}

.form-group {
  margin-bottom: 1.5rem;
}

.error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  display: block;
}

.success-message {
  color: #28a745;
  margin: 1rem 0;
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}
</style>