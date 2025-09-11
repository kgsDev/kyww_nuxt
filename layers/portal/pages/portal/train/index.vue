<script setup lang="ts">
import { ref, computed } from 'vue'
import PolicyGuard from '../../components/PolicyGuard.vue'

const { user } = useDirectusAuth()

// Refs for form data
const emails = ref('')
const training_date = ref('')
const training_location = ref('')
const training_field_chemistry = ref(false)
const training_r_card = ref(false)
const training_habitat = ref(false)
const training_biological = ref(false)
const training_no_training = ref(false)
const error = ref('')
const success = ref('')
const showModal = ref(false)
const showSuccessModal = ref(false)

const hasTrainingSelected = computed(() => {
	return training_field_chemistry.value || 
			training_r_card.value || 
			training_habitat.value || 
			training_biological.value ||
			training_no_training.value;
});

// Watch for "No Training" checkbox changes to clear other checkboxes
const onNoTrainingChange = () => {
	if (training_no_training.value) {
		training_field_chemistry.value = false;
		training_r_card.value = false;
		training_habitat.value = false;
		training_biological.value = false;
		// Clear date and location when no training is selected
		training_date.value = '';
		training_location.value = '';
	}
};

// Watch for other training checkboxes to clear "No Training"
const onTrainingTypeChange = () => {
	if (training_field_chemistry.value || training_r_card.value || 
		training_habitat.value || training_biological.value) {
		training_no_training.value = false;
	}
};

// Computed property to check if date and location are required
const isDateLocationRequired = computed(() => {
	return !training_no_training.value;
});

// Enhanced date validation
function validateTrainingDate(dateString: string): { isValid: boolean; message: string } {
	// If no training conducted, date is not required
	if (!isDateLocationRequired.value) {
		return { isValid: true, message: '' };
	}
	
	if (!dateString?.trim()) {
		return { isValid: false, message: 'Training date is required' };
	}

	const selectedDate = new Date(dateString);
	const today = new Date();
	const currentYear = today.getFullYear();
	
	// Check if date is valid
	if (isNaN(selectedDate.getTime())) {
		return { isValid: false, message: 'Please enter a valid date' };
	}
	
	// Check if year is reasonable (between 2020 and current year + 2)
	const selectedYear = selectedDate.getFullYear();
	if (selectedYear < 2020 || selectedYear > currentYear + 5) {
		return { isValid: false, message: `Valid training date must be between 2020 and ${currentYear + 5}` };
	}
	
	// Check if date is not more than 2 years in the future
	const fiveYearsFromNow = new Date();
	fiveYearsFromNow.setFullYear(currentYear + 5);
	
	if (selectedDate > fiveYearsFromNow) {
		return { isValid: false, message: 'Training date cannot be more than 5 years in the future' };
	}
	
	return { isValid: true, message: '' };
}

const dateValidation = computed(() => {
	return validateTrainingDate(training_date.value);
});

const canSubmit = computed(() => {
	return (
		// Check that emails are valid and present
		emails.value?.trim().length > 0 &&
		validateEmails(emails.value) &&
		// Check that training date is selected and valid (if required)
		(!isDateLocationRequired.value || (!!training_date.value?.length && dateValidation.value.isValid)) &&
		// Check that location is entered (if required)
		(!isDateLocationRequired.value || training_location.value?.trim().length > 0) &&
		// Check that at least one training type is selected
		hasTrainingSelected.value
	);
});

function clearMessages() {
	error.value = '';
	success.value = '';
}

function validateEmails(emailString: string): boolean {
	const emailList = emailString.split(/[ ,;]/).map(email => email.trim()).filter(Boolean);
	const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailList.every(email => emailPattern.test(email));
}

function confirmSubmit() {
	const emailList = emails.value.split(/[ ,;]/).map(email => email.trim()).filter(Boolean);
	const emailSet = new Set(emailList);

	if (emailSet.size !== emailList.length) {
		error.value = 'Duplicate emails entered!';
		return;
	}

	if (emailList.length > 15) {
		error.value = 'You can only submit up to 15 email addresses.';
		return;
	}

	// Additional date validation before submission (only if required)
	if (isDateLocationRequired.value) {
		const dateCheck = validateTrainingDate(training_date.value);
		if (!dateCheck.isValid) {
			error.value = `Invalid training date: ${dateCheck.message}`;
			return;
		}
	}

	showModal.value = true;
}

async function submitEmails() {
	showModal.value = false;
	error.value = ''; // Clear previous errors

	// Final date validation before API call (only if required)
	if (isDateLocationRequired.value) {
		const dateCheck = validateTrainingDate(training_date.value);
		if (!dateCheck.isValid) {
			error.value = `Cannot submit: ${dateCheck.message}`;
			return;
		}
	}

	try {
		const emailList = emails.value.split(/[ ,;]/).map(email => email.trim()).filter(Boolean);

		const response = await fetch('/api/invite-users', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				emails: emailList,
				training_date: training_date.value,
				training_location: training_location.value,
				training_field_chemistry: training_field_chemistry.value,
				training_r_card: training_r_card.value,
				training_habitat: training_habitat.value,
				training_biological: training_biological.value,
				training_no_training: training_no_training.value,
				trainer_id: user.value.id,
				trainer_name: `${user.value.first_name} ${user.value.last_name}`
			}),
		});

		// Handle 202 Accepted response specially
		if (response.status === 202) {
			// For 202 responses, try to parse JSON but handle cases where it might be empty
			let data;
			try {
				const responseText = await response.text();
				data = responseText ? JSON.parse(responseText) : {};
			} catch (parseError) {
				console.warn('Could not parse 202 response as JSON:', parseError);
				data = { message: 'Invitations are being processed.' };
			}
			
			success.value = data.message || 'Invitations are being processed. You will be notified of any failures.';
			showSuccessModal.value = true;
			resetForm();
			return;
		}

		// Handle other successful responses
		if (response.ok) {
			const data = await response.json();
			
			// Handle different response types from improved API
			if (data.status === 'success') {
				if (data.code === 'PROCESSING') {
					success.value = 'Invitations are being processed. You will be notified of any failures.';
				} else {
					success.value = data.message || 'Invitations sent successfully!';
				}
			} else {
				success.value = data.message || 'Invitations sent successfully!';
			}
			
			showSuccessModal.value = true;
			resetForm();
		} else {
			// Handle error responses
			let errorData;
			try {
				errorData = await response.json();
			} catch (parseError) {
				console.warn('Could not parse error response as JSON:', parseError);
				errorData = { message: 'An error occurred while processing your request.' };
			}
			
			switch(response.status) {
				case 400:
					error.value = errorData.message || 'Please check your input and try again.';
					break;
				case 500:
					error.value = 'Server error occurred. Some invitations may have failed to send.';
					break;
				default:
					error.value = errorData.message || 'Failed to send invitations!';
			}
		}
	} catch (err) {
		console.error('Submit error:', err);
		
		// Handle different types of errors
		if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
			error.value = 'Server response was invalid. Please try again or contact support.';
		} else if (err.name === 'TypeError' && err.message.includes('fetch')) {
			error.value = 'Failed to reach server. Please check your connection and try again.';
		} else {
			error.value = 'An unexpected error occurred. Please try again.';
		}
	}
}

function resetForm() {
	emails.value = '';
	training_date.value = '';
	training_location.value = '';
	training_field_chemistry.value = false;
	training_r_card.value = false;
	training_habitat.value = false;
	training_biological.value = false;
	training_no_training.value = false;
	error.value = '';
	success.value = '';
}

async function retrySubmission() {
	error.value = '';
	await submitEmails();
}

function closeSuccessModal() {
	showSuccessModal.value = false;
}

function viewReport() {
	showSuccessModal.value = false;
	navigateTo('/portal/train/report');
}
</script>

<template>
	<PolicyGuard path="/portal/train">
	<div>
	  <PageContainer>
		<div>
		  <PortalPageHeader
			title="Invite Samplers"
			:breadcrumbs="[
			  { title: 'Portal', href: '/portal' },
			  { title: 'Trainer', href: '/portal/train' }
			]"
		  ></PortalPageHeader>
  
		  <div class="flex items-center justify-between">
			<h1 class="text-2xl text-gray-900">
			  Kentucky Watershed Watch Trainee Invite Form
			</h1>
			<img
			  class="w-48"
			  src="~/assets/illustrations/tokyo-luminous-table-lamp-on-boxes.svg"
			/>
		  </div>
  
		  <TypographyHeadline :content="headContent" size="xl" />
		  <VDivider class="my-8" />
  
		  <!-- Form for Emails, Training Date, and Training Location -->
		  <form @submit.prevent="confirmSubmit">
			<p class="text-m text-gray-800 mb-4">
				Thank you for assisting Kentucky Watershed Watch as a trainer. 
				Your assistance is greatly appreciated as we work to create an informed network of stream samplers.
				<br><br>
				To help us enroll newly trained samplers and grant them access to the data portal, 
				please provide the following information from your training session.
				<br><br>
				If possible, please include the information provided on the Participant Agreement forms that each new 
				volunteer completes at training sessions. These forms should be scanned and emailed to 
				<b>contact@kywater.org</b> or mail them to JoAnn Palmer, P.O. Box 1245, Frankfort, KY 40602. 
				If you would prefer that KWW enters this information, please include that request with the forms. 
				We will be happy to assist with this.
				<br><br>
				On this form, please enter email(s), training date, training location, trainings completed, and training equipment information for the 
				newly trained samplers. If the bulk of samplers have the same information, you can submit their emails in bulk 
				(separate emails with commas, semicolons, or spaces). Otherwise, each sampler can be entered seperately.<br><br>
				This will send an email invitation to each volunteer with a link to sign up for the data portal.
			</p>
  
			<label class="block mb-2 font-bold required">Trainee Email Addresses (up to 15 emails):</label>
			<textarea
				v-model="emails"
				@input="clearMessages"
				class="w-full p-2 border rounded-lg"
				placeholder="Enter emails separated by , ; or space"
				required
			></textarea>
  
			<label class="block mt-4 mb-2 font-bold" :class="{ 'required': isDateLocationRequired }">Training Date:</label>
			<input
				type="date"
				v-model="training_date"
				@input="clearMessages"
				class="w-full p-2 border rounded-lg"
				:class="{ 
					'border-red-500': training_date && !dateValidation.isValid,
					'opacity-50': !isDateLocationRequired
				}"
				:required="isDateLocationRequired"
				:disabled="!isDateLocationRequired"
			/>
			<div v-if="training_date && !dateValidation.isValid" class="text-sm text-red-500 mt-1">
				{{ dateValidation.message }}
			</div>
			<div v-if="!isDateLocationRequired" class="text-sm text-gray-500 mt-1">
				Date not required for non-samplers
			</div>
  
			<label class="block mt-4 mb-2 font-bold" :class="{ 'required': isDateLocationRequired }">Training Location:</label>
			<input
				type="text"
				v-model="training_location"
				class="w-full p-2 border rounded-lg"
				:class="{ 'opacity-50': !isDateLocationRequired }"
				placeholder="Enter training location"
				:required="isDateLocationRequired"
				:disabled="!isDateLocationRequired"
			/>
			<div v-if="!isDateLocationRequired" class="text-sm text-gray-500 mt-1">
				Location not required for non-samplers
			</div>
  
			<label class="block mt-4 mb-2 font-bold required">Training Completed (select at least one):</label>
			
			<div class="form-group checkbox-group">
			  <label>Field Chemistry:</label>
			  <input 
			  	type="checkbox" 
			  	v-model="training_field_chemistry" 
			  	@change="onTrainingTypeChange"
			  	:disabled="training_no_training"
			  />
			</div>
			<div class="form-group checkbox-group">
			  <label>R-Card:</label>
			  <input 
			  	type="checkbox" 
			  	v-model="training_r_card" 
			  	@change="onTrainingTypeChange"
			  	:disabled="training_no_training"
			  />
			</div>
			<div class="form-group checkbox-group">
			  <label>Habitat:</label>
			  <input 
			  	type="checkbox" 
			  	v-model="training_habitat" 
			  	@change="onTrainingTypeChange"
			  	:disabled="training_no_training"
			  />
			</div>
			<div class="form-group checkbox-group">
			  <label>Biological:</label>
			  <input 
			  	type="checkbox" 
			  	v-model="training_biological" 
			  	@change="onTrainingTypeChange"
			  	:disabled="training_no_training"
			  />
			</div>
			<div class="form-group checkbox-group">
				<label>No Training Conducted (for Hub contacts and non-samplers only - please contact Doug Curl doug@uky.edu about these registrants):</label>
				<input 
					type="checkbox" 
					v-model="training_no_training" 
					@change="onNoTrainingChange"
					:disabled="training_field_chemistry || training_r_card || training_habitat || training_biological"
				/>
			</div>
	
			<div v-if="!canSubmit" class="text-sm text-red-500 mt-2">
				<p v-if="!emails?.trim() || !validateEmails(emails)">
					Please enter valid email addresses
				</p>
				<p v-if="isDateLocationRequired && !training_date">
					Please select a training date
				</p>
				<p v-if="isDateLocationRequired && training_date && !dateValidation.isValid">
					{{ dateValidation.message }}
				</p>
				<p v-if="isDateLocationRequired && !training_location?.trim()">
					Please enter a training location
				</p>
				<p v-if="!hasTrainingSelected">
					Please select at least one training type or 'No Training Conducted'
				</p>
			</div>

			<UButton 
				:disabled="!canSubmit" 
				variant="solid" 
				type="submit" 
				class="mt-4"
				:class="{'opacity-50 cursor-not-allowed': !canSubmit}"
			>
				Submit
			</UButton>
		  </form>
  
		  <!-- Confirmation Modal -->
		  <div v-if="showModal" class="modal">
			<div class="modal-content">
			  <p>Are you sure you want to submit these email addresses?</p>
			  <UButton variant="solid" @click="submitEmails">Yes</UButton>
			  <UButton variant="outlined" @click="showModal = false">No</UButton>
			</div>
		  </div>

  		  <!-- Success Modal -->
		<div v-if="showSuccessModal" class="modal">
			<div class="modal-content">
				<div class="flex items-center justify-center mb-4">
				<svg class="h-8 w-8 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
					<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
				</svg>
				<h3 class="text-lg font-semibold">Invitations Sent!</h3>
				</div>
				<p class="mb-4">{{ success }}</p>
				<div class="flex gap-4 justify-center mt-4">
				<UButton variant="solid" @click="viewReport">View Report</UButton>
				<UButton variant="outline" @click="closeSuccessModal">Close</UButton>
				</div>
			</div>
		</div>
  
		  <!-- Display Messages -->
		<div v-if="error" class="error-message-container">
			<div class="flex items-center">
				<svg class="h-5 w-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
				</svg>
				<span>{{ error }}</span>
			</div>
			<button 
				v-if="error.includes('server') || error.includes('connection')"
				@click="retrySubmission"
				class="retry-button mt-2"
			>
				Try Again
			</button>
		</div>

		<div v-if="success" class="success-message-container">
			<div class="flex items-center">
				<svg class="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
				</svg>
				<span>{{ success }}</span>
			</div>
			</div>
		</div>
	  </PageContainer>
		</div>
	</PolicyGuard>
  </template>
  
  <style scoped>
  .flex {
	display: flex;
	align-items: center;
	justify-content: space-between;
  }
  .mb-4 {
	margin-bottom: 1rem;
  }
  textarea {
	border: 1px solid #e2e8f0;
	border-radius: 0.375rem;
	padding: 0.5rem;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    margin-bottom: 1rem;
	margin-left: 20px;
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
	margin-left: 5px;
  }

  /* Disabled checkbox styling */
  input[type="checkbox"]:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Disabled input styling */
  input:disabled {
    background-color: #f7fafc;
    cursor: not-allowed;
  }

  .modal {
	position: fixed;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	justify-content: center;
	align-items: center;
  }
  .modal-content {
	background-color: white;
	padding: 20px;
	border-radius: 8px;
	text-align: center;
	max-width: 400px; /* Set a max width */
	width: 90%; /* Responsive width */
	}
  .modal-content p {
	margin-bottom: 20px;
	font-size: 1.1rem;
	color: #4CAF50; /* Green success color */
  }
  .gap-4 {
	gap: 1rem;
 }

	.justify-center {
		justify-content: center;
	}

	.mt-4 {
		margin-top: 1rem;
	}

	.required::after {
		content: '*';
		color: red;
		margin-left: 4px;
	}

	input:invalid,
	textarea:invalid {
		border-color: #ef4444;
	}

	.form-group label {
		display: inline-flex;
		align-items: center;
	}

	/* Add hover states for better UX */
	input[type="checkbox"] {
		cursor: pointer;
	}

	input[type="checkbox"]:hover:not(:disabled) {
		outline: 2px solid #e2e8f0;
	}

	/* Style disabled submit button */
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-message-container {
		background-color: #fef2f2;
		border: 1px solid #fca5a5;
		color: #b91c1c;
		padding: 1rem;
		border-radius: 0.375rem;
		margin: 1rem 0;
	}

	.success-message-container {
		background-color: #f0fdf4;
		border: 1px solid #86efac;
		color: #166534;
		padding: 1rem;
		border-radius: 0.375rem;
		margin: 1rem 0;
	}

	.retry-button {
		background-color: #6b7280;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.25rem;
		border: none;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.retry-button:hover {
		background-color: #4b5563;
	}

	/* Additional styles for date validation */
	.border-red-500 {
		border-color: #ef4444 !important;
	}

	.text-red-500 {
		color: #ef4444;
	}

	.text-gray-500 {
		color: #6b7280;
	}

	.mt-1 {
		margin-top: 0.25rem;
	}

	.opacity-50 {
		opacity: 0.5;
	}
</style>
