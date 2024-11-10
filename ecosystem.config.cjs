module.exports = {
  apps: [{
    name: 'kyww_nuxt',
    script: './.output/server/index.mjs',
    exec_mode: 'cluster',
    instances: 'max', // Or specific number like 2 based on your CPU cores
    max_memory_restart: '1G',
    exp_backoff_restart_delay: 100,
    env: {
      NODE_ENV: 'production',
      API_URL: 'https://kyww.uky.edu',
      BASE_URL: 'https://kyww.uky.edu',
      DIRECTUS_URL: 'https://kyww.uky.edu/backend',
      PORT: 3001
    },
    error_file: '/var/log/kyww/error.log',
    out_file: '/var/log/kyww/access.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_restarts: 10,
    min_uptime: '5s',
    listen_timeout: 50000,
    kill_timeout: 3000,
    watch: false, // Set to true only if you need file watching
    exp_backoff_restart_delay: 100,
    max_restarts: 5,
    post_update: ["npm install"],
    watch: false,
    autorestart: true,
    max_memory_restart: '1G',
    error_file: '/var/log/kyww/error.log',
    out_file: '/var/log/kyww/out.log',
    merge_logs: true,
  }]
};