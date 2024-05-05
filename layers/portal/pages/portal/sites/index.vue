<script setup lang="ts">
const { path, query } = useRoute();
const router = useRouter();
</script>
<template>
	<div>
		<PortalPageHeader
			title="Sites"
			:breadcrumbs="[
				{
					title: 'Portal',
					href: '/portal',
				},
				{
					title: 'Sampling',
				},
			]"
		>
			<template #actions>
				<UButton
					color="primary"
					variant="outline"
					size="xl"
					:loading="stripeLoading"
					@click="getPortalLink('cus_OlTbJKVanSb1zN')"
				>
					Update Payment Settings
				</UButton>
			</template>
		</PortalPageHeader>
		<UCard class="mt-6">
			<template #header>
				<!-- Filters -->
				<div class="flex items-center justify-between gap-3">
					<UInput v-model="search" icon="i-heroicons-magnifying-glass-20-solid" placeholder="Search..." type="text" />
					<div class="flex gap-3">
						<USelect v-model="status" :options="statusOptions" placeholder="Invoice Status" />
						<UButton
							color="white"
							size="xs"
							:disabled="!search && !status"
							icon="material-symbols:filter-alt-off-outline-rounded"
							@click="clearFilters"
						>
							Reset
						</UButton>
					</div>
				</div>
			</template>
			<!-- Table -->
			<UTable v-auto-animate :columns="columns" :rows="invoices" column-attribute="label" :loading="pending">
				<!-- Empty State -->
				<template #empty-state>
					<div class="w-1/4 mx-auto text-center">
						<img src="~/assets/illustrations/tokyo-attention-sign.svg" alt="Empty State" />
						<TypographyHeadline content="Looks like there's nothing here." size="xs" />
						<UButton
							v-if="search || status"
							color="white"
							size="xs"
							icon="material-symbols:filter-alt-off-outline-rounded"
							class="mt-4"
							@click="clearFilters"
						>
							Reset Filters
						</UButton>
					</div>
				</template>
				<!-- Columns -->
				<template #invoice_number-data="{ row }">
					<UButton variant="outline" :to="`/portal/billing/invoices/${row.id}`" :padding="false">
						{{ row.invoice_number }}
					</UButton>
				</template>
				<template #amount_due-data="{ row }">
					{{ row.amount_due }}
				</template>
				<template #total-data="{ row }">
					{{ row.total }}
				</template>
				<template #contact-data="{ row }">
					<UserBadge :user="row.contact" size="sm" />
				</template>
				<template #status-data="{ row }">
					<UBadge
						:label="row.status"
						:color="row.status === 'unpaid' ? 'rose' : 'primary'"
						size="xs"
						class="capitalize"
					/>
				</template>
				<template #due_date-data="{ row }">
					<VText size="xs">
						{{
							getFriendlyDate(row.due_date, {
								monthAbbr: true,
							})
						}}
					</VText>
					<VText size="xs" text-color="light">{{ getRelativeTime(row.due_date) }}</VText>
				</template>
				<template #actions-data="{ row }">
					<UButton
						:to="`/portal/billing/invoices/${row.id}`"
						color="primary"
						variant="outline"
						icon="i-heroicons-arrow-right"
					/>
				</template>
			</UTable>
			<!-- Number of rows & Pagination -->
			<template #footer>
				<div class="flex flex-wrap items-center justify-between">
					<VText>
						<span class="text-sm leading-5">
							Showing
							<span class="font-medium">{{ pageFrom }}</span>
							to
							<span class="font-medium">{{ pageTo }}</span>
							of
							<span class="font-medium">{{ totalCount }}</span>
							results
						</span>
					</VText>
					<UPagination v-model="page" :page-count="rowsPerPage" :total="totalCount" />
				</div>
			</template>
		</UCard>
	</div>
</template>
