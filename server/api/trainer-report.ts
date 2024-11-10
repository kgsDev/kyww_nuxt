export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig();
    const { trainerId } = getQuery(event);
  
    if (!trainerId) {
      throw createError({
        statusCode: 400,
        message: 'Trainer ID is required'
      });
    }
  
    try {
      // Get users managed by this trainer
      const usersResponse = await fetch(
        `${config.public.DIRECTUS_URL}/users?filter[trainer_id][_eq]=${trainerId}`,
        {
          headers: {
            Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );
  
      if (!usersResponse.ok) {
        throw new Error('Failed to fetch users');
      }
  
      const usersData = await usersResponse.json();
  
      return {
        users: usersData.data
      };
    } catch (error) {
      console.error('Trainer report error:', error);
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch trainer report data'
      });
    }
  });