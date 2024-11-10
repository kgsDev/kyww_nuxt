<template>
	<div>
	  <PageContainer>
		<div v-if="hasAccess">
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
  
			<label class="block mb-2 font-bold">Trainee Email Addresses (up to 15 emails):</label>
			<textarea
			  v-model="emails"
			  @input="clearMessages"
			  class="w-full p-2 border rounded-lg"
			  placeholder="Enter emails separated by , ; or space"
			></textarea>
  
			<label class="block mt-4 mb-2 font-bold">Training Date:</label>
			<input
			  type="date"
			  v-model="training_date"
			  class="w-full p-2 border rounded-lg"
			/>
  
			<label class="block mt-4 mb-2 font-bold">Training Location:</label>
			<input
			  type="text"
			  v-model="training_location"
			  class="w-full p-2 border rounded-lg"
			  placeholder="Enter training location"
			/>
  
			<label class="block mt-4 mb-2 font-bold">Training Completed:</label>
			
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
	
			<UButton :disabled="!canSubmit" variant="solid" type="submit" class="mt-4">
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
  
		<div v-else>
		  <p>Access Denied. You do not have permission to view this page.</p>
		</div>
	  </PageContainer>
	</div>
  </template>
  
  <script lang="ts">
  export default {
	setup() {
	  const hasAccess = ref(false);
  
	  const configPublic = useRuntimeConfig().public;
	  const roles = {
		sampler: configPublic.SAMPLER_ROLE_ID,
		trainer: configPublic.TRAINER_ROLE_ID,
		basin_lead: configPublic.BASIN_LEAD_ROLE_ID,
		admin: configPublic.ADMIN_ROLE_ID,
	  };
  
	  const allowedRoles = [roles.trainer, roles.basin_lead, roles.admin];
  
	  const checkUserAccess = async () => {
		const { user } = useDirectusAuth();
  
		if (user && allowedRoles.includes(user?.value.role)) {
		  hasAccess.value = true;
		} else {
		  hasAccess.value = false;
		  navigateTo('/unauthorized');
		}
	  };
  
	  onMounted(() => {
		checkUserAccess();
	  });
  
		return { hasAccess };
	},
	data() {
	  return {
		emails: '',
		training_date: '',        // New field for training date
		training_location: '',     // New field for training location
		training_field_chemistry: false,
		training_r_card: false,
		training_habitat: false,
		training_biological: false,
	  	// Error messages for integer validation
		error: '',
		success: '',
		showModal: false,
		showSuccessModal: false,
	  };
	},
	computed: {
		canSubmit() {
			// Ensure all validations pass before allowing submission
			return (
				this.emails.trim().length > 0 &&
				this.validateEmails(this.emails) &&
				!this.rcardError &&
				!this.pipetteError
			);
		},
	},
	methods: {
	  clearMessages() {
		this.success = '';
		this.error = '';
	  },
  
	  validateEmails(emails) {
		const emailList = emails.split(/[ ,;]/).map(email => email.trim()).filter(Boolean);
		const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailList.every(email => emailPattern.test(email));
	  },

	  confirmSubmit() {
		const emailList = this.emails.split(/[ ,;]/).map(email => email.trim()).filter(Boolean);
		const emailSet = new Set(emailList);
  
		if (emailSet.size !== emailList.length) {
		  this.error = 'Duplicate emails entered!';
		  return;
		}
  
		if (emailList.length > 15) {
		  this.error = 'You can only submit up to 15 email addresses.';
		  return;
		}
  
		this.showModal = true;
	  },
  
	  async submitEmails() {
		this.showModal = false;
		const { user } = useDirectusAuth();

		try {
		  const emailList = this.emails.split(/[ ,;]/).map(email => email.trim()).filter(Boolean);
  
		  const response = await fetch('/api/invite-users', {
			method: 'POST',
			headers: {
			  'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				// Send email list, training date, and training location and other options
			  emails: emailList,
			  training_date: this.training_date,      // Include training date
			  training_location: this.training_location, // Include training location
			  training_field_chemistry: this.training_field_chemistry,
			  training_r_card: this.training_r_card,
			  training_habitat: this.training_habitat,
			  training_biological: this.training_biological,
			  trainer_id: user.value.id,  // Add trainer ID
        	  trainer_name: `${user.value.first_name} ${user.value.last_name}` // Add trainer name
			}),
		  });

			if (response.ok) {
				this.showSuccessModal = true; // Show success modal
				this.resetForm(); // Clear form fields
			} else {
				const errorData = await response.json();
				this.error = errorData.message || 'Failed to send invitations!';
			}
		} catch (err) {
			console.error(err);
			this.error = 'Failed to send invitations!';
		}
		},
		resetForm() {
			// Clear all form fields, including checkboxes
			this.emails = '';
			this.training_date = '';
			this.training_location = '';
			this.training_field_chemistry = false;
			this.training_r_card = false;
			this.training_habitat = false;
			this.training_biological = false;
		},
		closeSuccessModal() {
			this.showSuccessModal = false;
		},
		viewReport() {
			this.showSuccessModal = false;
			navigateTo('/portal/train/report');
		},
	}
	};
  </script>
  
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
</style>
  
