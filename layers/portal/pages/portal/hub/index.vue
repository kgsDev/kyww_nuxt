<script setup lang="ts">
import { UInput } from '#components';

const { loadGoogleMaps, isLoaded } = useGoogleMaps();
const { user } = useDirectusAuth();
const loading = ref(false);
const error = ref(null);
const isConfirmationModalOpen = ref(false);
const showSuccessModal = ref(false);

const counties = ["Adair", "Allen", "Anderson", "Ballard", "Barren", "Bath", "Bell", "Boone", "Bourbon", "Boyd", "Boyle", "Bracken", "Breathitt", "Breckinridge", "Bullitt", "Butler", "Caldwell", "Calloway", "Campbell", "Carlisle", "Carroll", "Carter", "Casey", "Christian", "Clark", "Clay", "Clinton", "Crittenden", "Cumberland", "Daviess", "Edmonson", "Elliott", "Estill", "Fayette", "Fleming", "Floyd", "Franklin", "Fulton", "Gallatin", "Garrard", "Grant", "Graves", "Grayson", "Green", "Greenup", "Hancock", "Hardin", "Harlan", "Harrison", "Hart", "Henderson", "Henry", "Hickman", "Hopkins", "Jackson", "Jefferson", "Jessamine", "Johnson", "Kenton", "Knott", "Knox", "Larue", "Laurel", "Lawrence", "Lee", "Leslie", "Letcher", "Lewis", "Lincoln", "Livingston", "Logan", "Lyon", "McCracken", "McCreary", "McLean", "Madison", "Magoffin", "Marion", "Marshall", "Martin", "Mason", "Meade", "Menifee", "Mercer", "Metcalfe", "Monroe", "Montgomery", "Morgan", "Muhlenberg", "Nelson", "Nicholas", "Ohio", "Oldham", "Owen", "Owsley", "Pendleton", "Perry", "Pike", "Powell", "Pulaski", "Robertson", "Rockcastle", "Rowan", "Russell", "Scott", "Shelby", "Simpson", "Spencer", "Taylor", "Todd", "Trigg", "Trimble", "Union", "Warren", "Washington", "Wayne", "Webster", "Whitley", "Wolfe", "Woodford"];
const basins = ["North Fork Kentucky River", "South Fork Kentucky River", "Kentucky River", "Licking River", "Salt River", "Green River", "Barren River", "Cumberland River", "Tennessee River", "Ohio River", "Mississippi River"];

const addressInput = ref(null);

const formData = reactive({
  description: '',
  organization: '',
  full_address: '',
  mailing_address: '',
  contact_person: '',
  availability: '',
  phone: '',
  email: '',
  county: [],
  basin: [],
  sampling_kits: false,
  incubator: false,
  biological_kit: false,
  events_and_meetings: false,
  site_selection_assist: false,
  data_entry_assist: false,
  interpret_findings: false,
  coordinate_community: false,
  host_outreach_materials: false,
  latitude: null,
  longitude: null,
});

// Form validation
const formErrors = reactive({
  description: '',
  organization: '',
  full_address: '',
  mailing_address: '',
  contact_person: '',
  availability: '',
  phone: '',
  email: '',
  basin: '',
});

// Validate form fields
function validateForm() {
  let isValid = true;
  
  // Reset all form errors
  formErrors.description = '';
  formErrors.organization = '';
  formErrors.full_address = '';
  formErrors.mailing_address = '';
  formErrors.contact_person = '';
  formErrors.availability = '';
  formErrors.phone = '';
  formErrors.email = '';
  formErrors.basin = '';

  // Check required fields
  if (!formData.description) {
    formErrors.description = 'Hub name is required';
    isValid = false;
  }
  if (!formData.organization) {
    formErrors.organization = 'Organization is required';
    isValid = false;
  }
  if (!formData.full_address) {
    formErrors.full_address = 'Physical address is required';
    isValid = false;
  }
  if (!formData.mailing_address) {
    formErrors.mailing_address = 'Mailing address is required';
    isValid = false;
  }
  if (!formData.contact_person) {
    formErrors.contact_person = 'Contact person is required';
    isValid = false;
  }
  if (!formData.availability) {
    formErrors.availability = 'Availability is required';
    isValid = false;
  }
  if (!formData.phone) {
    formErrors.phone = 'Phone is required';
    isValid = false;
  }
  if (!formData.email) {
    formErrors.email = 'Email is required';
    isValid = false;
  }
  if (formData.basin.length === 0) {
    formErrors.basin = 'At least one basin must be selected';
    isValid = false;
  }

  return isValid;
}

const phoneError = ref('');
const emailError = ref('');

// Email validation function
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Phone validation function
function isValidPhone(phone: string): boolean {
  return /^\d{3}[-.]?\d{3}[-.]?\d{4}$/.test(phone.replace(/\s/g, ''));
}

// Format phone number as user types
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return phone;
}

// Add watchers for real-time validation
watch(() => formData.email, (newEmail) => {
  if (!newEmail) {
    emailError.value = '';
  } else if (!isValidEmail(newEmail)) {
    emailError.value = 'Please enter a valid email address';
  } else {
    emailError.value = '';
  }
});

watch(() => formData.phone, (newPhone) => {
  if (!newPhone) {
    phoneError.value = '';
    return;
  }
  
  // Format phone number as user types
  const formattedPhone = formatPhoneNumber(newPhone);
  if (formattedPhone !== newPhone) {
    formData.phone = formattedPhone;
  }
  
  if (!isValidPhone(newPhone)) {
    phoneError.value = 'Please enter a valid phone number (XXX-XXX-XXXX)';
  } else {
    phoneError.value = '';
  }
});

// Compute if form is valid for submit button
const isFormValid = computed(() => {
  return formData.description &&
    formData.organization &&
    formData.full_address &&
    formData.mailing_address &&
    formData.contact_person &&
    formData.availability &&
    formData.phone &&
    formData.email &&
    formData.basin.length > 0;
});

// Handle form submission attempt
function handleSubmitAttempt() {
  if (validateForm()) {
    isConfirmationModalOpen.value = true;
  }
}

// Initialize Google Places Autocomplete
// Modified initialization function
function initializeAutocomplete() {
  nextTick(() => {
    if (!addressInput.value) {
      console.log('Input not found');
      return;
    }

    const inputElement = addressInput.value.$el.querySelector('input');
    
    if (!inputElement) {
      console.log('Input element not found');
      return;
    }

    try {
      const autocomplete = new google.maps.places.Autocomplete(inputElement, {
        types: ['address'],
        componentRestrictions: { country: 'us' }
      });

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
          formData.full_address = place.formatted_address;
          
          // If "same as physical address" is checked, update mailing address
          if (copyAddress.value) {
            formData.mailing_address = place.formatted_address;
          }

          // Get coordinates directly from place object
          if (place.geometry && place.geometry.location) {
            formData.latitude = place.geometry.location.lat();
            formData.longitude = place.geometry.location.lng();
          }
        }
      });
    } catch (error) {
      console.error('Error initializing autocomplete:', error);
    }
  });
}

const copyAddress = ref(false);

// Watch for changes in copyAddress and physical address
watch([copyAddress, () => formData.full_address], ([newCopy, newAddress]) => {
  if (newCopy) {
    formData.mailing_address = formData.full_address;
  }
});

const showSuccess = ref(false);

async function resetForm() {
  showSuccessModal.value = false;
  isConfirmationModalOpen.value = false;
  // Reset all form fields
  formData.description = '';
  formData.organization = '';
  formData.basin = [];
  formData.county = [];
  formData.full_address = '';
  formData.mailing_address = '';
  formData.contact_person = '';
  formData.phone = '';
  formData.email = '';
  formData.availability = '';
  formData.sampling_kits = false;
  formData.incubator = false;
  formData.biological_kit = false;
  formData.events_and_meetings = false;
  formData.site_selection_assist = false;
  formData.data_entry_assist = false;
  formData.interpret_findings = false;
  formData.coordinate_community = false;
  formData.host_outreach_materials = false;
  formData.latitude = null;
  formData.longitude = null;
  
  // Reset other form state
  copyAddress.value = false;
  error.value = null;
}

async function submitData() {
  try {
    loading.value = true;
    error.value = null;
    showSuccess.value = false;

    const hubData = {
      Description: formData.description,
      organization: formData.organization,
      Basin: formData.basin.join(', '),
      County: formData.county.join(', '),
      Full_Address: formData.full_address,
      mailing_address: formData.mailing_address,
      Contact_Person: formData.contact_person,
      Phone: formData.phone,
      Email: formData.email,
      Availability: formData.availability,
      Sampling_kits: formData.sampling_kits,
      Incubator: formData.incubator,
      Biological_kit: formData.biological_kit,
      Events_and_meetings: formData.events_and_meetings,
      Site_selection_assist: formData.site_selection_assist,
      Data_entry_assistance: formData.data_entry_assist,
      Interpret_findings: formData.interpret_findings,
      Coordinate_community: formData.coordinate_community,
      Host_outreach_materials: formData.host_outreach_materials,
      latitude: formData.latitude,
      longitude: formData.longitude,
      user_created: user.value?.id
    };

    const result = await useDirectus(createItem('wwky_hubs', hubData));
 
    // Close confirmation modal and show success modal
    isConfirmationModalOpen.value = false;
    showSuccessModal.value = true;

  } catch (err) {
	isConfirmationModalOpen.value = false
    console.error('Submission error:', err);
    error.value = `Failed to create hub: ${err.message}`;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadGoogleMaps();
  if (isLoaded.value) {
    initializeAutocomplete();
  }
});

const viewHubList = () => {
	navigateTo('/portal/hub/hub-list');
};
</script>
<template>
	<div>
	  <PortalPageHeader
		title="New Hub"
		:breadcrumbs="[
		  {
			title: 'Portal',
			href: '/portal',
		  },
		  {
			title: 'Hub',
			href: '/portal/hub',
		  },
		]"
	  />
  
	  <div class="max-w-4xl mx-auto">
		<h1 class="text-2xl font-bold text-center text-gray-900 mb-6">
		  Kentucky Watershed Watch New Hub Form
		</h1>
  
		<!-- Existing alert for errors -->
		<UAlert
		v-if="error"
		type="error"
		:title="error"
		class="mb-4"
		/>

 
		<Form @submit.prevent="handleSubmitAttempt">
        <div class="space-y-6">
          <!-- Basic Information Section -->
          <div class="bg-white rounded-lg shadow p-6">
			  <h2 class="text-lg font-medium mb-4">Basic Information</h2>
			  
			  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<UFormGroup
					label="Hub Name"
					required
					class="space-y-1"
					:error="formErrors.description"
				>
					<UInput
					v-model="formData.description"
					icon="ph:building"
					/>
					<span class="text-xs text-gray-500">
					Enter the name of the hub
					</span>
				</UFormGroup>
 
				<UFormGroup
				  label="Organization"
				  required
				  class="space-y-1"
				  :error="formErrors.organization"
				>
				  <UInput
					v-model="formData.organization"
					icon="clarity:organization-line"
				  />
				  <span class="text-xs text-gray-500">
					Organization or individual sponsoring this hub
				  </span>
				</UFormGroup>
			  </div>
  
			  <!-- Address Section -->
			  <div class="mt-4">
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<UFormGroup
						label="Physical Address"
						required
						class="space-y-1"
						:error="formErrors.full_address"
					>
					<UInput
						v-model="formData.full_address"
						ref="addressInput"
						type="text"
						placeholder="Enter address"
						/>
						<span class="text-xs text-gray-500">
							Street address for the hub location
						</span>
					</UFormGroup>
  
				  <div class="space-y-2">
					<UFormGroup
					  label="Mailing Address"
					  required
					  class="space-y-1"
					  :error="formErrors.mailing_address"
					>
					  <UInput
						v-model="formData.mailing_address"
						:disabled="copyAddress"
					  />
					  <span class="text-xs text-gray-500">
						PO Box or other mailing address
					  </span>
					</UFormGroup>
					
					<UCheckbox
					  v-model="copyAddress"
					  label="Same as physical address"

					/>
				  </div>
				</div>
			</div>
			<div class="flex">
				<UFormGroup 
					label="Contact Name" 
					required 
					class="p-2 basis-1/2"
					:error="formErrors.contact_person"
				>
					<UTextarea v-model="formData.contact_person" icon="" />
					<span class="text-xs text-gray-500">Enter the primary contact person or persons at this hub</span>
				</UFormGroup>
				<UFormGroup 
					label="Availability Description" 
					required
					class="p-2 basis-1/2"
					:error="formErrors.availability"
				>
					<UTextarea v-model="formData.availability" icon="" />
					<span class="text-xs text-gray-500">Enter the days and times the hub is available for sampling kit check-out and drop-off (e.g.: M-F 8:00 am to 4:30 pm. Contact to schedule outside of normal times.)</span>
				</UFormGroup>
			</div>
			<div class="flex">
					<!-- Phone input -->
					<UFormGroup 
						label="Phone" 
						required 
						class="p-2 basis-1/2" 
						:error="phoneError"
					>
						<UInput
						v-model="formData.phone"
						icon="bx:bxs-phone"
						type="tel"
						placeholder="XXX-XXX-XXXX"
						:status="phoneError ? 'error' : formData.phone ? 'success' : undefined"
						/>
						<span v-if="!phoneError && formData.phone" class="text-xs text-green-600">
						Valid phone number format
						</span>
					</UFormGroup>

					<!-- Email input -->
					<UFormGroup 
						class="p-2 basis-1/2" 
						label="Email" 
						required 
						:error="emailError"
					>
						<UInput
						v-model="formData.email"
						icon="bx:bxs-envelope"
						type="email"
						placeholder="email@example.com"
						:status="emailError ? 'error' : formData.email ? 'success' : undefined"
						/>
						<span v-if="!emailError && formData.email" class="text-xs text-green-600">
						Valid email format
						</span>
					</UFormGroup>
			</div>
			<div class="flex">
				<UFormGroup class="p-2 basis-1/2" label="Basin" required :error="formErrors.basin">
					<USelectMenu 
						v-model="formData.basin" 
						:options="basins" 
						icon="bx:bxs-flag" 
						multiple 
						searchable 
						placeholder="Basin"
					/>
					</UFormGroup>
					<UFormGroup class="p-2 basis-1/2" label="County" required>
					<USelectMenu 
						v-model="formData.county" 
						:options="counties" 
						icon="bx:bxs-flag" 
						multiple 
						searchable 
						placeholder="County"
					/>
				</UFormGroup>
			</div>
		</div>
		<div class="bg-white rounded-lg shadow p-6">
			<h2 class="text-lg font-medium mb-4">Services Offered</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<UFormGroup class="p-2 basis-1/3">
				<UCheckbox v-model="formData.sampling_kits" label="Host sampling kits for check-out" />
				<UCheckbox v-model="formData.incubator" label="Host incubator for E. coli analysis" />
				<UCheckbox v-model="formData.biological_kit" label="Host biological sampling kits" />
			</UFormGroup>
			<UFormGroup class="p-2 basis-1/3">
				<UCheckbox v-model="formData.events_and_meetings" label="Host sampler training events and meetings" />
				<UCheckbox v-model="formData.site_selection_assist" label="Assist with sampling site selection" />
				<UCheckbox v-model="formData.data_entry_assist" label="Provide assistance with volunteer data entry" />
			</UFormGroup>
			<UFormGroup class="p-2 basis-1/3">
				<UCheckbox v-model="formData.interpret_findings" label="Help interpret water quality findings" />
				<UCheckbox v-model="formData.coordinate_community" label="Help coordinate community water projects" />
				<UCheckbox v-model="formData.host_outreach_materials" label="Host outreach materials" />
			</UFormGroup>
		</div>
	</div>
	<div class="flex justify-end">
		<UButton
			type="submit"
			:loading="loading"
			:disabled="!isFormValid"
			color="primary"
			variant="solid"
		>
			Create Hub
		</UButton>
	</div>
  </div>
</Form>

<!-- Success Modal -->
  <UModal
    v-model="showSuccessModal"
    prevent-close
  >
    <UCard>
      <template #header>
        <div class="text-xl font-bold text-green-600">Success!</div>
      </template>
      
      <div class="p-4">
        <p>Hub has been successfully created.</p>
      </div>
      <div class="flex justify-center space-x-4 p-4 text-center">
        <UButton variant="outline" @click="resetForm" label="Submit Another Hub" />
        <UButton variant="solid" @click="viewHubList" label="View Hub List" />
      </div>
    </UCard>
  </UModal>

    <!-- Confirmation Modal -->
    <UModal
      v-model="isConfirmationModalOpen"
      prevent-close
    >
      <UCard>
        <template #header>
          <div class="text-xl font-bold">Confirm Submission</div>
        </template>
        
        <div class="space-y-4">
          <p>Please review the following information:</p>
          
          <div class="bg-gray-50 p-4 rounded">
            <dl class="space-y-2">
              <div>
                <dt class="font-medium">Hub Name:</dt>
                <dd>{{ formData.description }}</dd>
              </div>
              <div>
                <dt class="font-medium">Organization:</dt>
                <dd>{{ formData.organization }}</dd>
              </div>
              <div>
                <dt class="font-medium">Physical Address:</dt>
                <dd>{{ formData.full_address }}</dd>
              </div>
              <div>
                <dt class="font-medium">Mailing Address:</dt>
                <dd>{{ formData.mailing_address }}</dd>
              </div>
              <div>
                <dt class="font-medium">Contact Person:</dt>
                <dd>{{ formData.contact_person }}</dd>  
              </div>
              <div>
                <dt class="font-medium">Phone:</dt>
                <dd>{{ formData.phone }}</dd>
              </div>
              <div>
                <dt class="font-medium">Email:</dt>
                <dd>{{ formData.email }}</dd>
              </div>
              <div>
                <dt class="font-medium">Availability:</dt>
                <dd>{{ formData.availability }}</dd>
              </div>
              <div>
                <dt class="font-medium">Basin(s):</dt>
                <dd>{{ formData.basin.join(', ') }}</dd>
              </div>
              <div>
                <dt class="font-medium">Counties:</dt>
                <dd>{{ formData.county.join(', ') }}</dd>
              </div>
              <div>
                <dt class="font-medium">Services Offered:</dt>
                <dd>
                  <ul class="list-disc list-inside">
                    <li v-if="formData.sampling_kits">Host sampling kits for check-out</li>
                    <li v-if="formData.incubator">Host incubator for E. coli analysis</li>
                    <li v-if="formData.biological_kit">Host biological sampling kits</li>
                    <li v-if="formData.events_and_meetings">Host sampler training events and meetings</li>
                    <li v-if="formData.site_selection_assist">Assist with sampling site selection</li>
                    <li v-if="formData.data_entry_assist">Provide assistance with volunteer data entry</li>
                    <li v-if="formData.interpret_findings">Help interpret water quality findings</li>
                    <li v-if="formData.coordinate_community">Help coordinate community water projects</li>
                    <li v-if="formData.host_outreach_materials">Host outreach materials</li>
                  </ul>
                </dd>
              </div>            
              <!-- Add other important fields to review -->
            </dl>
          </div>
          
          <p class="text-sm text-gray-600">
            Are you sure you want to create this hub?
          </p>
        </div>

        <template #footer>
          <div class="flex justify-end space-x-4">
            <UButton
              color="gray"
              variant="soft"
              @click="isConfirmationModalOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :loading="loading"
              @click="submitData"
            >
              Confirm & Create
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</div>
</template>

<style>
.form-label {
  @apply text-sm font-medium text-gray-700;
}

.helper-text {
  @apply text-xs text-gray-500 mt-1;
}
.embed-container {
	position: relative;
	padding-bottom: 80%;
	height: 0;
	max-width: 100%;
}
.embed-container iframe,
.embed-container object,
.embed-container iframe {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
}
small {
	position: absolute;
	z-index: 40;
	bottom: 0;
	margin-bottom: -15px;
}
</style>
