export default defineNuxtRouteMiddleware((to) => {
    const { hasAccess } = useRBAC()
    
    if (!hasAccess(to.path)) {
      // You can customize the unauthorized behavior
      return navigateTo({
        path: '/unauthorized',
        query: { 
          from: to.fullPath
        }
      })
    }
  })