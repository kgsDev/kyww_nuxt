import { createDirectus, rest, readItems } from '@directus/sdk';

const config = getApiConfig();

export default defineEventHandler(async (event) => {
  const directus = createDirectus(process.env.DIRECTUS_URL).with(rest());

  try {
    // Fetch users with isSampler filter, ensuring we get the UUID
    const usersResponse = await fetch(
      `${config.public.directusUrl}/users?` + 
      `fields[]=id&fields[]=first_name&fields[]=last_name&fields[]=email&` +
      `filter[isSampler][_eq]=true&` +
      `sort[]=last_name`, 
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