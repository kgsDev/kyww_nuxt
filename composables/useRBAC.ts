export interface AccessControl {
  path: string
  roles?: string[]
  policies?: string[]
  exact?: boolean
  requireTraining?: ('fieldChemistry' | 'habitat' | 'biological' | 'rCard')[]
  requireTrainer?: boolean
  requireBasinLead?: boolean
  requireSampler?: boolean
}

export function useRBAC() {
  const nuxtApp = useNuxtApp()
  const $directus = nuxtApp.$directus as RestClient<Schema> & AuthenticationClient<Schema>
  const { user, _loggedIn } = useDirectusAuth()
  const config = useRuntimeConfig()
  
  const userPoliciesRef = ref([])
  const userRoleRef = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const userTrainingRef = ref<Record<string, boolean>>({})

  // Roles configuration
  const roles = {
    devAdmin: config.public.DEVADMIN_ROLE_ID,
    wwkyAdmin: config.public.WWKYADMIN_ROLE_ID,
    standard: config.public.STANDARD_ROLE_ID,
  }

  // Policies configuration
  const policies = {
    fullAdmin: config.public.FULLADMIN_POLICY_ID,
    wwkyAdmin: config.public.WWKYADMIN_POLICY_ID,
    hub: config.public.HUB_POLICY_ID,
    trainer: config.public.TRAINER_POLICY_ID,
    leader: config.public.LEADER_POLICY_ID,
    sampler: config.public.SAMPLER_POLICY_ID,
    public: config.public.PUBLIC_POLICY_ID,
  }

  const fetchUserPolicies = async () => {
    if (!_loggedIn.get()) {
      console.warn('User not logged in')
      return
    }

    loading.value = true
    error.value = null

    try {
      const userData = await $directus.request(readMe({
        fields: ['*', 'role.id', 'role.name', 'policies.*']
      }))

      if (userData?.role?.id) {
        userRoleRef.value = userData.role.id
      }

      if (userData?.policies && Array.isArray(userData.policies)) {
        const policyArray = Array.from(userData.policies)
        userPoliciesRef.value = policyArray.map(p => p.policy)
      } else {
        userPoliciesRef.value = []
      }

      // ✅ Fetch training status here, inside the async function
      try {
        const trainingStatus = await $fetch('/api/my-training-status', {
          query: { userId: userData.id }
        })
        userTrainingRef.value = trainingStatus
      } catch {
        userTrainingRef.value = {}
      }

    } catch (err) {
      console.error('Error fetching policies:', err)
      error.value = err
      userPoliciesRef.value = []
      userRoleRef.value = null
      userTrainingRef.value = {}   // ← also reset training on failure
    } finally {
      loading.value = false
    }
  }

  // Access configuration - add new routes here - update the portal.vue for navigation
  const accessConfig: AccessControl[] = [
    {
      path: '/portal/leader/hub-manager-invite',
      roles: [roles.devAdmin, roles.wwkyAdmin],
      policies: [policies.fullAdmin, policies.wwkyAdmin, policies.leader],
    },
    {
      path: '/portal/users',
      roles: [roles.devAdmin, roles.wwkyAdmin],
      policies: [policies.fullAdmin, policies.wwkyAdmin, policies.leader],
    },
    {
      path: '/portal/train',
      roles: [roles.devAdmin, roles.wwkyAdmin],
      policies: [policies.fullAdmin, policies.trainer],
    },
    {
      path: '/portal/train/report',
      roles: [roles.devAdmin, roles.wwkyAdmin],
      policies: [policies.fullAdmin, policies.trainer],
    },
    {
      path: '/portal/hub/hub-add',
      roles: [roles.devAdmin, roles.wwkyAdmin],
      policies: [policies.fullAdmin, policies.hub, policies.leader],
    },
    {
      path: '/portal/hub/hub-samplers',
      roles: [roles.devAdmin, roles.wwkyAdmin],
      policies: [policies.fullAdmin, policies.hub, policies.leader],
    },
    {
      path: '/portal/hub',
      roles: [roles.devAdmin, roles.wwkyAdmin, roles.standard],
    },
    {
      path: '/portal/sample',
      roles: [roles.devAdmin, roles.wwkyAdmin],
      policies: [policies.fullAdmin, policies.sampler, policies.trainer, policies.leader],
      requireTraining: ['fieldChemistry'],
    },
    {
      path: '/portal/biological',
      roles: [roles.devAdmin, roles.wwkyAdmin],
      policies: [policies.fullAdmin, policies.sampler, policies.trainer, policies.leader],
      requireTraining: ['biological'],
    },
    {
      path: '/portal/habitat',
      roles: [roles.devAdmin, roles.wwkyAdmin],
      policies: [policies.fullAdmin, policies.sampler, policies.trainer, policies.leader],
      requireTraining: ['habitat'],
    },
    {
      path: '/unauthorized',
      roles: [],
      policies: []
    }
  ] as const

  const hasAccess = async (path: string): Promise<boolean> => {
    if (_loggedIn.get() && (!userPoliciesRef.value.length || !userRoleRef.value)) {
      await fetchUserPolicies()
    }

    if (!path) return false

    const routeConfig = accessConfig.find(p =>
      p.exact ? p.path === path : path.startsWith(p.path)
    )

    if (!routeConfig) return true

    const currentPolicies = Array.isArray(userPoliciesRef.value)
      ? Array.from(userPoliciesRef.value) : []

    const isAdmin = Boolean(
      userRoleRef.value &&
      [roles.devAdmin, roles.wwkyAdmin].includes(userRoleRef.value)
    )

    // Admins bypass all training checks
    if (isAdmin) return true

    const hasRole = Boolean(
      !routeConfig.roles?.length ||
      (userRoleRef.value && routeConfig.roles.includes(userRoleRef.value))
    )

    const hasPolicy = Boolean(
      !routeConfig.policies?.length ||
      currentPolicies.some(p => routeConfig.policies.includes(p))
    )

    if (!hasRole && !hasPolicy) return false

    // Training check — only if the route requires it
    if (routeConfig.requireTraining?.length) {
      const hasRequiredTraining = routeConfig.requireTraining.every(
        type => userTrainingRef.value[type] === true
      )
      if (!hasRequiredTraining) return false
    }

    return true
  }
  
  const getAccessibleRoutes = computed(async () => {
    const routes = []
    for (const config of accessConfig) {
      if (await hasAccess(config.path)) {
        routes.push(config.path)
      }
    }
    return routes
  })
  
  const getNavigationItems = async (items: any[]) => {
    const filteredItems = []
    for (const item of items) {
      if (!item.href || await hasAccess(item.href)) {
        filteredItems.push(item)
      }
    }
    return filteredItems
  }
  
  // Setup route middleware
  onMounted(() => {
    const router = useRouter()
    
    router.beforeEach(async (to, from, next) => {
      try {
        const hasAccessToRoute = await hasAccess(to.path)
        if (!hasAccessToRoute) {
          next('/unauthorized')
        } else {
          next()
        }
      } catch (error) {
        console.error('Error checking access:', error)
        next('/unauthorized')
      }
    })
  
    // Watch for user changes
    watch(() => user.value, async (newUser) => {
      if (newUser && _loggedIn.get()) {
        await fetchUserPolicies()
      } else {
        userPoliciesRef.value = []
        userRoleRef.value = null
      }
    }, { immediate: true })
  })
  
  return {
    userPolicies: computed(() => userPoliciesRef.value),
    userTraining: computed(() => userTrainingRef.value),
    userRole: computed(() => userRoleRef.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchUserPolicies,
    getNavigationItems,
    getAccessibleRoutes,
    hasAccess,
  }
}