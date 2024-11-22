module.exports = {
  apps: [{
    name: 'kyww_nuxt',
    script: './.output/server/index.mjs',
    exec_mode: 'cluster',
    instances: 'max',
    instances: 2, // Let's start with 2 instances instead of max
    env: {
      NODE_ENV: 'production',
      API_URL: 'https://kyww.uky.edu',
      BASE_URL: 'https://kyww.uky.edu',
      DIRECTUS_URL: 'https://kyww.uky.edu/backend',
      NUXT_PUBLIC_DIRECTUS_URL: 'https://kyww.uky.edu/backend', // Add this
      PORT: 3001,
      HOST: 'localhost', // Add this
      NITRO_HOST: 'localhost', // Add this
      NITRO_PORT: 3001 // Add this
    },
    error_file: '/var/log/kyww/error.log',
    out_file: '/var/log/kyww/access.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_restarts: 5,
    min_uptime: '5s',
    listen_timeout: 50000,
    kill_timeout: 3000,
    watch: false,
    exp_backoff_restart_delay: 100,
    post_update: ["npm install"],
    autorestart: true,
    max_memory_restart: '1G',
    merge_logs: true
  }]
};