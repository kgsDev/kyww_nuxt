<template>
  <div class="page-container">
    <div class="signup-form-container">
      <div class="logo-container">
        <img class="logo" src="~/assets/KyWW_logo.png" alt="KyWW Logo" />
      </div>
      <LoadingOverlay :isLoading="isLoading" />
      <p v-if="message" v-html="message" class="message"></p>


      <form ref="signupForm" v-if="showForm" @submit.prevent="onSubmit">
        <h2>Welcome to Kentucky Watershed Watch!</h2>
        <h1>We greatly appreciate your interest in supporting the organization and Kentucky's waterways with your stream sampling efforts.
        <br><br> 
        This data portal will serve as your access point to information about participation, including identifying other samplers and sampling sites and finding support hub locations. 
        It will also enable you to enter your monitoring data.<br><br>
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
          <input type="password" v-model="password" id="password" required @input="validatePassword" />
          <small class="info-text">Password must be at least 8 characters and include uppercase, lowercase, number, and special character. Password can contain spaces.</small>
          <p v-if="passwordMessage" class="password-message">{{ passwordMessage }}</p>
        </div>

        <div class="form-group">
          <label for="confirmPassword">Re-enter Password:</label>
          <input type="password" v-model="confirmPassword" id="confirmPassword" required @input="validatePasswordMatch" />
          <p v-if="passwordMatchMessage" class="password-message">{{ passwordMatchMessage }}</p>
        </div>

        <!-- Read-only Sampler Data Fields from Token -->
        <label>Details from your Training (read only):</label>
        <div class="read-group-div">
          <div class="form-group">
            <label>Original Training Date:</label>
            <input type="text" :value="originalTrainingDate" disabled class="readonly-field"/>
          </div>
          <div class="form-group">
            <label>Latest Training Date:</label>
            <input type="text" :value="trainingDateLatest" disabled readonly  class="readonly-field"/>
          </div>
          <div class="form-group">
            <label>Training Location:</label>
            <input type="text" :value="trainingLocation" disabled readonly  class="readonly-field"/>
          </div>

          <label>Training Completed:</label>

          <div class="form-group read-group">
            <label>Field Chemistry: <input type="checkbox" :checked="training_field_chemistry" disabled readonly  class="readonly-checkbox"/></label>
          </div>
          <div class="form-group read-group">
            <label>R-Card:
            <input type="checkbox" :checked="training_r_card" disabled readonly class="readonly-checkbox"/></label>
          </div>
          <div class="form-group read-group">
            <label>Habitat:
            <input type="checkbox" :checked="training_habitat" disabled readonly class="readonly-checkbox"/></label>
          </div>
          <div class="form-group read-group">
            <label>Biological:
            <input type="checkbox" :checked="training_biological" disabled readonly class="readonly-checkbox"/></label>
          </div>
        </div>

        <label>Please Enter the Equipment Issued:</label>

        <div class="form-group read-group">
          <div class="form-group">
            <label>pH kit: <input type="checkbox" :checked="equip_ph" v-model="equip_ph"/></label>
          </div>
          <div v-if="equip_ph" class="form-group">
            <label>pH Kit Expiration Date:
            <input type="date" v-model="equip_ph_expiration" id="equip_ph_expiration"/></label>
          </div>
          <div class="form-group">
            <label>Dissolved oxygen kit:
            <input type="checkbox" :checked="equip_do" v-model="equip_do"/></label>
          </div>
          <div v-if="equip_do" class="form-group">
            <label>DO Kit Expiration Date:
            <input type="date" v-model="equip_do_expiration" id="equip_do_expiration"/></label>
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
            <label>Waste container:
              <input type="checkbox" v-model="equip_waste" />
            </label>
          </div>
          <div class="form-group">
            <label>
              White pan:
              <input type="checkbox" v-model="equip_pan" />
            </label>
          </div>
          <div class="form-group">
            <label>
              Instructional flip cards:
              <input type="checkbox" v-model="equip_flip" />
            </label>
          </div>
          <div class="form-group">
            <label>
              Incubator:
              <input type="checkbox" v-model="equip_incubator" />
            </label>
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
              readonly
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
          <label for="county_residence">County of Residence:</label>
          <select v-model="county_residence" id="county_residence" required>
            <option v-for="county in counties" :key="county.id" :value="county.id">{{ county.name }}</option>
          </select>
          <small class="info-text">Required.</small>
        </div>

        <!-- Sampling Kit Section with Radio Buttons -->
        <label class="block font-bold mt-4">Sampling Kit:</label>
        <div class="form-group">
          <label>
            <input type="radio" v-model="kitOption" value="personal" />
            I have been issued my own kit to use until I no longer participate in sampling.
          </label>
          <label>
            <input type="radio" v-model="kitOption" value="borrow" />
            I plan to borrow a kit from a nearby Support Hub.
          </label>
        </div>

        <div class="form-group">
          <label for="desiredHub">Support Hub location:</label>
          <select v-model="desiredHub" id="desiredHub" required>
            <option value="">Select a Support Hub</option>
            <option v-for="hub in hubs" :key="hub.id" :value="hub.id">
              {{ hub.Basin }} - {{ hub.Description }}
            </option>
          </select>
        </div>

          <!-- Submit Button -->
        <p v-if="message_submit" v-html="message_submit" class="message"></p>
        <button
          type="submit"
          class="submit-button g-recaptcha"
          data-sitekey="6LeSlG4qAAAAAKo9KheTqBdOD1HhHGxjCAvt9Seg"
          data-callback="onSubmit"
          data-size="invisible"
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
  import { useRoute, useFetch } from '#app';
  import LoadingOverlay from '/components/LoadingOverlay.vue'

  definePageMeta({
    layout: 'blank',
    ssr: false  // Add this to prevent SSR issues
  });

  const isLoading = ref(true);
  const config = useRuntimeConfig();
  const route = useRoute();
  const token = route.query.token;

  // Form data refs
  const showForm = ref(false);
  const message = ref('');
  const message_submit = ref('');
  const firstName = ref('');
  const lastName = ref('');
  const email = ref('');
  const password = ref('');
  const confirmPassword = ref('');
  const passwordMessage = ref('');
  const passwordMatchMessage = ref('');
  const phone = ref('');
  const mailing_address = ref('');
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

  // Counties data array
  const counties = [
    { id: '', name: 'Select a county' }, // Default option
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
    { id: 'kentont', name: 'Kenton' },
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

  const validatePassword = () => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?& ]{8,}$/;
    if (regex.test(password.value)) {
      passwordMessage.value = '';
    } else {
      passwordMessage.value = 'Password does not meet security requirements.';
    }
  };

  const validatePasswordMatch = () => {
    if (confirmPassword.value !== password.value) {
      passwordMatchMessage.value = 'Passwords do not match.';
    } else {
      passwordMatchMessage.value = '';
    }
  };

  // Computed properties
  const isFormValid = computed(() => {
    return (
      !emailMessage.value &&
      !phoneMessage.value &&
      !passwordMessage.value &&
      !passwordMatchMessage.value &&
      email.value &&
      password.value &&
      confirmPassword.value
    );
  });
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
      hubs.value = data.data.sort((a, b) => {
        if (a.Basin === b.Basin) {
          return a.Description.localeCompare(b.Description);
        }
        return a.Basin.localeCompare(b.Basin);
      });
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

    if (emailMessage.value || phoneMessage.value || passwordMessage.value || passwordMatchMessage.value) {
      message_submit.value = 'Please fix validation errors before submitting.';
      return;
    }

    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.execute();
    } else {
      message.value = 'reCAPTCHA could not load. Please refresh the page.';
    }
  };

  // reCAPTCHA response handler
  const handleReCaptchaResponse = async (captchaToken) => {
    try {
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
          originalTrainingDate: originalTrainingDate.value,
          trainingDateLatest: trainingDateLatest.value,
          trainingLocation: trainingLocation.value,
          training_field_chemistry: training_field_chemistry.value,
          training_r_card: training_r_card.value,
          training_habitat: training_habitat.value,
          training_biological: training_biological.value,
          equip_ph: equip_ph.value,
          equip_do: equip_do.value,
          equip_cond: equip_cond.value,
          equip_thermo: equip_thermo.value,
          equip_waste: equip_waste.value,
          equip_pan: equip_pan.value,
          equip_flip: equip_flip.value,
          equip_incubator: equip_incubator.value,
          DO_expire: equip_do_expiration.value,
          PH_expire: equip_ph_expiration.value,
        }
      });

      if (error.value) {
        console.error('API error:', error.value);
        
        if (error.value.statusCode === 409) {
          message_submit.value = 'An account with this email already exists. You can reset your password at the login page if needed.';
          setTimeout(() => {
            navigateTo('/auth/signin');
          }, 3000);
          return;
        }
        
        switch(error.value.statusCode) {
          case 400:
            message_submit.value = 'Please check your form entries and try again.';
            break;
          case 401:
            message_submit.value = 'Your session has expired. Please refresh the page and try again.';
            break;
          case 403:
            message_submit.value = 'You do not have permission to perform this action.';
            break;
          case 500:
            message_submit.value = 'A server error occurred. Please try again later.';
            break;
          default:
            message_submit.value = error.value.data?.message || 'An unexpected error occurred. Please try again.';
        }
      } else if (data.value?.message) {
        showForm.value = false;
        message.value = data.value.message;
        setTimeout(() => {
          window.location.href = 'https://kyww.uky.edu';
        }, 2000);
      } else {
        console.error('Unexpected response format:', data);
        message_submit.value = 'An unexpected error occurred during signup.';
      }
    } catch (err) {
      console.error('Fetch failed:', err);
      message_submit.value = 'Failed to reach server. Please try again later.';
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
        return;
      } else if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.email) {
        showForm.value = true;
        email.value = data.email;
        originalTrainingDate.value = data.training_date;
        trainingDateLatest.value = data.training_date;
        trainingLocation.value = data.training_location;
        training_field_chemistry.value = data.training_field_chemistry;
        training_r_card.value = data.training_r_card;
        training_habitat.value = data.training_habitat;
        training_biological.value = data.training_biological;
      }
    } catch (error) {
      console.error('Error during invite lookup:', error);
      message.value = 'An error occurred while checking your signup link. Please try again later.';
      showForm.value = false;
    }

    await nextTick();
    initializeAutocomplete();
    isLoading.value = false;
  });

  // Head configuration
  useHead({
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
    background-color: #f0f0f0; /* Light grey to indicate read-only */
    color: #888; /* Grey text color */
    border: 1px solid #ddd; /* Subtle border for clarity */
    cursor: not-allowed; /* Cursor indicates non-editable */
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
    appearance: none; /* Remove default checkbox appearance */
    width: 20px;
    height: 20px;
    background-color: #e0e0e0; /* Light grey background */
    border: 1px solid #333; /* Darker border for better visibility */
    position: relative;
    pointer-events: none; /* Make it non-interactive */
  }

  input[type="checkbox"].readonly-checkbox:checked {
    background-color: #333; /* Dark background for checked state */
  }

  .read-group-div label {
    font-weight: normal;
    color: #801a1a; /* Dark grey text for visibility */
  }

  .read-group-div input[type="text"] {
    font-weight: normal;
    color: #333; /* Dark grey text for visibility */
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
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

  .address-group {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 1rem;
  }
  </style>