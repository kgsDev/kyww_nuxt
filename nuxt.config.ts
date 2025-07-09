// import { formatFonts } from './utils/fonts';
import { theme } from './theme';
export default defineNuxtConfig({
	server: {
		port: 3001,       // Ensure this matches your Nginx proxy configuration
		host: '0.0.0.0',  // Ensure it's accessible externally
	},

	// Add Vite config for development
	devServer: process.env.NODE_ENV === 'development' ? {
        port: 3000,
        host: '0.0.0.0',
    } : {},

    vite: {
        define: {
            'process.env.DEBUG': 'false'
        },
        server: {
            hmr: process.env.NODE_ENV === 'development' ? {
                clientPort: 3000,
                port: 3000,
                protocol: 'ws',
                host: '0.0.0.0',
                overlay: false
            } : false
        },
		build: {
			chunkSizeWarningLimit: 1000,
			rollupOptions: {
			  output: {
				manualChunks(id) {
				  if (id.includes('node_modules')) {
					return 'vendor';
				  }
				  if (id.includes('pages/account')) {
					return 'account';
				  }
				}
			  }
			}
		}
    },

	//for development:
    //devtools: { enabled: true },
    //debug: process.env.NODE_ENV === 'development',

	extends: [
		'./layers/portal', // Client portal module
	],

	dir: {
		pages: 'pages',  // This ensures the root pages directory is recognized
	},

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
		'@/assets/css/font-awesome.css'
	],

	modules: [
		//'@nuxt/devtools', 
		'@nuxt/image', 
		'@nuxt/ui', 
		'@nuxtjs/color-mode', 
		'@nuxtjs/google-fonts', // https://motion.vueuse.org/nuxt.html
		'@vueuse/motion/nuxt', // https://vueuse.org/
		'@vueuse/nuxt', // https://github.com/nuxt-modules/icon
		'nuxt-icon', 
		'nuxt-schema-org',
		'nuxt-file-storage',
		'nuxt-gtag'
	],

	gtag: {
		id: process.env.GTM_ID, // Your GA4 measurement ID
		config: {
		  page_title: 'Kentucky Watershed Watch',
		  debug_mode: false // Set to false in production
		},
	},

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
		SENDGRID_API_KEY: process.env.EMAIL_SENDGRID_API_KEY, //mail client - under dccurl2@g.uky.edu account
		RECAPTCHA_SECRET_KEY : process.env.RECAPTCHA_SECRET_KEY, //captcha - under dccurl2@g.uky.edu
		DIRECTUS_SERVER_TOKEN: process.env.DIRECTUS_SERVER_TOKEN,
		DB_CLIENT : process.env.DB_CLIENT,
		DB_HOST:process.env.DB_HOST,
		DB_PORT : process.env.DB_PORT,
		DB_USER : process.env.DB_USER,
		DB_PASSWORD	: process.env.DB_PASSWORD,
		DB_DATABASE	: process.env.DB_DATABASE,
		public: {
			directusPublicUrl: process.env.NODE_ENV === 'development'
				? 'http://localhost:8057'
				: (process.env.DIRECTUS_URL || 'https://kyww.uky.edu/backend'),
			siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://kyww.uky.edu',
			API_URL: process.env.API_URL || 'not set',
			DIRECTUS_URL: process.env.NODE_ENV === 'development'
				? 'http://localhost:8057'
				: (process.env.DIRECTUS_URL || 'https://kyww.uky.edu/backend'),
			//TRAINER_ROLE_ID:process.env.TRAINER_ROLE_ID,
			//BASIN_LEAD_ROLE_ID:process.env.BASIN_LEAD_ROLE_ID,
			//SAMPLER_ROLE_ID:process.env.SAMPLER_ROLE_ID,
			//ADMIN_ROLE_ID:process.env.ADMIN_ROLE_ID,
			DEVADMIN_ROLE_ID:process.env.DEVADMIN_ROLE_ID,
			WWKYADMIN_ROLE_ID:process.env.WWKYADMIN_ROLE_ID,
			STANDARD_ROLE_ID:process.env.STANDARD_ROLE_ID,
			FULLADMIN_POLICY_ID:process.env.FULLADMIN_POLICY_ID,
			WWKYADMIN_POLICY_ID:process.env.WWKYADMIN_POLICY_ID,
			HUB_POLICY_ID:process.env.HUB_POLICY_ID,
			TRAINER_POLICY_ID:process.env.TRAINER_POLICY_ID,
			LEADER_POLICY_ID:process.env.LEADER_POLICY_ID,
			SAMPLER_POLICY_ID:process.env.SAMPLER_POLICY_ID,
			PUBLIC_POLICY_ID:process.env.PUBLIC_POLICY_ID,
			WEB_API_ROLE_ID:process.env.WEB_API_ROLE_ID,
			GOOGLE_MAPS_API_KEY : process.env.GOOGLE_MAPS_API_KEY,
			RECAPTCHA_PUBLIC_KEY : process.env.RECAPTCHA_PUBLIC_KEY,
			MAPBOX_ACCESS_TOKEN : process.env.MAPBOX_ACCESS_TOKEN //mapbox - under doug@uky.edu
		},
	},

	nitro: {
        routeRules: {
            '/api/**': {
                cors: true,
                credentials: true
            },
            '/': { redirect: '/sites' },
            '/auth': { redirect: '/auth/signin' },
            '/reset-password': { ssr: false },
            '/request-password': { ssr: false },
            '/signup': { ssr: false },
			'/signin': { redirect: '/auth/signin' },
            '/projects': { redirect: '/sites' },
            '/data': { redirect: '/sites' },
        },
        // Add development proxy for Directus
        devProxy: process.env.NODE_ENV === 'development' ? {
            '/backend': {
				target: 'http://localhost:8057',
				changeOrigin: true,
				pathRewrite: { '^/backend': '' }
			}
        } : {}
    },

	// Directus Configuration
	directus: {
		rest: {
			baseUrl: (() => {
				const url = process.env.NODE_ENV === 'development'
				  ? 'http://localhost:8057'
				  : (process.env.DIRECTUS_URL || 'https://kyww.uky.edu/backend');
				return url;
			  })(),
            nuxtBaseUrl: process.env.NODE_ENV === 'development'
                ? 'http://localhost:3000'
                : (process.env.NUXT_PUBLIC_SITE_URL || 'https://kyww.uky.edu'),
        },
		auth: {
			enabled: true,
			enableGlobalAuthMiddleware: false, // Enable auth middleware on every page
			userFields: ['*', { contacts: ['*'] }], // Select user fields
			redirect: {
				login: '/auth/signin', // Path to redirect when login is required
				logout: '/auth/signin', // Path to redirect after logout
				home: '/portal', // Path to redirect after successful login
				resetPassword: '/reset-password', // Path to redirect for password reset
				callback: '/auth/callback', // Path to redirect after login with provider
			},
		},
	},

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
			baseURL: process.env.DIRECTUS_PUBLIC_URL 
            ? `${process.env.DIRECTUS_PUBLIC_URL}/assets/`
            : 'https://kyww.uky.edu/backend/assets/',
		},
	},

	// Google Fonts Configuration - https://google-fonts.nuxtjs.org/
	googleFonts: {
		families: theme.googleFonts,
		display: 'swap',
		download: true,	
	},

	site: {
		url: process.env.NUXT_PUBLIC_SITE_URL || 'https://kyww.uky.edu',
		name: 'KY Watershed Watch',
	},

	//router used for RBAC - role based access control
	router: {
		middleware: ['rbac']
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