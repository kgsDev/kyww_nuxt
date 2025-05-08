//this pulls a list of users with the sampler policy - for use in the sampler form
//must be a sammpler to see this
import { createDirectus, rest, readItems } from '@directus/sdk';

const config = getApiConfig();

export default defineEventHandler(async (event) => {
  const { samplerId } = getQuery(event);
  
  if (!samplerId) {
    throw createError({
      statusCode: 400,
      message: 'Must be authorizeed to see this'
    });
  }


  try {
    // Fetch users with filter, ensuring we get the UUID
    const usersResponse = await fetch(
      `${config.public.directusUrl}/users?` + 
      `fields[]=id&fields[]=first_name&fields[]=last_name&fields[]=email&` +
      `filter[policies][policy][name][_eq]=Sampler&` +
      `sort[]=last_name&limit=-1`, 
      {
        headers: getDirectusHeaders(config),
        method: 'GET'
      }
    );

    if (!usersResponse.ok) {
      throw new Error(`HTTP error! status: ${usersResponse.status}`);
    }

    const usersData = await usersResponse.json();
    const users = usersData.data;

    // Map the response to include the UUID as the id
    const samplers = users.map(user => ({
      id: user.id,
      label: `${user.first_name} ${user.last_name}`,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email
    }));

    return samplers;
  } catch (error) {
    console.error('Error fetching samplers:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch samplers: ' + error.message
    });
  }
});