import { setResponseStatus, send, readBody, sendError } from 'h3';
import { getApiConfig, getDirectusHeaders } from '../utils/config';

export default eventHandler(async (event) => {
  try {
    const { token } = await readBody(event);
    const config = getApiConfig();

    if (!token) {
      console.warn('Token is missing in request body');
      setResponseStatus(event, 400);
      return send(event, JSON.stringify({ message: 'No user found', error: 'Token is required' }));
    }

    const inviteResponse = await fetch(`${config.public.directusUrl}/items/user_invites?filter[invite_token][_eq]=${encodeURIComponent(token)}`, 
      {
        headers: getDirectusHeaders(config),
      },
    );

    if (!inviteResponse.ok) {
      const errorText = await inviteResponse.text();
      console.error(`Failed to fetch invite data: ${errorText}`);
      setResponseStatus(event, 500);
      return send(event, JSON.stringify({ message: 'Error retrieving user invite data', error: 'Failed to query Directus' }));
    }

    // Parse the response
    const inviteData = await inviteResponse.json();

    // If no invite is found, return a "no user found" message
    if (!inviteData.data || inviteData.data.length === 0) {
      console.warn('No invite found with the provided token');
      setResponseStatus(event, 404);
      return send(event, JSON.stringify({ message: 'No user found' }));
    }

    const invite = inviteData.data[0];

    // Construct the response data
    const responseData = {
      email: invite.email || 'N/A',
      trainer_name: invite.trainer_name || 'N/A',
      training_date: invite.training_date || 'N/A',
      training_location: invite.training_location || 'N/A',
      training_field_chemistry: invite.training_field_chemistry || false,
      training_r_card: invite.training_r_card || false,
      training_habitat: invite.training_habitat || false,
      training_biological: invite.training_biological || false,
      equip_ph: invite.equip_ph || false,
      equip_do: invite.equip_do || false,
      equip_cond: invite.equip_cond || false,
      equip_thermo: invite.equip_thermo || false,
      equip_waste: invite.equip_waste || false,
      equip_pan: invite.equip_pan || false,
      equip_flip: invite.equip_flip || false,
      equip_chem_do: invite.equip_chem_do || false,
      equip_chem_ph: invite.equip_chem_ph || false,
      equip_incubator: invite.equip_incubator || false,
      equip_rcard: invite.equip_rcard || 0,
      equip_pipette: invite.equip_pipette || 0,
    };

    // Send the response
    return send(event, JSON.stringify(responseData));

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    sendError(event, createError({ statusCode: 500, statusMessage: 'Internal Server Error', data: { message: 'An error occurred while processing the request', error: error.message } }));
  }
});