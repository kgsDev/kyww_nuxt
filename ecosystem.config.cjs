module.exports = {
  apps: [
    {
      name: 'kyww_nuxt',
      script: './.output/server/index.mjs', // This should directly point to the production build
      exec_mode: 'fork', // Use 'fork' mode instead of 'cluster' for simplicity
      env: {
        NODE_ENV: 'production',
        API_URL: 'https://kyww.uky.edu',
        BASE_URL: 'https://kyww.uky.edu',
        DIRECTUS_URL: 'https://kyww.uky.edu/backend', 
        PORT: 3001
      }
    }
  ]
};
