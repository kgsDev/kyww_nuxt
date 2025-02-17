export default defineNuxtPlugin(async (nuxtApp) => {
  const { _loggedIn } = useDirectusAuth()
  const rbac = useRBAC()
  
  // Only fetch policies if user is logged in
  if (_loggedIn.get()) {
    await rbac.fetchUserPolicies()
  }
  
  return {
    provide: {
      rbac
    }
  }
})