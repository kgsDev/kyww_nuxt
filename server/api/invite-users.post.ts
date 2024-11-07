//This API page is for inviting users - sends off emails to users who have attended a training session

import { v4 as uuidv4 } from 'uuid';
import sendgrid from '@sendgrid/mail';
import { readBody, send } from 'h3'; // Correct imports from h3

const config = useRuntimeConfig();
sendgrid.setApiKey(config.SENDGRID_API_KEY);

export default eventHandler(async (event) => {
  const body = await readBody(event);
  const { emails, 
    training_date, 
    training_location,
    training_field_chemistry,
    training_r_card,
    training_habitat,
    training_biological,
  } = body; // Extract the new fields

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    throw new Error('Invalid or missing emails list');
  }

  try {
    send(event, JSON.stringify({ message: 'Processing invitations' }), 200);
// Process each email invite asynchronously
setImmediate(async () => {
  for (const email of emails) {
    try {
      const token = uuidv4();

      // Check for existing invite
      const existingInviteResponse = await fetch(
        `${config.public.DIRECTUS_URL}/items/user_invites?filter[email][_eq]=${email}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!existingInviteResponse.ok) {
        throw new Error(`Failed to fetch existing invite for ${email}`);
      }

      const existingInviteData = await existingInviteResponse.json();
      if (existingInviteData.data?.length > 0) {
        for (const invite of existingInviteData.data) {
          const deleteResponse = await fetch(
            `${config.public.DIRECTUS_URL}/items/user_invites/${invite.id}`,
            {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
                'Content-Type': 'application/json',
              },
            }
          );

          if (!deleteResponse.ok) {
            throw new Error(`Failed to delete existing invite for ${email}`);
          }
        }
      }

      // Create new invite
      const inviteResponse = await fetch(`${config.public.DIRECTUS_URL}/items/user_invites`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.DIRECTUS_SERVER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          training_date,
          training_location,
          training_field_chemistry,
          training_r_card,
          training_habitat,
          training_biological,
          invite_token: token,
          invite_sent_at: new Date().toISOString(),
        }),
      });

      if (!inviteResponse.ok) {
        const errorData = await inviteResponse.json();
        console.error('Error creating invite:', errorData);
        throw new Error(`Failed to create invite for ${email}`);
      }

      // Send the invitation email
      const signupLink = `https://kyww.uky.edu/signup/?token=${token}`;
      await sendgrid.send({
        to: email,
        from: {
          email: 'contact@kywater.org',
          name: 'Kentucky Watershed Watch',
        },
        subject: 'Complete Your Kentucky Watershed Watch Registration',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to Kentucky Watershed Watch!</h2>
            <p>Thank you for attending the Kentucky Watershed Watch Sampler Training. We're excited to have you join our network of citizen scientists working to protect Kentucky's water resources!</p>
            <div style="margin: 30px 0;">
              <h3 style="color: #4CAF50;">Next Step: Create Your Data Portal Account</h3>
              <p>You're now invited to create your account in the KWW data portal where you'll be able to enter and track your stream sample data.</p>
              <div style="text-align: center; margin: 25px 0;">
                <a href="${signupLink}" 
                   style="background-color: #4CAF50; color: white; padding: 12px 25px; 
                          text-decoration: none; border-radius: 4px; display: inline-block;">
                  Create Your Data Portal Account
                </a>
              </div>
            </div>
            <div style="margin: 30px 0; padding: 20px; background-color: #f8f8f8; border-radius: 4px;">
              <p style="color: #666; margin-bottom: 10px;"><strong>Important Security Notice:</strong></p>
              <ul style="color: #666; margin: 0; padding-left: 20px;">
                <li>This invitation link is unique to you and will expire after use</li>
                <li>Kentucky Watershed Watch will never ask for your password via email or phone</li>
                <li>Always ensure you're accessing our official websites: kyww.uky.edu and kywater.org</li>
              </ul>
            </div>
            <p style="margin-top: 30px;">Best regards,<br>Kentucky Watershed Watch Team</p>
            <p style="color: #666; font-size: 0.9em; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
              Questions about registration? Need assistance?<br>
              Contact us at contact@kywater.org
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error(`Failed to process invite for ${email}:`, error);
    }
  }
});
} catch (error) {
  console.error('Error sending invitations:', error);
  sendError(event, createError({ statusCode: 500, statusMessage: 'Failed to process invitations' }));
}
});