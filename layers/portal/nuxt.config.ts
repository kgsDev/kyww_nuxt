export default defineNuxtConfig({
	components: [
		// Disable prefixing base components with `Base`
		{ path: './components/', prefix: 'Portal' },
	],

	routeRules: {
		'/auth/**': { ssr: false },
		'/portal/**': { ssr: false, index: false },
	},
});
