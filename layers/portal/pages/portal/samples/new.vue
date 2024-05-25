<script setup lang="ts">
const { user } = useDirectusAuth();

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

const odorOptions = [
	{
		value: 'none',
		label: 'None',
	},
	{
		value: 'rotteneggs',
		label: 'Rotten Eggs',
	},
	{
		value: 'chlorine',
		label: 'Chlorine',
	},
	{
		value: 'rancid/sour',
		label: 'Rancid/Sour',
	},
	{
		value: 'gas/Petro',
		label: 'Gas/Petro',
	},
	{
		value: 'musty',
		label: 'Musty',
	},
	{
		value: 'sweet/fruity',
		label: 'Sweet/Fruity',
	},
	{
		value: 'sharp/pungent',
		label: 'Sharp/Pungent',
	},
];

const waterSurfaceOptions = [
	{
		value: 'none',
		label: 'None',
	},
	{
		value: 'oilSheen',
		label: 'Oil Sheen',
	},
	{
		value: 'algae',
		label: 'Algae',
	},
	{
		value: 'soapSuds',
		label: 'Soap Suds',
	},
	{
		value: 'sewage',
		label: 'Sewage',
	},
	{
		value: 'erosion',
		label: 'Erosion',
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

const bacterialSourcesOptions = [
	{
		value: 'duckGoose',
		label: 'Duck/Goose',
	},
	{
		value: 'human',
		label: 'Human',
	},
	{
		value: 'livestock',
		label: 'Livestock',
	},
	{
		value: 'petWaste',
		label: 'Pet Waste',
	},
	{
		value: 'wildlife',
		label: 'Wildlife',
	},
];

const sampler = ref(user?.value?.first_name + ' ' + user?.value?.last_name);
const adults = ref();
const youths = ref();
const siteId = ref();
const latitude = ref();
const longitude = ref();
const date = ref();
const startTime = ref();
const totalVolunteerMinutes = ref();
const milesDriven = ref();
const currentWeather = ref();
const rainfall = ref();
const waterColor = ref();
const odor = ref();
const waterSurface = ref();
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
const bacterialSources = ref();
const ecoliA = ref();
const sampleVolA = ref();
const ecoliB = ref();
const sampleVolB = ref();
const ecoliC = ref();
const sampleVolC = ref();

const averageEcoli = ref(
	computed(() => {
		let a = ecoliA.value && sampleVolA.value ? (ecoliA.value * 100) / sampleVolA.value : 0;
		let b = ecoliB.value && sampleVolB.value ? (ecoliB.value * 100) / sampleVolB.value : 0;
		let c = ecoliC.value && sampleVolC.value ? (ecoliC.value * 100) / sampleVolC.value : 0;

		return (a + b + c) / 3;
	}),
);

const other = ref();
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
					title: 'Samples',
					href: '/portal/samples',
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
						<UFormGroup class="p-2 basis-1/3" label="Site ID" required>
							<UInput v-model="siteId" icon="bxs:been-here" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3" label="Latitude" required>
							<UInput v-model="latitude" icon="ri:globe-fill" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3" label="Longitude" required>
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
							<URadioGroup v-model="odor" :options="odorOptions" name="odor" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/3" label="Water Surface">
							<URadioGroup v-model="waterSurface" :options="waterSurfaceOptions" name="waterSurface" />
						</UFormGroup>
					</div>
				</div>
				<div class="flex">
					<div class="border-4 p-1 border-gray-900 w-1/2">
						<UFormGroup class="p-2 basis-1/2" label="Stream Flow (Visual)">
							<URadioGroup v-model="streamFlowVisual" :options="streamFlowVisualOptions" name="streamFlowVisual" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/2" label="Stream Flow (Measured Cubic Ft/Sec)">
							<UInput v-model="streamFlowMeasured" icon="mdi:water" />
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
						<img src="assets/form_icons/field_multimeter.png" alt="Water Quality" class="w-10" label="stuff" />
						If Field Multimeter is Used:
						<UFormGroup class="p-2" label="Manufacturer">
							<UInput v-model="manufacturer" />
						</UFormGroup>
						<UFormGroup class="p-2" label="Model">
							<UInput v-model="model" />
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
					</div>
					<div class="border-4 p-1 border-gray-900 basis-1/6">
						<h2 class="text-lg">Possible Bacterial Sources:</h2>
						<UFormGroup class="p-2">
							<URadioGroup v-model="bacterialSources" :options="bacterialSourcesOptions" name="bacterialSources" />
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

							<label>Average E.coli/100mL</label>
							<UInput v-model="averageEcoli" class="col-span-2" type="number" disabled />
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
						<div class="basis-1/3">
							<img src="assets/KyWW_logo.png" alt="Kentucky Watershed Watch Logo" class="h-fit" />
						</div>
						<div class="basis-2/3 p-4">
							<h2 class="text-lg">
								Visit
								<a href="www.kywater.org">www.kywater.org</a>
								to view and enter data.
							</h2>
							<p class="text-md">Kentucky Watershed Watch</p>
							<p class="text-md">P.O. Box 1245</p>
							<p class="text-md">Frankfort, KY 40602</p>
							<p class="text-md">(502) 782-7032</p>
						</div>
					</div>
				</div>
				<div class="flex justify-end mt-6">
					<UButton class="text-gray-900" variant="solid">Submit</UButton>
				</div>
			</div>
		</Form>
	</div>
</template>
