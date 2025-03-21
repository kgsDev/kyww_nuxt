<script setup lang="ts">
import PolicyGuard from '../../components/PolicyGuard.vue';

const { path, query } = useRoute();
const router = useRouter();

const { user } = useDirectusAuth();
// Access the query parameters
const siteId = ref(query?.siteId || '');
const latitude = ref(query?.latitude || '');
const longitude = ref(query?.longitude || '');

const siteNumber = ref('');
const streamName = ref('');
const basin = ref('');
const date = ref('');
const time = ref('');
const samplerName = ref(user?.value?.display_name);
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
const isOpen = ref(false);

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

const submittedAlert = () => {
	alert('Submitted');
};

const submitData = () => {
	submittedAlert();
};
</script>
<template>
<PolicyGuard path="/portal/biological">
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
	<div>
		<PortalPageHeader
			title="New Biological Assessment"
			:breadcrumbs="[
				{
					title: 'Portal',
					href: '/portal',
				},
				{
					title: 'Biological',
					href: '/portal/biological',
				},
			]"
		></PortalPageHeader>
		<h1 class="text-2xl text-center text-gray-900">Kentucky Watershed Watch Biological Assessment Form</h1>

		<Form>
			<div class="relative items-start">
				<div class="border-4 p-1-4a72-bf16-cd2d1e67829b border-gray-900">
					<div class="flex">
						<UFormGroup class="p-2 basis-1/4" label="Sampler Name">
							<UInput v-model="samplerName" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/6" label="Site Number">
							<UInput v-model="siteNumber" type="number" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/4" label="Select a Site">
							<UButton label="Open Map" @click="isOpen = true" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/6" label="Date">
							<UInput v-model="date" type="date" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-1/6" label="Time">
							<UInput v-model="time" />
						</UFormGroup>
					</div>
					<div class="flex">
					</div>
					<div class="flex">
						<h3 class="p-2 basis-2/6 border-2 border-gray-900 text-center text-xl">Weather Conditions</h3>
						<h3 class="p-2 basis-4/6 border-2 border-gray-900 text-center text-xl">Habitat Zone</h3>
					</div>
					<div class="flex">
						<UFormGroup class="p-2 basis-2/6 border-2 border-gray-900">
							<URadioGroup v-model="weatherConditions" :options="weatherConditionOptions" name="weatherConditions" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-2/6 border-l-2 border-b-2 border-t-2 border-gray-900">
							<UCheckbox v-model="riffle" name="riffle" label="Riffle" />
							<UCheckbox v-model="leafPacks" name="leafPacks" label="Leaf Packs" />
							<UCheckbox v-model="woodyDebris" name="woodyDebris" label="Woody Debris" />
						</UFormGroup>
						<UFormGroup class="p-2 basis-2/6 border-r-2 border-b-2 border-t-2 border-gray-900">
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
					Click all of the macroinvertebrates that you find in your stream and the form will calculate your stream's
					biological water quality score.
				</p>
				<h2
					class="border-2 border-gray-900 text-xl text-gray-900 text-center p-2"
					:class="{
						'bg-red-500': habitatScore < 19,
						'bg-orange-500': habitatScore >= 19 && habitatScore <= 32,
						'bg-yellow-500': habitatScore > 32 && habitatScore <= 41,
						'bg-green-500': habitatScore > 41,
					}"
				>
					Biological Water Quality Score = {{ habitatScore }} - {{ habitatScore < 19 ? 'Poor' : '' }}
					{{ habitatScore >= 19 && habitatScore <= 32 ? 'Marginal' : '' }}
					{{ habitatScore > 32 && habitatScore <= 41 ? 'Fair' : '' }}
					{{ habitatScore > 41 ? 'Good' : '' }}
				</h2>
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
					<div class="border-2 border-gray-900 basis-1/5">
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': mussels }" @click="mussels = !mussels">
							<label for="mussels">Mussels (Native)</label>
							<img src="@/assets/form_icons/mussels-native.png" alt="Mussels" />
						</div>
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': stoneflies }" @click="stoneflies = !stoneflies">
							<label for="stoneflies">Stoneflies</label>
							<img src="@/assets/form_icons/stoneflies.png" alt="Stoneflies" />
						</div>
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': caddisfliesCaseBuilding }"
							@click="caddisfliesCaseBuilding = !caddisfliesCaseBuilding"
						>
							<label for="caddisfliesCaseBuilding">Caddisflies (case-building)</label>
							<img src="@/assets/form_icons/caddisflies-case_building.png" alt="Caddisflies" />
						</div>
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': mayflies }" @click="mayflies = !mayflies">
							<label for="mayflies">Mayflies</label>
							<img src="@/assets/form_icons/mayflies.png" alt="Mayflies" />
						</div>
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': waterPennies }"
							@click="waterPennies = !waterPennies"
						>
							<label for="waterPennies">Water Pennies</label>
							<img src="@/assets/form_icons/water_pennies.png" alt="Water Pennies" />
						</div>
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': waterSnipe }" @click="waterSnipe = !waterSnipe">
							<label for="waterSnipe">Water Snipe</label>
							<img src="@/assets/form_icons/water_snipe.png" alt="Water Snipe" />
						</div>
					</div>
					<div class="border-2 border-gray-900 basis-1/5">
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': caddisfliesNetSpinning }"
							@click="caddisfliesNetSpinning = !caddisfliesNetSpinning"
						>
							<label for="caddisfliesNetSpinning">Caddisflies (net-spinning)</label>
							<img src="@/assets/form_icons/caddisflies-net_spinning.png" alt="Caddisflies" />
						</div>
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': riffleBeetles }"
							@click="riffleBeetles = !riffleBeetles"
						>
							<label for="riffleBeetles">Riffle Beetles (adults and larvae)</label>
							<img src="@/assets/form_icons/riffle_beetles-adults_and_larvae.png" alt="Riffle Beetles" />
						</div>
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': operculateSnails }"
							@click="operculateSnails = !operculateSnails"
						>
							<label for="operculateSnails">Operculate Snails (Right-opening)</label>
							<img src="@/assets/form_icons/operculate_snails-right_opening.png" alt="Operculate Snails" />
						</div>
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': blackFlyLarva }"
							@click="blackFlyLarva = !blackFlyLarva"
						>
							<label for="blackFlyLarva">Black Fly Larvae</label>
							<img src="@/assets/form_icons/black_fly_larva.png" alt="Black Fly Larva" />
						</div>
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': craneFlyLarva }"
							@click="craneFlyLarva = !craneFlyLarva"
						>
							<label for="craneFlyLarva">Crane Fly Larvae</label>
							<img src="@/assets/form_icons/crane_fly_larva.png" alt="Crane Fly Larva" />
						</div>
					</div>
					<div class="border-2 border-gray-900 basis-1/5">
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': hellgrammites }"
							@click="hellgrammites = !hellgrammites"
						>
							<label for="hellgrammites">Hellgrammites / Dobsonfly Larvae</label>
							<img src="@/assets/form_icons/hellgrammites-dobsonfly_larvae.png" alt="Hellgrammites" />
						</div>
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': clamsAndMussels }"
							@click="clamsAndMussels = !clamsAndMussels"
						>
							<label for="clamsAndMussels">Clams and Mussels (Non-Native)</label>
							<img src="@/assets/form_icons/clams_and_mussels-non_native.png" alt="Clams and Mussels" />
						</div>
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': crayfish }" @click="crayfish = !crayfish">
							<label for="crayfish">Crayfish</label>
							<img src="@/assets/form_icons/crayfish.png" alt="Crayfish" />
						</div>
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': dragonflies }" @click="dragonflies = !dragonflies">
							<label for="dragonflies">Dragonflies</label>
							<img src="@/assets/form_icons/dragonflies.png" alt="Dragonflies" />
						</div>
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': flatworms }" @click="flatworms = !flatworms">
							<label for="flatworms">Flatworms</label>
							<img src="@/assets/form_icons/flatworms.png" alt="Flatworms" />
						</div>
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': midges }" @click="midges = !midges">
							<label for="midges">Midges</label>
							<img src="@/assets/form_icons/midges.png" alt="Midges" />
						</div>
					</div>
					<div class="border-b-2 border-l-2 border-t-2 border-gray-900 basis-1/5">
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': alderflies }" @click="alderflies = !alderflies">
							<label for="alderflies">Alderflies</label>
							<img src="@/assets/form_icons/alderflies.png" alt="Alderflies" />
						</div>
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': scuds }" @click="scuds = !scuds">
							<label for="scuds">Scuds</label>
							<img src="@/assets/form_icons/scuds.png" alt="Scuds" />
						</div>
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': nonOperculateSnails }"
							@click="nonOperculateSnails = !nonOperculateSnails"
						>
							<label for="nonOperculateSnails">Non-operculate Snails (Left-opening)</label>
							<img src="@/assets/form_icons/non_operculate_snails-left_opening.png" alt="Non-operculate Snails" />
						</div>
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': sowBugs }" @click="sowBugs = !sowBugs">
							<label for="sowBugs">Sow Bugs</label>
							<img src="@/assets/form_icons/sow_bugs.png" alt="Sow Bugs" />
						</div>
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': leeches }" @click="leeches = !leeches">
							<label for="leeches">Leeches</label>
							<img src="@/assets/form_icons/leeches.png" alt="Leeches" />
						</div>
					</div>
					<div class="border-b-2 border-r-2 border-t-2 border-gray-900 basis-1/5">
						<div class="p-2" :class="{ 'bg-lime-500 text-gray-900': damselflies }" @click="damselflies = !damselflies">
							<label for="damselflies">Damselflies</label>
							<img src="@/assets/form_icons/damselflies.png" alt="Damselflies" />
						</div>
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': aquaticWorms }"
							@click="aquaticWorms = !aquaticWorms"
						>
							<label for="aquaticWorms">Aquatic Worms</label>
							<img src="@/assets/form_icons/aquatic_worms.png" alt="Aquatic Worms" />
						</div>
						<div
							class="p-2"
							:class="{ 'bg-lime-500 text-gray-900': otherAquaticBeetles }"
							@click="otherAquaticBeetles = !otherAquaticBeetles"
						>
							<label for="otherAquaticBeetles">Other Aquatic Beetles (adults and larvae)</label>
							<img src="@/assets/form_icons/other_aquatic_beetles-adults_and_larvae.png" alt="Other Aquatic Beetles" />
						</div>
					</div>
				</div>
				<div>
					<h2
						class="border-2 border-gray-900 text-xl text-gray-900 text-center p-2"
						:class="{
							'bg-red-500': habitatScore < 19,
							'bg-orange-500': habitatScore >= 19 && habitatScore <= 32,
							'bg-yellow-500': habitatScore > 32 && habitatScore <= 41,
							'bg-green-500': habitatScore > 41,
						}"
					>
						Biological Water Quality Score = {{ habitatScore }} - {{ habitatScore < 19 ? 'Poor' : '' }}
						{{ habitatScore >= 19 && habitatScore <= 32 ? 'Marginal' : '' }}
						{{ habitatScore > 32 && habitatScore <= 41 ? 'Fair' : '' }}
						{{ habitatScore > 41 ? 'Good' : '' }}
					</h2>
				</div>
				<div>
					<p class="text-sm">
						Images are not shown to scale. Images from the following sources: Zebra mussel Image: fieldguide.mt.gov;
						Operculate Snail Image: mdc.mo.gov; Aquatic Worm Image: nwnature.net, All other images from
						Macroinvertebrates.org
					</p>
					<p>
						<strong>NOTE:</strong>
						Common macroinvertebrates such as water boatmen, backswimmers, water scorpions, giant water bugs, water
						striders, and fishing spiders are not included on the form as their presences is not linked to tolerance or
						sensitivity to pollution.
					</p>
				</div>
			</div>
			<div class="flex justify-end mt-6">
				<UButton class="text-gray-900" variant="solid" @click="submitData">Submit</UButton>
			</div>
		</Form>
	</div>
</PolicyGuard>
</template>
