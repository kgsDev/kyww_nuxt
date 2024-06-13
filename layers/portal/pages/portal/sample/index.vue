<script setup lang="ts">
const { user } = useDirectusAuth();

const { query } = useRoute();
// Access the query parameters
const siteId = ref(query?.siteId || '');
const latitude = ref(query?.latitude || '');
const longitude = ref(query?.longitude || '');

const currentWeatherOptions = [
	{
		value: 'sunny',
		label: 'Clear/Sunny',
		icon: 'wi-day-sunny',
	},
	{
		value: 'overcast',
		label: 'Overcast',
		icon: 'wi-day-cloudy',
	},
	{
		value: 'intermittentRain',
		label: 'Intermittent Rain',
		icon: 'wi-day-showers',
	},
	{
		value: 'steadyRain',
		label: 'Steady Rain',
		icon: 'wi-day-rain',
	},
	{
		value: 'heavyRain',
		label: 'Heavy Rain',
		icon: 'wi-day-thunderstorm',
	},
];

const rainfallOptions = [
	{
		value: '0',
		label: '0"',
	},
	{
		value: '1',
		label: '0.1"',
	},
	{
		value: '5',
		label: '0.5"',
	},
	{
		value: '10',
		label: '1"',
	},
	{
		value: '15',
		label: '1.5"',
	},
	{
		value: '20',
		label: '>1.5"',
	},
];

const waterColorOptions = [
	{
		value: 'clear',
		label: 'Clear',
	},
	{
		value: 'brown/muddy',
		label: 'Brown/Muddy',
	},
	{
		value: 'green',
		label: 'Green',
	},
	{
		value: 'white',
		label: 'White',
	},
	{
		value: 'gray',
		label: 'Gray',
	},
	{
		value: 'orange',
		label: 'Orange',
	},
];

const streamFlowVisualOptions = [
	{
		value: 'flood',
		label: 'Flood',
	},
	{
		value: 'Bankfull',
		label: 'Bankfull',
	},
	{
		value: 'normal',
		label: 'Normal',
	},
	{
		value: 'low',
		label: 'Low',
	},
	{
		value: 'ponded',
		label: 'Ponded',
	},
	{
		value: 'dry',
		label: 'Dry',
	},
];

const sampler = ref(user?.value?.display_name);
const adults = ref();
const youths = ref();
const date = ref();
const startTime = ref();
const totalVolunteerMinutes = ref();
const milesDriven = ref();
const currentWeather = ref();
const rainfall = ref();
const waterColor = ref();
const odorNone = ref();
const odorRottenEggs = ref();
const odorChlorine = ref();
const odorRancidSour = ref();
const odorGasPetro = ref();
const odorMusty = ref();
const odorSweetFruity = ref();
const odorSharpPungent = ref();
const waterSurfaceNone = ref();
const waterSurfaceOilSheen = ref();
const waterSurfaceAlgae = ref();
const waterSurfaceSoapSuds = ref();
const waterSurfaceSewage = ref();
const waterSurfaceErosion = ref();
const streamFlowVisual = ref();
const streamFlowMeasured = ref();
const waterTemperature = ref();
const pH = ref();
const dissolvedOxygen = ref();
const conductivity = ref();
const manufacturer = ref();
const model = ref();
const iCertifyCheckbox = ref();
const timeINIncubator = ref();
const timeOUTIncubator = ref();
const bacterialSourceHuman = ref();
const bacterialSourceDuckGoose = ref();
const bacterialSourceLivestock = ref();
const bacterialSourcePetWaste = ref();
const bacterialSourceWildlife = ref();
const ecoliA = ref();
const sampleVolA = ref();
const ecoliB = ref();
const sampleVolB = ref();
const ecoliC = ref();
const sampleVolC = ref();
const conductivityMeterCalibrationDate = ref();
const streamMeter = ref();
const bacterialSourceOther = ref();

const averageEcoli = computed(() => {
	let a = ecoliA.value && sampleVolA.value ? (ecoliA.value * 100) / sampleVolA.value : -1;
	let b = ecoliB.value && sampleVolB.value ? (ecoliB.value * 100) / sampleVolB.value : -1;
	let c = ecoliC.value && sampleVolC.value ? (ecoliC.value * 100) / sampleVolC.value : -1;
	if (a === -1 || b === -1 || c === -1) return 'Please enter all measurements.';
	return (a + b + c) / 3;
});

const other = ref();

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
			title="New Sample"
			:breadcrumbs="[
				{
					title: 'Portal',
					href: '/portal',
				},
				{
					title: 'Sample',
					href: '/portal/sample',
				},
			]"
		></PortalPageHeader>
		<h1 class="text-2xl text-center text-gray-900">Kentucky Watershed Watch Monitoring Data Form</h1>

		<Form>
			<div class="relative items-start">
				<div class="border-4 p-1 border-gray-900">
					<div class="flex">
						<UFormGroup class="p-2 basis-1/3" label="Sampler">
							<UInput v-model="sampler" icon="i-ic-baseline-person" disabled />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3" label="# Adult Participants">
							<UInput v-model="adults" icon="ic:baseline-group" type="number" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3" label="# Youth Participants">
							<UInput v-model="youths" icon="healthicons:child-program" type="number" />
						</UFormGroup>
					</div>
					<div class="flex">
						<UFormGroup class="p-2 basis-1/4" label="Select a Site">
							<UButton label="Open Map" @click="isOpen = true" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Site ID" required>
							<UInput v-model="siteId" icon="bxs:been-here" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Latitude" required>
							<UInput v-model="latitude" icon="ri:globe-fill" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Longitude" required>
							<UInput v-model="longitude" icon="ri:globe-fill" />
						</UFormGroup>
					</div>
					<div class="flex">
						<UFormGroup class="p-2 basis-1/4" label="Date" required>
							<UInput v-model="date" icon="solar:calendar-bold" type="date" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Start Time" required>
							<UInput v-model="startTime" icon="mdi:clock-outline" type="time" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Total Volunteer Minutes" required>
							<UInput v-model="totalVolunteerMinutes" placeholder="Travel+Sampling" tuiype="number" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Miles Driven">
							<UInput v-model="milesDriven" type="number" icon="fa-solid:car-side" />
						</UFormGroup>
					</div>
				</div>
				<div class="border-4 p-1 border-gray-900">
					<div class="flex">
						<UFormGroup class="p-2 basis-1/3" label="Current Weather">
							<URadioGroup v-model="currentWeather" :options="currentWeatherOptions" name="currentWeather" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3" label="Rainfall in last 48 hours (round up)">
							<URadioGroup v-model="rainfall" :options="rainfallOptions" name="rainfall" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3" label="Water Color">
							<URadioGroup v-model="waterColor" :options="waterColorOptions" name="waterColor" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3" label="Odor">
							<UCheckbox v-model="odorNone" name="odorNone" label="None" />
							<UCheckbox v-model="odorRottenEggs" name="odorRottenEggs" label="Rotten Eggs" />
							<UCheckbox v-model="odorChlorine" name="odorChlorine" label="Chlorine" />
							<UCheckbox v-model="odorRancidSour" name="odorRancidSour" label="Rancid/Sour" />
							<UCheckbox v-model="odorGasPetro" name="odorGasPetro" label="Gas/Petro" />
							<UCheckbox v-model="odorMusty" name="odorMusty" label="Musty" />
							<UCheckbox v-model="odorSweetFruity" name="odorSweetFruity" label="Sweet/Fruity" />
							<UCheckbox v-model="odorSharpPungent" name="odorSharpPungent" label="Sharp/Pungent" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3" label="Water Surface">
							<UCheckbox v-model="waterSurfaceNone" name="waterSurfaceNone" label="None" />
							<UCheckbox v-model="waterSurfaceOilSheen" name="waterSurfaceOilSheen" label="Oil Sheen" />
							<UCheckbox v-model="waterSurfaceAlgae" name="waterSurfaceAlgae" label="Algae" />
							<UCheckbox v-model="waterSurfaceSoapSuds" name="waterSurfaceSoapSuds" label="Soap Suds" />
							<UCheckbox v-model="waterSurfaceSewage" name="waterSurfaceSewage" label="Sewage" />
							<UCheckbox v-model="waterSurfaceErosion" name="waterSurfaceErosion" label="Erosion" />
						</UFormGroup>
					</div>
				</div>
				<div class="flex">
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<UFormGroup class="p-2 basis-1/2" label="Stream Flow (Visual)">
							<URadioGroup v-model="streamFlowVisual" :options="streamFlowVisualOptions" name="streamFlowVisual" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/2">
							<UCheckbox
								v-model="streamMeter"
								label="Check here if using a stream flow meter? (optional)"
								icon="mdi:water"
								placeholder="CuFt/Sec"
								@click="!streamMeter"
							/>
							<UInput v-if="streamMeter" v-model="streamFlowMeasured" icon="mdi:water" />
						</UFormGroup>
					</div>
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<img src="assets/form_icons/stream_flow.png" alt="Stream Flow" class="w-full" />
					</div>
				</div>
				<div class="flex">
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<UFormGroup class="p-2" label="Water Temperature">
							<UInput v-model="waterTemperature" icon="mdi:thermometer" placeholder="°C" />
						</UFormGroup>
						<UFormGroup class="p-2" label="pH">
							<UInput v-model="pH" icon="mdi:ph" placeholder="SU" />
						</UFormGroup>
						<UFormGroup class="p-2" label="Dissolved Oxygen">
							<UInput v-model="dissolvedOxygen" icon="mdi:cloud" placeholder="mg/L" />
						</UFormGroup>
						<UFormGroup class="p-2" label="Conductivity">
							<UInput v-model="conductivity" icon="ant-design:thunderbolt-outlined" placeholder="μS/cm" />
						</UFormGroup>
					</div>
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<br />
						Read thermometer in water or quickly after removing. Take reading in shade.
						<br />
						<br />
						Use a white background or hold up to the sun. Don't wear sunglasses while reading.
						<br />
						<br />
						Check bottle and syringes for air bubbles. Add drops slowly.
						<br />
						<br />
						Calibrate meter within 24 hours of measurement.
					</div>
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<img src="assets/form_icons/field_multimeter.png" alt="Water Quality" class="w-10 inline" label="stuff" />
						Meter Calibration
						<br />
						Conductivity Meter
						<UFormGroup class="p-2" label="Calibration Date">
							<UInput v-model="conductivityMeterCalibrationDate" type="date" />
						</UFormGroup>
						Other electronic meters
						<UFormGroup class="p-2" label=" Calibration Date">
							<UInput v-model="elecDates" type="date" />
						</UFormGroup>
						<UFormGroup class="p-2">
							<UCheckbox
								v-model="iCertifyCheckbox"
								label="I certify that my instruments were successfully calibrated within 24 hours with unexpired reagents."
							/>
						</UFormGroup>
					</div>
				</div>
				<div class="flex">
					<div class="border-4 p-1 border-gray-900 basis-1/3">
						<img
							src="assets/form_icons/bacteria.png"
							alt="Bacteria"
							class="w-20 float-left"
							label="Incubation should be for 20-24 hrs at 35-38°C"
						/>
						<h2 class="text-lg">Bacteria: R-Card Method</h2>
						<p class="p-2">Incubation should be for 20-24 hrs at 35-38°C</p>
						<br />
						<UFormGroup class="p-2" label="Time IN Incubator" required>
							<UInput v-model="timeINIncubator" icon="mdi:clock-outline" type="time" />
						</UFormGroup>
						<UFormGroup class="p-2" label="Time OUT Incubator" required>
							<UInput v-model="timeOUTIncubator" icon="mdi:clock-outline" type="time" />
						</UFormGroup>
						<UFormGroup class="p-2" label="Initials of R-Card Reader">
							<UInput v-model="manufacturer" label="Initials of R-Card Reader" />
						</UFormGroup>
					</div>
					<div class="border-4 p-1 border-gray-900 basis-1/6">
						<h2 class="text-lg">Possible Bacterial Sources:</h2>
						<UFormGroup class="p-2">
							<UCheckbox v-model="bacterialSourceDuckGoose" label="Duck/Goose" />
							<UCheckbox v-model="bacterialSourceHuman" label="Human" />
							<UCheckbox v-model="bacterialSourceLivestock" label="Livestock" />
							<UCheckbox v-model="bacterialSourcePetWaste" label="Pet Waste" />
							<UCheckbox v-model="bacterialSourceWildlife" label="Wildlife" />
							<UCheckbox v-model="bacterialSourceOther" label="Other" @click="!bacterialSourceOther" />
							<UInput v-if="bacterialSourceOther" v-model="bacterialSourceOtherData" />
						</UFormGroup>
					</div>
					<div class="border-4 p-1 border-gray-900 basis-1/2">
						<div class="container grid grid-cols-3 grid-rows-4 gap-5 px-4">
							<div></div>
							<label>E. coli</label>
							<label>Sample Vol (mL)</label>

							<label>Sample A:</label>
							<UInput v-model="ecoliA" type="number" />
							<UInput v-model="sampleVolA" type="number" />

							<label>Sample B:</label>
							<UInput v-model="ecoliB" type="number" />
							<UInput v-model="sampleVolB" type="number" />

							<label>Sample C:</label>
							<UInput v-model="ecoliC" type="number" />
							<UInput v-model="sampleVolC" type="number" />

							<label>Average E.&nbsp;coli/100mL</label>
							<UInput v-model="averageEcoli" class="col-span-2" disabled />
							<div></div>
						</div>
					</div>
				</div>
				<div class="flex">
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<h2 class="text-lg">Other Observations or Measurements</h2>
						<UFormGroup class="p-2">
							<UTextarea v-model="other" />
						</UFormGroup>
					</div>
					<div class="border-4 p-1 border-gray-900 w-1/2 flex">
						<div class="basis-1/3 pt-4">
							<img src="assets/KyWW_logo.png" alt="Kentucky Watershed Watch Logo" class="h-fit" />
						</div>
						<div class="basis-2/3 p-3">
							<h2 class="text-lg">
								Visit
								<a href="www.kywater.org">www.kywater.org</a>
								to view and enter data. For questions or feedback, email contact@kywater.org.
							</h2>
						</div>
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
									scrolling="yes"
									marginheight="0"
									marginwidth="0"
									title="WWKY Pick A Site"
									src="//kygs.maps.arcgis.com/apps/Embed/index.html?webmap=0b9b8080cf574324847adcf99fb84c93&extent=-93.2364,33.5842,-77.0536,41.2751&zoom=true&scale=true&disable_scroll=false&theme=light"
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
