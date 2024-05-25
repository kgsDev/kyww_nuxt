<script setup lang="ts">
const { path, query } = useRoute();
const router = useRouter();

const { user } = useDirectusAuth();

const siteNumber = ref('');
const streamName = ref('');
const basin = ref('');
const date = ref('');
const time = ref('');
const samplerId = ref('');
const samplerName = ref('');
const county = ref('');
const samplingLocationDescription = ref('');
const weatherConditions = ref('');
const riffle = ref(false);
const leafPacks = ref(false);
const woodyDebris = ref(false);
const pools = ref(false);
const undercutBanks = ref(false);
const submergedAquaticPlants = ref(false);
const mussels = ref(false);
const stoneflies = ref(false);
const caddisfliesCaseBuilding = ref(false);
const mayflies = ref(false);
const waterPennies = ref(false);
const waterSnipe = ref(false);
const caddisfliesNetSpinning = ref(false);
const riffleBeetles = ref(false);
const operculateSnails = ref(false);
const blackFlyLarva = ref(false);
const craneFlyLarva = ref(false);
const hellgrammites = ref(false);
const clamsAndMussels = ref(false);
const crayfish = ref(false);
const dragonflies = ref(false);
const flatworms = ref(false);
const midges = ref(false);
const alderflies = ref(false);
const scuds = ref(false);
const nonOperculateSnails = ref(false);
const sowBugs = ref(false);
const leeches = ref(false);
const damselflies = ref(false);
const aquaticWorms = ref(false);
const otherAquaticBeetles = ref(false);

const habitatScore = computed(
	() =>
		(mussels.value ? 4 : 0) +
		(stoneflies.value ? 4 : 0) +
		(caddisfliesCaseBuilding.value ? 4 : 0) +
		(mayflies.value ? 4 : 0) +
		(waterPennies.value ? 4 : 0) +
		(waterSnipe.value ? 4 : 0) +
		(caddisfliesNetSpinning.value ? 3 : 0) +
		(riffleBeetles.value ? 3 : 0) +
		(operculateSnails.value ? 3 : 0) +
		(blackFlyLarva.value ? 3 : 0) +
		(craneFlyLarva.value ? 3 : 0) +
		(hellgrammites.value ? 2 : 0) +
		(clamsAndMussels.value ? 2 : 0) +
		(crayfish.value ? 2 : 0) +
		(dragonflies.value ? 2 : 0) +
		(flatworms.value ? 2 : 0) +
		(midges.value ? 2 : 0) +
		(alderflies.value ? 1 : 0) +
		(scuds.value ? 1 : 0) +
		(nonOperculateSnails.value ? 1 : 0) +
		(sowBugs.value ? 1 : 0) +
		(leeches.value ? 1 : 0) +
		(damselflies.value ? 1 : 0) +
		(aquaticWorms.value ? 1 : 0) +
		(otherAquaticBeetles.value ? 1 : 0),
);

const weatherConditionOptions = [
	{ value: 'flooded', label: 'Flooded over banks' },
	{ value: 'atBank', label: 'Water at bank level' },
	{ value: 'below', label: 'Water below bank level, but flowing' },
	{ value: 'drought', label: 'Drought condition; not flowing' },
];
</script>
<template>
	<div>
		<PortalPageHeader
			title="New Biological Sample"
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
		<h1 class="text-2xl text-center text-gray-900">Kentucky Watershed Watch Biological Assessment Form</h1>

		<Form>
			<div class="relative items-start">
				<div class="border-4 p-1 border-gray-900">
					<div class="flex">
						<UFormGroup class="p-2 basis-1/6" label="Site Number">
							<UInput v-model="siteNumber" type="number" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-2/6" label="Stream Name">
							<UInput v-model="streamName" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/6" label="Basin">
							<UInput v-model="basin" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/6" label="Date">
							<UInput v-model="date" type="date" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/6" label="Time">
							<UInput v-model="time" />
						</UFormGroup>
					</div>
					<div class="flex">
						<UFormGroup class="p-2 basis-1/6" label="Sampler ID #">
							<UInput v-model="samplerId" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-2/6" label="Sampler Name">
							<UInput v-model="samplerName" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/6" label="County">
							<UInput v-model="county" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-2/6" label="Sampling Location Description">
							<UInput v-model="samplingLocationDescription" />
						</UFormGroup>
					</div>
					<div class="flex">
						<h3 class="p-2 basis-2/6 border-2 border-gray-900 text-center text-xl">Weather Conditions</h3>
						<h3 class="p-2 basis-4/6 border-2 border-gray-900 text-center text-xl">Habitat Zone</h3>
					</div>
					<div class="flex">
						<UFormGroup class="p-2 basis-2/6 b-2 border-gray-900">
							<URadioGroup v-model="weatherConditions" :options="weatherConditionOptions" name="weatherConditions" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-2/6 border-l">
							<UCheckbox v-model="riffle" name="riffle" label="Riffle" />
							<UCheckbox v-model="leafPacks" name="leafPacks" label="Leaf Packs" />
							<UCheckbox v-model="woodyDebris" name="woodyDebris" label="Woody Debris" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-2/6">
							<UCheckbox v-model="pools" name="pools" label="Pools" />
							<UCheckbox v-model="undercutBanks" name="undercutBanks" label="Undercut Banks" />
							<UCheckbox
								v-model="submergedAquaticPlants"
								name="submergedAquaticPlants"
								label="Submerged Aquatic Plants"
							/>
						</UFormGroup>
					</div>
				</div>
				<p class="text-l text-gray-900">
					Check all of the macroinvertebrates that you find in your stream and the form will calculate your stream's
					water quality rating.
				</p>
				<div class="flex">
					<h2 class="border-2 border-gray-900 bg-lime-500 basis-1/5 text-xl text-gray-900 text-center">
						Highly Sensitive
					</h2>
					<h2 class="border-2 border-gray-900 bg-lime-500 basis-1/5 text-xl text-gray-900 text-center">Sensitive</h2>
					<h2 class="border-2 border-gray-900 bg-lime-500 basis-1/5 text-xl text-gray-900 text-center">
						Moderately Tolerant
					</h2>
					<h2 class="border-2 border-gray-900 bg-lime-500 basis-2/5 text-xl text-gray-900 text-center">Tolerant</h2>
				</div>
				<div class="flex">
					<div class="border-2 p-2 border-gray-900 basis-1/5">
						<UCheckbox v-model="mussels" :class="{ 'bg-lime-500': mussels }" name="mussels" label="Mussels (Native)" />
						<img src="@/assets/form_icons/mussels-native.png" alt="Mussels" />
						<UCheckbox v-model="stoneflies" name="stoneflies" label="Stoneflies" />
						<img src="@/assets/form_icons/stoneflies.png" alt="Stoneflies" />
						<UCheckbox
							v-model="caddisfliesCaseBuilding"
							name="caddisfliesCaseBuilding"
							label="Caddisflies (case-building)"
						/>
						<img src="@/assets/form_icons/caddisflies-case_building.png" alt="Caddisflies" />
						<UCheckbox v-model="mayflies" name="mayflies" label="Mayflies" />
						<img src="@/assets/form_icons/mayflies.png" alt="Mayflies" />
						<UCheckbox v-model="waterPennies" name="waterPennies" label="Water Pennies" />
						<img src="@/assets/form_icons/water_pennies.png" alt="Water Pennies" />
						<UCheckbox v-model="waterSnipe" name="waterSnipe" label="Water Snipe" />
						<img src="@/assets/form_icons/water_snipe.png" alt="Water Snipe" />
					</div>
					<div class="border-2 p-2 border-gray-900 basis-1/5">
						<UCheckbox
							v-model="caddisfliesNetSpinning"
							name="caddisfliesNetSpinning"
							label="Caddisflies (net-spinning)"
						/>
						<UCheckbox v-model="riffleBeetles" name="riffleBeetles" label="Riffle Beetles (adults and larvae)" />
						<UCheckbox v-model="operculateSnails" name="operculateSnails" label="Operculate Snails (Right-opening)" />
						<UCheckbox v-model="blackFlyLarva" name="blackFlyLarva" label="Black Fly Larva" />
						<UCheckbox v-model="craneFlyLarva" name="craneFlyLarva" label="Crane Fly Larva" />
					</div>
					<div class="border-2 p-2 border-gray-900 basis-1/5">
						<UCheckbox v-model="hellgrammites" name="hellgrammites" label="Hellgrammites / Dobsonfly larvae" />
						<UCheckbox v-model="clamsAndMussels" name="clamsAndMussels" label="Clams and Mussels (Non-Native)" />
						<UCheckbox v-model="crayfish" name="crayfish" label="Crayfish" />
						<UCheckbox v-model="dragonflies" name="dragonflies" label="Dragonflies" />
						<UCheckbox v-model="flatworms" name="flatworms" label="Flatworms" />
						<UCheckbox v-model="midges" name="midges" label="Midges" />
					</div>
					<div class="border-2 p-2 border-gray-900 basis-1/5">
						<UCheckbox v-model="alderflies" name="alderflies" label="Alderflies" />
						<UCheckbox v-model="scuds" name="scuds" label="Scuds" />
						<UCheckbox
							v-model="nonOperculateSnails"
							name="nonOperculateSnails"
							label="Non-operculate Snails (Left-opening)"
						/>
						<UCheckbox v-model="sowBugs" name="sowBugs" label="Sow Bugs" />
						<UCheckbox v-model="leeches" name="leeches" label="Leeches" />
					</div>
					<div class="border-2 p-2 border-gray-900 basis-1/5">
						<UCheckbox v-model="damselflies" name="damselflies" label="Damselflies" />
						<UCheckbox v-model="aquaticWorms" name="aquaticWorms" label="Aquatic Worms" />
						<UCheckbox
							v-model="otherAquaticBeetles"
							name="otherAquaticBeetles"
							label="Other Aquatic Beetles (adults and larvae)"
						/>
					</div>
				</div>
				<div>
					<h2 class="border-2 border-gray-900 bg-lime-500 basis-1/5 text-xl text-gray-900 text-center">
						Water Quality Score = {{ habitatScore }}
					</h2>
				</div>
			</div>
			<div class="flex justify-end mt-6">
				<UButton class="text-gray-900" variant="solid">Submit</UButton>
			</div>
		</Form>
	</div>
</template>
