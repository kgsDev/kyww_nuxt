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
const error = ref('')
const success = ref('')
const showModal = ref(false)
const showSuccessModal = ref(false)

const hasTrainingSelected = computed(() => {
	return training_field_chemistry.value || 
			training_r_card.value || 
			training_habitat.value || 
			training_biological.value;
});

const canSubmit = computed(() => {
	return (
		// Check that emails are valid and present
		emails.value?.trim().length > 0 &&
		validateEmails(emails.value) &&
		// Check that training date is selected
		!!training_date.value?.length &&
		// Check that location is entered
		training_location.value?.trim().length > 0 &&
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

	showModal.value = true;
}

async function submitEmails() {
	showModal.value = false;

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
			trainer_id: user.value.id,
			trainer_name: `${user.value.first_name} ${user.value.last_name}`
		}),
		});

		if (response.ok) {
		showSuccessModal.value = true;
		resetForm();
		} else {
		const errorData = await response.json();
		error.value = errorData.message || 'Failed to send invitations!';
		}
	} catch (err) {
		console.error(err);
		error.value = 'Failed to send invitations!';
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
  
			<label class="block mt-4 mb-2 font-bold required">Training Date:</label>
			<input
				type="date"
				v-model="training_date"
				class="w-full p-2 border rounded-lg"
				required
			/>
  
			<label class="block mt-4 mb-2 font-bold required">Training Location:</label>
			<input
				type="text"
				v-model="training_location"
				class="w-full p-2 border rounded-lg"
				placeholder="Enter training location"
				required
			/>
  
			<label class="block mt-4 mb-2 font-bold required">Training Completed (select at least one):</label>
			
			<div class="form-group checkbox-group">
			  <label>Field Chemistry:</label>
			  <input type="checkbox" v-model="training_field_chemistry" />
			</div>
			<div class="form-group checkbox-group">
			  <label>R-Card:</label>
			  <input type="checkbox" v-model="training_r_card" />
			</div>
			<div class="form-group checkbox-group">
			  <label>Habitat:</label>
			  <input type="checkbox" v-model="training_habitat" />
			</div>
			<div class="form-group checkbox-group">
			  <label>Biological:</label>
			  <input type="checkbox" v-model="training_biological" />
			</div>
	
			<div v-if="!canSubmit" class="text-sm text-red-500 mt-2">
				<p v-if="!emails?.trim() || !validateEmails(emails)">
					Please enter valid email addresses
				</p>
				<p v-if="!training_date">
					Please select a training date
				</p>
				<p v-if="!training_location?.trim()">
					Please enter a training location
				</p>
				<p v-if="!hasTrainingSelected">
					Please select at least one training type
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
				<p>Invitations sent successfully!</p>
				<div class="flex gap-4 justify-center mt-4">
				<UButton variant="solid" @click="viewReport">View Report</UButton>
				<UButton variant="outline" @click="closeSuccessModal">Close</UButton>
				</div>
			</div>
			</div>
  
		  <!-- Display Messages -->
		  <p v-if="error" class="text-red-500">{{ error }}</p>
		  <p v-if="success" class="text-green-500">{{ success }}</p>
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

	input[type="checkbox"]:hover {
		outline: 2px solid #e2e8f0;
	}

	/* Style disabled submit button */
	button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
  
