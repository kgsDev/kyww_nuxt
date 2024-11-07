#!/bin/bash
export NITRO_PRESET=node-server
export NODE_ENV=production
export PORT=3001
export DIRECTUS_URL=http://directus:8055
export NUXT_DIRECTUS_URL=http://localhost:8056
export DIRECTUS_PUBLIC_URL=https://kyww.uky.edu/backend
export PUBLIC_URL=https://kyww.uky.edu

cd /var/www/prod/kyww_nuxt
exec node .output/server/index.mjs
