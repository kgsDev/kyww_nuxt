<script setup lang="ts">
import Joi from 'joi';
import type { FormSubmitEvent } from '#ui/types';

const myJoi = Joi.extend(require('joi-phone-number'));

const { path, query } = useRoute();
const router = useRouter();

//pull these from database. duh
const teamOptions = ref([
	{
		id: 1,
		name: 'Anderson Creek',
	},
	{
		id: 2,
		name: 'Big Bend',
	},
	{
		id: 3,
		name: 'CatLadies',
	},
	{
		id: 4,
		name: 'DuckDuckGoose',
	},
	{
		id: 5,
		name: 'Timber',
	},
	{
		id: 6,
		name: 'Wolves',
	},
	{
		id: 7,
		name: 'Zebra',
	},
	{
		id: 8,
		name: 'ZZTopFans',
	},
	{
		id: 9,
		name: 'ZooCrew',
	},
	{
		id: 10,
		name: 'ZooKeepers',
	},
]);

const selected = ref([]);

const labels = computed({
	get: () => selected.value,
	set: async (labels) => {
		const promises = labels.map(async (label) => {
			if (label.id) {
				return label;
			}

			// In a real app, you would make an API call to create the label
			const response = {
				id: teamOptions.value.length + 1,
				name: label.name,
			};

			teamOptions.value.push(response);

			return response;
		});

		selected.value = await Promise.all(promises);
	},
});

const now = Date.now();
const cutOffDate = new Date(now - 1000 * 60 * 60 * 24 * 365 * 14);

const schema = myJoi.object({
	name: myJoi.string().min(3).required(),
	mailingAddress: myJoi.string().required(),
	phoneNumber: myJoi.string().phoneNumber().required(),
	birthdate: myJoi.date().max(cutOffDate).required(),
});

// TODO: better calendar for birthday select
</script>
<template>
	<div>
		<PortalPageHeader
			title="New Trained Volunteer Signup"
			:breadcrumbs="[
				{
					title: 'Portal',
					href: '/portal',
				},
				{
					title: 'Signup',
				},
			]"
		>
			<template #actions>
				<UButton color="primary" variant="outline" size="l" @click="resetForm()">&nbsp;Reset Form&nbsp;</UButton>
			</template>
		</PortalPageHeader>
		<UCard class="mt-6">
			<UForm>
				<div class="relative items-start">
					<div class="border-4 p-1 border-gray-900">
						<div class="flex">
							<UFormGroup class="p-2 basis-1/3" label="Name" required>
								<UInput v-model="name" icon="i-ic-baseline-person" />
							</UFormGroup>
						</div>
						<div class="flex">
							<UFormGroup class="p-2 basis-1/3" label="Name" required>
								<UInput placeholder="jonbonjovilover59@aol.com" icon="i-ic-baseline-email" disabled />
							</UFormGroup>
						</div>
						<div class="flex">
							<UFormGroup class="p-2 basis-1/3" label="Mailing Address" required>
								<UInput v-model="mailingAddress" icon="ic:baseline-mail" />
							</UFormGroup>
						</div>
						<div class="flex">
							<UFormGroup class="p-2 basis-1/3" label="Phone Number" required>
								<UInput v-model="phoneNumber" icon="ic:baseline-phone" />
							</UFormGroup>
						</div>

						<div class="flex">
							<UFormGroup class="p-2 basis-1/3" label="Birthday" required>
								<UInput v-model="birthdate" icon="mdi:birthday-cake-outline" type="date" />
							</UFormGroup>
						</div>
						<div class="flex">
							<UFormGroup class="p-2 basis-1/3" label="Team" required>
								<USelectMenu
									v-model="labels"
									class="h-full"
									by="id"
									name="labels"
									:options="teamOptions"
									option-attribute="name"
									multiple
									searchable
									creatable
									show-create-option-when="always"
									placeholder="Find a Team"
									searchable-placeholder="Search for a Team or Create Your Own"
									icon="ic:baseline-groups"
								/>
								<template #help>
									You have to select at least one team. It can be one you come up with just for you.
								</template>
							</UFormGroup>
						</div>
						<UButton>Submit</UButton>
					</div>
				</div>
			</UForm>
		</UCard>
	</div>
</template>
