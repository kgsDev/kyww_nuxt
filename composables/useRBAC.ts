export interface AccessControl {
  path: string
  roles?: string[]
  policies?: string[]
  exact?: boolean
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

      // Set role of user (one per user)
      if (userData?.role?.id) {
        userRoleRef.value = userData.role.id
      }
  
      // Handle policies - clean array of policy IDs
      if (userData?.policies && Array.isArray(userData.policies)) {
        // Convert the proxy to a regular array and extract policy IDs
        const policyArray = Array.from(userData.policies)
        userPoliciesRef.value = policyArray.map(p => p.policy)
      } else {
        userPoliciesRef.value = []
      }
    } catch (err) {
      console.error('Error fetching policies:', err)
      error.value = err
      userPoliciesRef.value = []
      userRoleRef.value = null
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
      policies: [policies.fullAdmin, policies.sampler],
    },
    {
      path: '/portal/biological',
      roles: [roles.devAdmin, roles.wwkyAdmin],
      policies: [policies.fullAdmin]
    },
    {
      path: '/portal/habitat',
      roles: [roles.devAdmin, roles.wwkyAdmin],
      policies: [policies.fullAdmin]
    },
    {
      path: '/unauthorized',
      roles: [],
      policies: []
    }
  ] as const

  const hasAccess = async (path: string): Promise<boolean> => {
    // First ensure policies are loaded if needed
    if (_loggedIn.get() && (!userPoliciesRef.value.length || !userRoleRef.value)) {
      await fetchUserPolicies()
    }
  
    if (!path) return false
  
    const config = accessConfig.find(p => 
      p.exact ? p.path === path : path.startsWith(p.path)
    )
    
    if (!config) return true
  
    // Get clean arrays for comparison
    const currentPolicies = Array.isArray(userPoliciesRef.value) 
      ? Array.from(userPoliciesRef.value)
      : []
 
    // Check role access
    const hasRole = Boolean(
      !config.roles?.length || 
      (userRoleRef.value && config.roles.includes(userRoleRef.value))
    )
  
    // Check policy access
    const hasPolicy = Boolean(
      !config.policies?.length || 
      currentPolicies.some(userPolicy => 
        config.policies.includes(userPolicy)
      )
    )
  
    const allowed = (hasRole || hasPolicy)
    return allowed
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
    userRole: computed(() => userRoleRef.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchUserPolicies,
    getNavigationItems,
    getAccessibleRoutes,
    hasAccess,
  }
}