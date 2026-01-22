<template>
  <div class="page-container">
    <div class="signup-form-container">
      <div class="logo-container">
        <img class="logo" src="~/assets/KyWW_logo.png" alt="KyWW Logo" />
      </div>
      <LoadingOverlay :isLoading="isLoading" />

      <!-- Place messages here -->
      <div 
        v-if="message && !apiError" 
        v-html="message" 
        class="message success-message"
      ></div>

      <div 
        v-if="apiError" 
        id="error-message"
        class="message error-message"
      >
        <div class="flex items-center">
          <UIcon 
            name="i-heroicons-exclamation-circle"
            class="h-5 w-5 text-red-500 mr-2"
          />
          <span v-html="apiError"></span>
        </div>
      </div>

      <!-- Date validation warning - only show for actual samplers with problematic dates -->
      <div 
        v-if="dateValidationWarning && showForm && isActualSampler" 
        class="message warning-message"
      >
        <div class="flex items-center">
          <UIcon 
            name="i-heroicons-exclamation-triangle"
            class="h-5 w-5 text-yellow-500 mr-2"
          />
          <span>{{ dateValidationWarning }}</span>
        </div>
      </div>

      <form ref="signupForm" v-if="showForm" @submit.prevent="onSubmit">
        <h2>Welcome to Kentucky Watershed Watch!</h2>
        <h1>We greatly appreciate your interest in supporting the organization and Kentucky's waterways{{ isActualSampler ? ' with your stream sampling efforts' : ' as a community partner' }}.
        <br><br> 
        This data portal will serve as your access point to information about participation, including identifying other samplers and sampling sites and finding support hub locations.{{ isActualSampler ? ' It will also enable you to enter your monitoring data.' : '' }}
        <br><br>
        To get started, please create a data portal user name (your email), password, and enter your contact information.</h1>
      
        <!-- Directus User Fields -->
        <div class="form-group">
          <label for="firstName">First Name:</label>
          <input type="text" v-model="firstName" id="firstName" required />
          <small class="info-text">Required.</small>
        </div>
        <div class="form-group">
          <label for="lastName">Last Name:</label>
          <input type="text" v-model="lastName" id="lastName" required />
          <small class="info-text">Required.</small>
        </div>

        <!-- Email with validation message -->
        <div class="form-group">
          <label for="email">Email:</label>
          <input type="email" v-model="email" id="email" required @input="validateEmail" />
          <p v-if="emailMessage" class="error-message">{{ emailMessage }}</p>
          <small class="info-text">Required. This will be your login user email.</small>
        </div>
        
        <!-- Password with validation message -->
        <div class="form-group">
          <label for="password">Create a Password:</label>
          <div class="relative">
            <input 
              :type="showPassword ? 'text' : 'password'" 
              v-model="password" 
              id="password" 
              required 
              @input="validatePassword"
            />
            <button 
              type="button"
              class="absolute right-2 top-1/2 transform -translate-y-1/2"
              @click="showPassword = !showPassword"
            >
              <UIcon 
                :name="showPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                class="w-5 h-5 text-gray-500 hover:text-gray-700"
              />
            </button>
          </div>
          <small class="info-text">Password must be at least 8 characters and include uppercase, lowercase, number, and at least one special character. Password can contain spaces.</small>
          <p v-if="passwordMessage" class="password-message">{{ passwordMessage }}</p>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Re-enter Password:</label>
          <div class="relative">
            <input 
              :type="showConfirmPassword ? 'text' : 'password'" 
              v-model="confirmPassword" 
              id="confirmPassword" 
              required 
              @input="validatePasswordMatch"
            />
            <button 
              type="button"
              class="absolute right-2 top-1/2 transform -translate-y-1/2"
              @click="showConfirmPassword = !showConfirmPassword"
            >
              <UIcon 
                :name="showConfirmPassword ? 'i-heroicons-eye-slash' : 'i-heroicons-eye'"
                class="w-5 h-5 text-gray-500 hover:text-gray-700"
              />
            </button>
          </div>
          <p v-if="passwordMatchMessage" class="password-message">{{ passwordMatchMessage }}</p>
        </div>

        <!-- Read-only Sampler Data Fields from Token - only show if there's actually training data -->
        <div v-if="hasTrainingInfo">
          <label>Details from your Training (read only):</label>
          <div class="read-group-div">
            <div class="form-group" v-if="originalTrainingDate">
              <label>Original Training Date:</label>
              <input 
                type="text" 
                :value="displayOriginalTrainingDate" 
                disabled 
                class="readonly-field"
                :class="{ 
                  'date-warning': hasActualDateIssue && originalTrainingDate && !originalDateValidation.isBlank 
                }"
              />
              <p v-if="hasActualDateIssue && originalTrainingDate && !originalDateValidation.isBlank" class="date-warning-text">
                ⚠️ This date appears to have an issue. Please contact your trainer if this looks incorrect.
              </p>
            </div>
            <div class="form-group" v-if="trainingDateLatest">
              <label>Latest Training Date:</label>
              <input 
                type="text" 
                :value="displayLatestTrainingDate" 
                disabled 
                readonly  
                class="readonly-field"
                :class="{ 
                  'date-warning': hasActualDateIssue && trainingDateLatest && !latestDateValidation.isBlank 
                }"
              />
            </div>
            <div class="form-group" v-if="trainingLocation">
              <label>Training Location:</label>
              <input type="text" :value="trainingLocation" disabled readonly class="readonly-field"/>
            </div>
            <div class="form-group" v-if="trainer_name">
              <label>Trainer:</label>
              <input type="text" :value="trainer_name" disabled readonly class="readonly-field"/>
            </div>

            <label v-if="hasAnyTrainingType">Training Completed:</label>

            <div class="form-group read-group" v-if="training_field_chemistry">
              <label>Field Chemistry: <input type="checkbox" :checked="training_field_chemistry" disabled readonly class="readonly-checkbox"/></label>
            </div>
            <div class="form-group read-group" v-if="training_r_card">
              <label>R-Card:
              <input type="checkbox" :checked="training_r_card" disabled readonly class="readonly-checkbox"/></label>
            </div>
            <div class="form-group read-group" v-if="training_habitat">
              <label>Habitat:
              <input type="checkbox" :checked="training_habitat" disabled readonly class="readonly-checkbox"/></label>
            </div>
            <div class="form-group read-group" v-if="training_biological">
              <label>Biological:
              <input type="checkbox" :checked="training_biological" disabled readonly class="readonly-checkbox"/></label>
            </div>
          </div>
        </div>

        <!-- Equipment section - only show for actual samplers -->
        <div v-if="isActualSampler">
          <label>Please Enter the Equipment Issued:</label>

          <div class="form-group read-group">
            <div class="form-group">
              <label>Lamotte pH kit: <input type="checkbox" :checked="equip_ph" v-model="equip_ph"/></label>
            </div>
            <div v-if="equip_ph" class="form-group">
              <label>Lamotte pH Kit (reagent) Expiration Date:
              <input type="date" v-model="equip_ph_expiration" id="equip_ph_expiration" @input="validateEquipmentDate('ph')"/></label>
              <p v-if="equipmentDateErrors.ph" class="error-message">{{ equipmentDateErrors.ph }}</p>
            </div>
            <div class="form-group">
              <label>Lamotte Dissolved oxygen kit:
              <input type="checkbox" :checked="equip_do" v-model="equip_do"/></label>
            </div>
            <div v-if="equip_do" class="form-group">
              <label>Lamotte DO Kit (reagent) Expiration Date:
              <input type="date" v-model="equip_do_expiration" id="equip_do_expiration" @input="validateEquipmentDate('do')"/></label>
              <p v-if="equipmentDateErrors.do" class="error-message">{{ equipmentDateErrors.do }}</p>
            </div>
            <div class="form-group">
              <label>
                Conductivity meter:
                <input type="checkbox" v-model="equip_cond" />
              </label>
            </div>
            <div class="form-group">
              <label>Thermometer:
                <input type="checkbox" v-model="equip_thermo" />
              </label>
            </div>
            <div class="form-group">
              <label>
                Incubator:
                <input type="checkbox" v-model="equip_incubator" />
              </label>
            </div>
          </div>
        </div>

        <!-- Phone with validation message -->
        <div class="form-group">
          <label for="phone">Phone:</label>
          <input type="text" v-model="phone" id="phone" required @input="validatePhone" />
          <p v-if="phoneMessage" class="error-message">{{ phoneMessage }}</p>
          <small class="info-text">Required.</small>
        </div>
        
        <div class="form-group">
          <label for="mailing_address">Street Address:</label>
          <input
            type="text"
            v-model="address.street"
            id="mailing_address"
            ref="mailingAddressInput"
            required
          />
          <small class="info-text">Required.</small>
        </div>

        <div class="address-group">
          <div class="form-group">
            <label for="city">City:</label>
            <input
              type="text"
              v-model="address.city"
              id="city"
              required
            />
          </div>

          <div class="form-group">
            <label for="state">State:</label>
            <input
              type="text"
              v-model="address.state"
              id="state"
            />
          </div>

          <div class="form-group">
            <label for="zip">ZIP Code:</label>
            <input
              type="text"
              v-model="address.zip"
              id="zip"
              required
              pattern="[0-9]{5}"
            />
          </div>
        </div>
        
        <div class="form-group">
          <label for="county_residence">KY county you will primarily sample or identify with:</label>
          <select v-model="county_residence" id="county_residence" required>
            <option v-for="county in counties" :key="county.id" :value="county.id">{{ county.name }}</option>
          </select>
          <small class="info-text">Required.</small>
        </div>

        <!-- Sampling Kit Section with Radio Buttons - only show for actual samplers -->
        <div v-if="isActualSampler">
          <label class="block font-bold mt-4">Sampling Kit:</label>
          <div class="form-group">
            <div class="form-group">
              <label>Kit Ownership/Status (please select one even if you aren't a sampler):</label>
              <select v-model="kitOption" required>
              <option value="">Select kit ownership/status</option>
              <option value="own">KYWW issued kit for individual use</option>
              <option value="other">Borrow (borrow from friend/other sampler)</option>
              <option value="personal">Personal (personally bought/acquired not from KYWW)</option>
              <option value="borrow">Borrow a kit from Hub</option>
              <option value="none">Non-sampler (no kit needed)</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label for="desiredHub">Support Hub location:</label>
          <select v-model="desiredHub" id="desiredHub" required>
            <option value="">Select a Support Hub</option>
            <option v-for="hub in hubs" :key="hub.hub_id" :value="hub.hub_id">
              {{ hub.Description }} - {{ hub.City }}
            </option>
          </select>
        </div>

          <!-- Submit Button -->
        <button
          type="submit"
          class="submit-button g-recaptcha"
          data-sitekey="6LeSlG4qAAAAAKo9KheTqBdOD1HhHGxjCAvt9Seg"
          data-callback="onSubmit"
          data-size="invisible"
          :disabled="!canSubmitForm"
        >
          Sign Up
        </button>
      </form>

      <!-- Empty div specifically for reCAPTCHA -->
      <div ref="recaptchaContainer"></div>
    </div>
  </div>
</template>

<script setup>
//This is the signup page for new users to create an account. It is a form that takes in user information and sends it to the backend for processing.
  import { useRoute, useFetch } from '#app';
  import LoadingOverlay from '/components/LoadingOverlay.vue'

  definePageMeta({
    layout: 'blank',
    ssr: false  // Add this to prevent SSR issues
  });

  const apiError = ref('');
  const isLoading = ref(true);
  const config = useRuntimeConfig();
  const route = useRoute();
  const token = route.query.token;

  // Form data refs
  const showForm = ref(false);
  const message = ref('');
  const firstName = ref('');
  const lastName = ref('');
  const email = ref('');
  const password = ref('');
  const confirmPassword = ref('');
  const passwordMessage = ref('');
  const passwordMatchMessage = ref('');
  const phone = ref('');
  const mailingAddressInput = ref(null);
  const address = ref({
    street: '',
    city: '',
    state: '',
    zip: ''
  });
  const county_residence = ref('');
  const desiredHub = ref('');
  const hubs = ref([]);
  const kitOption = ref('');

  // Training and equipment refs
  const originalTrainingDate = ref('');
  const trainer_name = ref('');
  const trainingDateLatest = ref('');
  const trainingLocation = ref('');
  const training_field_chemistry = ref(false);
  const training_r_card = ref(false);
  const training_habitat = ref(false);
  const training_biological = ref(false);
  const equip_ph = ref(false);
  const equip_do = ref(false);
  const equip_cond = ref(false);
  const equip_thermo = ref(false);
  const equip_waste = ref(false);
  const equip_pan = ref(false);
  const equip_flip = ref(false);
  const equip_incubator = ref(false);
  const equip_do_expiration = ref('');
  const equip_ph_expiration = ref('');

  // Form validation refs
  const phoneMessage = ref('');
  const emailMessage = ref('');
  const signupForm = ref(null);
  const recaptchaContainer = ref(null);
  const hasRecaptchaRendered = ref(false);
  const dateValidationWarning = ref('');
  const equipmentDateErrors = ref({ ph: '', do: '' });

  // Computed properties to determine user type and what to show
  const isActualSampler = computed(() => {
    // A user is an actual sampler if they have any training completed (not just no training)
    return training_field_chemistry.value || 
           training_r_card.value || 
           training_habitat.value || 
           training_biological.value;
  });

  const hasTrainingInfo = computed(() => {
    // Show training info if there's any meaningful training data
    return originalTrainingDate.value || 
           trainingLocation.value || 
           trainer_name.value || 
           isActualSampler.value;
  });

  const hasAnyTrainingType = computed(() => {
    return training_field_chemistry.value || 
           training_r_card.value || 
           training_habitat.value || 
           training_biological.value;
  });

  // Date validation functions - improved to handle blank dates properly
  function validateTrainingDate(dateString) {
    // If date is blank or null, that's perfectly fine (non-sampler)
    if (!dateString || dateString.trim() === '') {
      return { 
        isValid: true, 
        message: '', 
        displayDate: 'Not applicable',
        isBlank: true
      };
    }
    
    const date = new Date(dateString);
    const currentYear = new Date().getFullYear();
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return { 
        isValid: false, 
        message: 'Invalid date format', 
        displayDate: 'Invalid Date',
        isBlank: false
      };
    }
    
    const year = date.getFullYear();
    
    // Check if year is reasonable (between 2020 and current year + 5)
    if (year < 2020 || year > currentYear + 5) {
      return { 
        isValid: false, 
        message: `Training date appears to be from year ${year}, which seems incorrect`, 
        displayDate: `${date.toLocaleDateString()} (Year ${year} - Please verify)`,
        isBlank: false
      };
    }
    
    return { 
      isValid: true, 
      message: '', 
      displayDate: date.toLocaleDateString(),
      isBlank: false
    };
  }

  function validateEquipmentDate(equipmentType) {
    const dateValue = equipmentType === 'ph' ? equip_ph_expiration.value : equip_do_expiration.value;
    
    if (!dateValue) {
      equipmentDateErrors.value[equipmentType] = '';
      return;
    }
    
    const validation = validateTrainingDate(dateValue);
    if (!validation.isValid && !validation.isBlank) {
      equipmentDateErrors.value[equipmentType] = validation.message;
    } else {
      equipmentDateErrors.value[equipmentType] = '';
    }
  }

  // Computed properties for date display and validation
  const originalDateValidation = computed(() => validateTrainingDate(originalTrainingDate.value));
  const latestDateValidation = computed(() => validateTrainingDate(trainingDateLatest.value));
  
  const displayOriginalTrainingDate = computed(() => originalDateValidation.value.displayDate);
  const displayLatestTrainingDate = computed(() => latestDateValidation.value.displayDate);
  
  // Only show date issues for actual dates that have problems (not blank dates)
  const hasActualDateIssue = computed(() => 
    (!originalDateValidation.value.isValid && !originalDateValidation.value.isBlank) || 
    (!latestDateValidation.value.isValid && !latestDateValidation.value.isBlank)
  );

  const canSubmitForm = computed(() => {
    // Check all validation states
    const hasValidationErrors = 
      emailMessage.value || 
      phoneMessage.value || 
      passwordMessage.value || 
      passwordMatchMessage.value ||
      equipmentDateErrors.value.ph ||
      equipmentDateErrors.value.do;
    
    return !hasValidationErrors;
  });

  // Counties data array
  const counties = [
    { id: '', name: 'Select a county' },
    { id: 'adair', name: 'Adair' },
    { id: 'allen', name: 'Allen' },
    { id: 'anderson', name: 'Anderson' },
    { id: 'ballard', name: 'Ballard' },
    { id: 'barren', name: 'Barren' },
    { id: 'bath', name: 'Bath' },
    { id: 'bell', name: 'Bell' },
    { id: 'boone', name: 'Boone' },
    { id: 'bourbon', name: 'Bourbon' },
    { id: 'boyd', name: 'Boyd' },
    { id: 'boyle', name: 'Boyle' },
    { id: 'bracken', name: 'Bracken' },
    { id: 'breathitt', name: 'Breathitt' },
    { id: 'breckinridge', name: 'Breckinridge' },
    { id: 'bullitt', name: 'Bullitt' },
    { id: 'butler', name: 'Butler' },
    { id: 'caldwell', name: 'Caldwell' },
    { id: 'calloway', name: 'Calloway' },
    { id: 'campbell', name: 'Campbell' },
    { id: 'carroll', name: 'Carroll' },
    { id: 'carter', name: 'Carter' },
    { id: 'casey', name: 'Casey' },
    { id: 'christian', name: 'Christian' },
    { id: 'clark', name: 'Clark' },
    { id: 'clay', name: 'Clay' },
    { id: 'clinton', name: 'Clinton' },
    { id: 'crittenden', name: 'Crittenden' },
    { id: 'cumberland', name: 'Cumberland' },
    { id: 'daviess', name: 'Daviess' },
    { id: 'edmonson', name: 'Edmonson' },
    { id: 'elliott', name: 'Elliott' },
    { id: 'estill', name: 'Estill' },
    { id: 'fayette', name: 'Fayette' },
    { id: 'fleming', name: 'Fleming' },
    { id: 'floyd', name: 'Floyd' },
    { id: 'franklin', name: 'Franklin' },
    { id: 'fulton', name: 'Fulton' },
    { id: 'gallatin', name: 'Gallatin' },
    { id: 'garrard', name: 'Garrard' },
    { id: 'grant', name: 'Grant' },
    { id: 'graves', name: 'Graves' },
    { id: 'grayson', name: 'Grayson' },
    { id: 'green', name: 'Green' },
    { id: 'greenup', name: 'Greenup' },
    { id: 'hancock', name: 'Hancock' },
    { id: 'hardin', name: 'Hardin' },
    { id: 'harlan', name: 'Harlan' },
    { id: 'harrison', name: 'Harrison' },
    { id: 'hart', name: 'Hart' },
    { id: 'henderson', name: 'Henderson' },
    { id: 'henry', name: 'Henry' },
    { id: 'hickman', name: 'Hickman' },
    { id: 'hopkins', name: 'Hopkins' },
    { id: 'jackson', name: 'Jackson' },
    { id: 'jefferson', name: 'Jefferson' },
    { id: 'jessamine', name: 'Jessamine' },
    { id: 'johnson', name: 'Johnson' },
    { id: 'kenton', name: 'Kenton' },
    { id: 'knott', name: 'Knott' },
    { id: 'knox', name: 'Knox' },
    { id: 'larue', name: 'LaRue' },
    { id: 'laurel', name: 'Laurel' },
    { id: 'lawrence', name: 'Lawrence' },
    { id: 'lee', name: 'Lee' },
    { id: 'leslie', name: 'Leslie' },
    { id: 'letcher', name: 'Letcher' },
    { id: 'lewis', name: 'Lewis' },
    { id: 'lincoln', name: 'Lincoln' },
    { id: 'livingston', name: 'Livingston' },
    { id: 'logan', name: 'Logan' },
    { id: 'lyon', name: 'Lyon' },
    { id: 'mccracken', name: 'McCracken' },
    { id: 'mccreary', name: 'McCreary' },
    { id: 'mclean', name: 'McLean' },
    { id: 'madison', name: 'Madison' },
    { id: 'magoffin', name: 'Magoffin' },
    { id: 'marion', name: 'Marion' },
    { id: 'marshall', name: 'Marshall' },
    { id: 'martin', name: 'Martin' },
    { id: 'mason', name: 'Mason' },
    { id: 'meade', name: 'Meade' },
    { id: 'menifee', name: 'Menifee' },
    { id: 'mercer', name: 'Mercer' },
    { id: 'metcalfe', name: 'Metcalfe' },
    { id: 'monroe', name: 'Monroe' },
    { id: 'montgomery', name: 'Montgomery' },
    { id: 'morgan', name: 'Morgan' },
    { id: 'muhlenberg', name: 'Muhlenberg' },
    { id: 'nelson', name: 'Nelson' },
    { id: 'nicholas', name: 'Nicholas' },
    { id: 'ohio', name: 'Ohio' },
    { id: 'oldham', name: 'Oldham' },
    { id: 'owen', name: 'Owen' },
    { id: 'owsley', name: 'Owsley' },
    { id: 'pendleton', name: 'Pendleton' },
    { id: 'perry', name: 'Perry' },
    { id: 'pike', name: 'Pike' },
    { id: 'powell', name: 'Powell' },
    { id: 'pulaski', name: 'Pulaski' },
    { id: 'robertson', name: 'Robertson' },
    { id: 'rockcastle', name: 'Rockcastle' },
    { id: 'rowan', name: 'Rowan' },
    { id: 'russell', name: 'Russell' },
    { id: 'scott', name: 'Scott' },
    { id: 'shelby', name: 'Shelby' },
    { id: 'simpson', name: 'Simpson' },
    { id: 'spencer', name: 'Spencer' },
    { id: 'taylor', name: 'Taylor' },
    { id: 'todd', name: 'Todd' },
    { id: 'trigg', name: 'Trigg' },
    { id: 'trimble', name: 'Trimble' },
    { id: 'union', name: 'Union' },
    { id: 'warren', name: 'Warren' },
    { id: 'washington', name: 'Washington' },
    { id: 'wayne', name: 'Wayne' },
    { id: 'webster', name: 'Webster' },
    { id: 'whitley', name: 'Whitley' },
    { id: 'wolfe', name: 'Wolfe' },
    { id: 'woodford', name: 'Woodford' }
  ];

  const showPassword = ref(false);
  const showConfirmPassword = ref(false);

  const togglePassword = () => {
	  showPassword.value = !showPassword.value
  }

  // Validation functions
  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email.value && emailRegex.test(email.value)) {
      emailMessage.value = '';
    } else if (!email.value) {
      emailMessage.value = 'Email is required';
    } else {
      emailMessage.value = 'Invalid email format';
    }
  };

  const validatePhone = () => {
    const phoneRegex = /^(\(\d{3}\)\s?|\d{3}-?)\d{3}-?\d{4}$/;
    if (phoneRegex.test(phone.value)) {
      phoneMessage.value = '';
    } else {
      phoneMessage.value = 'Invalid phone number format. Expected format: (123) 456-7890 or 123-456-7890.';
    }
  };

// Update password validation functions
const validatePassword = () => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~` ])[A-Za-z\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~` ]{8,}$/;

  if (regex.test(password.value)) {
    passwordMessage.value = '';
    validatePasswordMatch();
  } else {
    passwordMessage.value = 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character. Spaces are allowed.';
  }
};

const validatePasswordMatch = () => {
  if (confirmPassword.value) {
    if (confirmPassword.value !== password.value) {
      passwordMatchMessage.value = 'Passwords do not match.';
    } else {
      passwordMatchMessage.value = '';
    }
  }
};

  // Fetch hubs data
  const fetchHubs = async () => {
    try {
      const response = await fetch(`${config.public.DIRECTUS_URL}/items/wwky_hubs`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) throw new Error('Failed to fetch hubs');
      
      const data = await response.json();
      hubs.value = data.data.sort((a, b) => a.Description.localeCompare(b.Description));
    } catch (error) {
      console.error('Error fetching hubs:', error);
    }
  };

  // Initialize Google Places Autocomplete
  const initializeAutocomplete = () => {
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      const autocomplete = new google.maps.places.Autocomplete(
        mailingAddressInput.value,
        { 
          types: ['address'],
          componentRestrictions: { country: 'us' }
        }
      );

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        
        // Reset address fields
        address.value = {
          street: '',
          city: '',
          state: '',
          zip: ''
        };

        if (place.address_components) {
          for (const component of place.address_components) {
            const type = component.types[0];
            
            switch (type) {
              case 'street_number':
                address.value.street = component.long_name;
                break;
              case 'route':
                address.value.street += ' ' + component.long_name;
                break;
              case 'locality':
                address.value.city = component.long_name;
                break;
              case 'administrative_area_level_1':
                address.value.state = component.short_name;
                break;
              case 'postal_code':
                address.value.zip = component.long_name;
                break;
            }
          }
        }
      });
    } else {
      setTimeout(initializeAutocomplete, 500);
    }
  };

  // Form submission handler
  const onSubmit = () => {
    validatePhone();
    validateEmail();
    validatePassword();
    validatePasswordMatch();
    validateEquipmentDate('ph');
    validateEquipmentDate('do');

    if (emailMessage.value || phoneMessage.value || passwordMessage.value || passwordMatchMessage.value || equipmentDateErrors.value.ph || equipmentDateErrors.value.do) {
      apiError.value = 'Please fix all validation errors before submitting.';
      // Scroll to error message
      nextTick(() => {
        document.getElementById('error-message')?.scrollIntoView({ behavior: 'smooth' });
      });
      return;
    }

    // Only warn about date issues if this is an actual sampler with problematic dates
    if (hasActualDateIssue.value && isActualSampler.value) {
      dateValidationWarning.value = 'Your training date appears to have an issue. The signup will proceed, but please contact your trainer to verify the correct training date.';
    }

    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.execute();
    } else {
      message.value = 'reCAPTCHA could not load. Please refresh the page.';
    }
  };

  // Function to sanitize dates before sending to API - improved to handle non-samplers
  function sanitizeDate(dateString) {
    if (!dateString || dateString.trim() === '') return null;
    
    const validation = validateTrainingDate(dateString);
    if (!validation.isValid && !validation.isBlank) {
      // If date is invalid (but not blank), return null to prevent API errors
      console.warn(`Invalid date detected: ${dateString}, sending null instead`);
      return null;
    }
    
    return dateString;
  }

  // reCAPTCHA response handler
  const handleReCaptchaResponse = async (captchaToken) => {
    try {
    apiError.value = ''; // Clear any previous errors
    const fullAddress = `${address.value.street}, ${address.value.city}, ${address.value.state} ${address.value.zip}`.trim();

    const { data, error } = await useFetch('/api/signup', {
      method: 'POST',
      body: {
        captchaToken,
        token,
          firstName: firstName.value,
          lastName: lastName.value,
          email: email.value,
          password: password.value,
          phone: phone.value,
          county_residence: county_residence.value,
          desiredHub: desiredHub.value,
          mailing_address: fullAddress,
          address: {
            street: address.value.street,
            city: address.value.city,
            state: address.value.state,
            zip: address.value.zip
          },
          kitOption: kitOption.value,
          trainer_name: trainer_name.value,
          // Sanitize dates before sending to API
          originalTrainingDate: sanitizeDate(originalTrainingDate.value),
          trainingDateLatest: sanitizeDate(trainingDateLatest.value),
          trainingLocation: trainingLocation.value,
          training_field_chemistry: training_field_chemistry.value,
          training_r_card: training_r_card.value,
          training_habitat: training_habitat.value,
          training_biological: training_biological.value,
          training_no_training: !isActualSampler.value, 
          equip_ph: equip_ph.value,
          equip_do: equip_do.value,
          equip_cond: equip_cond.value,
          equip_thermo: equip_thermo.value,
          equip_waste: equip_waste.value,
          equip_pan: equip_pan.value,
          equip_flip: equip_flip.value,
          equip_incubator: equip_incubator.value,
          DO_expire: sanitizeDate(equip_do_expiration.value),
          PH_expire: sanitizeDate(equip_ph_expiration.value),
        }
      });

      if (error.value) {
        console.error('API error:', error.value);
        
        if (error.value.statusCode === 409) {
          apiError.value = 'An account with this email already exists. You can reset your password at the login page if needed.';
          return;
        }

        switch(error.value.statusCode) {
          case 400:
            apiError.value = 'Please check your form entries and try again.';
            break;
          case 401:
            apiError.value = 'Your session has expired. Please refresh the page and try again.';
            break;
          case 403:
            apiError.value = 'You do not have permission to perform this action.';
            break;
          case 500:
            apiError.value = 'A server error occurred. Please try again later.';
            break;
          default:
            apiError.value = error.value.data?.message || 'An unexpected error occurred. Please try again.';
        }
        // Scroll to error message
        nextTick(() => {
            document.getElementById('error-message')?.scrollIntoView({ behavior: 'smooth' });
          });
        } else if (data.value) {
          const response = data.value;
          
          if (response.status === 'success') {
            // Check if there was an email warning
            if (response.code === 'EMAIL_WARNING') {
              message.value = `⚠️ ${response.message}`;
            } else if (hasActualDateIssue.value && isActualSampler.value) {
              message.value = `✅ ${response.message}<br><br>⚠️ Note: Your training date had some issues. Please contact your trainer to verify the correct training date after logging in.`;
            } else {
              message.value = `✅ ${response.message}`;
            }
            
            showForm.value = false;
            setTimeout(() => {
              window.location.href = '/auth/signin';
            }, 3000); // Give more time for warnings
          } else {
            // Legacy support
            let successMessage = response.message || 'Account created successfully!';
            if (hasActualDateIssue.value && isActualSampler.value) {
              successMessage += '<br><br>⚠️ Note: Your training date had some issues. Please contact your trainer to verify the correct training date after logging in.';
            }
            message.value = successMessage;
            showForm.value = false;
            setTimeout(() => {
              window.location.href = '/auth/signin';
            }, 3000);
          }
        }
    } catch (err) {
      console.error('Fetch failed:', err);
      apiError.value = 'Failed to reach server. Please try again later.';
      
      // Scroll to error message
      nextTick(() => {
        document.getElementById('error-message')?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  };

  // Component mounted lifecycle hook
  onMounted(async () => {
    isLoading.value = true;
    await fetchHubs();

    window.handleReCaptchaResponse = handleReCaptchaResponse;
    const interval = setInterval(() => {
      if (typeof grecaptcha !== 'undefined' && !hasRecaptchaRendered.value) {
        if (recaptchaContainer.value) {
          if (recaptchaContainer.value.innerHTML === '') {
            grecaptcha.render(recaptchaContainer.value, {
              sitekey: config.public.RECAPTCHA_PUBLIC_KEY,
              size: 'invisible',
              callback: handleReCaptchaResponse,
            });
            hasRecaptchaRendered.value = true;
            clearInterval(interval);
          }
        }
      }
    }, 500);

    if (!token) {
      message.value = 'No user invite found. Please check your email for the correct link.';
      isLoading.value = false;
      return;
    }

    try {
      const response = await fetch('/api/invite-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.status === 404) {
        message.value = 'Invalid or expired signup link. Please check your email for the correct link. You can also ask your coordinator to resend the invite.<br><br>You may also already have a login. If you have forgotten your password, you can reset it at the login page: <a href="https://kyww.uky.edu">kyww.uky.edu</a>.';
        showForm.value = false;
        isLoading.value = false;
        return;
      } else if (!response.ok) {
        isLoading.value = false;
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.email) {
        showForm.value = true;
        email.value = data.email;
        trainer_name.value = data.trainer_name;
        originalTrainingDate.value = data.training_date;
        trainingDateLatest.value = data.training_date;
        trainingLocation.value = data.training_location;
        training_field_chemistry.value = data.training_field_chemistry;
        training_r_card.value = data.training_r_card;
        training_habitat.value = data.training_habitat;
        training_biological.value = data.training_biological;

        // Only check for date issues if this is an actual sampler with real dates
        if (isActualSampler.value) {
          const originalValidation = validateTrainingDate(originalTrainingDate.value);
          const latestValidation = validateTrainingDate(trainingDateLatest.value);
          
          if (!originalValidation.isValid || !latestValidation.isValid) {
            dateValidationWarning.value = 'There appears to be an issue with your training date. You can still complete signup, but please contact your trainer to verify the correct date.';
          }
        }
      }
    } catch (error) {
      console.error('Error during invite lookup:', error);
      message.value = 'An error occurred while checking your signup link. Please try again later.';
      isLoading.value = false;
      showForm.value = false;
    }

    await nextTick();
    initializeAutocomplete();
    isLoading.value = false;
  });

  // Head configuration
  useHead({
    meta: [
      { name: 'color-scheme', content: 'light' }
    ],
    script: [
      {
        src: 'https://www.google.com/recaptcha/api.js?render=explicit',
        async: true,
        defer: true,
      },
      {
        src: `https://maps.googleapis.com/maps/api/js?key=${config.public.GOOGLE_MAPS_API_KEY}&libraries=places`,
        async: true,
        defer: true,
      },
    ],
  });
</script>

<style scoped>
  input[type="text"],
  input[type="email"],
  input[type="password"],
  input[type="tel"],
  input[type="date"],
  select,
  textarea {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    box-sizing: border-box;
    background-color: #ffffff;
    color: #000000;
  }

  input[type="text"]:focus,
  input[type="email"]:focus,
  input[type="password"]:focus,
  input[type="tel"]:focus,
  input[type="date"]:focus,
  select:focus,
  textarea:focus {
    border-color: #666;
    outline: none;
    box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.5);
  }

  /* Force color scheme */
  @media (prefers-color-scheme: dark) {
    input[type="text"],
    input[type="email"],
    input[type="password"],
    input[type="tel"],
    input[type="date"],
    select,
    textarea {
      background-color: #ffffff !important;
      color: #000000 !important;
      -webkit-text-fill-color: #000000 !important;
    }
  }

  .readonly-field,
  input:disabled,
  textarea:disabled,
  select:disabled {
    background-color: #f0f0f0 !important;
    color: #666666 !important;
    -webkit-text-fill-color: #666666 !important;
  }

  .page-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background-color: #f4f4f9;
  }
  
  .signup-form-container {
    width: 100%;
    max-width: 500px;
    padding: 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    text-align: left;
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
    text-align: center;
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
  
  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
  }
  
  .checkbox-group label {
    margin: 0;
  }
  
  .readonly-field {
    background-color: #f0f0f0;
    color: #888;
    border: 1px solid #ddd;
    cursor: not-allowed;
  }

  .read-group {
    display: flex;
    align-items: left;
    gap: 0.5rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    margin-left: 1.0rem;
  }

  .read-group-div {
    align-items: left;
    gap: 0.5rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    margin-left: 1.0rem;
  }

  input[type="checkbox"].readonly-checkbox {
    appearance: none;
    width: 20px;
    height: 20px;
    background-color: #e0e0e0;
    border: 1px solid #333;
    position: relative;
    pointer-events: none;
  }

  input[type="checkbox"].readonly-checkbox:checked {
    background-color: #333;
  }

  .read-group-div label {
    font-weight: normal;
    color: #801a1a;
  }

  .read-group-div input[type="text"] {
    font-weight: normal;
    color: #333;
  }

  input[type="checkbox"].readonly-checkbox {
    appearance: none;
    width: 20px;
    height: 20px;
    background-color: #ffffff;  /* Changed from #e0e0e0 to white */
    border: 2px solid #666;     /* Made border thicker and darker */
    border-radius: 3px;
    position: relative;
    pointer-events: none;
    cursor: not-allowed;
  }

  input[type="checkbox"].readonly-checkbox:checked {
    background-color: #4CAF50;  /* Changed from #333 to green */
    border-color: #4CAF50;
  }

  input[type="checkbox"].readonly-checkbox:checked::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 14px;
    font-weight: bold;
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

  .submit-button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  .info-text {
    display: block;
    font-size: 0.85rem;
    color: #6c757d;
    margin-top: 0.25rem;
  }

  .password-message {
    font-size: 0.85rem;
    color: #dc3545;
    margin-top: 0.25rem;
  }

  .address-group {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 1rem;
  }

  .message {
    margin: 1rem 0;
    padding: 1rem;
    border-radius: 0.375rem;
    text-align: left;
  }

  .success-message {
    background-color: #F0FDF4;
    border: 1px solid #86EFAC;
    color: #166534;
  }

  .error-message {
    background-color: #FEF2F2;
    border: 1px solid #FCA5A5;
    color: #B91C1C;
  }

  .warning-message {
    background-color: #FFFBEB;
    border: 1px solid #FDE68A;
    color: #92400E;
  }

  .relative {
    position: relative;
  }

  .absolute {
    position: absolute;
  }

  .right-2 {
    right: 0.5rem;
  }

  .transform {
    transform: translate(0, -50%);
  }

  button {
    background: none;
    border: none;
    cursor: pointer;
  }

  input[type="password"],
  input[type="text"] {
    padding-right: 2.5rem;
  }

  .date-warning {
    border-color: #f59e0b !important;
    background-color: #fffbeb !important;
  }

  .date-warning-text {
    font-size: 0.85rem;
    color: #92400e;
    margin-top: 0.25rem;
    font-style: italic;
  }

  .flex {
    display: flex;
  }

  .items-center {
    align-items: center;
  }
</style>