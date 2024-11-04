import { setResponseStatus, send } from 'h3';

export default eventHandler(async (event) => {
  const { token } = await readBody(event);

  if (!token) {
    setResponseStatus(event, 400);
    return send(event, JSON.stringify({ message: 'No user found' }));
  }

 //query the user_invites table in Directus to find the invite with the token
  const inviteResponse = await fetch(`${process.env.DIRECTUS_URL}/items/user_invites?filter[invite_token][_eq]=${token}`, {
    headers: {
      Authorization: `Bearer ${process.env.DIRECTUS_SERVER_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  //parse the response
  const inviteData = await inviteResponse.json();

  //if no invite is found, return no user found message
  if (inviteData.data.length === 0) {
    return send(event, JSON.stringify({ message: 'No user found' }));
  }

  const invite = inviteData.data[0];

  // Ensure a proper JSON response
  const responseData = {
    email: invite.email || 'N/A',
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
    equip_pipette: invite.equip_pipette || 0
  };

  return send(event, JSON.stringify(responseData));
});