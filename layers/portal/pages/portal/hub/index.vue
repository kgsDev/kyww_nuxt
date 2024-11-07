<script setup lang="ts">
const { user } = useDirectusAuth();

const { query } = useRoute();
// Access the query parameters
const siteId = ref(query?.siteId || '');

const sampler = ref(user?.value?.display_name);
const adults = ref();
const youths = ref();
const date = ref();
const startTime = ref();
const totalVolunteerMinutes = ref();
const milesDriven = ref();

const counties = ["Adair", "Allen", "Anderson", "Ballard", "Barren", "Bath", "Bell", "Boone", "Bourbon", "Boyd", "Boyle", "Bracken", "Breathitt", "Breckinridge", "Bullitt", "Butler", "Caldwell", "Calloway", "Campbell", "Carlisle", "Carroll", "Carter", "Casey", "Christian", "Clark", "Clay", "Clinton", "Crittenden", "Cumberland", "Daviess", "Edmonson", "Elliott", "Estill", "Fayette", "Fleming", "Floyd", "Franklin", "Fulton", "Gallatin", "Garrard", "Grant", "Graves", "Grayson", "Green", "Greenup", "Hancock", "Hardin", "Harlan", "Harrison", "Hart", "Henderson", "Henry", "Hickman", "Hopkins", "Jackson", "Jefferson", "Jessamine", "Johnson", "Kenton", "Knott", "Knox", "Larue", "Laurel", "Lawrence", "Lee", "Leslie", "Letcher", "Lewis", "Lincoln", "Livingston", "Logan", "Lyon", "McCracken", "McCreary", "McLean", "Madison", "Magoffin", "Marion", "Marshall", "Martin", "Mason", "Meade", "Menifee", "Mercer", "Metcalfe", "Monroe", "Montgomery", "Morgan", "Muhlenberg", "Nelson", "Nicholas", "Ohio", "Oldham", "Owen", "Owsley", "Pendleton", "Perry", "Pike", "Powell", "Pulaski", "Robertson", "Rockcastle", "Rowan", "Russell", "Scott", "Shelby", "Simpson", "Spencer", "Taylor", "Todd", "Trigg", "Trimble", "Union", "Warren", "Washington", "Wayne", "Webster", "Whitley", "Wolfe", "Woodford"];
const county = ref([]);
const basins = ["North Fork Kentucky River", "South Fork Kentucky River", "Kentucky River", "Licking River", "Salt River", "Green River", "Barren River", "Cumberland River", "Tennessee River", "Ohio River", "Mississippi River"];
const basin = ref([]);
const submittedAlert = () => {
	alert('Submitted');
};

const submitData = () => {
	submittedAlert();
};

const isOpen = ref(false);
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
		></PortalPageHeader>
		<h1 class="text-2xl text-center text-gray-900">Kentucky Watershed Watch New Hub Form</h1>

		<Form>
			<div class="relative items-start">
				<div class="border-4 p-1 border-gray-900">
					<div class="flex">
						<UFormGroup class="p-2 basis-1/4" label="Hub Name" required>
							<UInput v-model="hubName" icon="ph:building" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Organization">
							<UInput v-model="organization" icon="clarity:organization-line" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Select a Site">
							<UButton label="Open Map" @click="isOpen = true" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Site Id">
							<UInput v-model="siteId" icon="bxs:been-here" />
						</UFormGroup>
					</div>
					<div class="flex">
						<UFormGroup class="p-2 basis-1/2" label="Physical Address">
							<UTextarea v-model="physicalAddress" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/2" label="Mailing Address">
							<UTextarea v-model="mailingAddress" />
						</UFormGroup>
					</div>
					<div class="flex">
						<UFormGroup class="p-2 basis-1/2" label="Contacts">
							<UTextarea v-model="contacts" icon="" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/2" label="Availability">
							<UTextarea v-model="availability" icon="" />
						</UFormGroup>
					</div>
					<div class="flex">
						<UFormGroup class="p-2 basis-1/4" label="Phone">
							<UInput v-model="phone" icon="bx:bxs-phone" type="tel"/>
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Email">
							<UInput v-model="email" icon="bx:bxs-envelope" type="email"/>
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Basin">
							<USelectMenu v-model="basin" :options="basins" icon="bx:bxs-flag" multiple searchable placeholder="Basin"/>
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="County">
							<USelectMenu v-model="county" :options="counties" icon="bx:bxs-flag" multiple searchable placeholder="County"/>
						</UFormGroup>
					</div>
					</div>
					<div class="border-4 p-1 border-gray-900 mt-4">
					<h2 class="text-center text-xl text-gray-900">Services Offered</h2>
					<div class="flex">
						<UFormGroup class="p-2 basis-1/3">
							<UCheckbox v-model="servicesOffered" label="Host sampling kits for check-out" />
							<UCheckbox v-model="servicesOffered" label="Host incubator for E. coli analysis" />
							<UCheckbox v-model="servicesOffered" label="Host biological sampling kits" />
							</UFormGroup>
							<UFormGroup class="p-2 basis-1/3">
							<UCheckbox v-model="servicesOffered" label="Host sampler training events and meetings" />
							<UCheckbox v-model="servicesOffered" label="Assist with sampling site selection" />
							<UCheckbox v-model="servicesOffered" label="Provide assistance with volunteer data entry" />
							</UFormGroup>
							<UFormGroup class="p-2 basis-1/3">
							<UCheckbox v-model="servicesOffered" label="Help interpret water quality findings" />
							<UCheckbox v-model="servicesOffered" label="Help coordinate community water projects" />
							<UCheckbox v-model="servicesOffered" label="Host outreach materials" />
						</UFormGroup>
					</div>
				</div>
				<div>
					<UModal v-model="isOpen">
						<div class="p-4">
							<div class="embed-container">
								<iframe
									width="800"
									height="600"
									frameborder="0"
									scrolling="no"
									marginheight="0"
									marginwidth="0"
									title="WWKY Pick A Site"
									src="//kygs.maps.arcgis.com/apps/Embed/index.html?webmap=0b9b8080cf574324847adcf99fb84c93&extent=-93.2364,33.5842,-77.0536,41.2751&zoom=true&previewImage=false&scale=true&disable_scroll=true&theme=light"
								></iframe>
							</div>
						</div>
					</UModal>
				</div>
				<div class="flex justify-end mt-6">
					<UButton class="text-gray-900" variant="solid" @click="submitData">Submit</UButton>
				</div>
			</div>
		</Form>
	</div>
</template>

<style>
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
