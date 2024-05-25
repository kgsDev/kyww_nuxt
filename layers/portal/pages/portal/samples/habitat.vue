<script setup lang="ts">
const { user } = useDirectusAuth();

const items = [
	{
		title: 'Streambank Vegetation',
		description: 'Look above water level and on land next to stream. Mowing/grazing impacts?',
	},
	{ description: 'Lots of plants, shrubs and trees (not lawn or crops) covering banks and floodplain.' },
	{ description: 'Some plants, shrubs and trees along banks.' },
	{ description: 'Most trees and shrubs are gone.' },
	{ description: 'Very little plant life at all along banks or in floodplain.' },
	{
		title: 'Stream Channel Alteration',
		description: 'Is the stream curving or straight? Have humans changed the stream channel?',
	},
	{
		description:
			'Channel allowed to naturally bend and curve around landscape. Flow not impacted by manmade features, such as rock baskets or concrete.',
	},
	{
		description:
			'Channel straightened in some places, but some natural bends still present. No bank hardening with concrete or rocks.',
	},
	{
		description: 'Channel mostly straightened, but vegetation still present and no rock or cement hardening of banks.',
	},
	{ description: 'Channel straightened and flowing along a rocky or paved channel.' },

	{
		title: 'Embeddedness',
		description: 'Are there rocks on the bottom and are they covered by silt? Is there a variety of rock sizes?',
	},
	{ description: 'Exposed rocks cover almost all of the stream bed with very little sand or silt between them.' },
	{ description: 'Exposed rocks cover most of stream bed, with some sand/silt between & on rocks.' },
	{ description: 'Rocks more than halfway buried (embedded) into sand/silt.' },
	{ description: 'Rocks entirely buried by sand and silt.' },

	{ title: 'Erosion', description: 'What length of banks is bare of vegetation?' },
	{
		description: 'Most of streambanks are covered with large rocks and vegetation with very little exposed soil.',
	},
	{ description: 'Approx. 2/3 of bank area covered with large rocks and vegetation, 1/3 exposed soil.' },
	{ description: 'Approx. 1/3 of bank area covered with large rocks and vegetation, 2/3 exposed soil.' },
	{ description: 'Steep banks of bare, exposed soil with very little covered by large rocks and vegetation.' },

	{
		title: 'Shelter for Macroinvertebrates',
		description: 'Look for rocks, limbs and leaves on the stream bottom.',
	},
	{ description: 'Lots of different sized rocks, submerged wood, and plenty of leaf packs.' },
	{ description: 'Only small gravel-sized rocks, some wood and leaf packs.' },
	{ description: 'No rocks or wood, but some leaf packs.' },
	{ description: 'No rocks, wood, or leaf packs. Stream bottom mainly mud or bedrock.' },

	{
		title: 'Shelter for Fish',
		description: 'Good shelter includes deep pools, submerged wood and undercut banks.',
	},
	{ description: 'Multiple pools, some submerged wood, and undercut banks in the water.' },
	{ description: 'Some pools, wood, and undercut banks in the water.' },
	{ description: 'Very few pools, wood, and undercut banks in the water.' },
	{ description: 'No pools, wood, and undercut banks in the water.' },

	{
		title: 'Riparian Vegetated Buffer Width',
		description: 'How wide is the band of trees and shrubs on each side of the stream?',
	},
	{ description: 'More than 50 feet of trees and shrubs extending out from EACH bank of the stream.' },
	{ description: 'EACH bank has at least 20‐50 feet of trees and shrubs.' },
	{ description: 'EACH bank has at least 5‐20 feet of trees and shrubs.' },
	{ description: 'EACH bank has 0‐5 feet of trees and shrubs.' },

	{
		title: 'Bank Stability',
		description: 'Are the banks of the stream steep or more gradually sloped? More vertical = more unstable.',
	},
	{
		description:
			'Top of bank only slightly higher than water surface, bank gradually sloped (less than 20-degree incline). Minimal evidence of erosion.',
	},
	{
		description:
			'Bank slope steeper (20 to 45-degree slope) and higher than water surface, less than half of bank surface showing erosion.',
	},
	{ description: 'Banks steep (45 to-70-degree slope) with approximately half of bank surface showing erosion.' },
	{
		description:
			'Banks extremely high compared to water surface (70 to 90-degree slope). More than half of bank surface area eroded.',
	},

	{
		title: 'Velocity & Depth Combinations',
		description: 'A variety of combinations provides a range of habitat conditions that support aquatic life.',
	},
	{
		description:
			'Stream has areas of (a) fast/deep water, (b) fast/shallow water, (c) slow/shallow areas, and (d) slow/deep areas.',
	},
	{ description: 'Stream has 3 of the velocity and depth combinations.' },
	{ description: 'Stream has 2 of the velocity and depth combinations.' },
	{ description: 'Stream has only 1 type of velocity and depth combination.' },
];

const groupCount = Math.ceil(items.length / 5);
const selectedOptions = ref(Array(groupCount).fill(null));
const habitatScore = computed(() => selectedOptions.value?.reduce((acc, val) => acc + (5 - val), 0));

const siteNumber = ref();
const streamName = ref();
const dateOfAssessment = ref();
const samplingLocationDescription = ref();
const county = ref();
const time = ref();
const samplerName = ref(user.value?.display_name);
const samplerId = ref(user.value?.id);

const landUseIndustrial = ref();
const landUseDowntown = ref();
const landUseSuburban = ref();
const landUseCommercial = ref();
const landUseOpen = ref();
const landUseAgricultural = ref();
const landUseOther = ref();
const landUseOtherDetail = ref();
</script>
<template>
	<div>
		<PortalPageHeader
			title="New Habitat Assessment"
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
		<h1 class="text-2xl text-center text-gray-900 bg-lime-500 border-4 border-gray-900">
			Kentucky Watershed Watch Habitat Assessment Form
		</h1>

		<Form>
			<div class="relative items-start">
				<div class="border-b-4 border-l-4 border-r-4 p-1 border-gray-900">
					<div class="flex">
						<UFormGroup class="p-2 basis-1/6" label="Site Number">
							<UInput v-model="siteNumber" disabled />
						</UFormGroup>
						<UFormGroup class="p-2 basis-4/6" label="Stream Name">
							<UInput v-model="streamName" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/6" label="Date of Assessment">
							<UInput v-model="dateOfAssessment" type="date" />
						</UFormGroup>
					</div>
					<div class="flex">
						<UFormGroup class="p-2 basis-3/6" label="Sampling Location Description" required>
							<UInput v-model="samplingLocationDescription" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-2/6" label="County" required>
							<UInput v-model="county" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/6" label="Time of Assessment" required>
							<UInput v-model="time" type="time" />
						</UFormGroup>
					</div>
					<div class="flex">
						<UFormGroup class="p-2 basis-3/6" label="Name of Watershed Watch Sampler" required>
							<UInput v-model="samplerName" disabled />
						</UFormGroup>
						<UFormGroup class="p-2 basis-3/6" label="Sampler ID" required>
							<UInput v-model="samplerId" disabled />
						</UFormGroup>
					</div>
					<div class="flex"></div>
					<UFormGroup class="p-2 basis-1" label="Instructions">
						<p>
							Record information on this sheet as you conduct assessments to determine the overall physical health of
							your stream. Fill out the sheet based on observed conditions at your monitoring site.
						</p>
					</UFormGroup>
				</div>
				<div class="border-b-4 border-l-4 border-r-4 border-gray-900">
					<h2 class="text-2xl text-center border-b-2 border-gray-900 bg-lime-500 text-gray-900">
						Land Use in Drainage Area (Check all that apply)
					</h2>
					<p class="text-center">
						NOTE: For this section, you can use visual indicators of land use, as well as your general familiarity with
						the area.
					</p>
					<div class="flex">
						<UFormGroup class="p-2 basis-1/2">
							<UCheckbox v-model="landUseIndustrial" label="Industrial" />
							<UCheckbox v-model="landUseDowntown" label="Downtown Residential" />
							<UCheckbox v-model="landUseSuburban" label="Suburban Residential" />
							<UCheckbox v-model="landUseCommercial" label="Commercial" />
							<UCheckbox v-model="landUseOpen" label="Open Space" />
							<UCheckbox v-model="landUseAgricultural" label="Agriculture" />
							<UCheckbox v-model="landUseOther" label="Other" />
							<UInput v-if="landUseOther" v-model="landUseOtherDetail" />
						</UFormGroup>
					</div>
				</div>
				<div class="border-b-4 border-l-4 border-r-4 border-collapse border-gray-900">
					<h2 class="text-2xl text-center border-b-2 border-gray-900 bg-lime-500">Pollutant Indicators</h2>
					<p class="text-center border-b-2 border-gray-900">
						Provide a brief description of any potential pollutant indicators you notice. These indicators may range
						from strange odors, unusual colors, or floatables (suds, sewage, or petroleum). Refer to guidance, if
						needed.
					</p>
					<div class="grid grid-cols-6 border-gray-900">
						<div class="text-center border-b-2 border-r-2 p-2 border-gray-900">
							<b>Indicator</b>
						</div>
						<div class="text-center p-2 border-b-2 col-span-5 border-gray-900">
							<b>Description</b>
						</div>
						<div class="text-center border-b-2 border-r-2 p-2 border-gray-900">Odor</div>
						<UTextarea v-model="odor" class="col-span-5 p-2 border-b-2 border-gray-900" />
						<div class="text-center p-2 border-b-2 border-r-2 border-gray-900">Color</div>
						<UTextarea v-model="color" class="col-span-5 p-2 border-b-2 border-gray-900" />
						<div class="text-center p-2 border-r-2 border-gray-900">Floatables on water surface</div>
						<UTextarea v-model="floatables" class="col-span-5 p-2" />
					</div>
				</div>
				<h1 class="text-2xl text-center text-gray-900 border-b-4 border-l-4 border-r-4 border-gray-900 bg-lime-500">
					Physical Assessment: Stream Corridor Assessment
				</h1>
				<p class="text-center text-gray-900 border-l-4 border-r-4 border-gray-900">
					<em>Based on Stream Corridor Assessment protocol from Maryland Department of Natural Resources.</em>
					<br />
					<b>Instructions:</b>
					Select a stream segment of 100+ feet and observe the stream habitat in and on both sides of the water. Select
					the closest descriptions to that of your stream segment for each habitat characteristic.
				</p>
				<h2
					v-if="selectedOptions.every((option) => option !== null)"
					class="text-xl text-center text-gray-900 border-t-4 border-l-4 border-r-4 border-gray-900 bg-lime-500"
					:class="{
						'bg-red-500': habitatScore < 15,
						'bg-orange-500': habitatScore >= 16 && habitatScore <= 22,
						'bg-yellow-500': habitatScore > 22 && habitatScore <= 29,
						'bg-green-500': habitatScore > 29,
					}"
				>
					Stream Corridor Score: {{ habitatScore }} - {{ habitatScore <= 15 ? 'Poor' : '' }}
					{{ habitatScore >= 16 && habitatScore <= 22 ? 'Marginal' : '' }}
					{{ habitatScore >= 23 && habitatScore <= 29 ? 'Fair' : '' }}
					{{ habitatScore >= 30 ? 'Good' : '' }}
				</h2>
				<h2
					v-else
					class="text-xl text-center text-gray-900 border-t-4 border-l-4 border-r-4 border-gray-900 bg-lime-500"
				>
					Please select an option for each habitat characteristic.
				</h2>
				<div class="border-4 p-1 border-gray-900">
					<div v-for="groupIndex in groupCount" :key="groupIndex" class="grid-container">
						<div class="grid-item">
							<p class="title">
								<strong>{{ items[(groupIndex - 1) * 5].title }}</strong>
							</p>
							<p class="description">{{ items[(groupIndex - 1) * 5].description }}</p>
						</div>
						<div
							v-for="index in 4"
							:key="index"
							class="grid-item"
							:class="{ 'selected bg-lime-500': selectedOptions[groupIndex - 1] === index }"
							@click="selectedOptions[groupIndex - 1] = index"
						>
							<div class="clickable">
								<input
									:id="'option' + ((groupIndex - 1) * 5 + index)"
									v-model="selectedOptions[groupIndex - 1]"
									type="radio"
									:value="index"
									style="display: none"
								/>
								<div>{{ items[(groupIndex - 1) * 5 + index].description }}</div>
							</div>
						</div>
					</div>
				</div>
				<h2
					v-if="selectedOptions.every((option) => option !== null)"
					class="text-xl text-center text-gray-900 border-b-4 border-l-4 border-r-4 border-gray-900 bg-lime-500"
					:class="{
						'bg-red-500': habitatScore < 15,
						'bg-orange-500': habitatScore >= 16 && habitatScore <= 22,
						'bg-yellow-500': habitatScore > 22 && habitatScore <= 29,
						'bg-green-500': habitatScore > 29,
					}"
				>
					Stream Corridor Score: {{ habitatScore }} - {{ habitatScore <= 15 ? 'Poor' : '' }}
					{{ habitatScore >= 16 && habitatScore <= 22 ? 'Marginal' : '' }}
					{{ habitatScore >= 23 && habitatScore <= 29 ? 'Fair' : '' }}
					{{ habitatScore >= 30 ? 'Good' : '' }}
				</h2>
				<h2
					v-else
					class="text-xl text-center text-gray-900 border-b-4 border-l-4 border-r-4 border-gray-900 bg-lime-500"
				>
					Please select an option for each habitat characteristic.
				</h2>
			</div>

			<div class="flex justify-end mt-6">
				<UButton class="text-gray-900" variant="solid">Submit</UButton>
			</div>
		</Form>
	</div>
</template>

<style scoped>
.grid-container {
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	padding-top: 10px;
	padding-bottom: 10px;
}

.grid-item {
	border: 1px solid #ccc;
	padding: 10px;
}

.grid-item.selected {
	background-color: #af7;
}

.clickable {
	cursor: pointer;
	width: 100%;
	height: 100%;
}

.title {
	font-weight: bold;
}

.description {
	margin-bottom: 10px;
}
</style>
