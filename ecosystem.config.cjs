module.exports = {
  apps: [{
    name: 'kyww_nuxt',
    script: './.output/server/index.mjs',
    //exec_mode: 'cluster',
    exec_mode: 'fork',
    instances: 1, // Let's start with 2 instances instead of max
    env: {
      NODE_ENV: 'production',
      API_URL: 'https://kyww.uky.edu',
      BASE_URL: 'https://kyww.uky.edu',
      DIRECTUS_URL: 'https://kyww.uky.edu/backend',
      NUXT_PUBLIC_DIRECTUS_URL: 'https://kyww.uky.edu/backend', // Add this
      PORT: 3001,
      HOST: '127.0.0.1', //  use this instead of localhost
      NITRO_HOST: '127.0.0.1', // use this instead of localhost
      NITRO_PORT: 3001 // this port should be the same as PORT
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