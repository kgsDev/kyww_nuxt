// server/api/other-trainer-invites.js
import { getApiConfig, getDirectusHeaders } from '../utils/config';

export default defineEventHandler(async (event) => {
  const config = getApiConfig();
  const method = event.method;
  
  if (method === 'GET') {
    // Get the current user ID from the query parameter
    const { userId } = getQuery(event);
    
    if (!userId) {
      throw createError({
        statusCode: 400,
        message: 'User ID is required'
      });
    }
    
    try {
      // Fetch invites from other trainers
      const invitesResponse = await fetch(
        `${config.public.directusUrl}/items/user_invites?filter[trainer_id][_neq]=${userId}&fields=id,email,invite_sent_at,training_date,training_location,invite_token,trainer_id&sort=-invite_sent_at`,
        {
          headers: getDirectusHeaders(config),
        }
      );
      
      if (!invitesResponse.ok) {
        throw new Error('Failed to fetch other trainers\' invites');
      }
      
      const invitesData = await invitesResponse.json();
      
      if (!invitesData.data || invitesData.data.length === 0) {
        return { invites: [] };
      }
      
      // Get unique trainer IDs
      const trainerIds = [...new Set(invitesData.data.map(invite => invite.trainer_id))];
      
      // Process each trainer ID individually to avoid issues with complex query parameters
      let trainers = [];
      
      for (const trainerId of trainerIds) {
        // Fetch a single trainer at a time to avoid complex query parameters
        const trainerResponse = await fetch(
          `${config.public.directusUrl}/users/${trainerId}?fields=id,first_name,last_name,email`,
          {
            headers: getDirectusHeaders(config),
          }
        );
        
        if (trainerResponse.ok) {
          const trainerData = await trainerResponse.json();
          if (trainerData.data) {
            trainers.push(trainerData.data);
          }
        } else {
          console.warn(`Could not fetch trainer with ID: ${trainerId}`);
        }
      }
      
      // Combine invites with trainer information
      const invitesWithTrainers = invitesData.data.map(invite => {
        const trainer = trainers.find(t => t.id === invite.trainer_id) || null;
        
        return {
          ...invite,
          trainer
        };
      });
      
      return {
        invites: invitesWithTrainers
      };
    } catch (error) {
      console.error('Failed to fetch other trainers\' invites:', error);
      throw createError({
        statusCode: 500,
        message: 'Failed to fetch other trainers\' invites'
      });
    }
  } else {
    throw createError({
      statusCode: 405,
      message: 'Method not allowed'
    });
  }
});