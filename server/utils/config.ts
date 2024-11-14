import { useRuntimeConfig } from '#imports';

export interface RuntimeConfig {
  SENDGRID_API_KEY: string;
  RECAPTCHA_SECRET_KEY: string;
  DIRECTUS_SERVER_TOKEN: string;
  public: {
    directusPublicUrl: string;
    siteUrl: string;
    API_URL: string;
    DIRECTUS_URL: string;
    TRAINER_ROLE_ID: string;
    BASIN_LEAD_ROLE_ID: string;
    SAMPLER_ROLE_ID: string;
    ADMIN_ROLE_ID: string;
    WEB_API_ROLE_ID: string;
    GOOGLE_MAPS_API_KEY: string;
    RECAPTCHA_PUBLIC_KEY: string;
    MAPBOX_ACCESS_TOKEN: string;
  }
}

// Update the getApiConfig function with the type
export function getApiConfig(): RuntimeConfig {
  const runtimeConfig = useRuntimeConfig();
  const isDev = process.env.NODE_ENV === 'development';

  return {
    ...runtimeConfig,
    public: {
      ...runtimeConfig.public,
      directusUrl: isDev ? 'http://localhost:8057' : runtimeConfig.public.DIRECTUS_URL,
      DIRECTUS_URL: isDev ? 'http://localhost:8057' : runtimeConfig.public.DIRECTUS_URL,
      directusPublicUrl: isDev ? 'http://localhost:8057' : runtimeConfig.public.directusPublicUrl,
      siteUrl: isDev ? 'http://localhost:3000' : runtimeConfig.public.siteUrl,
      API_URL: isDev ? 'http://localhost:8057' : runtimeConfig.public.API_URL,
    }
  } as RuntimeConfig;
}

// You can also add helper functions for common API operations
export function getDirectusHeaders(config: ReturnType<typeof getApiConfig>) {
  return {
    Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
    'Content-Type': 'application/json',
  };
}