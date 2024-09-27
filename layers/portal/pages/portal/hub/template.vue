<template>
	<div v-for="groupIndex in Math.ceil(items.length / 5)" :key="groupIndex" class="grid-container">
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
			:class="{ selected: selectedOptions[groupIndex - 1] === index }"
			@click="selectOption(groupIndex - 1, index)"
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
</template>

<script>
export default {
	data() {
		return {
			items: [
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
					description:
						'Channel mostly straightened, but vegetation still present and no rock or cement hardening of banks.',
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
				{ description: 'Only small gravel- sized rocks, some wood and leaf packs.' },
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
				{ description: 'Stream 2 of the velocity and depth combinations.' },
				{ description: 'Stream has only 1 type of velocity and depth combination.' },
			],
			selectedOptions: [],
		};
	},
	created() {
		const groupCount = Math.ceil(this.items.length / 5);
		this.selectedOptions = Array(groupCount).fill(null);
	},
	methods: {
		selectOption(groupIndex, index) {
			this.selectedOptions[groupIndex] = index;
		},
	},
};
</script>

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