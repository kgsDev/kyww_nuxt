// import { formatFonts } from './utils/fonts';
import { theme } from './theme';

export default defineNuxtConfig({
	// https://nuxt.com/docs/api/configuration/nuxt-config

	extends: [
		'./layers/proposals', // Proposals module
		'./layers/portal', // Client portal module
	],

	// Global page headers: https://go.nuxtjs.dev/config-head
	components: [
		// Disable prefixing base components with `Base`
		{ path: '~/components/base', pathPrefix: false },
		// Auto import components from `~/components`
		'~/components',
	],

	css: [
		'~/assets/css/tailwind.css', 
		'~/assets/css/main.css',
	],

	modules: [// https://devtools.nuxtjs.org/
		'@nuxt/devtools', 
		'@nuxt/image', 
		'@nuxt/ui', 
		'@nuxtjs/color-mode', 
		'@nuxtjs/google-fonts', // https://motion.vueuse.org/nuxt.html
		'@vueuse/motion/nuxt', // https://vueuse.org/
		'@vueuse/nuxt', // https://github.com/nuxt-modules/icon
		'nuxt-icon', 
		'nuxt-og-image', // https://nuxtseo.com/schema-org/guides/quick-setup
		'nuxt-schema-org',
		'nuxt-file-storage',
	],

	fileStorage: {
		storages: {
		  local: {
			driver: 'local',
			config: {
			  root: process.env.FILE_STORAGE_MOUNT
			}
		  }
		}
	},

	experimental: {
		componentIslands: true,
		asyncContext: true, // https://nuxt.com/docs/guide/going-further/experimental-features#asynccontext
	},

	runtimeConfig: {
		public: {
			directusPublicUrl: process.env.DIRECTUS_PUBLIC_URL,
			siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
		},
	},

	// Directus Configuration
	directus: {
		rest: {
			baseUrl: process.env.DIRECTUS_URL,
			nuxtBaseUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
		},
		auth: {
			enabled: true,
			enableGlobalAuthMiddleware: false, // Enable auth middleware on every page
			userFields: ['*', { contacts: ['*'] }], // Select user fields
			redirect: {
				login: '/auth/signin', // Path to redirect when login is required
				logout: '/auth/signin', // Path to redirect after logout
				home: '/portal', // Path to redirect after successful login
				resetPassword: '/auth/reset-password', // Path to redirect for password reset
				callback: '/auth/callback', // Path to redirect after login with provider
			},
		},
	},

	// Nuxt DevTools - https://devtools.nuxtjs.org/
	devtools: { enabled: true },

	ui: {
		icons: 'all',
	},

	// Color Mode Configuration - https://color-mode.nuxtjs.org/
	colorMode: {
		classSuffix: '', // This is so we play nice with TailwindCSS
	},

	// Image Configuration - https://image.nuxt.com/providers/directus
	image: {
		provider: 'directus',
		directus: {
			baseURL: `${process.env.DIRECTUS_PUBLIC_URL}/assets/`,
		},
	},

	// Google Fonts Configuration - https://google-fonts.nuxtjs.org/
	googleFonts: {
		families: theme.googleFonts,
		display: 'swap',
		download: true,	
	},

	site: {
		url: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
		name: 'AgencyOS',
	},

	// OG Image Configuration - https://nuxtseo.com/og-image/getting-started/installation
	ogImage: {
		defaults: {
						component: 'OgImageTemplate',
						width: 1200,
						height: 630,
		},
		// @TODO: Fix font families for OG Image
		// fonts: formatFonts(fontFamilies),
	},

	postcss: {
		plugins: {
			'postcss-import': {},
			'tailwindcss/nesting': {},
			'tailwindcss': {},
			'autoprefixer': {},
		},
	},

});