<template>
	<div>
		<PortalPageHeader
			title="Sample Info"
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

	<SampleView />
	</div>
  </template>
  
  <script setup>
  	import SampleView from 'SampleView.vue';
  </script>